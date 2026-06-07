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

RELEASE_BIN="$APP_ROOT/src-tauri/target/release/harmonic-conductor-studio"
export HCS_DESKTOP_LAUNCHER_STUDIO_STARTUP_FIX_V1="1"

if [[ "${HCS_USE_RELEASE_BINARY:-0}" == "1" && -x "$RELEASE_BIN" ]]; then
  echo "Launching release binary because HCS_USE_RELEASE_BINARY=1 was explicitly set."
  exec "$RELEASE_BIN"
fi

if [[ -x "$RELEASE_BIN" ]]; then
  echo "Release binary exists, but the one-click launcher is using source-backed dev startup by default to avoid stale UI bundles."
  echo "Set HCS_USE_RELEASE_BINARY=1 only after running the production release build and verification path."
fi

if [[ -x "$HCS_NODE_TOOLCHAIN/npm" ]]; then
  echo "Launching Tauri dev workflow through locked HCS Node toolchain."
  echo "Studio startup contract: aiweb.hfield.desktop_launcher_studio_startup_fix.v1"
  exec "$HCS_NODE_TOOLCHAIN/npm" run tauri dev
fi

echo "ERROR: locked HCS npm toolchain not found: $HCS_NODE_TOOLCHAIN/npm" >&2
exit 1
