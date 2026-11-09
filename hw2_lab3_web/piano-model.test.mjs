import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePianoKeys,
  isBlackMidi,
  midiToFrequency,
  midiToNoteName,
  PIANO_RANGE,
} from "./piano-model.mjs";

test("generates the inclusive A0-C8 MIDI range in ascending order", () => {
  const keys = generatePianoKeys();

  assert.equal(keys.length, 88);
  assert.equal(keys[0].midi, 21);
  assert.equal(keys[0].noteName, "A0");
  assert.equal(keys.at(-1).midi, 108);
  assert.equal(keys.at(-1).noteName, "C8");
  assert.deepEqual(keys.map((key) => key.midi), Array.from({ length: 88 }, (_, i) => i + 21));
  assert.deepEqual(keys.filter((key) => !key.isBlack).map((key) => key.whiteIndex), Array.from({ length: 52 }, (_, i) => i));
  assert.ok(keys.filter((key) => key.isBlack).every((key) => key.whiteBefore > 0 && key.whiteBefore < 52));
});

test("algorithmically classifies 52 white and 36 black keys", () => {
  const keys = generatePianoKeys();
  const blackCount = keys.filter((key) => key.isBlack).length;

  assert.equal(blackCount, PIANO_RANGE.blackKeyCount);
  assert.equal(keys.length - blackCount, PIANO_RANGE.whiteKeyCount);
  assert.equal(isBlackMidi(21), false); // A0
  assert.equal(isBlackMidi(22), true); // A#0
});

test("converts MIDI pitches to note names and equal-tempered frequencies", () => {
  assert.equal(midiToNoteName(21), "A0");
  assert.equal(midiToNoteName(69), "A4");
  assert.equal(midiToNoteName(108), "C8");
  assert.equal(midiToFrequency(69), 440);
  assert.ok(Math.abs(midiToFrequency(21) - 27.5) < 1e-10);
  assert.ok(Math.abs(midiToFrequency(108) - 4186.009044809578) < 1e-9);
});

test("rejects invalid MIDI values", () => {
  for (const midi of [-1, 128, 1.5, NaN]) {
    assert.throws(() => midiToFrequency(midi), RangeError);
    assert.throws(() => midiToNoteName(midi), RangeError);
  }
});
