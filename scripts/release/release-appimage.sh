#!/usr/bin/env bash
set -euo pipefail

fail() { echo "release-appimage.sh: $*" >&2; exit 1; }

[ -z "${CI:-}" ] || fail "sign releases on the founder's machine; CI builds and measures only"
[ -z "${BKT_INCLUDE_STAFF_DATA:-}" ] || fail "BKT_INCLUDE_STAFF_DATA is set; public releases ship no staff data"
repo=$(cd "$(dirname "$0")/../.." && pwd)
askpass=${BUCKET_RELEASE_ASKPASS:-$HOME/.local/bin/bkt-release-askpass}
[ -x "$askpass" ] || fail "no askpass at $askpass"

artifact=$(bash "$repo/scripts/release/build-appimage.sh" "${1:-$repo/dist/release}" | tail -n1)
version=$(cd "$repo/packages/bkt" && bun -e 'console.log(require("./package.json").version)')
SSH_ASKPASS="$askpass" SSH_ASKPASS_REQUIRE=force DISPLAY=${DISPLAY:-:0} setsid -w bash "$repo/scripts/release/sign.sh" "$artifact" "$version" < /dev/null
check=$(mktemp -d)
trap 'rm -rf "$check"' EXIT
BUCKET_PREFIX="$check" bash "$repo/scripts/release/install.sh" "$artifact" < /dev/null > /dev/null || fail "install.sh could not verify $artifact"
echo "signed and verified $artifact"
