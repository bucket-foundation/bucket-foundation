#!/usr/bin/env bash
set -euo pipefail
app=$1
id=foundation.bucket.app
udid=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; d=json.load(sys.stdin)["devices"]; print(next(x["udid"] for k,v in d.items() if "iOS" in k for x in v if x["name"].startswith("iPhone")))')
xcrun simctl boot "$udid" || true
xcrun simctl bootstatus "$udid" -b
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" "$id"
sleep 20
xcrun simctl spawn "$udid" launchctl list | grep -q "$id" || { echo "app is not running"; exit 1; }
echo "ios smoke passed"
