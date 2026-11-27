#!/usr/bin/env bash
set -euo pipefail
repo="$(cd "$(dirname "$0")/../../.." && pwd)"
db="${ROOTS_DB:-$repo/_intake/photons/roots.sqlite}"
expected=9fa8a7270fc0c9efa8ced1f4d47150286f92e0eaf63be55a2eba991c46b65ac2
if [ -s "$db" ] && [ "$(sha256sum "$db" | cut -d' ' -f1)" = "$expected" ]; then
  echo "roots.sqlite matches sha256 $expected"
  exit 0
fi
cache="$repo/papers/retention-cognates/data/kaikki"
mkdir -p "$cache"
for lang in English German Spanish French Italian Portuguese; do
  f="$cache/$lang.jsonl"
  [ -s "$f" ] || curl -fL -o "$f" "https://kaikki.org/dictionary/$lang/kaikki.org-dictionary-$lang.jsonl"
done
out="$repo/papers/retention-cognates/data/roots.sqlite"
python3 "$repo/scripts/photon/roots_extract.py" --cache "$cache" --out "$out" --langs English,German,Spanish,French,Italian,Portuguese
echo "rebuilt $out; a fresh Kaikki dump differs from the 2026-06 snapshot behind sha256 $expected"
