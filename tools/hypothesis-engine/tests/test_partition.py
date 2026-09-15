import json

import pytest

from hte.address import DEFAULT_BIN_WIDTH, time_bin_index
from hte.belief import Constants, Opinion, pooled_weight
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.export import timeline_views, write_views
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.partition import EPSILON, partition, partition_odds
from hte.timeline import AllenRelation, Interval


def _placement(address, *, actor, obj="pyramid", place="giza", start=0) -> Hypothesis:
    p = Placement(actor=actor, action="built", object=obj, place=place, mechanism="labor", interval=Interval(start, start))
    return Hypothesis(address=address, content=p)


def _sequence(address, first, relation, second) -> Hypothesis:
    return Hypothesis(address=address, content=Sequence(first=first.content, relation=relation, second=second.content))


def _item(item_id, *, supports=(), refutes=()) -> EvidenceItem:
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    return EvidenceItem(id=item_id, kind=EvidenceKind.MATERIAL, tier=Tier.T3, source_id="src", span=span,
                         provenance="manual", supports=list(supports), refutes=list(refutes), views={"blended_a": 1.0})


def _younger_dryas():
    # STATISTICAL-AUDIT-2026-09-15.md's own case: meltwater and impact
    # carry the same (b, d, u) and differ only in the prior `a`.
    meltwater, impact = _placement(1, actor="meltwater-pulse"), _placement(2, actor="cosmic-impact")
    opinions = {
        meltwater.address: Opinion(b=0.502, d=0.0, u=0.498, a=0.941),
        impact.address: Opinion(b=0.502, d=0.0, u=0.498, a=0.562),
    }
    return meltwater, impact, opinions


def test_partition_groups_by_explanandum_placement_time_bin_and_sequence_pair():
    meltwater, impact, _ = _younger_dryas()
    later = _placement(3, actor="meltwater-pulse", start=DEFAULT_BIN_WIDTH * 5)
    a, b = _placement(4, actor="farmers", obj="wall", place="site-a"), _placement(5, actor="farmers", obj="temple", place="site-b")
    seqs = [_sequence(10, a, AllenRelation.BEFORE, b), _sequence(11, a, AllenRelation.MEETS, b)]

    groups = partition([meltwater, impact, later, *seqs])
    tbin_now, tbin_later = time_bin_index(0), time_bin_index(DEFAULT_BIN_WIDTH * 5)
    assert {h.address for h in groups[("placement", "pyramid", "giza", tbin_now)]} == {1, 2}
    assert [h.address for h in groups[("placement", "pyramid", "giza", tbin_later)]] == [3]
    assert {h.address for h in groups[("sequence", ("wall", "site-a"), ("temple", "site-b"))]} == {10, 11}


def test_shares_sum_to_one_singleton_is_trivial_and_identical_evidence_ties_the_factor():
    meltwater, impact, opinions = _younger_dryas()
    result = partition_odds([meltwater, impact], opinions)
    assert sum(e["share"] for e in result.values()) == pytest.approx(1.0)
    assert result[meltwater.address]["bayes_factor_vs_best"] == pytest.approx(1.0)
    assert result[impact.address]["bayes_factor_vs_best"] == pytest.approx(1.0)
    assert result[meltwater.address]["share"] > result[impact.address]["share"]  # 0.941 vs 0.562 sets the ratio

    singleton = partition_odds([meltwater], opinions)
    assert singleton[meltwater.address]["share"] == pytest.approx(1.0)
    assert singleton[meltwater.address]["bayes_factor_vs_best"] is None


def test_one_supporting_item_beats_one_refuting_item():
    supported, refuted = _placement(1, actor="meltwater-pulse"), _placement(2, actor="cosmic-impact")
    evidence = [_item("ev-support", supports=[supported.address]), _item("ev-refute", refutes=[refuted.address])]
    opinions = {
        supported.address: Opinion.from_evidence(*pooled_weight(evidence, supported.address, constants=Constants()), Constants().W, a=0.5),
        refuted.address: Opinion.from_evidence(*pooled_weight(evidence, refuted.address, constants=Constants()), Constants().W, a=0.5),
    }
    result = partition_odds([supported, refuted], opinions, evidence)
    assert result[supported.address]["bayes_factor_vs_best"] > 1.0


def test_shared_evidence_is_named_and_excluded_from_the_factor():
    meltwater, impact = _placement(1, actor="meltwater-pulse"), _placement(2, actor="cosmic-impact")
    # `ev-shared` names OBJECT/PLACE/TIME but not ACTOR, so it supports
    # both rivals at once; `ev-unique` supports meltwater alone.
    shared = _item("ev-shared", supports=[meltwater.address, impact.address])
    unique = _item("ev-unique", supports=[meltwater.address])
    evidence = [shared, unique]
    opinions = {
        meltwater.address: Opinion.from_evidence(*pooled_weight(evidence, meltwater.address, constants=Constants()), Constants().W, a=0.5),
        impact.address: Opinion.from_evidence(*pooled_weight(evidence, impact.address, constants=Constants()), Constants().W, a=0.5),
    }
    naive_factor = ((opinions[meltwater.address].b + EPSILON) / (opinions[meltwater.address].d + EPSILON)) / (
        (opinions[impact.address].b + EPSILON) / (opinions[impact.address].d + EPSILON))

    result = partition_odds([meltwater, impact], opinions, evidence)
    assert result[meltwater.address]["shared_evidence"] == ["ev-shared"]
    assert result[impact.address]["shared_evidence"] == ["ev-shared"]

    # With `ev-shared` held out, impact has no evidence left (u=1) and
    # meltwater only `ev-unique`: not the naive, shared-inclusive factor.
    adj_m = Opinion.from_evidence(*pooled_weight([unique], meltwater.address, constants=Constants()), Constants().W, a=0.0)
    adj_i = Opinion.from_evidence(*pooled_weight([], impact.address, constants=Constants()), Constants().W, a=0.0)
    expected_factor = ((adj_m.b + EPSILON) / (adj_m.d + EPSILON)) / ((adj_i.b + EPSILON) / (adj_i.d + EPSILON))

    factor = result[meltwater.address]["bayes_factor_vs_best"]
    assert factor == pytest.approx(expected_factor)
    assert factor != pytest.approx(naive_factor)


def test_export_round_trips_through_timeline_json(tmp_path):
    meltwater, impact, opinions = _younger_dryas()
    evidence = [_item("ev-shared", supports=[meltwater.address, impact.address])]
    elos = {meltwater.address: 1600.0, impact.address: 1400.0}
    tbin = time_bin_index(0)

    views = timeline_views([meltwater, impact], opinions, elos, [tbin], evidence=evidence)
    [event] = views["event_views"]
    for entry in event["ranked_placements"]:
        assert entry["partition"]["shared_evidence"] == ["ev-shared"]
        assert entry["partition"]["share"] is not None

    write_views(views, tmp_path)
    assert json.loads((tmp_path / "timeline.json").read_text()) == views
    text = (tmp_path / "TIMELINE.md").read_text()
    assert "Share" in text and "Bayes factor vs best" in text
