#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.config/systemd/user"
mkdir -p "$DEST"
cp "$HERE/canon-intake.service" "$DEST/canon-intake.service"
cp "$HERE/canon-intake.timer"   "$DEST/canon-intake.timer"
systemctl --user daemon-reload
systemctl --user enable --now canon-intake.timer
loginctl enable-linger "$USER" 2>/dev/null || true
echo "installed: canon-intake.{service,timer}"
systemctl --user list-timers 'canon-intake.*' --no-pager || true
