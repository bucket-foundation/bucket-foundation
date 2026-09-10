from hte.hypothesis import Hypothesis, Placement
from hte.belief import Opinion
from hte.periods import Period, choose_period, load_periods
from hte.timeline import Interval
from hte.unknowns import GapNode


def test_load_periods_returns_four_seed_candidates():
    periods = load_periods()
    ids = {p.id for p in periods}
    assert ids == {
        "younger-dryas-boundary", "neolithic-anatolia", "bronze-age-collapse", "quantum-history",
    }
    for period in periods:
        assert period.start_year <= period.end_year
        assert period.expected_evidence_kinds
        assert period.gaps


def test_load_periods_resolves_calendars_to_astronomical_years():
    periods = {p.id: p for p in load_periods()}

    yd = periods["younger-dryas-boundary"]
    assert yd.start_year == -10950
    assert yd.end_year == -9750

    na = periods["neolithic-anatolia"]
    assert na.start_year == -9499
    assert na.end_year == -6999

    bac = periods["bronze-age-collapse"]
    assert bac.start_year == -1199
    assert bac.end_year == -1149

    qh = periods["quantum-history"]
    assert qh.start_year == 1900
    assert qh.end_year == 2026
    assert qh.corpus == "quantum-history"


def test_load_periods_unknown_calendar_kind_raises(tmp_path):
    import json

    bad_path = tmp_path / "bad-periods.json"
    bad_path.write_text(json.dumps([{
        "id": "x", "label": "X", "calendar": "martian", "expected_evidence_kinds": [], "factors": {},
    }]))
    import pytest
    with pytest.raises(ValueError, match="unknown calendar kind"):
        load_periods(bad_path)


def _period(id_, gaps, factors=None):
    return Period(
        id=id_, label=id_, corpus=None, start_year=0, end_year=1,
        calendar_note="", expected_evidence_kinds=["textual"],
        factors=factors or {"uncertainty": 1.0, "novelty": 0.0, "coverage_gap": 0.0, "historical_gap": 0.0, "disagreement": 0.0},
        gaps=gaps,
    )


def test_choose_period_prefers_higher_priority_candidate_by_default():
    high = _period("high", [GapNode(id="g1", kind="unexcavated-site", description="d", period_id="high", cost=1.0)],
                    factors={"uncertainty": 1.0, "novelty": 0.0, "coverage_gap": 0.0, "historical_gap": 0.0, "disagreement": 0.0})
    low = _period("low", [GapNode(id="g2", kind="unexcavated-site", description="d", period_id="low", cost=1.0)],
                   factors={"uncertainty": 0.1, "novelty": 0.0, "coverage_gap": 0.0, "historical_gap": 0.0, "disagreement": 0.0})

    result = choose_period([high, low], budget=10)
    assert result["chosen"] == "high"
    assert "high" in result["rationale"]
    assert result["candidates"][0]["id"] == "high"
    assert result["candidates"][0]["score"] > result["candidates"][1]["score"]


def test_choose_period_respects_budget_and_skips_unaffordable_gaps():
    period = _period("p", [
        GapNode(id="cheap", kind="unexcavated-site", description="d", period_id="p", cost=1.0),
        GapNode(id="expensive", kind="unexcavated-site", description="d", period_id="p", cost=100.0),
    ])
    result = choose_period([period], budget=5)
    entry = result["candidates"][0]
    assert entry["selected_gaps"] == ["cheap"]
    assert entry["spent"] == 1.0
    assert entry["gap_count"] == 1
    assert entry["of_total_gaps"] == 2


def test_choose_period_folds_in_value_of_information_when_given_opinions():
    from hte.concepts import Slot, Vocabulary, other_id
    vocab = Vocabulary()
    placement = Placement(
        actor=other_id(Slot.ACTOR), action=other_id(Slot.ACTION), object=other_id(Slot.OBJECT),
        place=other_id(Slot.PLACE), mechanism=other_id(Slot.MECHANISM),
        interval=Interval(start=1900, end=1900),
    )
    hyp = Hypothesis.from_placement(placement, vocab, claims=[])
    opinions = {hyp.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5)}

    gap = GapNode(id="g", kind="unexcavated-site", description="d", period_id="p", would_move=[hyp.address], cost=1.0)
    period = _period("p", [gap], factors={"uncertainty": 0.0, "novelty": 0.0, "coverage_gap": 0.0, "historical_gap": 0.0, "disagreement": 0.0})

    no_voi = choose_period([period], budget=5)
    with_voi = choose_period([period], budget=5, hypotheses=[hyp], opinions=opinions)

    assert no_voi["candidates"][0]["voi_total"] == 0.0
    assert with_voi["candidates"][0]["voi_total"] == 1.0  # u^2 = 1.0^2
    assert with_voi["candidates"][0]["score"] > no_voi["candidates"][0]["score"]


def test_choose_period_empty_candidates_chooses_none():
    result = choose_period([], budget=10)
    assert result["chosen"] is None
    assert result["candidates"] == []
    assert "nothing chosen" in result["rationale"]
