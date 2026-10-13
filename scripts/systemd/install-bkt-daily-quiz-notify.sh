#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${BKT_INSTALL_DEST:-$HOME/.local/bin}"
mkdir -p "$DEST"
for name in bkt-daily-quiz-notify bkt-daily-critic-quiz; do
  if [ -f "$DEST/$name" ] && ! cmp -s "$HERE/$name" "$DEST/$name"; then
    cp -p "$DEST/$name" "$DEST/$name.bak"
    echo "kept the old copy: $DEST/$name.bak"
  fi
  install -m 0755 "$HERE/$name" "$DEST/$name"
  echo "installed: $DEST/$name"
done
