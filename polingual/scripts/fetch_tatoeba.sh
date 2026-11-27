#!/usr/bin/env bash
set -euo pipefail
dir="${1:?usage: fetch_tatoeba.sh <dir> [iso3 ...]}"
shift
langs=("$@")
[ ${#langs[@]} -gt 0 ] || langs=(spa fra ita por deu)
base="${TATOEBA_BASE_URL:-https://downloads.tatoeba.org/exports/per_language}"
mkdir -p "$dir"
fetch() {
  local sub="$1" f="$2"
  [ -s "$dir/$f" ] && return 0
  curl -fsSL --retry 3 -o "$dir/$f.part" "$base/$sub/$f"
  mv -f "$dir/$f.part" "$dir/$f"
}
fetch eng eng_sentences_detailed.tsv.bz2
for l in "${langs[@]}"; do
  fetch "$l" "${l}_sentences_detailed.tsv.bz2"
  fetch "$l" "${l}-eng_links.tsv.bz2"
done
