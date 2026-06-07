# HCS Composer Studio Canvas Rebuild v1

Contract: `aiweb.hfield.composer_studio_canvas_rebuild.v1`

This patch rebuilds the visible composer workflow into a single studio canvas.

It makes the score/notation area the primary composer surface, keeps piano roll, keyboard, instruments, and Glass Reader preview together, hides raw JSON from the normal composer path, hides SoundFont diagnostics from normal composer mode, and moves the product away from a developer dashboard layout.

This patch does not yet replace playback with FluidSynth. That comes next.
