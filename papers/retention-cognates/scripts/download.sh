#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$here/data"
out="$here/data/settles.acl16.learning_traces.13m.csv.gz"
if [ ! -s "$out" ]; then
  curl -fL -o "$out.part" "https://dataverse.harvard.edu/api/access/datafile/3091087"
  mv "$out.part" "$out"
fi
test "$(stat -c %s "$out")" = 379004009
stat -c '%s %n' "$out"
