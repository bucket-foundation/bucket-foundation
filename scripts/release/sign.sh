#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: sign.sh [--allow-unencrypted] [--expires-days N] ARTIFACT VERSION [PRIVATE_KEY]" >&2; exit 2; }
fail() { echo "sign.sh: $*" >&2; exit 1; }

allow_unencrypted=0
expires_days=365
while [ $# -gt 0 ]; do
  case "$1" in
    --allow-unencrypted) allow_unencrypted=1; shift ;;
    --expires-days) [ $# -ge 2 ] || usage; expires_days=$2; shift 2 ;;
    --) shift; break ;;
    -*) usage ;;
    *) break ;;
  esac
done
[ $# -ge 2 ] || usage

artifact=$1
version=$2
key=${3:-${BUCKET_RELEASE_KEY:-$HOME/.config/bucket/release_ed25519}}
repo=$(cd "$(dirname "$0")/../.." && pwd)

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "version must be MAJOR.MINOR.PATCH"
[[ "$expires_days" =~ ^[1-9][0-9]{0,3}$ ]] || fail "--expires-days must be 1 to 9999"
[ -f "$artifact" ] || fail "no artifact at $artifact"
[ -f "$key" ] || fail "no private key at $key"
case "$(cd "$(dirname "$key")" && pwd)/" in
  "$repo"/*) fail "refusing a private key inside the repo" ;;
esac
if [ "$allow_unencrypted" -eq 0 ] && ssh-keygen -y -P "" -f "$key" > /dev/null 2>&1; then
  fail "private key has no passphrase; add one with ssh-keygen -p -f $key or pass --allow-unencrypted"
fi

dir=$(cd "$(dirname "$artifact")" && pwd)
name=$(basename "$artifact")
sum=$(sha256sum -- "$dir/$name" | awk '{print $1}')
expires=$(( $(date +%s) + expires_days * 86400 ))

printf '%s  %s\n' "$sum" "$name" > "$dir/$name.sha256"
printf 'name=%s\nversion=%s\nsha256=%s\nexpires=%s\n' "$name" "$version" "$sum" "$expires" > "$dir/$name.manifest"
rm -f "$dir/$name.manifest.sig"
ssh-keygen -q -Y sign -f "$key" -n bucket-release "$dir/$name.manifest"
echo "$dir/$name.sha256"
echo "$dir/$name.manifest"
echo "$dir/$name.manifest.sig"
