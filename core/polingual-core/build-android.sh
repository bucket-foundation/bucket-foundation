#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
android="$here/../../android"
out="${1:-$android/core/rust/build/rustJniLibs}"
prop() { if [ -f "$android/local.properties" ]; then sed -n "s/^$1=//p" "$android/local.properties" | tail -1; fi; }
if [ -z "${ANDROID_NDK_HOME:-}" ]; then
  ndk="$(prop ndk.dir)"
  if [ -z "$ndk" ]; then
    sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$(prop sdk.dir)}}"
    sdk="${sdk:-$HOME/Android/Sdk}"
    if [ -d "$sdk/ndk" ]; then ndk="$(ls -d "$sdk"/ndk/* 2>/dev/null | sort -V | tail -1)"; fi
  fi
  if [ -z "$ndk" ] || [ ! -d "$ndk" ]; then
    echo "polingual-core: no Android NDK found. Set ANDROID_NDK_HOME, or ndk.dir or sdk.dir in android/local.properties, or build with -PpolingualKotlinCore=true." >&2
    exit 1
  fi
  export ANDROID_NDK_HOME="$ndk"
fi
if ! command -v cargo-ndk >/dev/null; then
  echo "polingual-core: cargo-ndk missing. Run: cargo install cargo-ndk && rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android" >&2
  exit 1
fi
cd "$here"
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 -P 26 -o "$out" build --release --lib
