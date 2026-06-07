#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/home/nic/aiweb/apps/harmonic-conductor-studio"
LOCAL_BIN="/home/nic/.local/bin"
LOCAL_ICON_DIR="/home/nic/.local/share/icons/harmonic-conductor-studio"
LOCAL_APP_DIR="/home/nic/.local/share/applications"
DESKTOP_DIR="/home/nic/Desktop"
LAUNCHER_BIN="$LOCAL_BIN/hcs-harmonic-conductor-studio"
ICON_SOURCE="$APP_ROOT/assets/branding/hcs_app_icon.png"
ICON_TARGET="$LOCAL_ICON_DIR/hcs_app_icon.png"
APP_DESKTOP="$LOCAL_APP_DIR/harmonic-conductor-studio.desktop"
DESKTOP_FILE="$DESKTOP_DIR/Harmonic Conductor Studio.desktop"

if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "ERROR: icon source missing: $ICON_SOURCE" >&2
  exit 1
fi

mkdir -p "$LOCAL_BIN" "$LOCAL_ICON_DIR" "$LOCAL_APP_DIR" "$DESKTOP_DIR"
cp -v "$APP_ROOT/scripts/desktop/hcs_launch_harmonic_conductor_studio.sh" "$LAUNCHER_BIN"
chmod +x "$LAUNCHER_BIN"
cp -v "$ICON_SOURCE" "$ICON_TARGET"

cat > "$APP_DESKTOP" <<DESKTOP_EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Harmonic Conductor Studio
GenericName=Harmonic Music Studio
Comment=Open Harmonic Conductor Studio with the Studio, score, conductor cue, and Glass Reader workflow.
Exec=$LAUNCHER_BIN
Icon=$ICON_TARGET
Terminal=false
StartupNotify=true
Categories=AudioVideo;Audio;Music;Development;
Keywords=HCS;Harmonic;Conductor;Studio;AI.Web;Music;Cymatics;
DESKTOP_EOF

cp -v "$APP_DESKTOP" "$DESKTOP_FILE"
chmod +x "$APP_DESKTOP" "$DESKTOP_FILE"

gio set "$DESKTOP_FILE" metadata::trusted true 2>/dev/null || true
update-desktop-database "$LOCAL_APP_DIR" 2>/dev/null || true

echo "Installed app menu launcher: $APP_DESKTOP"
echo "Installed desktop launcher: $DESKTOP_FILE"
echo "Installed launcher command: $LAUNCHER_BIN"
echo "Installed icon: $ICON_TARGET"
echo "If Ubuntu still shows it as an untrusted file, right-click the desktop icon and choose Allow Launching."
