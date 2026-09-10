"""Property tests over `hte.periods`: `choose_period`'s determinism and
its own budget contract, and the calendar resolution feeding `Period`."""
from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import periods


def _period(pid: str, gaps: list[periods.GapNode], factors: dict[str, float] | None = None) -> periods.Period:
    return periods.Period(
        id=pid, label=pid, corpus=None, start_year=0, end_year=100,
        calendar_note="", expected_evidence_kinds=[],
        factors=factors or {"uncertainty": 0.2, "novelty": 0.2, "coverage_gap": 0.2, "historical_gap": 0.2, "disagreement": 0.2},
        gaps=gaps,
    )


def _gap(gid: str, cost: float) -> periods.GapNode:
    return periods.GapNode(id=gid, kind="site", description="d", would_move=[], cost=cost)


gap_costs = st.lists(st.floats(min_value=0.1, max_value=20.0, allow_nan=False, allow_infinity=False), min_size=0, max_size=8)


# --------------------------------------------------------------------------
# choose_period: deterministic under equal inputs
# --------------------------------------------------------------------------


@given(gap_costs, gap_costs, st.floats(min_value=1.0, max_value=50.0, allow_nan=False, allow_infinity=False))
def test_choose_period_is_deterministic_under_equal_inputs(costs_a, costs_b, budget):
    candidates = [
        _period("alpha", [_gap(f"a{i}", c) for i, c in enumerate(costs_a)]),
        _period("beta", [_gap(f"b{i}", c) for i, c in enumerate(costs_b)]),
    ]
    result1 = periods.choose_period(candidates, budget=budget)
    result2 = periods.choose_period(candidates, budget=budget)
    assert result1["chosen"] == result2["chosen"]
    assert result1["candidates"] == result2["candidates"]
    assert result1["rationale"] == result2["rationale"]


@given(gap_costs, st.floats(min_value=1.0, max_value=50.0, allow_nan=False, allow_infinity=False))
def test_choose_period_never_spends_past_its_own_budget(costs, budget):
    candidate = _period("alpha", [_gap(f"g{i}", c) for i, c in enumerate(costs)])
    result = periods.choose_period([candidate], budget=budget)
    for entry in result["candidates"]:
        assert entry["spent"] <= budget + 1e-9


def test_choose_period_of_no_candidates_chooses_nothing():
    result = periods.choose_period([], budget=10.0)
    assert result["chosen"] is None
    assert result["candidates"] == []
    assert "nothing chosen" in result["rationale"]


def test_choose_period_picks_the_higher_scoring_candidate():
    high = _period("high-priority", [_gap("h1", 1.0)], factors={"uncertainty": 1.0, "novelty": 1.0, "coverage_gap": 1.0, "historical_gap": 1.0, "disagreement": 1.0})
    low = _period("low-priority", [_gap("l1", 1.0)], factors={"uncertainty": 0.0, "novelty": 0.0, "coverage_gap": 0.0, "historical_gap": 0.0, "disagreement": 0.0})
    result = periods.choose_period([low, high], budget=10.0)
    assert result["chosen"] == "high-priority"


def test_choose_period_a_zero_cost_gap_never_starves_the_budget():
    candidate = _period("alpha", [_gap("free", 0.0)])
    result = periods.choose_period([candidate], budget=0.0)
    assert result["candidates"][0]["spent"] == 0.0
    assert result["candidates"][0]["gap_count"] == 1


# --------------------------------------------------------------------------
# _resolve_calendar (through load_periods): every direction normalizes to
# start_year <= end_year
# --------------------------------------------------------------------------


@given(st.integers(min_value=1, max_value=50_000), st.integers(min_value=1, max_value=50_000))
def test_resolve_calendar_bce_always_orders_start_before_end(bce_a, bce_b):
    entry = {"calendar": "bce", "start_bce": bce_a, "end_bce": bce_b}
    start, end = periods._resolve_calendar(entry)
    assert start <= end


@given(st.integers(min_value=1, max_value=3000), st.integers(min_value=1, max_value=3000))
def test_resolve_calendar_ce_always_orders_start_before_end(ce_a, ce_b):
    entry = {"calendar": "ce", "start_ce": ce_a, "end_ce": ce_b}
    start, end = periods._resolve_calendar(entry)
    assert start <= end


@given(st.floats(min_value=0.1, max_value=100.0, allow_nan=False), st.floats(min_value=0.1, max_value=100.0, allow_nan=False))
def test_resolve_calendar_ka_always_orders_start_before_end(ka_a, ka_b):
    entry = {"calendar": "ka", "start_ka": ka_a, "end_ka": ka_b}
    start, end = periods._resolve_calendar(entry)
    assert start <= end


def test_resolve_calendar_rejects_unknown_calendar_kind():
    with pytest.raises(ValueError):
        periods._resolve_calendar({"calendar": "stardate"})


def test_load_periods_shipped_seed_file_parses_without_error():
    loaded = periods.load_periods()
    assert len(loaded) > 0
    for p in loaded:
        assert p.start_year <= p.end_year
