import assert from "node:assert/strict";
import test from "node:test";

import {
  createPolyphonicAudioEngine,
  DEMO_AUDIO_LABEL,
  MAX_VOICES,
} from "./audio-engine.mjs";

class FakeAudioParam {
  constructor(events) {
    this.events = events;
    this.value = 0;
  }

  cancelScheduledValues(time) {
    this.events.push(["cancel", time]);
  }

  setValueAtTime(value, time) {
    this.value = value;
    this.events.push(["set", value, time]);
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(["exponential-ramp", value, time]);
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(["linear-ramp", value, time]);
  }
}

class FakeOscillator {
  constructor(context) {
    this.context = context;
    this.frequency = new FakeAudioParam(context.events);
    this.events = context.events;
    this.onended = null;
    this.started = false;
    this.stopped = false;
  }

  connect() {}
  disconnect() {}

  start(time) {
    if (this.context.throwOnStart) throw new Error("start failed");
    this.started = true;
    this.events.push(["start", time, this]);
  }

  stop(time) {
    if (this.stopped) throw new Error("already stopped");
    this.stopped = true;
    this.events.push(["stop", time, this]);
  }
}

class FakeAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 10;
    this.destination = {};
    this.events = [];
    this.oscillators = [];
    FakeAudioContext.latest = this;
  }

  createOscillator() {
    const oscillator = new FakeOscillator(this);
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return { gain: new FakeAudioParam(this.events), connect() {}, disconnect() {} };
  }

  async resume() {
    if (this.throwOnResume) throw new Error("resume failed");
    this.state = "running";
  }

  async close() {
    this.state = "closed";
  }
}

test("keeps at most eight voices and steals the FIFO-oldest voice before starting the ninth", async () => {
  const engine = createPolyphonicAudioEngine({ AudioContextClass: FakeAudioContext });

  for (let midi = 21; midi <= 28; midi += 1) {
    assert.equal((await engine.noteOn(midi)).ok, true);
  }
  assert.equal(engine.activeVoiceCount, MAX_VOICES);
  assert.equal(engine.getOldestActiveMidi(), 21);

  const context = FakeAudioContext.latest;
  const result = await engine.noteOn(29);

  assert.equal(result.ok, true);
  assert.equal(context.oscillators[0].stopped, true);
  assert.ok(context.events.findIndex((event) => event[0] === "stop")
    < context.events.findLastIndex((event) => event[0] === "start"));
  assert.equal(engine.activeVoiceCount, 8);
  assert.deepEqual(engine.getActiveMidis(), [22, 23, 24, 25, 26, 27, 28, 29]);
  assert.equal(engine.getOldestActiveMidi(), 22);
  assert.match(DEMO_AUDIO_LABEL, /demo.*not Legacy/i);
  await engine.close();
});

test("same-MIDI noteOn and noteOff for an inactive MIDI are safe no-ops", async () => {
  const engine = createPolyphonicAudioEngine({ AudioContextClass: FakeAudioContext });
  const first = await engine.noteOn(69);
  const duplicate = await engine.noteOn(69);

  assert.equal(first.ok, true);
  assert.equal(duplicate.ignored, true);
  assert.equal(engine.activeVoiceCount, 1);
  assert.equal(FakeAudioContext.latest.oscillators.length, 1);

  const off = engine.noteOff(69);
  assert.deepEqual(off, { ok: true, midi: 69, released: true });
  assert.deepEqual(engine.noteOff(69), { ok: true, midi: 69, released: false, reason: "not-active" });
  assert.deepEqual(engine.noteOff(70), { ok: true, midi: 70, released: false, reason: "not-active" });
  assert.equal(engine.activeVoiceCount, 0);
  await engine.close();
});

