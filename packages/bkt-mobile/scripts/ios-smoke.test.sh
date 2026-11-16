#!/usr/bin/env bash
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin"
cat > "$tmp/bin/xcrun" <<'SHIM'
#!/usr/bin/env bash
state=$SHIM_STATE
case "$1 $2" in
  "simctl list") echo '{"devices":{"com.apple.CoreSimulator.SimRuntime.iOS-27-0":[{"udid":"U1","name":"iPhone 16e"}]}}' ;;
  "simctl boot"|"simctl bootstatus"|"simctl install"|"simctl terminate") ;;
  "simctl launch")
    n=$(( $(cat "$state/launches" 2>/dev/null || echo 0) + 1 ))
    echo "$n" > "$state/launches"
    if [ "$n" -le "${FAIL_LAUNCHES:-0}" ]; then echo "Broken pipe" >&2; exit 1; fi
    echo "foundation.bucket.app: 123" ;;
  "simctl spawn")
    if [ "${NEVER_RUNS:-0}" = 1 ]; then echo "PID Status Label"; else echo "123 0 UIKitApplication:foundation.bucket.app[1]"; fi ;;
  *) echo "unexpected: $*" >&2; exit 2 ;;
esac
SHIM
chmod +x "$tmp/bin/xcrun"
fails=0
run() {
  local name=$1 want=$2; shift 2
  local state; state=$(mktemp -d "$tmp/s.XXXX")
  out=$(env "$@" SHIM_STATE="$state" PATH="$tmp/bin:$PATH" SMOKE_WAIT_S=2 SMOKE_PAUSE_S=0 bash "$here/ios-smoke.sh" /fake/App.app 2>&1)
  got=$?
  if [ "$got" = "$want" ]; then echo "ok   $name"; else echo "FAIL $name: exit $got want $want"; echo "$out"; fails=$((fails+1)); fi
}
run "runs on first launch" 0
run "retries after two failed launches" 0 FAIL_LAUNCHES=2
run "fails after every launch fails" 1 FAIL_LAUNCHES=5
run "fails when app never shows as running" 1 NEVER_RUNS=1
exit "$fails"
