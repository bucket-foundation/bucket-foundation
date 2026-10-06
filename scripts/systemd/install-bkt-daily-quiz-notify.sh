#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.local/bin"
mkdir -p "$DEST"
install -m 0755 "$HERE/bkt-daily-quiz-notify" "$DEST/bkt-daily-quiz-notify"
echo "installed: $DEST/bkt-daily-quiz-notify"
echo "in $DEST/bkt-daily-critic-quiz replace the backgrounded notify-send subshell with:"
echo '  "$HOME/.local/bin/bkt-daily-quiz-notify" "$day" >> "$out/run.log" 2>&1 || true'
