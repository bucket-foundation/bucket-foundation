#!/usr/bin/env bash
set -euo pipefail

spike=$(cd "$(dirname "$0")/.." && pwd)
repo=$(cd "$spike/../.." && pwd)
data=$spike/.data/s2
wasm=$spike/target/wasm32-unknown-unknown/release/bucket_rank_wasm_spike.wasm
mkdir -p "$data"
rm -f "$data"/fixture-*

run() {
  node "$repo/node_modules/ts-node/dist/bin.js" -r tsconfig-paths/register \
    --compiler-options '{"module":"commonjs","baseUrl":".","jsx":"react-jsx"}' scripts/test-canon-search-parity.ts
}

cd "$repo"
git apply "$spike/s2-ranking-parity/fixture-hook.patch"
trap 'git -C "$repo" apply -R "$spike/s2-ranking-parity/fixture-hook.patch"' EXIT
export TS_NODE_BASEURL=./ TS_NODE_IGNORE='(?:^|/)node_modules/,\.mjs$'

echo "recording the TypeScript ranker calls behind the fixture"
CANON_RANK_RECORD_DIR="$data" run
echo "replaying the fixture test with the wasm ranker in place of the TypeScript ranker"
CANON_RANK_WASM="$wasm" CANON_RANK_WASM_LOG="$data/fixture-wasm-calls.txt" run
echo "replaying the recorded calls through the native Rust ranker"
"$spike/target/parity/s2-parity" "$data/fixture-calls.jsonl" > "$data/fixture-native.json"
echo "recorded calls: $(wc -l < "$data/fixture-calls.jsonl"), calls answered by wasm: $(cat "$data/fixture-wasm-calls.txt")"
