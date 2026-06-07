# HCS_TRACK_EDITOR_AND_PIANO_ROLL_V1

Adds the first production-backed composition surface for Harmonic Conductor Studio.

## Contract

`aiweb.hfield.track_editor_and_piano_roll.v1`

## User-facing behavior

- Paste/import a full `FieldScore` JSON or simple HCS score JSON.
- Load non-Ode presets: Glass Reader Arpeggio and Midnight Sonnet Seed.
- Click a virtual piano keyboard to write notes into a selected track and step.
- View real `music.tracks[*].notes` in a piano-roll grid and track lane editor.
- Play the deterministic studio mix and export audio.

## Boundary

This patch mutates only the current HCS score in the local Tauri runtime. It does not mutate Forge, perform an Identity Vault live write, export private identity, or change bundle custody semantics.
