#!/usr/bin/env bash
# One-line canon-intake status. Mirrors pursue-status.sh; used by bkt-nuc
# session start. Reports branch coverage (the audit's headline metric).
S="$HOME/agfarms/bucket-foundation/_intake/canon-intake/.status.json"
TIMER=$(systemctl --user is-active canon-intake.timer 2>/dev/null || echo "inactive")
if [ ! -f "$S" ]; then
  echo "[canon-intake] never run · timer=$TIMER · run: bash scripts/canon-intake-runner.sh"
  exit 0
fi
python3 - "$S" "$TIMER" <<'PY'
import json, sys
s = json.load(open(sys.argv[1])); timer = sys.argv[2]
done = s.get("complete")
mark = "✅" if done else "⏳"
print(
  f"[canon-intake] {mark} branches={s['branches_covered']}/{s['branches_total']} "
  f"folders={s['folders_converged']}/{s['folders_total']} "
  f"records={s['records_total']} fail={s['folders_failed']} "
  f"min_score={s['min_score']} · timer={timer} · {s['last_run']}"
)
PY
