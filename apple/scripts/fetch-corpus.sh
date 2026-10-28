#!/bin/sh
set -eu
dir="$(cd "$(dirname "$0")/.." && pwd)/Shared/Corpus"
for f in lang-core lang-cognates lang-phrases lang-layers; do
  curl -fsS "https://www.bucket.foundation/academy-app/corpus/$f.json" -o "$dir/$f.json"
done
ls -l "$dir"
