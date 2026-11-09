import test from "node:test";
import assert from "node:assert/strict";
import { calculateRemainingMs, createPubgAirdropClock } from "./pubg-airdrop-clock.mjs";

function makeEnvironment(startTime = 1000) {
  let now = startTime;
  let nextId = 1;
  const frames = new Map();
  const cancelled = [];
  const listeners = new Set();
  const documentRef = {
    visibilityState: "visible",
    addEventListener(type, listener) { if (type === "visibilitychange") listeners.add(listener); },
    removeEventListener(type, listener) { if (type === "visibilitychange") listeners.delete(listener); },
    dispatchVisibility() { for (const listener of [...listeners]) listener(); },
  };
  return {
    documentRef,
    frames,
    cancelled,
    listeners,
    setNow(value) { now = value; },
    now: () => now,
    requestFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
    cancelFrame(id) { cancelled.push(id); frames.delete(id); },
    flushFrame() {
      const entry = frames.entries().next().value;
      if (!entry) return false;
      const [id, callback] = entry;
      frames.delete(id);
      callback(now);
      return true;
    },
  };
}

test("calculates from epoch and clamps past targets without negative remaining time", () => {
  assert.equal(calculateRemainingMs(900, 0, 1000), 0);
  assert.equal(calculateRemainingMs(1500, 0, 1000), 500);
  assert.equal(calculateRemainingMs(1500, 250, 1000), 250);
});

test("a delayed frame uses current epoch instead of decrementing by one tick", () => {
  const env = makeEnvironment();
  const values = [];
  const clock = createPubgAirdropClock({
    targetEpochMs: 5000,
    now: env.now,
    documentRef: env.documentRef,
    requestFrame: env.requestFrame,
    cancelFrame: env.cancelFrame,
  });
  const cleanup = clock.start((value) => values.push(value));
  assert.equal(values.at(-1), 4000);
  env.setNow(3500); // Simulate a long scheduling delay.
  env.flushFrame();
  assert.equal(values.at(-1), 1500);
  cleanup();
});

test("visibility resume resyncs immediately after a long background period", () => {
  const env = makeEnvironment();
  const values = [];
  const clock = createPubgAirdropClock({
    targetEpochMs: 5000,
    now: env.now,
    documentRef: env.documentRef,
    requestFrame: env.requestFrame,
    cancelFrame: env.cancelFrame,
  });
  const cleanup = clock.start((value) => values.push(value));
  env.documentRef.visibilityState = "hidden";
  env.documentRef.dispatchVisibility();
  assert.equal(env.frames.size, 0);
  env.setNow(7000);
  env.documentRef.visibilityState = "visible";
  env.documentRef.dispatchVisibility();
  assert.equal(values.at(-1), 0);
  assert.equal(env.frames.size, 0);
  cleanup();
});

test("offset changes are used in a fresh clock; cleanup removes listener and pending frame", () => {
  const env = makeEnvironment();
  const firstValues = [];
  const firstClock = createPubgAirdropClock({
    targetEpochMs: 5000,
    serverOffsetMs: 0,
    now: env.now,
    documentRef: env.documentRef,
    requestFrame: env.requestFrame,
    cancelFrame: env.cancelFrame,
  });
  const firstCleanup = firstClock.start((value) => firstValues.push(value));
  assert.equal(firstValues.at(-1), 4000);
  firstCleanup();
  assert.equal(env.frames.size, 0);
  assert.equal(env.listeners.size, 0);

  const offsetValues = [];
  const offsetClock = createPubgAirdropClock({
    targetEpochMs: 5000,
    serverOffsetMs: 1500,
    now: env.now,
    documentRef: env.documentRef,
    requestFrame: env.requestFrame,
    cancelFrame: env.cancelFrame,
  });
  const cleanup = offsetClock.start((value) => offsetValues.push(value));
  assert.equal(offsetValues.at(-1), 2500);
  cleanup();
});

test("disposing on unmount cancels callbacks and prevents later updates", () => {
  const env = makeEnvironment();
  const values = [];
  const clock = createPubgAirdropClock({
    targetEpochMs: 5000,
    now: env.now,
    documentRef: env.documentRef,
    requestFrame: env.requestFrame,
    cancelFrame: env.cancelFrame,
  });
  const cleanup = clock.start((value) => values.push(value));
  const beforeDispose = values.length;
  cleanup();
  env.setNow(3000);
  env.documentRef.dispatchVisibility();
  env.flushFrame();
  assert.equal(values.length, beforeDispose);
  assert.equal(env.frames.size, 0);
  assert.equal(env.listeners.size, 0);
});
