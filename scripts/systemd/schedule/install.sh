#!/usr/bin/env bash
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
dst="$HOME/.config/systemd/user"
mkdir -p "$HOME/.local/share/bucket-schedule"
cp -r "$src/../../schedule/." "$HOME/.local/share/bucket-schedule/"
cp "$src"/bucket-*.service "$src"/bucket-*.timer "$dst/"
systemctl --user daemon-reload
for t in "$src"/bucket-*.timer; do systemctl --user enable --now "$(basename "$t")"; done
systemctl --user list-timers 'bucket-*' --no-pager
