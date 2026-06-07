# HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1

This patch repairs the Glass Reader page as one synchronized studio surface.

It does not create a disconnected preview panel. It updates the real Glass Reader scene so the currently active score notes and conductor cue can be verified against the same playhead state that drives the Glass Reader scan.

## Main corrections

- `HfieldVolumetricPacketField` now consumes `fieldReport`, `cymaticReport`, `carrierReport`, `renderManifest`, `waveformBodyReport`, and `playheadReport`.
- Cymatic reader surface, runtime path rails, carrier ripples, carrier time slices, field trace, harmonic event nodes, and active conductor influence are rendered inside the actual native volumetric scene.
- Payload bodies now glow/scale from `PlayheadCursorReport.active_notes` using the Rust-owned body source entry convention.
- Active conductor cue now produces visible conductor influence geometry in the same scene.
- `HfieldPhaseFieldViewport` displays a sync proof readout for active notes and active cue.
- `NotationSpine` fallback cue timing no longer uses the brittle `seconds * 1.4` rule; it uses tempo and meter math when Rust notation cue layout is not present.

## Boundaries

- No Forge mutation.
- No Identity Vault write.
- No health/sensor claim.
- No anchor ratio schema migration.
- No new preview panel.
