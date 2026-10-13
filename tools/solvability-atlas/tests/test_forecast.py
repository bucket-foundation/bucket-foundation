import copy
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import forecast


def node(i, ids, sims, **extra):
    others = [o for o in ids if o != i]
    order = sorted(others, key=lambda o: -sims.get(frozenset((i, o)), 0.1))
    base = {"id": i, "title": i, "branch": "mathematics", "kind": "sourced", "status": "open", "solved": False, "resolved": None, "posed": 1990, "words": 10,
            "n": [ids.index(o) for o in order], "s": [sims.get(frozenset((i, o)), 0.1) for o in order], "solved_nearest": None}
    base.update(extra)
    return base


def toy():
    ids = ["a", "b", "c", "d", "e", "f"]
    sims = {frozenset(k.split("|")): v for k, v in {"a|b": 0.9, "a|c": 0.85, "b|c": 0.8, "a|d": 0.3, "b|d": 0.2, "c|d": 0.3, "a|e": 0.88, "b|e": 0.7, "c|e": 0.6, "d|e": 0.2, "a|f": 0.75, "b|f": 0.7, "c|f": 0.7, "d|f": 0.2, "e|f": 0.6}.items()}
    nodes = [
        node("a", ids, sims, solved=True, status="solved", resolved=1950),
        node("b", ids, sims, solved=True, status="solved", resolved=1960),
        node("c", ids, sims, solved=True, status="solved", resolved=2010),
        node("d", ids, sims),
        node("e", ids, sims, status="partial"),
        node("f", ids, sims, posed=2015),
    ]
    return {"model": "m", "revision": "r", "k": 5, "ids": ids, "nodes": nodes}


def test_no_row_after_the_cutoff_enters():
    f = forecast.forecast(toy(), 2000, built="2026-10-07", min_branch_solved=2)
    assert {r["id"] for r in f["rows"]} == {"c", "d", "e"}
    assert all(r["posed"] <= 2000 for r in f["rows"])
    assert f["solved"] == 2


def test_a_solved_row_resolved_after_the_cutoff_is_tested_not_solved():
    f = forecast.forecast(toy(), 2000, min_branch_solved=2)
    row = next(r for r in f["rows"] if r["id"] == "c")
    assert row["reach"] == 0.85
    assert f["threshold"] == 0.9


def test_a_later_resolution_changes_nothing_in_the_forecast():
    base = forecast.forecast(toy(), 2000, built="x", min_branch_solved=2)
    later = toy()
    later["nodes"][3].update(solved=True, status="solved", resolved=2024)
    again = forecast.forecast(later, 2000, built="x", min_branch_solved=2)
    assert again == base


def test_threshold_changes_when_the_solved_set_changes():
    wide = forecast.forecast(toy(), 2020, min_branch_solved=2)
    narrow = forecast.forecast(toy(), 2000, min_branch_solved=2)
    assert wide["solved"] == 3 and narrow["solved"] == 2
    assert wide["threshold"] != narrow["threshold"]
    assert wide["input_hash"] != narrow["input_hash"]


def test_zones():
    f = forecast.forecast(toy(), 2000, min_branch_solved=2)
    zones = {r["id"]: r["zone"] for r in f["rows"]}
    assert zones == {"c": "outside", "d": "outside", "e": "outside"}
    sparse = forecast.forecast(toy(), 2000, min_branch_solved=3)
    assert {r["zone"] for r in sparse["rows"]} == {"unsampled"}


def test_hash_is_stable_and_ignores_the_build_date():
    a = forecast.forecast(toy(), 2000, built="2026-01-01", min_branch_solved=2)
    b = forecast.forecast(copy.deepcopy(toy()), 2000, built="2027-01-01", min_branch_solved=2)
    assert a["input_hash"] == b["input_hash"]


def test_too_few_solved_rows_is_refused():
    with pytest.raises(ValueError):
        forecast.forecast(toy(), 1955)


def test_write_round_trips(tmp_path):
    path = forecast.write(toy(), 2000, tmp_path)
    assert path.name == "2000.json"
    assert json.loads(path.read_text())["cutoff"] == 2000


@pytest.mark.skipif(not forecast.FORECASTS.exists() or not forecast.NEIGHBORS.exists(), reason="forecasts not built")
def test_committed_forecasts_match_the_neighbour_data():
    data = json.loads(forecast.NEIGHBORS.read_text())
    for cutoff in forecast.CUTOFFS:
        committed = json.loads((forecast.FORECASTS / f"{cutoff}.json").read_text())
        fresh = forecast.forecast(data, cutoff, built=committed["built"])
        assert committed == fresh
