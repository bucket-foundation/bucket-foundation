#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="${1:-$here/../../android/core/rust/build/rustJniLibs}"
sdk="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [ -z "${ANDROID_NDK_HOME:-}" ]; then
  ANDROID_NDK_HOME="$(ls -d "$sdk"/ndk/* | sort -V | tail -1)"
  export ANDROID_NDK_HOME
fi
cd "$here"
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -P 26 -o "$out" build --release --lib
