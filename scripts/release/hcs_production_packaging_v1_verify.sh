#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export PATH="/home/nic/aiweb/toolchains/node-hcs-current/bin:$PATH"
STAMP="$(date -u +%Y%m%d_%H%M%S_UTC)"
VERIFY_DIR="$ROOT/release/hcs_production_packaging_v1/verify_$STAMP"
mkdir -p "$VERIFY_DIR"
LOG="$VERIFY_DIR/verify.log"
exec > >(tee "$LOG") 2>&1

echo "HCS Production Packaging v1 verification"
echo "Generated: $(date -u)"
echo "Root: $ROOT"
echo "Git head: $(git rev-parse --short HEAD 2>/dev/null || true)"
echo

echo "=== Required source gates ==="
cargo fmt --all --check
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
npm run typecheck
npm run build
npm run tauri info

echo "=== Release artifact check ==="
ARTIFACTS=$(find src-tauri/target/release/bundle -type f \( -name '*.deb' -o -name '*.AppImage' \) -print 2>/dev/null || true)
if [ -z "$ARTIFACTS" ]; then
  echo "ERROR: no .deb or .AppImage artifacts found. Run npm run release:hcs:v1 first." >&2
  exit 1
fi
printf '%s\n' "$ARTIFACTS"

echo "=== SHA256 ==="
printf '%s\n' "$ARTIFACTS" | while IFS= read -r artifact; do
  sha256sum "$artifact"
done | tee "$VERIFY_DIR/SHA256SUMS.txt"

echo "=== Local custody exclusion check ==="
if find src-tauri/target/release/bundle -type f \( -path '*library*' -o -path '*exports*' -o -path '*projects*' \) -print | grep -q .; then
  echo "ERROR: release bundle path contains excluded local custody directory names." >&2
  exit 1
fi

echo "Verification complete: $VERIFY_DIR"
