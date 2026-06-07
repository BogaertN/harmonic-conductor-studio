# HCS Instrument Rack and Track Sound v1

Contract: `aiweb.hfield.instrument_rack_and_track_sound.v1`

This patch adds a musician-facing instrument rack and track mixer layer.

Production scope:
- per-track instrument assignment
- starter instrument set
- actual Web Audio sound variety beyond flat tone preview
- track mute / solo / level controls
- source-backed note playback from `current_score.music.tracks[*].notes`
- frequency authority preserved through `aiweb.hfield.key_frequency_registry.v1`

Authority boundaries:
- HCS score notes remain source authority.
- Instrument profiles are downstream render configuration.
- Forge is not mutated.
- Identity Vault is not written.
- Bundle custody semantics are not changed.
- No LLM path is introduced.
