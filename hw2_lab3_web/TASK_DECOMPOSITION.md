# WBS — Homework 2: 88-Key Polyphonic Piano & Concurrent FIFO Sequencer

## Scope and survey

Homework 2 is isolated in `hw2_lab3_web/`. Its specification is the two HW2 images provided in this conversation and the existing project files. Do not use PDF files, edit the root HW1 documents, or modify Homework 1 or Homework 3.

- Survey date: 2026-11-09.
- Repository root: `D:\PhuThanh\Code\hw_lab3_web`; branch `main`; remote `origin` points to `https://github.com/Phuthanh123456/hw_lab3_web.git`.
- Git status at survey: `main` tracks `origin/main`; the root HW1 files `project_rules.md` and `TASK_DECOMPOSITION.md` are untracked locally. Do not stage or change them for HW2.
- At the initial survey, `hw2_lab3_web/` contained only the tracked placeholder `README.md` (“Reserved for Homework 2; source code has not been uploaded.”). No HW2 source, Legacy source, audio assets, package manifest/lockfile, build configuration, or tests are present there.
- The existing HW1 application is vanilla HTML/CSS/ES modules with Web Audio; it is a separate homework and is not evidence of the HW2 stack. The HW2 `React.memo` requirement establishes React rendering, but the React version, bundler, and test tooling remain unknown until HW2 Legacy source/configuration is supplied or otherwise present.
- No HW2 implementation or profiler test has been run. No React DevTools Profiler evidence exists at this stage.

## Requirements established by the HW2 specification

| Requirement | Evidence status | Legacy-source details still to verify |
|---|---|---|
| Generate A0 through C8 by algorithm: exactly 88 keys, 52 white and 36 black; do not hard-code 88 key elements. | Established by supplied HW2 specification. | Existing Legacy note-data representation and visual ordering, if source is present. |
| Calculate frequency as `f = 440 * 2^((midi - 69) / 12)`. | Established by supplied HW2 specification. | Any Legacy-specific tuning or formatting only if evidenced by source. |
| Maximum eight active Web Audio voices; on a ninth note, retire the oldest voice using FIFO. | Established by supplied HW2 specification. | Legacy oscillator/audio characteristics and voice lifecycle, if source exists. |
| Use `React.memo`; activating one key should rerender only the related key. Do not fabricate React DevTools Profiler results. | Established by supplied HW2 specification. | Existing component boundaries and available profiler/test setup. |
| Memoized `PianoKey` receives `midi`, `noteName`, `isBlack`, `isPressed`, `onNoteOn`, and `onNoteOff`; semantic button pointer down/up call noteOn/noteOff. | Established by supplied HW2 component example. | Any additional Legacy pointer/focus behavior not visible in the example. |
| Track active voices in an ES6 `Map`, retain FIFO order, and obtain the oldest voice in O(1). | Established by supplied HW2 specification. | No source-dependent mapping identified. |
| Voice Map is keyed by MIDI; repeated noteOn for an already-active MIDI is ignored; noteOff for inactive MIDI is safe. | Established by supplied HW2 engine example and task requirements. | Whether a Legacy version used different duplicate-note policy, if source appears. |
| Ramp gain down before stopping each oscillator to avoid a click. | Established by supplied HW2 specification. | Any Legacy envelope shape/timing, if specified in source. |
| Record FIFO sequence items shaped `{ midi, freqHz, durationMs, deltaMs }`; replay at 0.5x, 1x, and 2x. | Established by supplied HW2 specification. | Legacy sequence interaction details and exact speed/timing semantics, if source exists. |
| Stop/unmount cancels scheduled playback and stops active oscillators as required. | Established by supplied HW2 specification. | Existing lifecycle integration only if source is found. |
| Stop/unmount aborts pending asynchronous replay with `AbortController`. | Established by supplied HW2 architecture example. | Any Legacy cancellation edge cases, if source appears. |

