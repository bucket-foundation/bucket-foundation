#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
lake build
lake env lean Check.lean > check-output.txt
if grep -Eq 'sorryAx|native_decide|^axiom ' PrimeDirections/*.lean check-output.txt; then
  echo "sorry or extra axiom found" >&2
  exit 1
fi
python3 - <<'PY'
from pathlib import Path

allowed = {"propext", "Classical.choice", "Quot.sound"}
for line in Path("check-output.txt").read_text().splitlines():
    if line.endswith("does not depend on any axioms"):
        continue
    names = set(line.split("depends on axioms: ", 1)[1].strip("[]").split(", "))
    if names - allowed:
        raise SystemExit(f"unapproved axioms: {line}")
PY
cat check-output.txt
