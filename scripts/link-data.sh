#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="${BUCKET_DATA_DIR:-$ROOT/../bucket-data}"
[ -d "$DATA" ] || { echo "clone bucket-foundation/bucket-data to $DATA or set BUCKET_DATA_DIR" >&2; exit 1; }
for d in archaeology openalex-fanout yt arxiv blog; do
  [ -e "$ROOT/$d" ] || ln -s "$DATA/$d" "$ROOT/$d"
done
