#!/usr/bin/env bash
set -uo pipefail

here=$(cd "$(dirname "$0")" && pwd)
work=$1 release=$2 branch=$3 reader=$4

rm -rf "$work"
mkdir -p "$work"
export PATH="/c/Windows/System32:/c/Windows/System32/WindowsPowerShell/v1.0:$PATH"
cmd.exe //c ver
bun "$here/ts/write-keys.mjs" write "$work" "$release" "$branch" || exit 1
ls -l "$LOCALAPPDATA/bkt/keys"
"$reader" run "$work" default
bun "$here/ts/write-keys.mjs" verify "$work"
