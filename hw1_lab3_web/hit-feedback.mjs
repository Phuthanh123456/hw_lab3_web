const MAX_VISIBLE_HITS = 8;
const METER_MIN_DBFS = -60;
const METER_MAX_DBFS = 0;
const METER_UPDATE_MS = 100;

function appendTextElement(documentTarget, parent, className, text) {
  const element = documentTarget.createElement("span");
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

/** Add a polite visual hit history and a meter backed only by measured dBFS. */
export function attachHitFeedback({ root, audioEngine }) {
  const documentTarget = root.nodeType === 9 ? root : root.ownerDocument;
  const history = root.querySelector("#hit-history");
  const emptyState = root.querySelector("#hit-empty-state");
  const meter = root.querySelector("#audio-level-meter");
  const meterTrack = root.querySelector("#audio-level-bars");
  const meterStatus = root.querySelector("#audio-level-status");
  const meterValue = root.querySelector("#audio-level-value");

  if (!history || !emptyState || !meter || !meterTrack || !meterStatus || !meterValue) {
    throw new TypeError("Hit history and level meter elements are required.");
  }

  let hitCount = 0;
  let lastMeterUpdate = 0;
  let animationFrame = null;
  let destroyed = false;
  const segments = [...meterTrack.querySelectorAll(".meter-segment")];

  function recordHit({ code, input }) {
    if (destroyed || typeof code !== "string") return;

    hitCount += 1;
    const item = documentTarget.createElement("li");
    item.className = "hit-entry";
    item.setAttribute("aria-label", `${code} hit by ${input === "keyboard" ? "keyboard" : "button"}`);
    appendTextElement(documentTarget, item, "hit-number", String(hitCount).padStart(2, "0"));
    appendTextElement(documentTarget, item, "hit-key", code);
    appendTextElement(documentTarget, item, "hit-input", input === "keyboard" ? "Keyboard" : "Button");
    history.prepend(item);
    emptyState.hidden = true;

    while (history.children.length > MAX_VISIBLE_HITS) history.lastElementChild.remove();
  }

  function showUnmeasured() {
    meter.dataset.state = "unmeasured";
    meter.setAttribute("role", "img");
    meter.setAttribute("aria-label", "Audio level not measured");
    meter.removeAttribute("aria-valuemin");
    meter.removeAttribute("aria-valuemax");
    meter.removeAttribute("aria-valuenow");
    meter.removeAttribute("aria-valuetext");
    meterStatus.textContent = "Not measured";
    meterValue.textContent = "Not measured";
    for (const segment of segments) segment.classList.remove("is-lit");
  }

  function showMeasurement(reading) {
    const silent = reading.silent === true && reading.valueDbfs === null;
    if (!silent && !Number.isFinite(reading.valueDbfs)) {
      showUnmeasured();
      return;
    }

    const dbfs = silent ? Number.NEGATIVE_INFINITY : reading.valueDbfs;
    const normalizedValue = silent ? -100 : Math.max(-100, Math.min(METER_MAX_DBFS, dbfs));
    const visualRatio = silent
      ? 0
      : Math.max(0, Math.min(1, (dbfs - METER_MIN_DBFS) / (METER_MAX_DBFS - METER_MIN_DBFS)));
    const litSegments = Math.round(visualRatio * segments.length);
    const valueText = silent ? "−∞ dBFS" : `${dbfs < 0 ? "−" : ""}${Math.abs(dbfs).toFixed(1)} dBFS`;

    meter.dataset.state = "measured";
    meter.setAttribute("role", "meter");
    meter.setAttribute("aria-label", "Measured digital audio level in dBFS");
    meter.setAttribute("aria-valuemin", "-100");
    meter.setAttribute("aria-valuemax", "0");
    meter.setAttribute("aria-valuenow", String(Number.isFinite(normalizedValue) ? normalizedValue : -100));
    meter.setAttribute("aria-valuetext", `${valueText}, measured digital signal level`);
    meterStatus.textContent = "Measured digital signal";
    meterValue.textContent = valueText;
    segments.forEach((segment, index) => segment.classList.toggle("is-lit", index < litSegments));
  }

  function updateMeter(timestamp) {
    if (destroyed) return;
    if (timestamp - lastMeterUpdate >= METER_UPDATE_MS) {
      lastMeterUpdate = timestamp;
      let reading = null;
      try {
        reading = audioEngine?.getLevelReading?.() ?? null;
      } catch {
        reading = null;
      }
      if (reading?.measured === true && reading.unit === "dBFS") showMeasurement(reading);
      else showUnmeasured();
    }
    animationFrame = globalThis.requestAnimationFrame?.(updateMeter) ?? null;
  }

  showUnmeasured();
  animationFrame = globalThis.requestAnimationFrame?.(updateMeter) ?? null;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (animationFrame !== null) globalThis.cancelAnimationFrame?.(animationFrame);
  }

  return Object.freeze({ recordHit, destroy });
}
