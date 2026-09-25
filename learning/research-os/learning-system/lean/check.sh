#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
lake build
lake env lean LearningSystem.lean > check-output.txt
if grep -Eq 'sorryAx|native_decide|^axiom |^ *sorry([[:space:]]|$)' LearningSystem.lean check-output.txt; then
  exit 1
fi
python3 - <<'PY_AUDIT'
from pathlib import Path

allowed = {"propext", "Classical.choice", "Quot.sound"}
lines = Path("check-output.txt").read_text().splitlines()
if len(lines) != 10:
    raise SystemExit("Unexpected axiom audit length")
for line in lines:
    if line.endswith(" does not depend on any axioms"):
        continue
    marker = " depends on axioms: "
    if marker not in line:
        raise SystemExit("Unexpected axiom audit output")
    names = line.split(marker, 1)[1].strip("[]").split(", ")
    if set(names) - allowed:
        raise SystemExit("Unapproved axiom dependency")
PY_AUDIT
cat check-output.txt
