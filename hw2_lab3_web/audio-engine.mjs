import { midiToFrequency } from "./piano-model.mjs";

export const MAX_VOICES = 8;
export const DEMO_AUDIO_LABEL = "Synthesized oscillator demo — not Legacy piano audio";

const MIN_GAIN = 0.0001;
const PEAK_GAIN = 0.2;
const ATTACK_SECONDS = 0.008;
const RELEASE_SECONDS = 0.04;

function failure(code, message) {
  return { ok: false, code, message };
}

function isPianoMidi(midi) {
  return Number.isInteger(midi) && midi >= 21 && midi <= 108;
}

function disconnectSafely(node) {
  try {
    node?.disconnect?.();
  } catch {
    // Disconnecting an already-disconnected node is harmless for this engine.
  }
}

/** Create an eight-voice, FIFO-stealing oscillator engine for the HW2 piano. */
export function createPolyphonicAudioEngine({
  AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext,
} = {}) {
  const activeVoices = new Map();
  const pendingNotes = new Map();
  let audioContext = null;
  let audioContextPromise = null;
  let disposed = false;

  async function getAudioContext() {
    if (disposed) throw new Error("Audio engine has been disposed.");
    if (audioContext?.state === "closed") {
      audioContext = null;
      audioContextPromise = null;
    }
    if (audioContextPromise) return audioContextPromise;
    if (typeof AudioContextClass !== "function") {
      throw Object.assign(new Error("Web Audio is unavailable."), { code: "audio-unavailable" });
    }

    audioContextPromise = (async () => {
      const context = new AudioContextClass();
      audioContext = context;
      if (context.state === "suspended") await context.resume();
      if (context.state === "closed") throw new Error("AudioContext is closed.");
      return context;
    })();

    try {
      return await audioContextPromise;
    } catch (error) {
      audioContext = null;
      audioContextPromise = null;
      throw Object.assign(new Error(error?.message ?? "AudioContext initialization failed."), {
        code: error?.code ?? "audio-initialization-failed",
      });
    }
  }

  function releaseVoice(midi) {
    const voice = activeVoices.get(midi);
    if (!voice) return false;

    activeVoices.delete(midi);
    voice.releasing = true;
    const now = audioContext.currentTime;
    const stopAt = now + RELEASE_SECONDS;
    const gainParam = voice.gainNode.gain;

    try {
      if (typeof gainParam.cancelAndHoldAtTime === "function") {
        gainParam.cancelAndHoldAtTime(now);
      } else {
        const heldGain = Number.isFinite(gainParam.value)
          ? Math.max(MIN_GAIN, gainParam.value)
          : PEAK_GAIN;
        gainParam.cancelScheduledValues(now);
        gainParam.setValueAtTime(heldGain, now);
      }
      gainParam.linearRampToValueAtTime(MIN_GAIN, stopAt);
      voice.oscillator.stop(stopAt);
      voice.stopAt = stopAt;
    } catch {
      // If automation or a scheduled stop fails, stop immediately to avoid a stuck voice.
      try {
        voice.oscillator.stop(now);
      } catch {
        // An oscillator may already have stopped.
      }
      disconnectSafely(voice.oscillator);
      disconnectSafely(voice.gainNode);
    }

    return true;
  }

  async function noteOn(midi, suppliedFrequency) {
    if (!isPianoMidi(midi)) return failure("invalid-midi", "MIDI note must be within the A0–C8 piano range.");

    let freqHz;
    try {
      freqHz = midiToFrequency(midi);
    } catch {
      return failure("invalid-midi", "MIDI note is invalid.");
    }
    if (suppliedFrequency !== undefined && (!Number.isFinite(suppliedFrequency)
      || Math.abs(suppliedFrequency - freqHz) > Math.max(1, freqHz) * 1e-12)) {
      return failure("frequency-mismatch", "Frequency must follow the equal-tempered MIDI formula.");
    }
    if (disposed) return failure("engine-disposed", "Audio engine has been disposed.");
    if (activeVoices.has(midi) || pendingNotes.has(midi)) {
      return { ok: true, midi, freqHz, ignored: true, reason: "already-active" };
    }

    const pendingNote = { cancelled: false };
    pendingNotes.set(midi, pendingNote);

    let context;
    try {
      context = await getAudioContext();
    } catch (error) {
      if (pendingNotes.get(midi) === pendingNote) pendingNotes.delete(midi);
      return failure(error?.code ?? "audio-initialization-failed", error?.message ?? "Audio initialization failed.");
    }

    if (pendingNote.cancelled || disposed || pendingNotes.get(midi) !== pendingNote) {
      return { ok: true, midi, freqHz, ignored: true, reason: "cancelled-before-start" };
    }
    pendingNotes.delete(midi);
    // Another noteOn can only become active after its own pending token is cleared.
    if (activeVoices.has(midi)) return { ok: true, midi, freqHz, ignored: true, reason: "already-active" };

    if (activeVoices.size >= MAX_VOICES) {
      const oldestMidi = activeVoices.keys().next().value;
      if (oldestMidi !== undefined) releaseVoice(oldestMidi);
    }

    let oscillator;
    let gainNode;
    try {
      oscillator = context.createOscillator();
      gainNode = context.createGain();
      const startAt = context.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freqHz, startAt);
      gainNode.gain.cancelScheduledValues(startAt);
      gainNode.gain.setValueAtTime(MIN_GAIN, startAt);
      gainNode.gain.exponentialRampToValueAtTime(PEAK_GAIN, startAt + ATTACK_SECONDS);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const voice = { midi, freqHz, oscillator, gainNode, startedAt: startAt, releasing: false, stopAt: null };
      oscillator.onended = () => {
        if (activeVoices.get(midi) === voice) activeVoices.delete(midi);
        disconnectSafely(oscillator);
        disconnectSafely(gainNode);
      };
      oscillator.start(startAt);
      activeVoices.set(midi, voice);
      return { ok: true, midi, freqHz, source: "demo" };
    } catch (error) {
      try {
        oscillator?.stop(context.currentTime);
      } catch {
        // The oscillator may not have started.
      }
      disconnectSafely(oscillator);
      disconnectSafely(gainNode);
      return failure("audio-playback-failed", error?.message ?? "The oscillator voice could not be started.");
    }
  }

  function noteOff(midi) {
    if (!isPianoMidi(midi)) return failure("invalid-midi", "MIDI note must be within the A0–C8 piano range.");
    const pendingNote = pendingNotes.get(midi);
    if (pendingNote) {
      pendingNote.cancelled = true;
      pendingNotes.delete(midi);
      return { ok: true, midi, released: true, pending: true };
    }
    if (!activeVoices.has(midi)) return { ok: true, midi, released: false, reason: "not-active" };
    return { ok: true, midi, released: releaseVoice(midi) };
  }

  function stopAll() {
    // Snapshotting is only used for bulk cleanup; FIFO stealing itself reads the Map head in O(1).
    for (const pendingNote of pendingNotes.values()) pendingNote.cancelled = true;
    pendingNotes.clear();
    for (const midi of [...activeVoices.keys()]) releaseVoice(midi);
  }

  async function close() {
    if (disposed) return;
    stopAll();
    disposed = true;
    const context = audioContext;
    audioContext = null;
    audioContextPromise = null;
    if (context && context.state !== "closed" && typeof context.close === "function") {
      try {
        await context.close();
      } catch {
        // Cleanup remains safe if the browser has already closed the context.
      }
    }
  }

  return Object.freeze({
    noteOn,
    noteOff,
    stopAll,
    close,
    get activeVoiceCount() {
      return activeVoices.size;
    },
    getActiveMidis() {
      return [...activeVoices.keys()];
    },
    getOldestActiveMidi() {
      return activeVoices.keys().next().value;
    },
    get audioContext() {
      return audioContext;
    },
    demoAudioLabel: DEMO_AUDIO_LABEL,
  });
}
