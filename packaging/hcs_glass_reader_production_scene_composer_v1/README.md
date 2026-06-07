# HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1

This patch supersedes the visually wrong result of `HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1` without deleting its data connectivity.

The previous patch correctly connected field, carrier, cymatic, waveform, manifest, and playhead reports into the Glass Reader, but it rendered the reports too literally. The visible result looked like stacked engineering/debug overlays. This patch composes those reports into a production scene:

- waveform lanes become continuous 3D sound bodies,
- conductor gestures become flowing motion fields,
- raw rails/traces/time slices move to Inspect mode,
- Production mode becomes the default reader state,
- camera presets expose Studio, Through Wave, Glass Plane, and Follow Active views.

No Forge core execution is authorized by this patch. No Identity Vault private data is exported. The renderer remains downstream of existing HCS/Rust reports.
