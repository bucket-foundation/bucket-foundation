#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
for lang in "${@:-es fr it pt de nl}"; do
  for l in $lang; do
    python3 "$root/scripts/polingual/yesno_sources.py" "$l" --out "$tmp/$l.json"
    NODE_OPTIONS=--max-old-space-size=2800 npx --prefix "$root" tsx "$root/scripts/build-yes-no-forms.ts" "$tmp/$l.json" "$root/learning/app/polingual/yesno" "$root/apple/Shared/Corpus/yesno"
    echo "built $l"
  done
done
