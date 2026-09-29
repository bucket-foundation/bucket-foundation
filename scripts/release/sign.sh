#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: sign.sh ARTIFACT [PRIVATE_KEY]" >&2; exit 2; }
[ $# -ge 1 ] || usage

artifact=$1
key=${2:-${BUCKET_RELEASE_KEY:-$HOME/.config/bucket/release_ed25519}}
repo=$(cd "$(dirname "$0")/../.." && pwd)

[ -f "$artifact" ] || { echo "sign.sh: no artifact at $artifact" >&2; exit 1; }
[ -f "$key" ] || { echo "sign.sh: no private key at $key" >&2; exit 1; }
case "$(cd "$(dirname "$key")" && pwd)/" in
  "$repo"/*) echo "sign.sh: refusing a private key inside the repo" >&2; exit 1 ;;
esac

dir=$(cd "$(dirname "$artifact")" && pwd)
name=$(basename "$artifact")
(cd "$dir" && sha256sum -- "$name" > "$name.sha256")
rm -f "$dir/$name.sig"
ssh-keygen -q -Y sign -f "$key" -n bucket-release "$dir/$name"
echo "$dir/$name.sha256"
echo "$dir/$name.sig"