Missing Legacy source does not block these specification-backed requirements. Do not invent Legacy note styling, sounds, controls, or timing details; mark any such details unverified until source evidence is available.

## Task order

### T01 — Survey HW2 project, source, configuration, and Git

- **Goal:** Identify HW2 files, stack, entry point, build/test commands, assets, Legacy source, and repository state without reading PDFs or changing other homework.
- **Dependencies:** None.
- **Expected files:** `hw2_lab3_web/TASK_DECOMPOSITION.md`; `hw2_lab3_web/project_rules.md`.
- **Acceptance criteria:** Record actual files, tools, and Git state; distinguish HW1’s sibling stack from HW2. If source/config is absent, state that and do not scaffold in this survey task.
- **Status (2026-11-09): COMPLETE.** The folder has only its tracked placeholder README; no HW2 app/config/assets/tests or Legacy source were found. Root HW1 documents remain unchanged and untracked. The React rendering requirement comes from the HW2 specification; no build system is inferred.

### T02 — Freeze piano, audio, FIFO, and sequencer contracts

- **Goal:** Define shared note, key, voice, and sequence data contracts before component/audio implementation.
- **Dependencies:** T01.
- **Expected files:** `hw2_lab3_web/TASK_DECOMPOSITION.md`; later consumers in the HW2 source tree.
- **Acceptance criteria:** Specify an algorithmic A0–C8 range with 88/52/36 counts; frequency formula; eight-voice limit and FIFO ninth-voice policy; ES6 `Map` and O(1) oldest retrieval; gain ramp-before-stop; sequence shape and FIFO order; speed factors 0.5x/1x/2x; and stop/unmount cancellation behavior. Keep source-dependent sound or presentation details marked unverified.
- **Status (2026-11-09): PARTIAL — specification-backed contracts are listed above; any details that depend on absent Legacy source remain unverified.** The images additionally establish the memoized key props and pointer handlers; voice Map key is MIDI, duplicate active `noteOn` is ignored, and Stop/unmount cancellation uses `AbortController`. Continue with established requirements; missing Legacy source does not block them.

### T03 — Build the algorithmic note model

- **Goal:** Generate piano note descriptors for A0 through C8 from MIDI/note rules and calculate each frequency using the required formula.
- **Dependencies:** T02.
- **Expected files:** `piano-model.mjs`, `piano-model.test.mjs` (Node built-in test runner; no package install needed).
- **Acceptance criteria:** Generated collection contains 88 unique ascending notes from A0 to C8, with 52 white and 36 black keys; source contains no manually enumerated set of 88 key elements; selected MIDI frequencies match the stated formula within a defined numeric tolerance.
- **Status (2026-11-09): COMPLETE.** `generatePianoKeys()` derives MIDI 21–108 from a loop, names notes, classifies black keys from pitch classes, and calculates `freqHz` with the specified formula. `node --test piano-model.test.mjs` passes 4 tests: 88 ascending entries/endpoints A0 and C8, 52/36 classification, formula samples (including A4=440 Hz), and invalid MIDI handling. No React render/profiler claim is part of T03.

### T04 — Implement memoized React piano rendering

- **Goal:** Render the generated note model through React components and limit updates with `React.memo`.
- **Dependencies:** T02, T03; confirm actual React setup before editing.
- **Expected files:** HW2 React components and styles in the existing or source-verified app structure.
- **Acceptance criteria:** Rendered key count/order/colors follow the note model and any verified source details. Each semantic key button has an accessible name and `aria-pressed`, receives `midi`, `noteName`, `isBlack`, `isPressed`, `onNoteOn`, and `onNoteOff`, and wires pointer down/up accordingly. Clear a held pointer note on pointer leave/cancel and focus loss. A single-key activation changes active state for the target key while unrelated key components do not rerender. Record actual render evidence using available instrumentation/React DevTools; if unavailable, state that and do not claim a Profiler result.

