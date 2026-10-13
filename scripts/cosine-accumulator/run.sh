#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
node "$here/generate.mjs" "$work/pairs.bin" "${1:-2000}" "${2:-384}"
rustc --edition 2021 -O -o "$work/compare" "$here/compare.rs"
"$work/compare" "$work/pairs.bin"
