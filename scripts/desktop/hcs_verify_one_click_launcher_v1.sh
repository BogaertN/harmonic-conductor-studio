#!/usr/bin/env bash
set -euo pipefail
LOCAL_BIN="/home/nic/.local/bin/hcs-harmonic-conductor-studio"
LOCAL_ICON="/home/nic/.local/share/icons/harmonic-conductor-studio/hcs_app_icon.png"
APP_DESKTOP="/home/nic/.local/share/applications/harmonic-conductor-studio.desktop"
DESKTOP_FILE="/home/nic/Desktop/Harmonic Conductor Studio.desktop"
APP_ROOT="/home/nic/aiweb/apps/harmonic-conductor-studio"

for path in "$LOCAL_BIN" "$LOCAL_ICON" "$APP_DESKTOP" "$DESKTOP_FILE" "$APP_ROOT/assets/branding/hcs_app_icon.png"; do
  if [[ ! -e "$path" ]]; then
    echo "ERROR: missing expected launcher artifact: $path" >&2
    exit 1
  fi
  echo "present: $path"
done

if [[ ! -x "$LOCAL_BIN" ]]; then
  echo "ERROR: launcher command is not executable: $LOCAL_BIN" >&2
  exit 1
fi
if [[ ! -x "$DESKTOP_FILE" ]]; then
  echo "ERROR: desktop file is not executable: $DESKTOP_FILE" >&2
  exit 1
fi

grep -F "Name=Harmonic Conductor Studio" "$APP_DESKTOP"
grep -F "Exec=$LOCAL_BIN" "$APP_DESKTOP"
grep -F "Icon=$LOCAL_ICON" "$APP_DESKTOP"

if command -v desktop-file-validate >/dev/null 2>&1; then
  desktop-file-validate "$APP_DESKTOP"
  desktop-file-validate "$DESKTOP_FILE"
else
  echo "desktop-file-validate not installed; skipped syntax validation."
fi

echo "HCS one-click desktop launcher verification passed."
