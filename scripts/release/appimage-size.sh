#!/usr/bin/env bash
set -euo pipefail

limit=${APPIMAGE_MAX_BYTES:-157286400}
[ $# -ge 1 ] || { echo "usage: appimage-size.sh ARTIFACT [APPDIR]" >&2; exit 2; }
artifact=$1
appdir=${2:-}
[ -f "$artifact" ] || { echo "appimage-size.sh: no artifact at $artifact" >&2; exit 1; }

size=$(stat -c %s "$artifact")
part() { [ -n "$appdir" ] && [ -e "$appdir/$1" ] && du -sb "$appdir/$1" | awk '{print $1}' || echo 0; }
report=$artifact.sizes.json
printf '{"artifact":"%s","bytes":%s,"limit":%s,"bkt":%s,"ui":%s,"pack":%s}\n' \
  "$(basename "$artifact")" "$size" "$limit" "$(part usr/bin/bkt)" "$(part usr/share/bucket/ui)" "$(part usr/share/bucket/pack.json)" > "$report"
echo "appimage $(basename "$artifact"): $(( size / 1048576 )) MB ($size bytes) of $(( limit / 1048576 )) MB"
cat "$report"
[ "$size" -le "$limit" ] || { echo "appimage-size.sh: over the size limit" >&2; exit 1; }
