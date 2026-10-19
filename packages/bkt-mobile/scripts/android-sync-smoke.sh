#!/usr/bin/env bash
set -euo pipefail
apk=$1
pkg=foundation.bucket.app
log="${RUNNER_TEMP:-/tmp}/sync-logcat.txt"
adb install -r "$apk"
adb logcat -c
adb shell monkey -p "$pkg" -c android.intent.category.LAUNCHER 1 >/dev/null
line=""
for _ in $(seq 1 120); do
  adb logcat -d > "$log"
  line=$(grep -o 'BKT_SMOKE \(ok\|fail\) .*' "$log" | head -1 || true)
  [ -n "$line" ] && break
  sleep 2
done
grep -o 'BKT_SMOKE step .*' "$log" | sort -u || true
echo "${line:-no final BKT_SMOKE line}"
if grep -q "FATAL EXCEPTION" "$log"; then grep -A20 "FATAL EXCEPTION" "$log"; exit 1; fi
case "$line" in
  "BKT_SMOKE ok "*) ;;
  *) grep -iE "Console|CapacitorHttp|SecureStorage|10\.0\.2\.2|cleartext" "$log" | tail -60 || true; exit 1 ;;
esac
echo "$line" | grep -q '"es:smoke-phone"' || { echo "the phone review did not come back from the server"; exit 1; }
echo "$line" | grep -q '"es:smoke-web"' || { echo "the web review did not reach the phone"; exit 1; }
echo "android sync round trip passed"
