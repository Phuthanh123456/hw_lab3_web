/**
 * Replaceable audio engine for the drum pad IDs.
 *
 * The default profiles are explicitly generated demo tones. They are not
 * recovered Legacy Slide 26 samples or a claim about the original pad sounds.
 */

export const DEMO_AUDIO_LABEL = "Demo synthesized tones — not Legacy audio";

const DEFAULT_DEMO_SOUND_MAP = new Map([
  ["pad-key-w", { kind: "demo-tone", frequency: 110 }],
  ["pad-key-a", { kind: "demo-tone", frequency: 146.83 }],
  ["pad-key-s", { kind: "demo-tone", frequency: 164.81 }],
  ["pad-key-d", { kind: "demo-tone", frequency: 196 }],
  ["pad-key-j", { kind: "demo-tone", frequency: 220 }],
  ["pad-key-k", { kind: "demo-tone", frequency: 261.63 }],
  ["pad-key-l", { kind: "demo-tone", frequency: 293.66 }],
]);

function engineError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Create one audio engine shared by all pads.
 *
 * `soundMap` can later be replaced with verified sample descriptors such as
 * `{ kind: "sample", url: "..." }`; no Legacy sample paths are assumed here.
 */
export function createAudioEngine(options = {}) {
  const soundMap = options.soundMap ?? DEFAULT_DEMO_SOUND_MAP;
  const AudioContextClass = Object.hasOwn(options, "AudioContextClass")
    ? options.AudioContextClass
    : globalThis.AudioContext ?? globalThis.webkitAudioContext;
  const fetchAudio = Object.hasOwn(options, "fetch") ? options.fetch : globalThis.fetch;

  let audioContext = null;
  let analyser = null;
  const decodedSamples = new Map();

  function getSound(padId) {
    return soundMap instanceof Map ? soundMap.get(padId) : soundMap?.[padId];
  }

  async function getAudioContext() {
    if (typeof AudioContextClass !== "function") {
      throw engineError("audio-unavailable", "Web Audio is unavailable in this browser.");
    }

    try {
      if (!audioContext || audioContext.state === "closed") {
        audioContext = new AudioContextClass();
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      if (audioContext.state !== "running") {
        throw new Error("Audio context did not enter the running state.");
      }

      ensureAnalyser(audioContext);

      return audioContext;
    } catch {
      throw engineError("audio-initialization-failed", "Audio could not be initialized.");
    }
  }

  function ensureAnalyser(context) {
    if (analyser || typeof context.createAnalyser !== "function") return;

    try {
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      analyser.connect(context.destination);
    } catch {
      analyser = null;
    }
  }

  function outputNode(context) {
    return analyser && audioContext === context ? analyser : context.destination;
  }

  function getLevelReading() {
    if (!audioContext || audioContext.state !== "running" || !analyser) return null;

    try {
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      let sumSquares = 0;
      for (const sample of samples) sumSquares += sample * sample;
      const rms = Math.sqrt(sumSquares / samples.length);
      if (!Number.isFinite(rms)) return null;

      return {
        measured: true,
        unit: "dBFS",
        rms,
        valueDbfs: rms === 0 ? null : 20 * Math.log10(rms),
        silent: rms === 0,
      };
    } catch {
      return null;
    }
  }

  function playDemoTone(context, sound) {
    if (!Number.isFinite(sound.frequency) || sound.frequency <= 0) {
      throw engineError("invalid-demo-profile", "The demo tone profile is invalid.");
    }

    const startAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(sound.frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
    oscillator.connect(gain);
    gain.connect(outputNode(context));
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.19);
  }

  async function getDecodedSample(context, url) {
    if (typeof url !== "string" || url.length === 0 || typeof fetchAudio !== "function") {
      throw engineError("sample-load-failed", "The selected audio sample could not be loaded.");
    }

    if (!decodedSamples.has(url)) {
      const samplePromise = (async () => {
        const response = await fetchAudio(url);
        if (!response.ok) throw new Error("Audio sample request failed.");
        return context.decodeAudioData(await response.arrayBuffer());
      })();
      decodedSamples.set(url, samplePromise);
      samplePromise.catch(() => decodedSamples.delete(url));
    }

    try {
      return await decodedSamples.get(url);
    } catch {
      throw engineError("sample-load-failed", "The selected audio sample could not be loaded.");
    }
  }

  async function triggerPad(padId) {
    const sound = getSound(padId);
    if (!sound) {
      return { ok: false, code: "unknown-pad-id", message: "No audio profile is configured for this pad." };
    }

    try {
      const context = await getAudioContext();

      if (sound.kind === "demo-tone") {
        playDemoTone(context, sound);
        return { ok: true, padId, source: "demo" };
      }

      if (sound.kind === "sample") {
        const buffer = await getDecodedSample(context, sound.url);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(outputNode(context));
        source.start();
        return { ok: true, padId, source: "sample" };
      }

      return { ok: false, code: "unsupported-audio-source", message: "The audio profile type is not supported." };
    } catch (error) {
      return {
        ok: false,
        code: error?.code ?? "audio-playback-failed",
        message: error?.message ?? "Audio playback failed.",
      };
    }
  }

  async function close() {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = null;
      analyser = null;
      decodedSamples.clear();
      return;
    }
    try {
      await audioContext.close();
    } catch {
      // Cleanup failures must not escape into pad interaction handlers.
    } finally {
      audioContext = null;
      analyser = null;
      decodedSamples.clear();
    }
  }

  return Object.freeze({ triggerPad, getLevelReading, close });
}
