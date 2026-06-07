# HCS_GLASS_READER_CUMULATIVE_REVEAL_HISTORY_V1

This patch changes the Glass Reader production reveal model from a temporary moving visibility window to a cumulative reader history.

## Correct visual law

- Future waveform is hidden.
- Active glass slice is emphasized.
- Past waveform remains visible after the glass has read it.
- Note/frequency text appears only at the glass crossing.
- Production skin remains translucent and muted.
- Diagnostic wireframe remains inspection-only.

## User-facing metaphor

The waveform already exists in the dark chamber. The glass timing ticker reads it forward through time. What the glass has already touched remains visible as played sound history. What the glass has not touched yet stays invisible.
