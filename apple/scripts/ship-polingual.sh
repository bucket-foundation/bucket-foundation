#!/bin/bash
set -euo pipefail
mode=${1:?usage: ship-polingual.sh beta|release "notes"}
notes=${2:-}
here=$(cd "$(dirname "$0")" && pwd)
out=$(mktemp -d /private/tmp/polingual-ship.XXXX)
case "$mode" in
  beta) kind=testflight; push=external ;;
  release) kind=review; push=release; [ -n "$notes" ] || { echo "release needs What's New notes"; exit 64; } ;;
  *) echo "mode must be beta or release"; exit 64 ;;
esac
"$here/archive-polingual.sh" "$kind" "$out" | tee "$out/archive.log"
build=$(sed -n 's/^archived Polingual \([0-9.]*\) .*/\1/p' "$out/archive.log")
~/code/.wt/buildq sudo launchctl asuser 501 sudo -u g env PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/Users/g LANG=en_US.UTF-8 \
  xcodebuild -exportArchive -archivePath "$out/Polingual.xcarchive" \
  -exportOptionsPlist "$here/exportOptions.plist" -exportPath "$out/export" -allowProvisioningUpdates
python3 "$here/../AppStore/polingual_ship.py" "$push" --build "$build" --notes "$notes" --apply "${@:3}"
