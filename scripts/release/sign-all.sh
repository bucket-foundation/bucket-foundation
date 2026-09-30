#!/usr/bin/env bash
set -euo pipefail

fail() { echo "sign-all.sh: $*" >&2; exit 1; }
[ $# -ge 3 ] || { echo "usage: sign-all.sh DIR VERSION KEY [sign.sh flags]" >&2; exit 2; }

repo=$(cd "$(dirname "$0")/../.." && pwd)
dir=$1 version=$2 key=$3
shift 3
count=0
for f in "$dir"/bkt-* "$dir"/Bucket-*.AppImage; do
  [ -f "$f" ] || continue
  [[ "$(basename "$f")" =~ ^[A-Za-z0-9._-]+$ ]] || fail "artifact names may use only letters, digits, dot, underscore and hyphen: $f"
  case "$f" in *.sha256|*.manifest|*.manifest.sig|*.sizes.json) continue ;; esac
  bash "$repo/scripts/release/sign.sh" "$@" "$f" "$version" "$key" > /dev/null
  (cd "$dir" && sha256sum -c --quiet "$(basename "$f").sha256") || fail "checksum did not verify for $f"
  count=$((count + 1))
done
[ "$count" -gt 0 ] || fail "nothing to sign in $dir"
echo "signed $count artifacts"