- **Status (2026-11-09): COMPLETE for rendered UI and interaction; React DevTools Profiler not used.** The HW2 folder had no app entry point or React runtime despite the supplied React component contract, so a minimal React 19 + Vite app was established in this folder; this is a new HW2 setup, not recovered Legacy configuration. src/App.jsx renders the generated model and memoized src/PianoKey.jsx semantic buttons with accessible names and synchronized aria-pressed. Browser checks at 1280px and 320px confirmed 88 buttons (52 white/36 black), A0/C8 endpoints, horizontally scrollable keyboard, no document horizontal overflow, and visible 3px focus outline. Pointer down/up toggled pressed state after React committed updates. Development render counters showed only the activated MIDI key rerendered; this is not a DevTools Profiler result. Build and 17 Node tests passed. Legacy layout remains unverified.
### T05 — Implement polyphonic Web Audio voice management

- **Goal:** Create and release note voices with a bounded FIFO policy and click-reducing gain envelope.
- **Dependencies:** T02, T03.
- **Expected files:** HW2 audio engine/module and tests under the established stack.
- **Acceptance criteria:** Never exceed eight active voices; a ninth releases the oldest active voice before the new note starts; active voices are indexed by MIDI in an ES6 `Map`; oldest lookup/retirement uses `voices.keys().next().value` in O(1) without scanning/sorting; duplicate active MIDI noteOn and stale noteOff are safe no-ops; gain automation is cancelled/rebased before ramping down and stopping the oscillator; unknown/unsupported audio setup fails safely. Do not claim Legacy sound reproduction without source evidence.
- **Status (2026-11-09): COMPLETE for the audio-engine scope requested.** `audio-engine.mjs` lazily initializes Web Audio, tracks voices in an insertion-ordered `Map` keyed by MIDI, ignores duplicate active noteOn, and safely ignores noteOff for inactive notes. At capacity eight, it reads the oldest MIDI via `keys().next().value`, ramps/release-stops that oscillator before starting the incoming voice. Frequency is calculated by `midiToFrequency`; a supplied mismatching value is rejected. Gain automation uses `cancelAndHoldAtTime` or a cancel/rebase fallback, then ramps down before scheduled oscillator stop. `noteOff` and `stopAll` cancel pending notes while AudioContext resume is unresolved. The default sound is explicitly labeled synthesized oscillator demo, not Legacy piano audio. `node --test piano-model.test.mjs audio-engine.test.mjs` passes 11 tests, covering voice cap/FIFO, duplicate and inactive-note handling, formula, envelope/stop ordering, unavailable/constructor/resume/playback errors, and cancellation during delayed resume. Tests use a fake AudioContext; physical audio output and Legacy sound remain unverified. The minimal React/Vite setup was added later as recorded under T04. React DevTools Profiler was not used.

### T06 — Record FIFO sequences and implement speed-controlled playback

- **Goal:** Record note events and replay them in sequence at the required three speed factors.
- **Dependencies:** T02, T03, T05.
- **Expected files:** HW2 sequencer module, controls/UI, and tests under the established stack.
- **Acceptance criteria:** Each entry has exactly the required `midi`, `freqHz`, `durationMs`, and `deltaMs` fields; insertion and playback preserve FIFO order; for speed `s`, both `deltaMs` and `durationMs` are divided by `s` (0.5x doubles elapsed time; 2x halves it); controls expose Record, Stop Recording, Play, Stop Sequence, and a 0.5x/1x/2x selector.
- **Status (2026-11-09): COMPLETE for recorder, playback core, and React-compatible control component.** `sequencer.mjs` records note starts in FIFO order, stores the exact four-field shape, computes `deltaMs` from the previous note start, and closes `durationMs` on noteOff or Stop Recording. Independent per-entry timers preserve overlapping note starts/ends. `scaleSequenceTime(ms, speed)` uses `ms / speed`. `sequencer-controls.mjs` creates Record, Stop Recording, Play, Stop Sequence buttons and the three-option speed selector; the component receives React's `createElement` function and is integrated by the React app recorded under T04. Node tests verify overlapping FIFO entries, duration finalization, exact event times at all speeds, button actions/disabled state and speed changes.

