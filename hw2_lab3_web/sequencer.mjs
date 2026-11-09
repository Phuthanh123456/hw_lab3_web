import { midiToFrequency } from "./piano-model.mjs";

export const PLAYBACK_SPEEDS = Object.freeze([0.5, 1, 2]);

export function scaleSequenceTime(milliseconds, speed) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError("Sequence times must be finite, non-negative milliseconds.");
  }
  if (!PLAYBACK_SPEEDS.includes(speed)) {
    throw new RangeError("Playback speed must be 0.5, 1, or 2.");
  }
  return milliseconds / speed;
}

function abortError() {
  const error = new Error("Sequence playback was cancelled.");
  error.name = "AbortError";
  return error;
}

function abortableDelay(milliseconds, signal, setTimer, clearTimer) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    let settled = false;
    const timer = setTimer(() => finish(resolve), milliseconds);
    function onAbort() {
      clearTimer(timer);
      finish(reject, abortError());
    }
    function finish(callback, value) {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback(value);
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function copySequence(sequence) {
  return sequence.map(({ midi, freqHz, durationMs, deltaMs }) => ({ midi, freqHz, durationMs, deltaMs }));
}

/** Record held notes and replay note starts FIFO with abortable per-note timers. */
export function createFifoSequencer({
  audioEngine,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  setTimer = globalThis.setTimeout.bind(globalThis),
  clearTimer = globalThis.clearTimeout.bind(globalThis),
  AbortControllerClass = globalThis.AbortController,
  onChange = () => {},
} = {}) {
  if (typeof audioEngine?.noteOn !== "function" || typeof audioEngine?.noteOff !== "function") {
    throw new TypeError("A noteOn/noteOff audio engine is required.");
  }
  if (typeof AbortControllerClass !== "function") throw new TypeError("AbortController is required.");

  let sequence = [];
  let recording = false;
  let playing = false;
  let destroyed = false;
  let previousStartMs = null;
  let playbackController = null;
  const recordedHolds = new Map();
  const heldInputs = new Set();

  function emitChange() {
    try {
      onChange({ recording, playing, sequence: copySequence(sequence) });
    } catch {
      // UI callbacks must not interrupt audio or sequence bookkeeping.
    }
  }

  function getSequence() {
    return copySequence(sequence);
  }

  function startRecording({ clear = true } = {}) {
    if (destroyed) return false;
    if (playbackController) stopSequence();
    if (recording) stopRecording();
    if (clear) sequence = [];
    recordedHolds.clear();
    previousStartMs = null;
    recording = true;
    emitChange();
    return true;
  }

  function stopRecording() {
    if (!recording) return getSequence();
    const stoppedAt = now();
    for (const { event, startedAt } of recordedHolds.values()) {
      event.durationMs = Math.max(0, stoppedAt - startedAt);
    }
    recordedHolds.clear();
    recording = false;
    emitChange();
    return getSequence();
  }

  function noteOn(midi) {
    if (destroyed) return Promise.resolve({ ok: false, code: "sequencer-disposed" });
    if (!Number.isInteger(midi) || midi < 21 || midi > 108) {
      return Promise.resolve({ ok: false, code: "invalid-midi" });
    }

    const freqHz = midiToFrequency(midi);
    const startedAt = now();
    if (!heldInputs.has(midi)) {
      heldInputs.add(midi);
      if (recording) {
        const event = {
          midi,
          freqHz,
          durationMs: 0,
          deltaMs: previousStartMs === null ? 0 : Math.max(0, startedAt - previousStartMs),
        };
        sequence.push(event);
        recordedHolds.set(midi, { event, startedAt });
        previousStartMs = startedAt;
        emitChange();
      }
    }

    try {
      return Promise.resolve(audioEngine.noteOn(midi, freqHz)).catch((error) => ({
        ok: false,
        code: "audio-playback-failed",
        message: error?.message ?? "The note could not be started.",
      }));
    } catch (error) {
      return Promise.resolve({
        ok: false,
        code: "audio-playback-failed",
        message: error?.message ?? "The note could not be started.",
      });
    }
  }

  function noteOff(midi) {
    if (!Number.isInteger(midi) || midi < 21 || midi > 108) {
      return { ok: false, code: "invalid-midi" };
    }
    heldInputs.delete(midi);
    const held = recordedHolds.get(midi);
    if (held) {
      held.event.durationMs = Math.max(0, now() - held.startedAt);
      recordedHolds.delete(midi);
      emitChange();
    }
    try {
      return audioEngine.noteOff(midi);
    } catch (error) {
      return { ok: false, code: "audio-release-failed", message: error?.message ?? "The note could not be released." };
    }
  }

  async function play(speed = 1) {
    if (destroyed) return { ok: false, code: "sequencer-disposed" };
    if (!PLAYBACK_SPEEDS.includes(speed)) return { ok: false, code: "invalid-playback-speed" };
    if (recording) stopRecording();
    if (playbackController) stopSequence();

    const entries = getSequence();
    if (entries.length === 0) return { ok: true, played: 0 };

    const controller = new AbortControllerClass();
    playbackController = controller;
    playing = true;
    emitChange();

    let startOffsetMs = 0;
    const starts = entries.map((entry) => {
      startOffsetMs += entry.deltaMs;
      return scaleSequenceTime(startOffsetMs, speed);
    });

    async function playEntry(entry, startAtMs) {
      let started = false;
      try {
        await abortableDelay(startAtMs, controller.signal, setTimer, clearTimer);
        if (controller.signal.aborted) return;

        const result = await audioEngine.noteOn(entry.midi, entry.freqHz);
        if (controller.signal.aborted) {
          if (result?.ok && !result.ignored) audioEngine.noteOff(entry.midi);
          return;
        }
        if (!result?.ok || result.ignored) return;
        started = true;

        await abortableDelay(scaleSequenceTime(entry.durationMs, speed), controller.signal, setTimer, clearTimer);
        if (!controller.signal.aborted && started) audioEngine.noteOff(entry.midi);
      } catch (error) {
        if (error?.name !== "AbortError" && started) {
          try {
            audioEngine.noteOff(entry.midi);
          } catch {
            // Keep one failed voice release from rejecting the rest of the queue.
          }
        }
      }
    }

    try {
      await Promise.all(entries.map((entry, index) => playEntry(entry, starts[index])));
      return controller.signal.aborted
        ? { ok: true, cancelled: true, played: 0 }
        : { ok: true, cancelled: false, played: entries.length };
    } finally {
      if (playbackController === controller) {
        playbackController = null;
        playing = false;
        emitChange();
      }
    }
  }

  function stopSequence() {
    const controller = playbackController;
    playbackController = null;
    if (controller && !controller.signal.aborted) controller.abort();
    playing = false;
    try {
      audioEngine.stopAll?.();
    } catch {
      // Stop should remain safe even if a provider fails during cleanup.
    }
    emitChange();
    return Boolean(controller);
  }

  function clearSequence() {
    if (playbackController) stopSequence();
    sequence = [];
    recordedHolds.clear();
    previousStartMs = null;
    emitChange();
  }

  function destroy() {
    if (destroyed) return;
    stopSequence();
    stopRecording();
    destroyed = true;
    recordedHolds.clear();
    heldInputs.clear();
  }

  return Object.freeze({
    noteOn,
    noteOff,
    startRecording,
    stopRecording,
    play,
    stopSequence,
    clearSequence,
    destroy,
    getSequence,
    get isRecording() {
      return recording;
    },
    get isPlaying() {
      return playing;
    },
  });
}
