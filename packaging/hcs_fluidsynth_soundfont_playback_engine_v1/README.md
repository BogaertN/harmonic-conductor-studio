# HCS FluidSynth SoundFont Playback Engine v1

Contract: `aiweb.hfield.fluidsynth_soundfont_playback_engine.v1`

This patch adds real SoundFont playback using FluidSynth.

The normal Web Audio instrument tones are now fallback previews only. The production playback path renders the current HCS score to MIDI, uses FluidSynth with the local FluidR3 GM SoundFont, writes a WAV file, and plays it through the OS audio path.

Pitch remains governed by the locked MIDI frequency registry. Instrument selection changes timbre/program, not pitch authority.
