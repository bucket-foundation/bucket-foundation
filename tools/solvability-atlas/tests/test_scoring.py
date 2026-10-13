import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import scoring

HERE = Path(__file__).parent
ATLAS = HERE.parent
NEIGHBORS = ATLAS.parent.parent / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"


def test_seeded_random_matches_the_typescript_generator():
    draw = scoring.seeded_random(20261006)
    values = [draw() for _ in range(3)]
    assert all(0 <= v < 1 for v in values) and len(set(values)) == 3
    again = scoring.seeded_random(20261006)
    assert [again() for _ in range(3)] == values


def test_auc_counts_ties_as_half():
    assert scoring.auc([0.9, 0.8, 0.1], [True, False, False]) == 1.0
    assert scoring.auc([0.5, 0.5], [True, False]) == 0.5
    assert scoring.auc([0.5], [True]) is None


def test_permutation_p_is_bounded_and_deterministic():
    a = scoring.permutation_p([True] * 8 + [False] * 2, [False] * 9 + [True], 500, 7)
    assert a == scoring.permutation_p([True] * 8 + [False] * 2, [False] * 9 + [True], 500, 7)
    assert 1 / 501 <= a < 0.05


def test_python_scorer_matches_the_typescript_scorer_on_the_frozen_2021_forecast():
    expected = json.loads((HERE / "fixtures" / "ts-score-2021.json").read_text())
    forecast = json.loads((ATLAS / "forecasts" / "2021.json").read_text())
    data = json.loads(NEIGHBORS.read_text())
    status = {n["id"]: {"status": n["status"], "solved": n["solved"], "resolved": n["resolved"]} for n in data["nodes"]}
    got = scoring.score_forecast(forecast, status)
    for key in ("cutoff", "tested", "unsampled", "undecided", "aucRows"):
        assert got[key] == expected[key]
    assert got["threshold"] == pytest.approx(expected["threshold"], abs=5e-4)
    assert got["auc"] == pytest.approx(expected["auc"], abs=5e-4)
    assert got["undatedRemoved"]["auc"] == pytest.approx(expected["undatedRemoved"]["auc"], abs=5e-4)
    for field in ("inside", "outside", "resolvedInside", "resolvedOutside"):
        assert got["all"][field] == expected["all"][field]
    for field in ("rateInside", "rateOutside", "ratio", "pValue"):
        assert got["all"][field] == pytest.approx(expected["all"][field], abs=5e-4)
    assert got["undatedRemoved"]["all"]["pValue"] == pytest.approx(expected["undatedRemoved"]["all"]["pValue"], abs=5e-4)
