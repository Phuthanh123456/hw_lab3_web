const FIRST_PIANO_MIDI = 21;
const LAST_PIANO_MIDI = 108;

const PITCH_CLASS_NAMES = Object.freeze([
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
]);

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

function assertMidi(midi) {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new RangeError("MIDI note must be an integer between 0 and 127.");
  }
}

export function midiToNoteName(midi) {
  assertMidi(midi);
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PITCH_CLASS_NAMES[pitchClass]}${octave}`;
}

export function isBlackMidi(midi) {
  assertMidi(midi);
  return BLACK_PITCH_CLASSES.has(midi % 12);
}

export function midiToFrequency(midi) {
  assertMidi(midi);
  return 440 * 2 ** ((midi - 69) / 12);
}

export function generatePianoKeys() {
  const keys = [];
  let whiteKeyCount = 0;

  for (let midi = FIRST_PIANO_MIDI; midi <= LAST_PIANO_MIDI; midi += 1) {
    const isBlack = isBlackMidi(midi);
    keys.push(Object.freeze({
      midi,
      noteName: midiToNoteName(midi),
      isBlack,
      ...(isBlack ? { whiteBefore: whiteKeyCount } : { whiteIndex: whiteKeyCount++ }),
      freqHz: midiToFrequency(midi),
    }));
  }

  return Object.freeze(keys);
}

export const PIANO_RANGE = Object.freeze({
  firstMidi: FIRST_PIANO_MIDI,
  lastMidi: LAST_PIANO_MIDI,
  keyCount: LAST_PIANO_MIDI - FIRST_PIANO_MIDI + 1,
  whiteKeyCount: 52,
  blackKeyCount: 36,
});
