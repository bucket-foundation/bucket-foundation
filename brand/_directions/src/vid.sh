#!/bin/bash
set -e
i=$1; f=$2; W=$3; H=$4
HERE=$(cd "$(dirname "$0")" && pwd); DIRS=$(dirname "$HERE")
O=${FRAMES_DIR:-$DIRS/.frames}/$i-$f; mkdir -p "$O" "$DIRS/video"
CHROME=${CHROME:-chromium-browser}; PORT=${PORT:-8777}
for n in $(seq 0 119); do t=$(python3 -c "print($n/12)"); f3=$(printf %03d $n); [ -f "$O/$f3.png" ] || "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=$W,$H --virtual-time-budget=6000 --screenshot="$O/$f3.png" "http://127.0.0.1:$PORT/_directions/screens/$i-mm.html?v=$f&t=$t" 2>/dev/null; done
ffmpeg -y -loglevel error -framerate 12 -i "$O/%03d.png" -vf "fps=24,format=yuv420p" -c:v libx264 -crf 20 -movflags +faststart "$DIRS/video/$i-$f.mp4"
