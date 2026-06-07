# HCS_GLASS_READER_AIR_WAVEFORM_PIEZO_TICKER_V1

This patch corrects the Glass Reader production view after the full-system demo song exposed that the stage still looked like a ground-based debug scene.

Production mode becomes an air waveform chamber:

- true waveform sound bodies float in space;
- the floor/grid and full cymatic surface are hidden from Production mode;
- pitch/frequency color is applied directly to each waveform body;
- selected and important notes expose note-name/frequency labels;
- the moving glass reader plane is the timing ticker;
- when the ticker intersects an active waveform body, PMUT/piezoelectric-style cymatic rings bloom on the glass plane;
- raw carrier paths, field traces, ground grid, and debug overlays remain in Inspect mode only.

The score remains the source of truth. This patch changes visualization composition only.
