# HCS_KEY_FREQUENCY_REGISTRY_V1

Adds deterministic key/frequency authority for Harmonic Conductor Studio.

## Contract

`aiweb.hfield.key_frequency_registry.v1`

## Rule

Every visible keyboard key and piano-roll note must resolve through:

`frequency_hz = 440 * 2^((midi_note - 69) / 12)`

using A4 = 440 Hz and MIDI A4 = 69 unless a later explicitly governed tuning registry supersedes it.

## Scope

- Adds backend registry and lookup commands.
- Adds report-level frequency provenance to the Track Editor and Piano Roll report.
- Shows frequency directly on virtual piano keys.
- Shows the selected key's MIDI number and frequency.
- Does not mutate Forge.
- Does not perform Identity Vault writes.
- Does not change custody or bundle semantics.
