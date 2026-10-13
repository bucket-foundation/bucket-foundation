#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: sign-deck-catalog.sh [--allow-unencrypted] [CATALOG] [PRIVATE_KEY]" >&2; exit 2; }
fail() { echo "sign-deck-catalog.sh: $*" >&2; exit 1; }

allow_unencrypted=0
while [ $# -gt 0 ]; do
  case "$1" in
    --allow-unencrypted) allow_unencrypted=1; shift ;;
    --) shift; break ;;
    -*) usage ;;
    *) break ;;
  esac
done
[ $# -le 2 ] || usage

repo=$(cd "$(dirname "$0")/../.." && pwd)
catalog=${1:-$repo/decks/catalog.json}
key=${2:-${BUCKET_DECK_CATALOG_KEY:-$HOME/.config/bucket/deck_catalog_ed25519}}

[ -f "$catalog" ] || fail "no catalog at $catalog"
[ -f "$key" ] || fail "no private key at $key; create one with ssh-keygen -t ed25519 -C deck-catalog@bucket.foundation -f $HOME/.config/bucket/deck_catalog_ed25519"
case "$(cd "$(dirname "$key")" && pwd -P)/" in
  "$(cd "$repo" && pwd -P)"/*) fail "refusing a private key inside the repo" ;;
esac
if [ "$allow_unencrypted" -eq 0 ] && ssh-keygen -y -P "" -f "$key" > /dev/null 2>&1; then
  fail "private key has no passphrase; add one with ssh-keygen -p -f $key or pass --allow-unencrypted"
fi

rm -f "$catalog.sig"
ssh-keygen -q -Y sign -f "$key" -n bucket-deck-catalog "$catalog"
echo "$catalog.sig"
echo "public key for DECK_CATALOG_PUBKEY in packages/bkt/src/library.ts:" >&2
ssh-keygen -y -f "$key" >&2
