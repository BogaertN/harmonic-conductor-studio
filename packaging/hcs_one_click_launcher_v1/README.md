# HCS One-Click Desktop Launcher v1

This package installs a local Linux desktop/menu launcher for Harmonic Conductor Studio.

It is a launcher and desktop integration layer only. It does not mutate Forge, does not write Identity Vault, and does not alter HFIELD custody semantics.

Installed local artifacts:

- `/home/nic/.local/bin/hcs-harmonic-conductor-studio`
- `/home/nic/.local/share/applications/harmonic-conductor-studio.desktop`
- `/home/nic/Desktop/Harmonic Conductor Studio.desktop`
- `/home/nic/.local/share/icons/harmonic-conductor-studio/hcs_app_icon.png`

The launcher uses the locked HCS Node toolchain at `/home/nic/aiweb/toolchains/node-hcs-current/bin` and starts HCS with `npm run tauri dev` until a release binary exists.
