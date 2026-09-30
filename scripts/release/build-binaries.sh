#!/usr/bin/env bash
set -euo pipefail

fail() { echo "build-binaries.sh: $*" >&2; exit 1; }

repo=$(cd "$(dirname "$0")/../.." && pwd)
out=${1:-$repo/dist/release}
targets=${BKT_TARGETS:-"linux-x64 linux-arm64 darwin-arm64 darwin-x64 windows-x64"}
version=$(bash "$repo/scripts/release/version.sh")
mkdir -p "$out"

cd "$repo/packages/bkt"
bun install --frozen-lockfile >/dev/null
bun run pack:content >/dev/null
for t in $targets; do
  case "$t" in
    linux-x64|linux-arm64|darwin-arm64|darwin-x64) name=bkt-$t ;;
    windows-x64) name=bkt-$t.exe ;;
    *) fail "unknown target $t" ;;
  esac
  bun build --compile --minify --define "BKT_BUILD_VERSION=\"$version\"" --target="bun-$t" src/cli.tsx --outfile "$out/$name" >/dev/null
  [ -s "$out/$name" ] || fail "no binary for $t"
  if [ "${BKT_INCLUDE_STAFF_DATA:-}" != "1" ]; then
    bun scripts/check-no-staff.ts "$out/$name" || fail "staff atlas data found in $name"
  fi
  echo "$out/$name"
done
