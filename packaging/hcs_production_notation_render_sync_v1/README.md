# HCS Production Notation Render Sync v1

Contract: `aiweb.hfield.production_notation_render_sync.v1`

This patch adds a real notation rendering surface generated from the same score note data used by the piano roll, virtual keyboard, deterministic audio engine, and Glass Reader field.

Rules:
- No fake staff state.
- No notation shadow-copy.
- Notes render from `current_score.music.tracks[*].notes`.
- Keyboard and piano-roll writes must update notation by refreshing the same score report.
- Frequency labels remain under `aiweb.hfield.key_frequency_registry.v1`.
- No Forge mutation.
- No Identity Vault live write.
