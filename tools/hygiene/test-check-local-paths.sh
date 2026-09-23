#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

CHECK="python3 tools/hygiene/check-local-paths.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fail=0
assert_exit() {
  local desc="$1" want="$2" got="$3"
  if [ "$got" -eq "$want" ]; then
    echo "ok   - $desc"
  else
    echo "FAIL - $desc (expected exit $want, got $got)"
    fail=1
  fi
}

cat > "$TMP/clean.md" <<'EOF'
No local paths here. Use ~/agfarms/bucket-foundation instead.
EOF
set +e
$CHECK "$TMP/clean.md" >/tmp/hygiene-test-out-1 2>&1
rc=$?
set -e
assert_exit "clean file passes" 0 "$rc"

cat > "$TMP/dirty.md" <<'EOF'
See /home/alice/agfarms/bucket-foundation/notes.md for details.
EOF
set +e
$CHECK "$TMP/dirty.md" >/tmp/hygiene-test-out-2 2>&1
rc=$?
set -e
assert_exit "new /home/<user> path fails" 1 "$rc"
grep -q "/home/alice" /tmp/hygiene-test-out-2 || { echo "FAIL - offending path not reported"; fail=1; }

cat > "$TMP/dirty2.md" <<'EOF'
Runner cwd was /home/build-bot-7/.cache, not portable.
EOF
set +e
$CHECK "$TMP/dirty2.md" >/tmp/hygiene-test-out-3 2>&1
rc=$?
set -e
assert_exit "generic username shape fails" 1 "$rc"

set +e
$CHECK PRODUCTION_LOG.md >/tmp/hygiene-test-out-4 2>&1
rc=$?
set -e
assert_exit "allowlisted file (PRODUCTION_LOG.md) passes" 0 "$rc"

if [ "$fail" -ne 0 ]; then
  echo
  echo "check-local-paths.py fixture test: FAILED"
  exit 1
fi
echo
echo "check-local-paths.py fixture test: all checks passed"
