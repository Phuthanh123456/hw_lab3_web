/** Build the React control component without choosing an HW2 bundler/runtime here. */
export function createSequencerControls(React) {
  if (typeof React?.createElement !== "function") {
    throw new TypeError("A React-compatible createElement function is required.");
  }

  const createElement = React.createElement.bind(React);

  return function SequencerControls({
    sequencer,
    recording = false,
    playing = false,
    sequenceLength = 0,
    speed = 1,
    ready = true,
    onSpeedChange = () => {},
  }) {
    if (!sequencer) throw new TypeError("A sequencer instance is required.");

    return createElement(
      "section",
      { className: "sequence-controls", "aria-label": "Sequence controls" },
      createElement(
        "div",
        { className: "sequence-actions" },
        createElement("button", {
          type: "button",
          onClick: () => sequencer.startRecording(),
          disabled: !ready || recording || playing,
        }, "Record"),
        createElement("button", {
          type: "button",
          onClick: () => sequencer.stopRecording(),
          disabled: !ready || !recording,
        }, "Stop Recording"),
        createElement("button", {
          type: "button",
          onClick: () => { void sequencer.play(speed); },
          disabled: !ready || playing || sequenceLength === 0,
        }, "Play"),
        createElement("button", {
          type: "button",
          onClick: () => sequencer.stopSequence(),
          disabled: !ready || !playing,
        }, "Stop Sequence"),
      ),
      createElement(
        "label",
        { className: "sequence-speed" },
        "Playback speed",
        createElement(
          "select",
          {
            value: String(speed),
            disabled: !ready,
            onChange: (event) => onSpeedChange(Number(event.currentTarget.value)),
          },
          createElement("option", { value: "0.5" }, "0.5× (half speed)"),
          createElement("option", { value: "1" }, "1× (normal speed)"),
          createElement("option", { value: "2" }, "2× (double speed)"),
        ),
      ),
    );
  };
}
