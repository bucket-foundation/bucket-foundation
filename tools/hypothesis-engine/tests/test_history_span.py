import json
from pathlib import Path

import pytest

from hte.history_span import PRECISION_RESOLUTION, factoid_interval, period_from_row, precision_resolution
from hte.timeline import Interval, NodeLevel, Resolution, Uncertainty, UncertaintyKind

REPO_ROOT = Path(__file__).resolve().parents[3]
GOLDEN_RELATIVE = Path("scripts/fixtures/history-span-golden.json")
GOLDEN = REPO_ROOT / GOLDEN_RELATIVE

def _golden() -> dict:
    assert GOLDEN.is_file(), f"golden file missing: {GOLDEN_RELATIVE}"
    return json.loads(GOLDEN.read_text(encoding="utf-8"))

def _accepted() -> list[tuple[str, dict]]:
    out = []
    for case in _golden()["cases"]:
        expect = case["expect"]
        if "span" in expect:
            out.append((case["id"], expect["span"]))
        for role, span in expect.get("roles", {}).items():
            out.append((f"{case['id']}:{role}", span))
    return out

ACCEPTED = _accepted()

def test_golden_file_is_read_by_repo_relative_path_and_has_the_accepted_cases():
    assert (REPO_ROOT / "tools/hypothesis-engine/tests" / Path(__file__).name).is_file()
    assert len(ACCEPTED) >= 150

@pytest.mark.parametrize("case_id,span", ACCEPTED, ids=[c for c, _ in ACCEPTED])
def test_accepted_case_maps_to_an_interval_with_the_same_bounds(case_id, span):
    interval = factoid_interval(span)
    assert (interval.start, interval.end) == (span["start_year"], span["end_year"])
    assert interval.uncertainty.to_dict() == span["uncertainty"]
    if interval.uncertainty.kind is UncertaintyKind.UNIFORM:
        params = interval.uncertainty.params
        assert (params["min"], params["max"]) == (span["start_min"], span["end_max"])
        assert params["endpoints"] == {"start": [span["start_min"], span["start_max"]], "end": [span["end_min"], span["end_max"]]}
    else:
        assert span["start_min"] == span["start_max"] and span["end_min"] == span["end_max"]
    assert Interval.from_dict(interval.to_dict()) == interval
    assert precision_resolution(span["precision"]) is PRECISION_RESOLUTION[span["precision"]]

def test_precision_table_matches_the_plan():
    assert PRECISION_RESOLUTION == {
        "day": Resolution.YEAR,
        "month": Resolution.YEAR,
        "year": Resolution.YEAR,
        "decade": Resolution.DECADE,
        "century": Resolution.CENTURY,
        "millennium": Resolution.MILLENNIUM,
        "ka": Resolution.MILLENNIUM,
        "10ka": Resolution.ERA,
        "100ka": Resolution.ERA,
    }
    with pytest.raises(ValueError):
        precision_resolution("week")

def test_every_golden_precision_has_a_resolution():
    assert {s["precision"] for _, s in ACCEPTED} <= set(PRECISION_RESOLUTION)

def test_collapsed_bounds_give_a_point():
    interval = factoid_interval({"start_year": 1777, "end_year": 1777, "start_min": 1777, "start_max": 1777, "end_min": 1777, "end_max": 1777})
    assert interval.uncertainty == Uncertainty.point()

@pytest.mark.parametrize(
    "row",
    [
        {"start_year": 1, "end_year": 1, "start_min": 2, "start_max": 1, "end_min": 1, "end_max": 1},
        {"start_year": 5, "end_year": 5, "start_min": 1, "start_max": 3, "end_min": 1, "end_max": 3},
        {"start_year": 1, "end_year": 1, "start_min": 1, "start_max": 1, "end_min": 1},
        {"start_year": 1, "end_year": 1, "start_min": 1, "start_max": 5, "end_min": 0, "end_max": 5},
    ],
)
def test_bad_bounds_raise(row):
    with pytest.raises(ValueError):
        factoid_interval(row)

def test_period_interval_runs_from_start_min_to_end_max():
    period = period_from_row(
        {"id": "p0kh9ds", "label": "Bronze Age", "spatial_qids": ["Q41"], "start_min": -3200, "start_max": -3000, "end_min": -1200, "end_max": -1000}
    )
    assert period.level is NodeLevel.PERIOD
    assert (period.interval.start, period.interval.end) == (-3200, -1000)
    assert period.interval.uncertainty.params["endpoints"] == {"start": [-3200, -3000], "end": [-1200, -1000]}
    assert period.region == ["Q41"]
    assert period.disputed is False
    assert period.label == "Bronze Age"
