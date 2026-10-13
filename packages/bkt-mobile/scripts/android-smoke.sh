#!/usr/bin/env bash
set -euo pipefail
apk=$1
pkg=foundation.bucket.app
adb install -r "$apk"
flags=$(adb shell dumpsys package "$pkg" | grep -m1 "pkgFlags=" || true)
echo "$flags"
case "$flags" in *DEBUGGABLE*) echo "release apk is debuggable"; exit 1 ;; esac
adb logcat -c
adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 25
pid=$(adb shell pidof "$pkg" | tr -d '\r')
adb logcat -d > "${RUNNER_TEMP:-/tmp}/logcat.txt"
if grep -q "FATAL EXCEPTION" "${RUNNER_TEMP:-/tmp}/logcat.txt"; then grep -A20 "FATAL EXCEPTION" "${RUNNER_TEMP:-/tmp}/logcat.txt"; exit 1; fi
if grep -qi "Content Security Policy" "${RUNNER_TEMP:-/tmp}/logcat.txt"; then grep -i "Content Security Policy" "${RUNNER_TEMP:-/tmp}/logcat.txt"; exit 1; fi
[ -n "$pid" ] || { echo "app is not running"; exit 1; }
echo "android smoke passed, pid $pid"
