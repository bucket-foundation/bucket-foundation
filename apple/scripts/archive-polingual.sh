#!/bin/bash
set -euo pipefail
mode=${1:?usage: archive-polingual.sh testflight|review}
out=${2:-/private/tmp/polingual-archive}
build=$(date +%y%m%d%H%M)
case "$mode" in
  testflight) free=YES; build="$build.1" ;;
  review) free=NO ;;
  *) echo "mode must be testflight or review"; exit 64 ;;
esac
cd "$(dirname "$0")/.."
xcodegen generate -q
~/code/.wt/buildq sudo launchctl asuser 501 sudo -u g env PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/Users/g LANG=en_US.UTF-8 \
  xcodebuild archive -project Bucket.xcodeproj -scheme Polingual -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$out/Polingual.xcarchive" \
  -allowProvisioningUpdates DEVELOPMENT_TEAM=QQ6D6A2LLS CODE_SIGN_STYLE=Automatic \
  CURRENT_PROJECT_VERSION="$build" POLINGUAL_FREE_BETA="$free"
echo "archived Polingual $build ($mode, free beta $free) at $out/Polingual.xcarchive"
