#!/usr/bin/env bash
# Install (or refresh) hte-serve as a systemd --user service. Idempotent:
# re-running copies the unit, reloads, and restarts it. Then set
# HTE_SERVE_URL=http://127.0.0.1:8420 in .env.local.
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
