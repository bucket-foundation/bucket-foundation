#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/.config/systemd/user"
mkdir -p "$dest"
install -m 644 "$here/finance-brief.service" "$here/finance-brief.timer" "$dest/"
systemctl --user daemon-reload
systemd-analyze --user verify "$dest/finance-brief.service" "$dest/finance-brief.timer" || true
echo "installed, not enabled. enable with: systemctl --user enable --now finance-brief.timer"
