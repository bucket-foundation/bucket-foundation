#!/usr/bin/env bash
#
# dispatch-pending-beads.sh — once the bucket-foundation Nucleus
# instance's /issues route is restored (or the org-level dispatch creds
# are corrected), this script walks BEADS-PENDING.jsonl and POSTs each
# entry as a real bead. After a successful POST the line is moved to
# BEADS-DISPATCHED.jsonl with the returned bead id so we never
# double-file.
#
# Usage:
#   NUCLEUS_ADMIN_USER=... NUCLEUS_ADMIN_PASSWORD=... \
#     ./scripts/dispatch-pending-beads.sh
#
# Behaviour:
#   • Tries the direct-instance path first: POST $INSTANCE/issues
#   • On 404 or 401 falls back to: POST https://nucleus.agfarms.dev/api/portfolio/dispatch
#   • Idempotent — re-runnable. Already-dispatched entries are not re-sent.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PENDING="$ROOT/BEADS-PENDING.jsonl"
DISPATCHED="$ROOT/BEADS-DISPATCHED.jsonl"
INSTANCE_URL="https://bucket-foundation.nucleus.agfarms.dev"
ORG_URL="https://nucleus.agfarms.dev/api/portfolio/dispatch"

: "${NUCLEUS_ADMIN_USER:?must export NUCLEUS_ADMIN_USER}"
: "${NUCLEUS_ADMIN_PASSWORD:?must export NUCLEUS_ADMIN_PASSWORD}"

[ -f "$PENDING" ] || { echo "no $PENDING — nothing to do" >&2; exit 0; }

touch "$DISPATCHED"

count_pending=$(wc -l < "$PENDING")
count_done=$(wc -l < "$DISPATCHED")
echo "[dispatch] pending=$count_pending already-dispatched=$count_done"

tmp_remaining="$(mktemp)"
trap 'rm -f "$tmp_remaining"' EXIT

while IFS= read -r line; do
  [ -z "$line" ] && continue

  title=$(echo "$line" | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["title"])')

  # Skip if already dispatched (match on title)
  if grep -Fq "\"title\":\"$title\"" "$DISPATCHED" 2>/dev/null; then
    echo "  [skip] $title"
    continue
  fi

  echo "  [post] $title"

  # Try the direct-instance path first.
  resp=$(curl -sS -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
    -X POST "$INSTANCE_URL/issues" \
    -H "Content-Type: application/json" \
    -d "$line" 2>&1 || true)
  code=$(curl -sS -o /dev/null -w "%{http_code}" -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
    -X POST "$INSTANCE_URL/issues" \
    -H "Content-Type: application/json" \
    -d "$line" 2>&1 || true)

  if [ "$code" != "200" ] && [ "$code" != "201" ]; then
    # Fallback: org-level dispatch.
    echo "    direct $code → trying org dispatch"
    resp=$(curl -sS -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
      -X POST "$ORG_URL" \
      -H "Content-Type: application/json" \
      -d "$line" 2>&1 || true)
    code=$(curl -sS -o /dev/null -w "%{http_code}" -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
      -X POST "$ORG_URL" \
      -H "Content-Type: application/json" \
      -d "$line" 2>&1 || true)
  fi

  if [ "$code" = "200" ] || [ "$code" = "201" ]; then
    bead_id=$(echo "$resp" | python3 -c 'import json,sys
try:
    d=json.loads(sys.stdin.read())
    print(d.get("id") or d.get("bead_id") or d.get("issue_id") or "?")
except Exception:
    print("?")' 2>/dev/null || echo "?")
    echo "    OK → $bead_id"
    echo "$line" | python3 -c "import json,sys; d=json.loads(sys.stdin.read()); d['_dispatched_id']='$bead_id'; print(json.dumps(d))" >> "$DISPATCHED"
  else
    echo "    FAIL ($code) — keeping in pending"
    echo "$line" >> "$tmp_remaining"
  fi
done < "$PENDING"

# Rewrite pending with only the failures.
mv "$tmp_remaining" "$PENDING"
echo "[dispatch] done. dispatched=$(wc -l < "$DISPATCHED") still-pending=$(wc -l < "$PENDING")"
