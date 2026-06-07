# HCS Composer First Workflow and SoundFont Foundation v1

Contract: `aiweb.hfield.composer_first_workflow_and_soundfont_foundation.v1`

This patch moves HCS away from developer/prototype workflow and toward a musician-first composer workflow.

It hides raw score JSON from the normal composer path, keeps JSON available only under Advanced import, reduces the visible mode rail, keeps notation, keyboard, piano roll, instrument rack, and Glass Reader workflow together, and reports the detected FluidSynth/SoundFont foundation.

This patch does not yet replace playback with FluidSynth. It prepares and proves the foundation for the next sample-backed playback patch.
