# Patch Notes

This pass is a control and timing correction, not a new visual layer.

The Glass Reader is now treated as an instrument viewer:

- default view must be stable;
- manual orbit must be intentional;
- the glass plane must follow the real audio output clock, not a separate UI timer;
- button names must match the current reveal/ticker architecture, not old experimental scene labels.

The patch keeps the cumulative reveal behavior from the previous pass:

- future waveform hidden;
- active glass slice emphasized;
- past waveform remains visible as played history.

It changes how the user gets to that view and how the timing is driven.
