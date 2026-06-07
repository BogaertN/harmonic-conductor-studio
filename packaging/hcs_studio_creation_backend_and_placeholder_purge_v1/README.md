# HCS Studio Creation Backend and Placeholder Purge v1

Contract: `aiweb.hfield.studio_creation_backend_and_placeholder_purge.v1`

This patch turns the normal Harmonic Conductor Studio workflow away from scaffolding and into a backed creation surface.

Visible user workflow:

1. Open Project
2. Create/Edit Music
3. Play Studio Mix
4. View 3D Glass Reader Field
5. Save Project
6. Seal Bundle v2
7. Export Audio

Hidden from normal users:

- Composer Tool Dock placeholder cards
- Professional Score Tools placeholder card
- Notation Staff placeholder/preview
- Palette/Mixer/Import/Export/Shortcuts placeholder claims
- raw g1-g9 gesture button pad
- legacy Bundle Manifest v1 as a normal action
- raw diagnostic/export wall outside Advanced

No Forge mutation, no Identity Vault live write, no `.hfield` source-authority change, no audio determinism change, and no custody semantics change.
