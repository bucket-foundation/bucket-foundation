#!/usr/bin/env bash
set -euo pipefail

repo=$(cd "$(dirname "$0")/../.." && pwd)
v=${BKT_VERSION:-}
if [ -z "$v" ] && [[ "${GITHUB_REF_NAME:-}" == bkt-v* ]]; then v=${GITHUB_REF_NAME#bkt-v}; fi
[ -n "$v" ] || v=$(cd "$repo/packages/bkt" && bun -e 'console.log(require("./package.json").version)')
[[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "version.sh: malformed version: $v" >&2; exit 1; }
echo "$v"
