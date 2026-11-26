#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
langs="${*:-es fr it pt de nl}"
first=1
for l in $langs; do
  if [ "$first" = 1 ]; then
    python3 "$root/scripts/polingual/yesno_sources.py" "$l" --out "$tmp/$l.json" --reject-out "$tmp/reject.txt"
    first=0
  else
    python3 "$root/scripts/polingual/yesno_sources.py" "$l" --out "$tmp/$l.json"
  fi
  NODE_OPTIONS=--max-old-space-size=2800 npx --prefix "$root" tsx "$root/scripts/build-yes-no-forms.ts" "$tmp/$l.json" "$tmp/reject.txt" "$root/learning/app/polingual/yesno" "$root/apple/Shared/Corpus/yesno"
done
