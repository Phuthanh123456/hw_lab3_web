import assert from "node:assert/strict";
import test from "node:test";

import { createSequencerControls } from "./sequencer-controls.mjs";
import { createFifoSequencer, PLAYBACK_SPEEDS, scaleSequenceTime } from "./sequencer.mjs";
import { midiToFrequency } from "./piano-model.mjs";

class FakeClock {
  currentTime = 0;
  nextId = 0;
  timers = new Map();

  now = () => this.currentTime;

  setTimer = (callback, delay) => {
    const id = ++this.nextId;
    this.timers.set(id, { id, dueAt: this.currentTime + Math.max(0, delay), callback });
    return id;
  };

  clearTimer = (id) => this.timers.delete(id);

  async flushMicrotasks() {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  }

  async advanceBy(milliseconds) {
    const target = this.currentTime + milliseconds;
    while (true) {
      const next = [...this.timers.values()]
        .filter((timer) => timer.dueAt <= target)
        .sort((left, right) => left.dueAt - right.dueAt || left.id - right.id)[0];
      if (!next) break;
      this.timers.delete(next.id);
      this.currentTime = next.dueAt;
      next.callback();
      await this.flushMicrotasks();
    }
    this.currentTime = target;
    await this.flushMicrotasks();
  }

  get pendingTimerCount() {
    return this.timers.size;
  }
}

class TrackingSignal {
  aborted = false;
  listeners = new Set();

  addEventListener(type, callback) {
    if (type === "abort") this.listeners.add(callback);
  }

  removeEventListener(type, callback) {
    if (type === "abort") this.listeners.delete(callback);
  }

  dispatchAbort() {
    this.aborted = true;
    for (const callback of [...this.listeners]) callback();
  }
}

class TrackingAbortController {
  constructor() {
    this.signal = new TrackingSignal();
  }

  abort() {
    this.signal.dispatchAbort();
  }
}

function createFakeAudioEngine(now) {
  const events = [];
  const active = new Map();
  return {
    events,
    active,
    async noteOn(midi, freqHz) {
      if (active.has(midi)) return { ok: true, ignored: true };
      active.set(midi, { midi, freqHz });
      events.push({ type: "on", midi, freqHz, at: now() });
      return { ok: true, midi, freqHz };
    },
    noteOff(midi) {
      const existed = active.delete(midi);
      events.push({ type: "off", midi, at: now(), existed });
      return { ok: true, released: existed };
    },
    stopAll() {
      events.push({ type: "stopAll", at: now() });
      active.clear();
    },
  };
}

function makeSequencer(clock, options = {}) {
  const audioEngine = options.audioEngine ?? createFakeAudioEngine(clock.now);
  const controllers = [];
  class CapturingAbortController extends TrackingAbortController {
    constructor() {
      super();
      controllers.push(this);
    }
  }
  const sequencer = createFifoSequencer({
    audioEngine,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    AbortControllerClass: CapturingAbortController,
    onChange: options.onChange,
  });
  return { sequencer, audioEngine, controllers };
}

async function recordOverlappingPair(sequencer, clock) {
  sequencer.startRecording();
  await sequencer.noteOn(60);
  await clock.advanceBy(20);
  await sequencer.noteOn(64);
  await clock.advanceBy(30);
  sequencer.noteOff(60);
  await clock.advanceBy(70);
  sequencer.noteOff(64);
  sequencer.stopRecording();
}

test("records the exact FIFO entry shape and note-start deltas while notes overlap", async () => {
  const clock = new FakeClock();
  const { sequencer } = makeSequencer(clock);
  await recordOverlappingPair(sequencer, clock);

  const entries = sequencer.getSequence();
  assert.deepEqual(entries, [
    { midi: 60, freqHz: midiToFrequency(60), durationMs: 50, deltaMs: 0 },
    { midi: 64, freqHz: midiToFrequency(64), durationMs: 100, deltaMs: 20 },
  ]);
  assert.deepEqual(Object.keys(entries[0]), ["midi", "freqHz", "durationMs", "deltaMs"]);
});

test("stop recording finalizes held notes without changing FIFO event order", async () => {
  const clock = new FakeClock();
  const { sequencer } = makeSequencer(clock);
  sequencer.startRecording();
  await sequencer.noteOn(65);
  await clock.advanceBy(17);
  await sequencer.noteOn(67);
  await clock.advanceBy(23);
  sequencer.stopRecording();

  assert.deepEqual(sequencer.getSequence(), [
    { midi: 65, freqHz: midiToFrequency(65), durationMs: 40, deltaMs: 0 },
    { midi: 67, freqHz: midiToFrequency(67), durationMs: 23, deltaMs: 17 },
  ]);
  assert.equal(sequencer.isRecording, false);
});

