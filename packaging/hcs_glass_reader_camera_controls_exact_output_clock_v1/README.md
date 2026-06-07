# HCS_GLASS_READER_CAMERA_CONTROLS_EXACT_OUTPUT_CLOCK_V1

Production correction for the Glass Reader after cumulative reveal history.

This patch fixes two visible issues:

1. The Glass Reader controls were still old dev-orbit controls with too many buttons and unstable floating behavior.
2. The glass timing plane could feel offset from the real audio output because the renderer still allowed client-side motion timing to race against the native audio clock.

Changes:

- Consolidates Glass Reader controls into Read, Ticker, Inspect, Free, Reset View, Play, Stop, Refresh.
- Makes Read the stable production mode.
- Makes Ticker frame the glass timing plane.
- Makes Inspect the explicit diagnostic/debug mode.
- Makes Free the only loose orbit mode.
- Adds tighter OrbitControls constraints, no damping drift, bounded pan/rotate/zoom outside Free mode.
- Passes the native playback clock time into the Glass Reader renderer as the authoritative scan time whenever audio playback is active.
- Stops the client requestAnimationFrame motion clock from racing the native playback clock while audio is playing.
- Raises playback clock polling cadence to 20 ms and playhead refresh threshold to 12 ms for tighter glass/output alignment.

Lock rule:
Do not call this patch locked until the proof passes and the screen confirms stable controls plus glass timing aligned to actual output.
