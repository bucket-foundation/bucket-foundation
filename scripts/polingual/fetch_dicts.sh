#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/_intake/polingual-dicts"
mkdir -p "$DEST"
fetch() {
  local url="$1" out="$DEST/$2"
  if [[ -s "$out" ]]; then echo "have $2"; return; fi
  curl -fsSL --retry 3 -o "$out.part" "$url"
  mv "$out.part" "$out"
  echo "got $2 $(stat -c %s "$out")"
}
fetch "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz" JMdict_e.gz
fetch "http://www.edrdg.org/kanjidic/kanjidic2.xml.gz" kanjidic2.xml.gz
fetch "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz" cedict.txt.gz
date -u +%FT%TZ > "$DEST/FETCHED_AT"
