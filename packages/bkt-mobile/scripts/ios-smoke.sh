#!/usr/bin/env bash
set -euo pipefail
app=$1
id=foundation.bucket.app
attempts=${SMOKE_ATTEMPTS:-3}
wait_s=${SMOKE_WAIT_S:-60}
pause_s=${SMOKE_PAUSE_S:-15}
udid=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; d=json.load(sys.stdin)["devices"]; print(next(x["udid"] for k,v in d.items() if "iOS" in k for x in v if x["name"].startswith("iPhone")))')
xcrun simctl boot "$udid" || true
xcrun simctl bootstatus "$udid" -b
sleep "$pause_s"
xcrun simctl install "$udid" "$app"

running() {
  xcrun simctl spawn "$udid" launchctl list 2>/dev/null | grep -q "$id"
}

for n in $(seq 1 "$attempts"); do
  if xcrun simctl launch "$udid" "$id"; then
    for _ in $(seq 1 "$wait_s"); do
      if running; then
        sleep 5
        if running; then
          echo "ios smoke passed on attempt $n"
          exit 0
        fi
      fi
      sleep 1
    done
    echo "attempt $n: app not running after ${wait_s}s"
  else
    echo "attempt $n: launch failed"
  fi
  xcrun simctl terminate "$udid" "$id" 2>/dev/null || true
  sleep "$pause_s"
done
echo "app is not running"
exit 1
