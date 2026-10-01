#!/usr/bin/env bash
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
spike=$(cd "$here/.." && pwd)
out=${1:-$spike/.data/s3}
profile=${WASM_PROFILE:-release}
mkdir -p "$out"

cd "$spike"
cargo build -p bucket-rank-wasm-spike --target wasm32-unknown-unknown --profile "$profile" --locked
cp "target/wasm32-unknown-unknown/$profile/bucket_rank_wasm_spike.wasm" "$here/rank.wasm"
bun build --compile --minify "$here/app.mts" --outfile "$out/app-wasm" >/dev/null
bun build --compile --minify "$here/baseline.mts" --outfile "$out/app-ts" >/dev/null
bun "$here/sizes.mts" "$out"
