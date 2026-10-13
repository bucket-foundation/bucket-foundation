import csv
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import backtest
import claims
import thresholds as th

ATLAS = Path(__file__).parent.parent
DOC = (ATLAS / "BACKTEST.md").read_text()
NAMES = {"solvability_score": "Solvability score", "formal_term_alone": "Formal term alone", "level_reversed": "Level, reversed", "year_posed": "Year posed", "market_count": "Market count"}


@pytest.fixture(scope="module")
def rows():
    return list(csv.DictReader(open(backtest.PROBLEMS), delimiter="\t"))


@pytest.fixture(scope="module")
def committed():
    return json.loads(backtest.RESULT.read_text())


def test_committed_result_is_what_the_script_computes(rows, committed):
    assert backtest.compute(rows) == committed
    assert backtest.RESULT.read_text() == json.dumps(committed, indent=1)


def test_weights_and_formal_values_match_the_atlas():
    assert (backtest.WEIGHT_RESOLVED, backtest.WEIGHT_FORMAL) == (th.SHIPPED["weight_resolved"], th.SHIPPED["weight_formal"])
    assert f"FORMAL = {json.dumps(backtest.FORMAL)}" in (ATLAS / "atlas.py").read_text()


def test_score_auc_is_one_because_the_score_holds_the_outcome(committed):
    assert committed["auc"]["solvability_score"] == {"auc": 1.0, "ci95": [1.0, 1.0]}
    assert backtest.WEIGHT_RESOLVED > backtest.WEIGHT_FORMAL * (max(backtest.FORMAL.values()) - min(backtest.FORMAL.values()))


def test_auc_counts_ties_as_half_and_reverses_with_the_sign():
    assert backtest.auc([1, 2, 3, 4], [False, False, True, True]) == 1.0
    assert backtest.auc([1, 1], [True, False]) == 0.5
    assert backtest.auc([3, 1, 2], [True, False, False]) == 1.0
    assert backtest.auc([-3, -1, -2], [True, False, False]) == 0.0


def test_a_claimed_row_has_no_resolved_year_and_counts_as_open(rows, committed):
    ruling = claims.governing(claims.entries())
    claimed = sorted(r["id"] for r in rows if ruling.get(r["id"], {}).get("status") == claims.CLAIMED)
    assert committed["claimed_counted_open"] == claimed
    assert all(not r["resolved"] for r in rows if r["id"] in claimed)
    assert committed["resolved"] == sum(1 for r in rows if r["resolved"])


def test_a_ledger_entry_for_the_full_problem_marks_the_row_claimed(rows):
    first_open = next(r["id"] for r in rows if not r["resolved"])
    ledger = [{"id": first_open, "match": claims.SETTLING_MATCH, "date": "2026-10-06", "family": "fixture", "confirmation": None, "withdrawn": None}]
    result = backtest.compute(rows, ledger)
    assert result["claimed_counted_open"] == [first_open]
    assert result["resolved"] == backtest.compute(rows, [])["resolved"]
    assert backtest.compute(rows, [])["claimed_counted_open"] == []


def test_every_table_row_in_the_doc_comes_from_the_result(committed):
    for key, name in NAMES.items():
        cell = committed["auc"][key]
        assert f"| {name} | {cell['auc']:.3f} | {cell['ci95'][0]:.3f} to {cell['ci95'][1]:.3f} |" in DOC
    for level, cell in committed["by_level"].items():
        assert f"| {level} | {cell['problems']} | {cell['resolved']} |" in DOC
    wait = committed["years_to_resolution"]
    assert f"{committed['resolved']} of {committed['problems']} problems are resolved" in DOC
    assert f"The median wait from posed to resolved is {wait['median']:.0f} years, range {wait['min']} to {wait['max']}" in DOC
    for claimed in committed["claimed_counted_open"]:
        assert f"`{claimed}`" in DOC


def test_the_doc_sends_no_high_score_to_a_prover():
    assert "gives no reason to hand a problem to a prover" in DOC
    assert "worth handing" not in DOC


def test_plot_draws_one_bar_per_feature(tmp_path, committed):
    target = tmp_path / "backtest.png"
    backtest.plot(committed, target)
    assert target.stat().st_size > 10_000
    assert set(backtest.LABELS) == set(committed["auc"])
