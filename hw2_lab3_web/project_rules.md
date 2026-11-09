# Project Rules — Homework 2: 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

These rules are scoped to Homework 2 and are based on the HW2 specification images described in this conversation and the files currently present in this project. The root `project_rules.md` and `TASK_DECOMPOSITION.md` belong to Homework 1 and must remain unchanged.

## Scope and project structure

- Keep all Homework 2 source, configuration, assets, tests, and HW2-specific documentation inside `hw2_lab3_web/`.
- Do not modify, move, merge, or commit changes to Homework 1 or Homework 3 as part of this homework.
- Do not open, read, extract, or search PDF files.
- If a Legacy HW2 source is found, preserve its established stack and structure. The `React.memo` requirement establishes that the piano rendering uses React. When Legacy source/configuration is absent, choose only the minimal setup needed to make the specified HW2 app runnable, document that as a new HW2 decision, and do not present it as the recovered Legacy stack.
- If Legacy source is absent, continue with requirements established by the HW2 specification. Do not claim the implementation reproduces Legacy styling, sound, or interactions without source evidence.
- Work through `TASK_DECOMPOSITION.md` in dependency order; settle shared data and audio contracts before implementing dependent components. Do not generate the entire app in one pass.

## Piano model, rendering, and voices

- Generate the piano range A0 through C8 algorithmically: 88 keys total, 52 white and 36 black. Do not hard-code 88 separate key elements.
- Calculate note frequency with `f = 440 * 2^((midi - 69) / 12)`.
- Use `React.memo` so activating one piano key only rerenders the related key; verify this with actual render instrumentation or React DevTools when available. Never invent or imply React DevTools Profiler evidence.
- Follow the supplied key component contract: pass `midi`, `noteName`, `isBlack`, `isPressed`, `onNoteOn`, and `onNoteOff` to a memoized semantic button; pointer down/up invoke the matching note callbacks. Clear active pointer state on pointer cancellation/leave or focus loss.
- Track active Web Audio voices with an ES6 `Map`, preserve FIFO activation order, and retrieve/retire the oldest voice in O(1) without scanning or sorting all voices.
- Key the voice map by MIDI as shown in the supplied engine contract. A repeated `noteOn` for a MIDI already active is a safe no-op; a `noteOff` for an inactive MIDI is also a safe no-op.
- Keep at most eight voices active. When a ninth voice is requested, stop/retire the oldest voice first.
- Apply a gain envelope that ramps down before stopping its oscillator to reduce audible clicks.

## Sequencer and cleanup

- Record notes in FIFO order using entries with `{ midi, freqHz, durationMs, deltaMs }`.
- Support playback at 0.5x, 1x, and 2x. Define and test how speed scales recorded timing/duration before implementation, consistently with the specification.
- Stop and component unmount must cancel pending sequence playback and stop/disconnect active oscillators/voices so no scheduled audio continues afterward.
- Use an `AbortController` (or the source-verified equivalent required by the supplied architecture) to cancel asynchronous sequence playback on Stop and unmount.

## Verification and reporting

- Turn each requirement into an observable check in the WBS. Distinguish specification-derived behavior from details still awaiting Legacy-source verification.
- Report only tests, render counts, profiling results, and audio behavior that were actually observed. If a tool is unavailable, record that limitation instead of claiming a result.
- Do not add packages or choose build/test tooling until the existing HW2 setup has been inspected and the need is established.

## Established HW2 implementation setup

- The initial HW2 survey found no application source, package manifest, entry point, or build/test setup. Because the supplied specification requires React.memo and the homework must run as an application, this folder now uses a minimal React 19 + Vite setup with Node built-in tests. This choice is local to HW2 and is not evidence of the absent Legacy stack.
- Keep generated `dist/` and installed `node_modules/` out of source control. Avoid adding further dependencies unless an implementation or verification need requires them.
