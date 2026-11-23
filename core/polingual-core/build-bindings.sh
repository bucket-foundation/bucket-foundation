#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
cd "$here"
cargo build --lib
lib="target/debug/libpolingual_core.so"
cargo run --release --features cli --bin uniffi-bindgen -- generate --library "$lib" --language kotlin --no-format --out-dir "$repo/android/core/rust/src/main/kotlin"
rm -rf bindings/swift
cargo run --release --features cli --bin uniffi-bindgen -- generate --library "$lib" --language swift --out-dir bindings/swift
