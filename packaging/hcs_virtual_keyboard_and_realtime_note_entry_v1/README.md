# HCS Virtual Keyboard and Realtime Note Entry v1

Contract: `aiweb.hfield.virtual_keyboard_and_realtime_note_entry.v1`

This patch converts the virtual keyboard from a visual note writer into a real-time composition input surface.

## Production behavior

- Mouse click can preview the canonical key frequency.
- Mouse click can insert the note into `current_score.music.tracks[*].notes` through `set_hcs_piano_roll_note_v1`.
- Optional computer keyboard mapping supports QWERTY note entry.
- Step position can auto-advance after note entry.
- Entry mode supports play+insert, play-only, and insert-only.
- Piano roll, track lanes, notation layout, playhead, and field reports refresh from the same score state.
- Frequency provenance is inherited from `aiweb.hfield.key_frequency_registry.v1`.

## Authority boundaries

- Does not mutate Forge.
- Does not write Identity Vault.
- Does not export private identity.
- Does not change bundle custody semantics.
- Does not use an LLM.
