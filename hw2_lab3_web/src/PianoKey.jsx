import React, { memo, useRef } from "react";

function PianoKey({
  midi,
  noteName,
  isBlack,
  isPressed,
  whiteIndex,
  whiteBefore,
  onNoteOn,
  onNoteOff,
}) {
  if (import.meta.env.DEV) {
    const counts = (window.__hw2PianoKeyRenderCounts ??= Object.create(null));
    counts[midi] = (counts[midi] ?? 0) + 1;
  }
  const heldSources = useRef(new Set());

  function press(source) {
    if (heldSources.current.has(source)) return;
    heldSources.current.add(source);
    onNoteOn(midi, source);
  }

  function release(source) {
    if (!heldSources.current.delete(source)) return;
    onNoteOff(midi, source);
  }

  function releaseAll() {
    for (const source of [...heldSources.current]) release(source);
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    const source = `pointer:${event.pointerId}`;
    press(source);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail when the browser has already cancelled the pointer.
    }
  }

  function handlePointerEnd(event) {
    release(`pointer:${event.pointerId}`);
  }

  function handleKeyDown(event) {
    if (event.repeat || (event.code !== "Space" && event.code !== "Enter")) return;
    event.preventDefault();
    press(`keyboard:${event.code}`);
  }

  function handleKeyUp(event) {
    if (event.code === "Space" || event.code === "Enter") release(`keyboard:${event.code}`);
  }

  const style = isBlack ? { "--white-before": whiteBefore } : { "--white-index": whiteIndex };

  return (
    <button
      type="button"
      data-midi={midi}
      className={`piano-key ${isBlack ? "piano-key--black" : "piano-key--white"}`}
      style={style}
      aria-label={`${noteName} ${isBlack ? "black" : "white"} piano key`}
      aria-pressed={isPressed}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={releaseAll}
    >
      <span className="piano-key-label" aria-hidden="true">{noteName}</span>
      {isPressed && <span className="pressed-indicator" aria-hidden="true" />}
    </button>
  );
}

export default memo(PianoKey);
