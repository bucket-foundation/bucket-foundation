#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.config/systemd/user"
mkdir -p "$DEST"
cp "$HERE/hte-serve.service" "$DEST/hte-serve.service"
systemctl --user daemon-reload
systemctl --user enable hte-serve.service
systemctl --user restart hte-serve.service
loginctl enable-linger "$USER" 2>/dev/null || true
echo "installed: hte-serve.service"
systemctl --user --no-pager status hte-serve.service | head -5 || true
