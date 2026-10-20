#!/bin/bash
set -e
HERE=$(cd "$(dirname "$0")" && pwd); DIRS=$(dirname "$HERE")
CHROME=${CHROME:-chromium-browser}
shot() { [ -f "$3" ] && [ -z "$FORCE" ] && return 0; "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=$1,$2 --virtual-time-budget=4000 --screenshot="$3" "file://$4" 2>/dev/null; }
case "$1" in
pages)
  for f in "$DIRS"/pages/*/*.html; do d=$(dirname "$f"); n=$(basename "$f" .html); mkdir -p "$d/thumbs"
    shot 1440 900 "$d/thumbs/$n-1440.png" "$f"; shot 390 844 "$d/thumbs/$n-390.png" "$f"; done ;;
screens)
  mkdir -p "$DIRS/screens/thumbs"
  for f in "$DIRS"/screens/*.html; do shot 1440 900 "$DIRS/screens/thumbs/$(basename "$f" .html).png" "$f"; done ;;
esac
