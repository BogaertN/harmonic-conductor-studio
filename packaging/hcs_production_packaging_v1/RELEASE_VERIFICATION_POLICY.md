# HCS Production Packaging v1 Release Verification Policy

Before Forge Adapter v1 is allowed, HCS release packaging must prove that the standalone app can build, report its packaging state, and exclude user custody data.

Required verification gates:

1. Rust tests pass.
2. Clippy passes with `-D warnings`.
3. TypeScript passes.
4. Vite production build passes.
5. Tauri environment report passes.
6. Release scripts exist and are executable.
7. `package.json` exposes `release:hcs:v1` and `verify:release:hcs:v1`.
8. Notice and checklist files exist under `packaging/hcs_production_packaging_v1/`.
9. Local SQLite database files, exports, projects, and proof files remain outside distribution artifacts.
10. Packaging does not mutate Forge and does not write to Identity Vault.
