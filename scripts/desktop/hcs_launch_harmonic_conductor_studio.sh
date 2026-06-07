#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/home/nic/aiweb/apps/harmonic-conductor-studio"
HCS_NODE_TOOLCHAIN="/home/nic/aiweb/toolchains/node-hcs-current/bin"
LOG_DIR="$APP_ROOT/logs/desktop"
STAMP="$(date -u +%Y%m%d_%H%M%S_UTC)"
LOG_FILE="$LOG_DIR/hcs_one_click_launcher_$STAMP.log"

mkdir -p "$LOG_DIR"
exec >> "$LOG_FILE" 2>&1

echo "============================================================"
echo "Harmonic Conductor Studio one-click launcher"
echo "Started: $(date -u)"
echo "App root: $APP_ROOT"
echo "Log file: $LOG_FILE"
echo "============================================================"

if [[ ! -d "$APP_ROOT" ]]; then
  echo "ERROR: app root not found: $APP_ROOT" >&2
  exit 1
fi

cd "$APP_ROOT"

export PATH="$HCS_NODE_TOOLCHAIN:$PATH"
hash -r || true

echo "node: $(command -v node || true)"
node -v || true
echo "npm: $(command -v npm || true)"
npm -v || true

if [[ -x "$APP_ROOT/src-tauri/target/release/harmonic-conductor-studio" ]]; then
  echo "Launching installed/release binary."
  exec "$APP_ROOT/src-tauri/target/release/harmonic-conductor-studio"
fi

if [[ -x "$HCS_NODE_TOOLCHAIN/npm" ]]; then
  echo "Launching Tauri dev workflow through locked HCS Node toolchain."
  exec "$HCS_NODE_TOOLCHAIN/npm" run tauri dev
fi

echo "ERROR: locked HCS npm toolchain not found: $HCS_NODE_TOOLCHAIN/npm" >&2
exit 1
