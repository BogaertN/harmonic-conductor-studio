# HCS_GLASS_READER_TICKER_REVEAL_AND_TRANSLUCENT_SKIN_V1

Production correction for the Glass Reader air waveform chamber.

This patch changes Production mode from always-visible waveform bodies to glass-ticker reveal behavior: waveform geometry remains hidden until the moving glass timing plane reaches the note segment. At crossing, a muted translucent frequency-colored skin appears, while the note/frequency readout remains gated to the glass event.

The harsh production wireframe layer is removed. Inspect mode remains the place for diagnostic/raw visualization.
