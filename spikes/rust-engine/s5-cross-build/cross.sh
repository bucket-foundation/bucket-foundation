#!/usr/bin/env bash
set -uo pipefail

spike=$(cd "$(dirname "$0")/.." && pwd)
out=$spike/.data/ci
mkdir -p "$out"
cd "$spike"
rows=""
failed=0
for target in aarch64-unknown-linux-gnu x86_64-apple-darwin aarch64-apple-darwin x86_64-pc-windows-gnu; do
  rustup target add "$target" >/dev/null 2>&1
  start=$(date +%s)
  if cargo zigbuild --release --locked -p s4-native-engine --target "$target" >"$out/cross-$target.log" 2>&1; then
    file=$(ls "target/$target/release/engine-min" "target/$target/release/engine-min.exe" 2>/dev/null | head -1)
    state="built, $(wc -c <"$file" | tr -d ' ') bytes"
  else
    state="failed: $(grep -m1 -E '^error' "$out/cross-$target.log" | cut -c1-160)"
    failed=$((failed + 1))
  fi
  secs=$(($(date +%s) - start))
  echo "$target: $state, ${secs}s"
  rows="$rows| $target | $state | $secs |\n"
done
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  printf "### cross-build from one Linux x64 runner with cargo-zigbuild\n\n| Target | Result | Seconds |\n|---|---|---|\n$rows" >>"$GITHUB_STEP_SUMMARY"
fi
printf "$rows" >"$out/cross.md"
exit 0