test("uses the MIDI frequency formula and rejects a mismatched supplied frequency", async () => {
  const engine = createPolyphonicAudioEngine({ AudioContextClass: FakeAudioContext });
  const result = await engine.noteOn(69);

  assert.equal(result.freqHz, 440);
  assert.equal(FakeAudioContext.latest.oscillators[0].frequency.value, 440);
  assert.deepEqual(await engine.noteOn(70, 440), {
    ok: false,
    code: "frequency-mismatch",
    message: "Frequency must follow the equal-tempered MIDI formula.",
  });
  assert.equal(engine.activeVoiceCount, 1);
  await engine.close();
});

test("cancels/rebases gain automation, ramps down, then schedules oscillator stop", async () => {
  const engine = createPolyphonicAudioEngine({ AudioContextClass: FakeAudioContext });
  await engine.noteOn(60);
  const context = FakeAudioContext.latest;
  const voice = engine.noteOff(60);
  const gainEvents = context.events.filter((event) => ["cancel", "set", "linear-ramp"].includes(event[0]));

  assert.equal(voice.released, true);
  assert.deepEqual(gainEvents.slice(-3).map((event) => event[0]), ["cancel", "set", "linear-ramp"]);
  assert.deepEqual(context.events.filter((event) => event[0] === "stop").at(-1).slice(0, 2), ["stop", 10.04]);
  await engine.close();
});

test("reports unavailable and initialization failures without throwing", async () => {
  const unavailable = createPolyphonicAudioEngine({ AudioContextClass: null });
  assert.equal((await unavailable.noteOn(60)).code, "audio-unavailable");

  class ThrowingContext {
    constructor() {
      throw new Error("constructor failed");
    }
  }
  const initializationFailure = createPolyphonicAudioEngine({ AudioContextClass: ThrowingContext });
  assert.equal((await initializationFailure.noteOn(60)).code, "audio-initialization-failed");

  class ResumeFailureContext extends FakeAudioContext {
    constructor() {
      super();
      this.state = "suspended";
      this.throwOnResume = true;
    }
  }
  const resumeFailure = createPolyphonicAudioEngine({ AudioContextClass: ResumeFailureContext });
  assert.equal((await resumeFailure.noteOn(60)).code, "audio-initialization-failed");
});

test("contains oscillator playback errors and leaves no active voice", async () => {
  class PlaybackFailureContext extends FakeAudioContext {
    constructor() {
      super();
      this.throwOnStart = true;
    }
  }
  const engine = createPolyphonicAudioEngine({ AudioContextClass: PlaybackFailureContext });

  assert.equal((await engine.noteOn(60)).code, "audio-playback-failed");
  assert.equal(engine.activeVoiceCount, 0);
  await engine.close();
});

test("noteOff and stopAll cancel notes waiting for AudioContext resume", async () => {
  let resumeContext;
  class DeferredResumeContext extends FakeAudioContext {
    constructor() {
      super();
      this.state = "suspended";
      resumeContext = this;
    }

    resume() {
      return new Promise((resolve) => {
        this.finishResume = () => {
          this.state = "running";
          resolve();
        };
      });
    }
  }

  const noteOffEngine = createPolyphonicAudioEngine({ AudioContextClass: DeferredResumeContext });
  const noteOnPending = noteOffEngine.noteOn(69);
  await Promise.resolve();
  assert.deepEqual(noteOffEngine.noteOff(69), { ok: true, midi: 69, released: true, pending: true });
  resumeContext.finishResume();
  assert.equal((await noteOnPending).reason, "cancelled-before-start");
  assert.equal(resumeContext.oscillators.length, 0);
  assert.equal(noteOffEngine.activeVoiceCount, 0);

  const stopAllEngine = createPolyphonicAudioEngine({ AudioContextClass: DeferredResumeContext });
  const stoppedPending = stopAllEngine.noteOn(70);
  await Promise.resolve();
  stopAllEngine.stopAll();
  resumeContext.finishResume();
  assert.equal((await stoppedPending).reason, "cancelled-before-start");
  assert.equal(resumeContext.oscillators.length, 0);
  assert.equal(stopAllEngine.activeVoiceCount, 0);
});
