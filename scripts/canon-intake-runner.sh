#!/usr/bin/env bash
# Idempotent, convergent canon-intake runner — all 7+ canon branches.
#
# Walks every bucket-canon/<NN-branch>/<concept>/ that has a queries.txt and
# converges it into primary-papers.yaml via tools/canon-pipeline/intake.py
# (free zero-key metadata APIs: OpenAlex / Crossref / PubMed / arXiv — NEVER
# the x402 gateway; citation-only canon needs no wallet and no payment).
#
# Safe to run repeatedly, safe to interrupt: intake.py is convergent (dedup by
# DOI, supersede->archive, fail-safe — a transient API failure never drops a
# previously-good record). Designed to be invoked by:
#   - systemd --user timer (canon-intake.timer, hourly; self-disables clean)
#   - @reboot / bkt-nuc session startup
#   - manually:  bash scripts/canon-intake-runner.sh [--min-score N]
#
# Mirrors the war.gov pursue-mirror-runner.sh pattern: single-instance flock,
# .status.json snapshot, timer self-disable on a clean (zero-fail) full pass.
set -u

REPO="$HOME/agfarms/bucket-foundation"
CANON="$REPO/bucket-canon"
PIPE="$REPO/tools/canon-pipeline/intake.py"
STATE="$REPO/_intake/canon-intake"
LOG="$STATE/runner.log"
LOCK="$STATE/.runner.lock"
STATUS="$STATE/.status.json"
MIN_SCORE="${CANON_MIN_SCORE:-30}"

# Allow `--min-score N` passthrough.
while [ $# -gt 0 ]; do
  case "$1" in
    --min-score) MIN_SCORE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

mkdir -p "$STATE"
[ -f "$PIPE" ] || { echo "no intake.py, exiting"; exit 0; }
[ -d "$CANON" ] || { echo "no bucket-canon/, exiting"; exit 0; }

# Single-instance lock (same idiom as pursue-mirror-runner.sh).
exec 9> "$LOCK"
flock -n 9 || { echo "[$(date -Iseconds)] another runner active, skip" >> "$LOG"; exit 0; }

echo "[$(date -Iseconds)] === canon-intake start (min_score=$MIN_SCORE) ===" >> "$LOG"

folders=$(find "$CANON" -maxdepth 3 -name queries.txt -printf '%h\n' | sort)
[ -z "$folders" ] && { echo "[$(date -Iseconds)] no queries.txt anywhere yet" >> "$LOG"; }

total_folders=0; conv_ok=0; conv_fail=0; total_records=0
while IFS= read -r folder; do
  [ -z "$folder" ] && continue
  total_folders=$((total_folders + 1))
  rel="${folder#$CANON/}"
  echo "[$(date -Iseconds)] converge $rel" >> "$LOG"
  if out=$(cd "$REPO" && python3 "$PIPE" "$folder" --min-score "$MIN_SCORE" 2>>"$LOG"); then
    echo "  $out" >> "$LOG"
    conv_ok=$((conv_ok + 1))
    n=$(echo "$out" | sed -n 's/.*total=\([0-9]*\).*/\1/p')
    total_records=$((total_records + ${n:-0}))
  else
    conv_fail=$((conv_fail + 1))
    echo "  CONVERGE-FAIL $rel" >> "$LOG"
  fi
  sleep 1   # polite pacing between folders (resolvers also self-throttle)
done <<< "$folders"

# Branch coverage snapshot: how many of the 7+ branches now have >=1 yaml.
branches_total=$(find "$CANON" -maxdepth 1 -type d -name '[0-9][0-9]-*' | wc -l)
branches_covered=$(find "$CANON" -maxdepth 3 -name primary-papers.yaml -printf '%h\n' \
  | sed "s#$CANON/##; s#/.*##" | sort -u | grep -c '^[0-9][0-9]-' || echo 0)

echo "[$(date -Iseconds)] === done: folders=$total_folders ok=$conv_ok fail=$conv_fail records=$total_records branches=$branches_covered/$branches_total ===" >> "$LOG"

cat > "$STATUS" <<EOF
{
  "last_run": "$(date -Iseconds)",
  "folders_total": $total_folders,
  "folders_converged": $conv_ok,
  "folders_failed": $conv_fail,
  "records_total": $total_records,
  "branches_covered": $branches_covered,
  "branches_total": $branches_total,
  "min_score": $MIN_SCORE,
  "complete": $([ "$total_folders" -gt 0 ] && [ "$conv_fail" -eq 0 ] && echo true || echo false)
}
EOF

# Self-disable on a clean full pass (zero converge failures over >=1 folder),
# exactly like pursue-mirror.timer. Re-enable when new queries.txt land:
#   systemctl --user enable --now canon-intake.timer
if [ "$total_folders" -gt 0 ] && [ "$conv_fail" -eq 0 ]; then
  systemctl --user stop canon-intake.timer 2>/dev/null || true
  systemctl --user disable canon-intake.timer 2>/dev/null || true
  echo "[$(date -Iseconds)] === CLEAN PASS - timer disabled (re-enable when new queries.txt land) ===" >> "$LOG"
fi
