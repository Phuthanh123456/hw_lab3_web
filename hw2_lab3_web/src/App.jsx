import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPolyphonicAudioEngine, DEMO_AUDIO_LABEL } from "../audio-engine.mjs";
import { generatePianoKeys } from "../piano-model.mjs";
import { createSequencerControls } from "../sequencer-controls.mjs";
import { createFifoSequencer } from "../sequencer.mjs";
import PianoKey from "./PianoKey.jsx";

const PIANO_KEYS = generatePianoKeys();
const SequencerControls = createSequencerControls(React);
const UNAVAILABLE_SEQUENCER = {
  startRecording() {},
  stopRecording() {},
  play() {},
  stopSequence() {},
};

function formatMilliseconds(value) {
  return `${Math.round(value)} ms`;
}

export default function App() {
  const [pressedMidis, setPressedMidis] = useState(() => new Set());
  const [sequenceView, setSequenceView] = useState({ recording: false, playing: false, sequence: [] });
  const [speed, setSpeed] = useState(1);
  const [sequencerReady, setSequencerReady] = useState(false);
  const sequencerRef = useRef(null);
  const audioEngineRef = useRef(null);
  const activeSourcesRef = useRef(new Map());

  useEffect(() => {
    const audioEngine = createPolyphonicAudioEngine();
    const sequencer = createFifoSequencer({
      audioEngine,
      onChange: setSequenceView,
    });
    audioEngineRef.current = audioEngine;
    sequencerRef.current = sequencer;
    setSequencerReady(true);

    return () => {
      if (sequencerRef.current === sequencer) sequencerRef.current = null;
      if (audioEngineRef.current === audioEngine) audioEngineRef.current = null;
      activeSourcesRef.current.clear();
      sequencer.destroy();
      void audioEngine.close();
    };
  }, []);

  const handleNoteOn = useCallback((midi, source) => {
    let sources = activeSourcesRef.current.get(midi);
    if (!sources) {
      sources = new Set();
      activeSourcesRef.current.set(midi, sources);
    }
    if (sources.has(source)) return;

    const wasActive = sources.size > 0;
    sources.add(source);
    if (!wasActive) {
      setPressedMidis((current) => new Set(current).add(midi));
      void sequencerRef.current?.noteOn(midi);
    }
  }, []);

  const handleNoteOff = useCallback((midi, source) => {
    const sources = activeSourcesRef.current.get(midi);
    if (!sources?.delete(source)) return;
    if (sources.size > 0) return;

    activeSourcesRef.current.delete(midi);
    setPressedMidis((current) => {
      if (!current.has(midi)) return current;
      const next = new Set(current);
      next.delete(midi);
      return next;
    });
    sequencerRef.current?.noteOff(midi);
  }, []);

  const handleSpeedChange = useCallback((nextSpeed) => setSpeed(nextSpeed), []);
  const statusText = sequenceView.recording
    ? "Recording notes"
    : sequenceView.playing
      ? "Playing sequence"
      : sequenceView.sequence.length > 0
        ? `${sequenceView.sequence.length} notes ready`
        : "No sequence recorded";

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <p className="eyebrow">HOMEWORK 2 <span>•</span> POLYPHONIC WORKSTATION</p>
        <h1>88-Key Piano <span>&amp; FIFO Sequencer</span></h1>
        <p className="intro-copy">Play across the full A0–C8 range, record overlapping notes, and replay your sequence at a chosen speed.</p>
      </header>

      <section className="panel piano-panel" aria-labelledby="piano-heading">
        <div className="panel-heading">
          <div>
            <p className="section-index">01 <span>/</span> INSTRUMENT</p>
            <h2 id="piano-heading">88-key piano</h2>
          </div>
          <p className="range-label">A0 <span>—</span> C8 <span className="range-divider">·</span> 52 white / 36 black</p>
        </div>

        <div className="keyboard-scroll" aria-label="Scrollable piano keyboard">
          <div className="piano-board" role="group" aria-label="88-key piano from A0 to C8">
            {PIANO_KEYS.map((key) => (
              <PianoKey
                key={key.midi}
                midi={key.midi}
                noteName={key.noteName}
                isBlack={key.isBlack}
                isPressed={pressedMidis.has(key.midi)}
                whiteIndex={key.whiteIndex}
                whiteBefore={key.whiteBefore}
                onNoteOn={handleNoteOn}
                onNoteOff={handleNoteOff}
              />
            ))}
          </div>
        </div>
        <div className="keyboard-footer">
          <span>Use pointer, touch, or focus a key and press Space/Enter.</span>
          <span>Scroll horizontally to reach the full range.</span>
        </div>
      </section>

      <section className="panel sequencer-panel" aria-labelledby="sequencer-heading">
        <div className="panel-heading sequencer-heading">
          <div>
            <p className="section-index">02 <span>/</span> SEQUENCER</p>
            <h2 id="sequencer-heading">Record &amp; replay</h2>
          </div>
          <p className={`sequence-status ${sequenceView.recording ? "is-recording" : ""} ${sequenceView.playing ? "is-playing" : ""}`} role="status">
            <span className="status-dot" aria-hidden="true" />
            {statusText}
          </p>
        </div>

        <SequencerControls
          sequencer={sequencerRef.current ?? UNAVAILABLE_SEQUENCER}
          recording={sequenceView.recording}
          playing={sequenceView.playing}
          sequenceLength={sequenceView.sequence.length}
          speed={speed}
          ready={sequencerReady}
          onSpeedChange={handleSpeedChange}
        />

        <div className="sequence-details" aria-label="Recorded sequence">
          <div className="sequence-details-heading">
            <h3>Sequence events</h3>
            <span>{sequenceView.sequence.length} / FIFO</span>
          </div>
          {sequenceView.sequence.length === 0 ? (
            <p className="sequence-empty">Press Record, play a few notes, then stop recording to create a sequence.</p>
          ) : (
            <ol className="sequence-list">
              {sequenceView.sequence.map((event, index) => (
                <li key={`${event.midi}-${index}`}>
                  <span className="event-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="event-note">{PIANO_KEYS[event.midi - 21]?.noteName}</span>
                  <span className="event-timing">Hold {formatMilliseconds(event.durationMs)}</span>
                  <span className="event-timing">Gap {formatMilliseconds(event.deltaMs)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <footer className="studio-footer">
        <span>{DEMO_AUDIO_LABEL}</span>
        <span>Voice pool: max 8 · oldest voice released first</span>
      </footer>
    </main>
  );
}
