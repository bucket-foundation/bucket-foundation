#!/usr/bin/env bash
set -u

REPO="$HOME/agfarms/bucket-foundation"
CANON="$REPO/bucket-canon"
PIPE="$REPO/tools/canon-pipeline/intake.py"
STATE="$REPO/_intake/canon-intake"
LOG="$STATE/runner.log"
LOCK="$STATE/.runner.lock"
STATUS="$STATE/.status.json"
MIN_SCORE="${CANON_MIN_SCORE:-30}"

while [ $# -gt 0 ]; do
  case "$1" in
    --min-score) MIN_SCORE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

mkdir -p "$STATE"
[ -f "$PIPE" ] || { echo "no intake.py, exiting"; exit 0; }
[ -d "$CANON" ] || { echo "no bucket-canon/, exiting"; exit 0; }

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

if [ "$total_folders" -gt 0 ] && [ "$conv_fail" -eq 0 ]; then
  systemctl --user stop canon-intake.timer 2>/dev/null || true
  systemctl --user disable canon-intake.timer 2>/dev/null || true
  echo "[$(date -Iseconds)] === CLEAN PASS - timer disabled (re-enable when new queries.txt land) ===" >> "$LOG"
fi
