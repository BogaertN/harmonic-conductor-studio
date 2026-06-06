# HCS Production Packaging v1 Release Checklist

1. Confirm git head is clean and the expected locked base is present.
2. Export or verify a Canonical Bundle Manifest v2 from the app.
3. Run `cargo fmt --all --check`.
4. Run `cargo test --workspace`.
5. Run `cargo clippy --workspace --all-targets -- -D warnings`.
6. Run `npm run typecheck`.
7. Run `npm run build`.
8. Run `npm run tauri info`.
9. Run `npm run tauri build`.
10. Verify Linux `.deb` and `.AppImage` artifacts exist under `src-tauri/target/release/bundle/`.
11. Generate SHA256 checksums for distributable artifacts.
12. Verify no local user storage is packaged: `library/`, `exports/`, `projects/`, proof files, and private identity exports must remain excluded.
13. Save the release manifest under `release/hcs_production_packaging_v1/`.

Forge Adapter v1 remains blocked until packaging, sealed bundles, and replay verification are clean.
