#!/usr/bin/env bash
# Fixture test for check-local-paths.py. Not wired into CI (the checker
# itself is); run by hand after touching the checker or the allowlist:
#   bash tools/hygiene/test-check-local-paths.sh
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

# 1. A clean file must pass.
cat > "$TMP/clean.md" <<'EOF'
No local paths here. Use ~/agfarms/bucket-foundation instead.
EOF
set +e
$CHECK "$TMP/clean.md" >/tmp/hygiene-test-out-1 2>&1
rc=$?
set -e
assert_exit "clean file passes" 0 "$rc"

# 2. A file with a fresh /home/<user> path must fail.
cat > "$TMP/dirty.md" <<'EOF'
See /home/alice/agfarms/bucket-foundation/notes.md for details.
EOF
set +e
$CHECK "$TMP/dirty.md" >/tmp/hygiene-test-out-2 2>&1
rc=$?
set -e
assert_exit "new /home/<user> path fails" 1 "$rc"
grep -q "/home/alice" /tmp/hygiene-test-out-2 || { echo "FAIL - offending path not reported"; fail=1; }

# 3. A different username shape must also be caught (not hardcoded to "gian").
cat > "$TMP/dirty2.md" <<'EOF'
Runner cwd was /home/build-bot-7/.cache, not portable.
EOF
set +e
$CHECK "$TMP/dirty2.md" >/tmp/hygiene-test-out-3 2>&1
rc=$?
set -e
assert_exit "generic username shape fails" 1 "$rc"

# 4. Real allowlisted files (existing /home/gian text) must still pass via --all.
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
