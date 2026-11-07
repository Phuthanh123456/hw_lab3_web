const SUPPORTED_CODES = ["KeyW", "KeyA", "KeyS", "KeyD", "KeyJ", "KeyK", "KeyL"];
const CLICK_ACTIVE_MS = 160;

function isTextControl(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
}

/** Attach the shared mouse/touch and physical-key controls to semantic pads. */
export function attachDrumControls({ root, keyTarget, audioEngine, onHit = () => {} }) {
  if (!root || !keyTarget) throw new TypeError("A DOM root and keyboard event target are required.");

  const buttons = [...root.querySelectorAll(".drum-pad")];
  const padsById = new Map(buttons.map((button) => [button.id, { id: button.id, button }]));
  const padMap = new Map();

  for (const code of SUPPORTED_CODES) {
    const button = buttons.find((candidate) => candidate.dataset.code === code);
    if (button) padMap.set(code, { id: button.id, button });
  }

  const activeSourcesById = new Map();
  const timersBySource = new Map();
  const heldKeys = new Map();
  let clickSequence = 0;
  let destroyed = false;

  function setSourceActive(padId, source, active) {
    const pad = padsById.get(padId);
    if (!pad) return;

    let sources = activeSourcesById.get(padId);
    if (!sources) {
      sources = new Set();
      activeSourcesById.set(padId, sources);
    }

    if (active) sources.add(source);
    else sources.delete(source);

    if (sources.size === 0) activeSourcesById.delete(padId);
    pad.button.setAttribute("aria-pressed", String(sources.size > 0));
  }

  function releaseSource(padId, source) {
    const timer = timersBySource.get(source);
    if (timer !== undefined) {
      clearTimeout(timer);
      timersBySource.delete(source);
    }
    setSourceActive(padId, source, false);
  }

  function onTriggerPad(padId) {
    if (!padsById.has(padId) || typeof audioEngine?.triggerPad !== "function") return;

    try {
      const result = audioEngine.triggerPad(padId);
      if (result && typeof result.catch === "function") {
        result.catch(() => {
          // The audio engine returns structured failures; UI activation remains usable.
        });
      }
    } catch {
      // Synchronous audio initialization failures must not break pad controls.
    }
  }

  function notifyHit(pad, input) {
    try {
      onHit({ padId: pad.id, code: pad.button.dataset.code, input });
    } catch {
      // Visual feedback must not break pad input if a consumer fails.
    }
  }

  function handleClick(event) {
    const pad = padsById.get(event.currentTarget.id);
    if (!pad) return;

    const source = `click:${++clickSequence}`;
    setSourceActive(pad.id, source, true);
    timersBySource.set(source, setTimeout(() => releaseSource(pad.id, source), CLICK_ACTIVE_MS));
    onTriggerPad(pad.id);
    notifyHit(pad, "button");
  }

  function handleKeyDown(event) {
    if (destroyed || event.repeat || isTextControl(event.target)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const pad = padMap.get(event.code);
    if (!pad || heldKeys.has(event.code)) return;

    heldKeys.set(event.code, pad.id);
    setSourceActive(pad.id, `key:${event.code}`, true);
    onTriggerPad(pad.id);
    notifyHit(pad, "keyboard");
  }

  function handleKeyUp(event) {
    const padId = heldKeys.get(event.code);
    if (!padId) return;

    heldKeys.delete(event.code);
    releaseSource(padId, `key:${event.code}`);
  }

  function clearAllActive() {
    for (const timer of timersBySource.values()) clearTimeout(timer);
    timersBySource.clear();
    heldKeys.clear();
    activeSourcesById.clear();
    for (const { button } of padsById.values()) button.setAttribute("aria-pressed", "false");
  }

  function handleVisibilityChange() {
    if (root.ownerDocument?.visibilityState === "hidden" || root.visibilityState === "hidden") {
      clearAllActive();
    }
  }

  for (const { button } of padsById.values()) button.addEventListener("click", handleClick);
  keyTarget.addEventListener("keydown", handleKeyDown);
  keyTarget.addEventListener("keyup", handleKeyUp);
  keyTarget.addEventListener("blur", clearAllActive);
  const documentTarget = root.nodeType === 9 ? root : root.ownerDocument;
  documentTarget?.addEventListener("visibilitychange", handleVisibilityChange);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const { button } of padsById.values()) button.removeEventListener("click", handleClick);
    keyTarget.removeEventListener("keydown", handleKeyDown);
    keyTarget.removeEventListener("keyup", handleKeyUp);
    keyTarget.removeEventListener("blur", clearAllActive);
    documentTarget?.removeEventListener("visibilitychange", handleVisibilityChange);
    clearAllActive();
  }

  return Object.freeze({ padMap, onTriggerPad, destroy });
}