test("scales event start deltas and note durations at 0.5x, 1x, and 2x", async () => {
  assert.deepEqual(PLAYBACK_SPEEDS, [0.5, 1, 2]);
  assert.equal(scaleSequenceTime(100, 0.5), 200);
  assert.equal(scaleSequenceTime(100, 1), 100);
  assert.equal(scaleSequenceTime(100, 2), 50);

  for (const [speed, expectedSecondStart, expectedFirstEnd, expectedSecondEnd] of [
    [0.5, 40, 100, 240],
    [1, 20, 50, 120],
    [2, 10, 25, 60],
  ]) {
    const clock = new FakeClock();
    const { sequencer, audioEngine, controllers } = makeSequencer(clock);
    await recordOverlappingPair(sequencer, clock);
    const playbackBase = clock.currentTime;
    const playbackEventIndex = audioEngine.events.length;
    const resultPromise = sequencer.play(speed);
    await clock.advanceBy(300);
    const result = await resultPromise;
    const events = audioEngine.events.slice(playbackEventIndex).filter((event) => event.type === "on" || event.type === "off");
    const starts = events.filter((event) => event.type === "on");
    const ends = events.filter((event) => event.type === "off");

    assert.deepEqual(result, { ok: true, cancelled: false, played: 2 });
    assert.deepEqual(starts.map((event) => event.at - playbackBase), [0, expectedSecondStart]);
    assert.deepEqual(ends.map((event) => event.at - playbackBase), [expectedFirstEnd, expectedSecondEnd]);
    assert.equal(sequencer.isPlaying, false);
    assert.equal(clock.pendingTimerCount, 0);
    assert.equal(controllers[0].signal.listeners.size, 0);
  }
});

test("Stop Sequence cancels pending starts and note-offs immediately and stops voices", async () => {
  const clock = new FakeClock();
  const { sequencer, audioEngine, controllers } = makeSequencer(clock);
  await recordOverlappingPair(sequencer, clock);
  const playbackStartCount = audioEngine.events.filter((event) => event.type === "on").length;
  const playback = sequencer.play(1);
  await clock.advanceBy(0);
  assert.equal(sequencer.isPlaying, true);
  assert.equal(audioEngine.active.size, 1);

  sequencer.stopSequence();
  assert.equal(sequencer.isPlaying, false);
  assert.equal(audioEngine.active.size, 0);
  assert.equal(clock.pendingTimerCount, 0);
  assert.equal(controllers[0].signal.listeners.size, 0);
  await clock.advanceBy(500);
  assert.equal((await playback).cancelled, true);
  assert.equal(audioEngine.events.filter((event) => event.type === "on").length - playbackStartCount, 1);
});

test("unmount aborts playback and repeated playback starts cleanly with no stale timers", async () => {
  const clock = new FakeClock();
  const { sequencer, audioEngine, controllers } = makeSequencer(clock);
  await recordOverlappingPair(sequencer, clock);

  const firstPlayback = sequencer.play(1);
  await clock.advanceBy(0);
  sequencer.destroy();
  assert.equal(sequencer.isPlaying, false);
  assert.equal(audioEngine.active.size, 0);
  assert.equal(clock.pendingTimerCount, 0);
  assert.equal(controllers[0].signal.listeners.size, 0);
  await clock.advanceBy(500);
  assert.equal((await firstPlayback).cancelled, true);
  assert.equal((await sequencer.play(1)).code, "sequencer-disposed");

  const replayClock = new FakeClock();
  const { sequencer: replaySequencer, audioEngine: replayAudio } = makeSequencer(replayClock);
  await recordOverlappingPair(replaySequencer, replayClock);
  const replayStartCount = replayAudio.events.filter((event) => event.type === "on").length;
  const first = replaySequencer.play(0.5);
  await replayClock.advanceBy(300);
  assert.equal((await first).cancelled, false);
  const second = replaySequencer.play(2);
  await replayClock.advanceBy(100);
  assert.equal((await second).cancelled, false);
  assert.equal(replaySequencer.isPlaying, false);
  assert.equal(replayClock.pendingTimerCount, 0);
  assert.equal(replayAudio.events.filter((event) => event.type === "on").length - replayStartCount, 4);
});

test("React-compatible controls expose recording, playback, Stop, and speed selection", () => {
  const React = {
    createElement(type, props, ...children) {
      return { type, props: props ?? {}, children };
    },
  };
  const actions = [];
  const sequencer = {
    startRecording: () => actions.push("record"),
    stopRecording: () => actions.push("stop-recording"),
    play: (speed) => actions.push(`play:${speed}`),
    stopSequence: () => actions.push("stop-sequence"),
  };
  let selectedSpeed;
  const Controls = createSequencerControls(React);
  const tree = Controls({
    sequencer,
    recording: true,
    playing: true,
    sequenceLength: 2,
    speed: 0.5,
    onSpeedChange: (speed) => { selectedSpeed = speed; },
  });
  const buttons = tree.children[0].children;

  assert.deepEqual(buttons.map((button) => button.children[0]), ["Record", "Stop Recording", "Play", "Stop Sequence"]);
  assert.equal(buttons[0].props.disabled, true);
  assert.equal(buttons[1].props.disabled, false);
  assert.equal(buttons[2].props.disabled, true);
  assert.equal(buttons[3].props.disabled, false);
  buttons[1].props.onClick();
  buttons[3].props.onClick();
  tree.children[1].children[1].props.onChange({ currentTarget: { value: "2" } });
  assert.deepEqual(actions, ["stop-recording", "stop-sequence"]);
  assert.equal(selectedSpeed, 2);
});
