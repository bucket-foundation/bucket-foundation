import json
import os
import subprocess
from collections import Counter
from pathlib import Path

import pytest

from bucket_eval.curveball import curveball_trade, scramble, scramble_within, seeded_random

FIXTURE = Path(__file__).parent / "fixtures" / "curveball-parity.json"
REPO = Path(__file__).resolve().parents[3]

def columns(rows):
    return Counter(x for r in rows for x in r)

def test_margins_hold_after_ten_thousand_trades():
    rng = seeded_random("margins")
    rows = [sorted({int(rng() * 40) for _ in range(1 + int(rng() * 5))}) for _ in range(60)]
    before_sizes = [len(r) for r in rows]
    before_cols = columns(rows)
    rand = seeded_random("trades")
    for _ in range(10_000):
        curveball_trade(rows, rand)
    assert [len(r) for r in rows] == before_sizes
    assert columns(rows) == before_cols
    assert all(len(set(r)) == len(r) for r in rows)

def test_within_field_scramble_keeps_each_fields_margins():
    rows = [[1, 2], [2, 3], [1, 3, 4], [4, 5], [5, 6, 1], [6, 2], [3, 5], [1, 6]]
    fields = [10, 10, 10, 20, 20, 20, 10, 20]
    mixed = scramble_within(rows, fields, "within")
    for f in (10, 20):
        assert columns([r for r, g in zip(rows, fields) if g == f]) == columns([r for r, g in zip(mixed, fields) if g == f])
    assert [len(r) for r in mixed] == [len(r) for r in rows]
    assert mixed != rows
    assert scramble(rows, "same") == scramble(rows, "same")

def test_python_port_matches_the_frozen_typescript_output():
    doc = json.loads(FIXTURE.read_text())
    rand = seeded_random(doc["seed"])
    assert [rand() for _ in doc["draws"]] == doc["draws"]
    rows = [list(r) for r in doc["rows_in"]]
    rand = seeded_random(doc["seed"])
    for _ in range(doc["trades"]):
        curveball_trade(rows, rand)
    assert rows == doc["rows_out"]

def test_typescript_source_still_produces_the_fixture():
    source = Path(os.environ.get("CURVEBALL_TS_SOURCE", REPO / "src" / "lib" / "research-os" / "prime-algebra.ts"))
    if not source.exists():
        pytest.skip(f"{source} is absent on this branch; set CURVEBALL_TS_SOURCE to a checkout that has it")
    doc = json.loads(FIXTURE.read_text())
    blob = subprocess.run(["git", "hash-object", str(source)], capture_output=True, text=True, check=True).stdout.strip()
    run = subprocess.run(
        ["npx", "ts-node", "--compiler-options", '{"module":"commonjs"}', str(Path(__file__).parents[1] / "parity" / "curveball-parity.ts"), str(source)],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, run.stderr
    fresh = json.loads(run.stdout)
    assert {k: fresh[k] for k in ("draws", "rows_out")} == {k: doc[k] for k in ("draws", "rows_out")}, f"prime-algebra.ts at blob {blob} no longer matches the fixture from {doc['source_blob']}"
