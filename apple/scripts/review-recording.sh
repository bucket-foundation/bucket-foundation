#!/bin/sh
set -eu
app="${1:?usage: review-recording.sh polingual|bucket device|device-check|sim}"
where="${2:?usage: review-recording.sh polingual|bucket device|device-check|sim}"
test=testRecordingFlow
if [ "$where" = device-check ]; then where=device; test=testScreenRecordingToggle; fi
case "$app" in
  polingual) scheme=PolingualUI; suite=PolingualUITests ;;
  bucket) scheme=BucketUI; suite=BucketUITests ;;
  *) echo "unknown app $app"; exit 64 ;;
esac
apple="$(cd "$(dirname "$0")/.." && pwd)"
dd="$HOME/code/.wt/.dd"
(cd "$apple" && xcodegen generate --spec project.yml)
if [ "$where" = sim ]; then
  exec "$HOME/code/.wt/buildq" xcodebuild test -project "$apple/Bucket.xcodeproj" -scheme "$scheme" \
    -destination "platform=iOS Simulator,id=ED83F68A-E9E7-4CCF-8EAC-CF73A5A6085B" \
    -derivedDataPath "$dd" -clonedSourcePackagesDirPath "$dd/spm" \
    -only-testing:"$suite/ReviewRecordingUITests/$test"
fi
: "${REVIEW_DEMO_EMAIL:?set the demo account address}"
: "${REVIEW_NEW_EMAIL:?set a fresh address to register and delete}"
: "${REVIEW_GROUP:?set the seeded group name}"
: "${REVIEW_MEMBER:?set the seeded member name}"
exec "$HOME/code/.wt/buildq" sudo launchctl asuser 501 sudo -u g env PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/Users/g LANG=en_US.UTF-8 \
  TEST_RUNNER_REVIEW_DEMO_EMAIL="$REVIEW_DEMO_EMAIL" TEST_RUNNER_REVIEW_NEW_EMAIL="$REVIEW_NEW_EMAIL" \
  TEST_RUNNER_REVIEW_GROUP="$REVIEW_GROUP" TEST_RUNNER_REVIEW_MEMBER="$REVIEW_MEMBER" \
  TEST_RUNNER_REVIEW_DEMO_CODE="${REVIEW_DEMO_CODE:-}" \
  xcodebuild test -project "$apple/Bucket.xcodeproj" -scheme "$scheme" \
  -destination "id=00008120-001E5CEE0C44201E" -allowProvisioningUpdates DEVELOPMENT_TEAM=QQ6D6A2LLS \
  -derivedDataPath "$dd" -clonedSourcePackagesDirPath "$dd/spm" \
  -only-testing:"$suite/ReviewRecordingUITests/$test"
