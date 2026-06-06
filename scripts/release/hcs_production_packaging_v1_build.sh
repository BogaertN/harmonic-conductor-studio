#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export PATH="/home/nic/aiweb/toolchains/node-hcs-current/bin:$PATH"
STAMP="$(date -u +%Y%m%d_%H%M%S_UTC)"
RELEASE_DIR="$ROOT/release/hcs_production_packaging_v1/$STAMP"
mkdir -p "$RELEASE_DIR"
LOG="$RELEASE_DIR/build.log"
exec > >(tee "$LOG") 2>&1

echo "HCS Production Packaging v1 build"
echo "Generated: $(date -u)"
echo "Root: $ROOT"
echo "Git head: $(git rev-parse --short HEAD 2>/dev/null || true)"
echo

echo "=== Toolchain ==="
node --version
npm --version
cargo --version
rustc --version

echo "=== Pre-release gates ==="
cargo fmt --all --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
npm run typecheck
npm run build
npm run tauri info

echo "=== Tauri release build ==="
npm run tauri build

echo "=== Release inventory ==="
MANIFEST="$RELEASE_DIR/release_manifest_v1.txt"
{
  echo "HCS Production Packaging v1 Release Manifest"
  echo "Generated: $(date -u)"
  echo "Git head: $(git rev-parse --short HEAD 2>/dev/null || true)"
  echo "Git status:"
  git status --short || true
  echo
  echo "Expected artifacts:"
  find src-tauri/target/release/bundle -type f \( -name '*.deb' -o -name '*.AppImage' \) -print 2>/dev/null || true
  echo
  echo "SHA256:"
  find src-tauri/target/release/bundle -type f \( -name '*.deb' -o -name '*.AppImage' \) -print0 2>/dev/null | xargs -0r sha256sum
  echo
  echo "Excluded local custody data must not be included in release artifacts: library/, exports/, projects/, proof files."
} | tee "$MANIFEST"

if ! find src-tauri/target/release/bundle -type f \( -name '*.deb' -o -name '*.AppImage' \) -print -quit 2>/dev/null | grep -q .; then
  echo "ERROR: no .deb or .AppImage release artifact found." >&2
  exit 1
fi

echo "Release manifest: $MANIFEST"
