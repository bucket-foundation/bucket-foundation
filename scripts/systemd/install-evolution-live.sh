#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.config/systemd/user"
mkdir -p "$DEST"
cp "$HERE/evolution-live.service" "$DEST/evolution-live.service"
cp "$HERE/evolution-live.timer" "$DEST/evolution-live.timer"
systemctl --user daemon-reload
echo "installed: evolution-live.{service,timer}, left disabled"
echo "dry run:  bash scripts/evolution-live-runner.sh --dry-run --force"
echo "enable:   systemctl --user enable --now evolution-live.timer"
