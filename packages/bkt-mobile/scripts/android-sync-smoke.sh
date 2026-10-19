#!/usr/bin/env bash
set -euo pipefail
apk=$1
pkg=foundation.bucket.app
log="${RUNNER_TEMP:-/tmp}/sync-logcat.txt"
adb install -r "$apk"
adb logcat -c
adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null
line=""
for _ in $(seq 1 90); do
  adb logcat -d > "$log"
  line=$(grep -m1 -o 'BKT_SMOKE [a-z]* .*' "$log" || true)
  [ -n "$line" ] && break
  sleep 2
done
echo "${line:-no BKT_SMOKE line}"
if grep -q "FATAL EXCEPTION" "$log"; then grep -A20 "FATAL EXCEPTION" "$log"; exit 1; fi
case "$line" in
  "BKT_SMOKE ok "*) ;;
  *) grep -i "capacitor\|chromium\|console" "$log" | tail -40; exit 1 ;;
esac
echo "$line" | grep -q '"es:smoke-phone"' || { echo "the phone review did not come back from the server"; exit 1; }
echo "$line" | grep -q '"es:smoke-web"' || { echo "the web review did not reach the phone"; exit 1; }
echo "android sync round trip passed"
