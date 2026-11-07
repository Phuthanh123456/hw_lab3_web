import { createAudioEngine } from "./audio-engine.mjs";
import { attachDrumControls } from "./drum-controls.mjs";
import { attachHitFeedback } from "./hit-feedback.mjs";

let audioEngine = null;
let drumControls = null;
let hitFeedback = null;

function mountDrumKit() {
  if (drumControls) return;
  audioEngine = createAudioEngine();
  hitFeedback = attachHitFeedback({ root: document, audioEngine });
  drumControls = attachDrumControls({
    root: document,
    keyTarget: window,
    audioEngine,
    onHit: hitFeedback.recordHit,
  });
}

function disposeDrumKit() {
  if (!drumControls) return;
  drumControls.destroy();
  hitFeedback.destroy();
  drumControls = null;
  hitFeedback = null;
  void audioEngine.close();
  audioEngine = null;
}

window.addEventListener("pagehide", disposeDrumKit);
window.addEventListener("pageshow", mountDrumKit);
mountDrumKit();
