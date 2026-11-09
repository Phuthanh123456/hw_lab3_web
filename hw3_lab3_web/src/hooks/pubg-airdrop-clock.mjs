/**
 * Calculate from wall-clock epoch each time; this is intentionally not a
 * decrementing counter, so delayed/background frames cannot accumulate drift.
 */
export function calculateRemainingMs(targetEpochMs, serverOffsetMs = 0, nowEpochMs = Date.now()) {
  if (!Number.isFinite(targetEpochMs) || !Number.isFinite(serverOffsetMs) || !Number.isFinite(nowEpochMs)) {
    throw new TypeError("Target, server offset, and current epoch must be finite numbers.");
  }
  return Math.max(0, targetEpochMs - (nowEpochMs + serverOffsetMs));
}

function defaultRequestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(() => callback(Date.now()), 16);
}

function defaultCancelFrame(frameId) {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(frameId);
  } else {
    globalThis.clearTimeout(frameId);
  }
}

/**
 * Clock driver used by the React hook. Dependencies are injectable so frame,
 * visibility, and cleanup behavior can be tested without a browser runtime.
 */
export function createPubgAirdropClock({
  targetEpochMs,
  serverOffsetMs = 0,
  now = () => Date.now(),
  documentRef = globalThis.document,
  requestFrame = defaultRequestFrame,
  cancelFrame = defaultCancelFrame,
} = {}) {
  if (!Number.isFinite(targetEpochMs) || !Number.isFinite(serverOffsetMs)) {
    throw new TypeError("targetEpochMs and serverOffsetMs must be finite numbers.");
  }

  let onUpdate = null;
  let frameId = null;
  let disposed = false;
  let started = false;

  const isVisible = () => !documentRef || documentRef.visibilityState === "visible";

  function cancelPendingFrame() {
    if (frameId === null) return;
    cancelFrame(frameId);
    frameId = null;
  }

  function scheduleFrame() {
    if (disposed || frameId !== null || !isVisible()) return;
    frameId = requestFrame(tick);
  }

  function syncNow() {
    if (disposed || !onUpdate) return;
    const remainingMs = calculateRemainingMs(targetEpochMs, serverOffsetMs, now());
    onUpdate(remainingMs);
    if (remainingMs === 0) cancelPendingFrame();
    else scheduleFrame();
  }

  function tick() {
    frameId = null;
    syncNow();
  }

  function handleVisibilityChange() {
    if (!isVisible()) {
      cancelPendingFrame();
      return;
    }
    // Re-read epoch immediately on wake; do not replay missed frame deltas.
    syncNow();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelPendingFrame();
    documentRef?.removeEventListener?.("visibilitychange", handleVisibilityChange);
    onUpdate = null;
  }

  function start(updateCallback) {
    if (typeof updateCallback !== "function") throw new TypeError("An update callback is required.");
    if (disposed) throw new Error("This countdown clock has been disposed.");
    onUpdate = updateCallback;
    if (!started) {
      started = true;
      documentRef?.addEventListener?.("visibilitychange", handleVisibilityChange);
    }
    syncNow();
    return dispose;
  }

  return Object.freeze({ start, dispose });
}