### T07 — Add deterministic stop, cancellation, and unmount cleanup

- **Goal:** Ensure stopped or unmounted playback cannot leave pending callbacks or oscillators running.
- **Dependencies:** T04, T05, T06.
- **Expected files:** HW2 audio/sequencer lifecycle modules and component cleanup.
- **Acceptance criteria:** Stop cancels all pending playback timers/scheduled events and stops active oscillators/voices; unmount invokes equivalent cleanup; repeated stop/unmount is safe; no callback can restart playback after cancellation. Abort every delay listener/timer and clear playback state after natural completion.
- **Status (2026-11-09): COMPLETE for app lifecycle wiring and sequencer cleanup.** src/App.jsx creates the engine/sequencer in an effect and on unmount calls sequencer.destroy() followed by audioEngine.close(). Destroy aborts pending replay, clears timers/listeners, stops voices and recording state, and is idempotent. Existing sequencer tests cover cancellation mid-play, no stale note after Stop, cleanup, natural completion, and consecutive replay. Browser checks exercised recording and natural replay/status updates. Physical audio output and an automated React-root unmount assertion were not independently measured.
### T08 — Verify piano counts, FIFO audio, memoization, sequencing, and lifecycle

- **Goal:** Run tests and runtime checks for each specification-backed requirement on the actual HW2 app.
- **Dependencies:** T03–T07.
- **Expected files:** Existing test files or tests added within `hw2_lab3_web/`; documented evidence in this WBS.
- **Acceptance criteria:** Verify 88/52/36 generation and endpoints; formula samples; eight concurrent voices and oldest-first ninth-note eviction; gain ramp before stop; FIFO entry shape/order and all three playback speeds; stop/unmount cleanup; and key-level rerender behavior. Use actual React DevTools Profiler evidence only if the tool is available. Record commands and environment; do not claim results for checks not performed.

- **Status (2026-11-09): PARTIAL, with implementation checks passing.** `npm test` passes 17/17 Node tests and `npm run build` passes with Vite 8.3.6. A running Vite app was inspected in headless Chrome through the DevTools Protocol: at 1280x900 and 320x720 the page reported 88 piano buttons, exactly 52 white and 36 black, A0/C8 endpoints, a horizontally scrollable keyboard, no document-level horizontal overflow, controls within the narrow viewport, and a visible 3px focus outline. Real CDP mouse press/release changed `aria-pressed` true/false. The development render counter changed for the activated key while an adjacent key count stayed unchanged. Browser sequence recording/replay UI was exercised; unit tests cover FIFO timing, 0.5x/1x/2x scaling, cancellation, natural completion, and consecutive replay. No Lighthouse or automated WCAG audit was run; no WCAG 2.2 AA, Lighthouse score, React DevTools Profiler, physical audio output, or Legacy sound/layout fidelity is claimed.
## Current delivery state

The initial survey found no HW2 source or configuration. T03 through T07 are implemented. index.html, src/main.jsx, src/App.jsx, src/PianoKey.jsx, and src/styles.css form the app, with a minimal React/Vite setup because a runnable React app was required and no existing stack was present. React and Vite are runtime/build dependencies; the built-in Node test runner is used without a test package. T08 browser/build/test verification is recorded above and remains limited to checks actually run. WCAG conformance, Lighthouse score, React DevTools Profiler evidence, physical audio output, and Legacy sound/layout fidelity are not claimed. Generated dist/ and installed node_modules/ are excluded through .gitignore. Keep all HW2 changes inside this folder and leave HW1/HW3 untouched.
