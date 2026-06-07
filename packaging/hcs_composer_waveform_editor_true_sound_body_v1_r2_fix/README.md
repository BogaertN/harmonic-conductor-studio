# HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1_R2_FIX

This is a narrow repair packet for the failed R1 installer run.

The previous installer successfully applied source files but failed during `cargo test --workspace` because `FieldScore` stores tempo and meter under `music`, not at the score root:

- `guard.tempo_bpm` must be `guard.music.tempo_bpm`
- `guard.meter` must be `guard.music.meter`

This packet does not replace the whole patch. It repairs the partially applied working tree, runs the full Forge-style gates, installs a packaging manifest into the app, and commits the completed `HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1` work.
