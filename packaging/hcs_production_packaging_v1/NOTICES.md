# HCS Production Packaging v1 Notices

Contract: `aiweb.hfield.production_packaging.v1`

This release path packages Harmonic Conductor Studio as a local-first Tauri desktop application for Linux distribution.

Production packaging is distribution and release custody only. It is not Harmonic Field Score source authority, not Forge authority, not Identity Vault authority, not physical sensor proof, and not health claim authority.

The release must not ship user-local custody data. The following paths are intentionally excluded from release artifacts and source commits:

- `library/`
- `library/*.sqlite3`
- `library/*.sqlite3-*`
- `exports/`
- `projects/`
- proof files
- private identity exports

SQLite is used only for local project, motif, and receipt storage. The `.hfield` score remains the source object. Renderings, bundles, release artifacts, and packaging reports are downstream custody artifacts.
