import pytest

from hte.belief import Opinion, score, sigmoid
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval
from hte.unknowns import (
    GapNode,
    active_priority,
    chao1,
    coverage_interval,
    good_turing_missing_mass,
    prior_profiles,
    robustness,
    surprise,
    unresolved_slot_gaps,
    value_of_information,
)


def _small_vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept("farmers", Slot.ACTOR, "Farmers", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("aliens", Slot.ACTOR, "Aliens", -4.0, ConsensusStatus.FRINGE))
    vocab.add(Concept("built", Slot.ACTION, "Built", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("shrine", Slot.OBJECT, "Shrine", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("site", Slot.PLACE, "Site", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("labor", Slot.MECHANISM, "Labor", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("tech", Slot.MECHANISM, "Tech", -2.5, ConsensusStatus.FRINGE))
    return vocab


def _hypothesis(vocab: Vocabulary, actor: str, mechanism: str) -> Hypothesis:
    interval = Interval(start=-7000, end=-6901)
    placement = Placement(actor=actor, action="built", object="shrine", place="site",
                           mechanism=mechanism, interval=interval)
    return Hypothesis.from_placement(placement, vocab)


# --------------------------------------------------------------------------
# Good-Turing and Chao1: hand-computed values
# --------------------------------------------------------------------------


def test_good_turing_missing_mass_hand_computed():
    # Two singletons (addresses 1, 2), one doubleton (3), one tripleton (4).
    # N = 1+1+2+3 = 7, n1 = 2 -> f1/N = 2/7.
    counts = {1: 1, 2: 1, 3: 2, 4: 3}
    assert good_turing_missing_mass(counts) == pytest.approx(2 / 7)


def test_good_turing_missing_mass_empty_is_zero():
    assert good_turing_missing_mass({}) == 0.0


def test_chao1_f2_positive_branch_hand_computed():
    # S_obs=4, f1=2 (addresses 1,2), f2=1 (address 3): 4 + 2^2/(2*1) = 6.0.
    counts = {1: 1, 2: 1, 3: 2, 4: 3}
    assert chao1(counts) == pytest.approx(6.0)


def test_chao1_f2_zero_fallback_hand_computed():
    # S_obs=3, f1=2 (addresses 1,2), f2=0: 3 + 2*(2-1)/2 = 4.0
    # (`Bucket.Unknowns.chao1`'s own f2=0 fallback; the Chao bias-corrected
    # form uses a different denominator).
    counts = {1: 1, 2: 1, 3: 3}
    assert chao1(counts) == pytest.approx(4.0)


def test_chao1_never_below_observed():
    for counts in ({}, {1: 1}, {1: 5, 2: 5}, {1: 1, 2: 1, 3: 2}):
        assert chao1(counts) >= len(counts)


def test_coverage_interval_shape_and_bounds():
    run_counts = [{1: 1, 2: 1}, {2: 1, 3: 1}, {3: 1, 4: 1}]
    result = coverage_interval(run_counts)
    assert set(result) == {"observed", "chao1_estimate", "missing_mass", "coverage_low", "coverage_high"}
    assert result["observed"] == 4
    assert result["chao1_estimate"] >= result["observed"]
    assert 0.0 <= result["coverage_low"] <= result["coverage_high"] <= 1.0


def test_coverage_interval_empty_runs():
    result = coverage_interval([])
    assert result["observed"] == 0
    assert result["missing_mass"] == 0.0


# --------------------------------------------------------------------------
# Prior profiles
# --------------------------------------------------------------------------


def test_prior_profiles_returns_four_named_vocabularies():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    assert set(profiles) == {"consensus", "skeptic", "fringe", "uniform"}
    for name, pv in profiles.items():
        assert isinstance(pv, Vocabulary)


def test_prior_profiles_preserves_vocabulary_index_order():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    for slot in Slot:
        original_ids = [c.id for c in vocab.concepts(slot)]
        for pv in profiles.values():
            assert [c.id for c in pv.concepts(slot)] == original_ids


def test_prior_profiles_uniform_is_zero_everywhere():
    vocab = _small_vocab()
    uniform = prior_profiles(vocab)["uniform"]
    for slot in Slot:
        for c in uniform.concepts(slot):
            assert c.prior_logit == 0.0


def test_prior_profiles_consensus_actor_unaffected_except_uniform():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    farmers_by_profile = {name: pv.get(Slot.ACTOR, "farmers").prior_logit for name, pv in profiles.items()}
    assert farmers_by_profile["consensus"] == pytest.approx(2.0)
    assert farmers_by_profile["skeptic"] == pytest.approx(2.0)
    assert farmers_by_profile["fringe"] == pytest.approx(2.0)
    assert farmers_by_profile["uniform"] == 0.0


def test_prior_profiles_fringe_actor_moves_monotonically():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    by_profile = {name: pv.get(Slot.ACTOR, "aliens").prior_logit for name, pv in profiles.items()}
    assert by_profile["skeptic"] < by_profile["consensus"] < by_profile["uniform"] < by_profile["fringe"]


def test_prior_profiles_projected_probability_moves_monotonically_for_fringe_actor():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    h = _hypothesis(vocab, "aliens", "tech")
    projections = {name: sigmoid(h.prior_logit(pv)) for name, pv in profiles.items()}
    assert projections["skeptic"] < projections["consensus"] < projections["uniform"] < projections["fringe"]


# --------------------------------------------------------------------------
# robustness
# --------------------------------------------------------------------------


def test_robustness_reports_projections_and_spread():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    h = _hypothesis(vocab, "aliens", "tech")
    result = robustness(h, [], profiles, score)
    assert set(result) >= {"projections", "spread", "robustness", "stable"}
    assert set(result["projections"]) == {"consensus", "skeptic", "fringe", "uniform"}
    assert result["robustness"] == pytest.approx(1.0 - result["spread"])


def test_robustness_consensus_hypothesis_is_more_robust_than_fringe():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    farmers = _hypothesis(vocab, "farmers", "labor")
    aliens = _hypothesis(vocab, "aliens", "tech")
    r_farmers = robustness(farmers, [], profiles, score)
    r_aliens = robustness(aliens, [], profiles, score)
    assert r_farmers["robustness"] > r_aliens["robustness"]


def test_robustness_with_population_reports_ranks():
    vocab = _small_vocab()
    profiles = prior_profiles(vocab)
    farmers = _hypothesis(vocab, "farmers", "labor")
    aliens = _hypothesis(vocab, "aliens", "tech")
    result = robustness(farmers, [], profiles, score, population=[farmers, aliens])
    assert result["ranks"]["consensus"] == 0  # farmers outranks aliens under consensus
    assert result["rank_spread"] is not None


# --------------------------------------------------------------------------
# surprise
# --------------------------------------------------------------------------


def test_surprise_finds_the_planted_orphan_item():
    vocab = _small_vocab()
    known = _hypothesis(vocab, "farmers", "labor")
    span = EvidenceSpan("doc", "loc", "quote", 0, 5)
    orphan = EvidenceItem(id="ev-orphan", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                           span=span, provenance="manual", supports=[999_999_999_999_999_999])
    matched = EvidenceItem(id="ev-matched", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                            span=span, provenance="manual", supports=[known.address])
    silent = EvidenceItem(id="ev-silent", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                           span=span, provenance="manual")

    result = surprise([orphan, matched, silent], [known])
    assert [item.id for item in result] == ["ev-orphan"]


def test_surprise_empty_population_still_needs_named_addresses():
    span = EvidenceSpan("doc", "loc", "quote", 0, 5)
    silent = EvidenceItem(id="ev-silent", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                           span=span, provenance="manual")
    assert surprise([silent], []) == []


# --------------------------------------------------------------------------
# GapNode / value_of_information / active_priority
# --------------------------------------------------------------------------


def test_gap_node_defaults():
    gap = GapNode(id="g1", kind="unexcavated-site", description="A site")
    assert gap.would_move == []
    assert gap.cost == 1.0
    assert gap.period_id is None


def test_value_of_information_sums_u_squared_over_would_move():
    vocab = _small_vocab()
    h1 = _hypothesis(vocab, "farmers", "labor")
    h2 = _hypothesis(vocab, "aliens", "tech")
    gap = GapNode(id="g1", kind="untranslated-text", description="d", would_move=[h1.address, h2.address])
    opinions = {
        h1.address: Opinion(b=0.1, d=0.1, u=0.8, a=0.5),
        h2.address: Opinion(b=0.4, d=0.4, u=0.2, a=0.5),
    }
    voi = value_of_information(gap, [h1, h2], opinions)
    assert voi == pytest.approx(0.8 ** 2 + 0.2 ** 2)


def test_value_of_information_skips_unmaterialized_or_unopined_addresses():
    vocab = _small_vocab()
    h1 = _hypothesis(vocab, "farmers", "labor")
    gap = GapNode(id="g1", kind="untranslated-text", description="d", would_move=[h1.address, 12345])
    voi_missing_opinion = value_of_information(gap, [h1], {})
    assert voi_missing_opinion == 0.0

    opinions = {h1.address: Opinion(b=0.0, d=0.0, u=1.0, a=0.5)}
    voi_missing_hypothesis = value_of_information(gap, [], opinions)
    assert voi_missing_hypothesis == 0.0


def test_active_priority_is_the_weighted_sum():
    gap = GapNode(id="g1", kind="unexcavated-site", description="d")
    weights = {"uncertainty": 1.0, "novelty": 2.0, "coverage_gap": 0.5, "historical_gap": 0.0, "disagreement": 1.0}
    result = active_priority(
        gap, uncertainty=0.4, novelty=0.1, coverage_gap=0.2, historical_gap=0.9, disagreement=0.3,
        weights=weights,
    )
    expected = 1.0 * 0.4 + 2.0 * 0.1 + 0.5 * 0.2 + 0.0 * 0.9 + 1.0 * 0.3
    assert result == pytest.approx(expected)


def test_active_priority_defaults_missing_weight_to_zero():
    gap = GapNode(id="g1", kind="unexcavated-site", description="d")
    result = active_priority(
        gap, uncertainty=1.0, novelty=1.0, coverage_gap=1.0, historical_gap=1.0, disagreement=1.0,
        weights={"uncertainty": 1.0},
    )
    assert result == pytest.approx(1.0)


# --------------------------------------------------------------------------
# unresolved_slot_gaps (ros-12 item 4, GapNode wiring)
# --------------------------------------------------------------------------


def _evidence(item_id: str, *, actor=None, action=None, object=None, place=None, mechanism=None,
              supports=None, refutes=None) -> EvidenceItem:
    span = EvidenceSpan("doc", "loc", "quote", 0, 5)
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s", span=span, provenance="manual",
        actor=actor, action=action, object=object, place=place, mechanism=mechanism,
        supports=supports or [], refutes=refutes or [],
    )


def test_unresolved_slot_gaps_skips_a_fully_resolved_item():
    item = _evidence("ev-full", actor="farmers", action="built", object="shrine", place="site", mechanism="labor")
    assert unresolved_slot_gaps([item], [], {}) == []


def test_unresolved_slot_gaps_emits_one_gap_per_item_missing_any_slot():
    item = _evidence("ev-partial", actor="farmers", action="built")
    gaps = unresolved_slot_gaps([item], [], {})
    assert len(gaps) == 1
    gap = gaps[0]
    assert gap.id == "gap-ev-partial"
    assert gap.kind == "unresolved-slot"
    assert "object" in gap.description and "place" in gap.description and "mechanism" in gap.description
    assert "actor" not in gap.description.split(":")[1]


def test_unresolved_slot_gaps_would_move_is_the_sorted_union_of_supports_and_refutes():
    item = _evidence("ev-gap", supports=[5, 1], refutes=[1, 3])
    gap = unresolved_slot_gaps([item], [], {})[0]
    assert gap.would_move == [1, 3, 5]


def test_unresolved_slot_gaps_ranked_by_value_of_information_highest_first():
    vocab = _small_vocab()
    h1 = _hypothesis(vocab, "farmers", "labor")
    h2 = _hypothesis(vocab, "aliens", "tech")
    low_voi = _evidence("ev-low", actor="farmers", supports=[h1.address])
    high_voi = _evidence("ev-high", actor="farmers", supports=[h1.address, h2.address])
    opinions = {
        h1.address: Opinion(b=0.1, d=0.1, u=0.8, a=0.5),
        h2.address: Opinion(b=0.1, d=0.1, u=0.9, a=0.5),
    }
    gaps = unresolved_slot_gaps([low_voi, high_voi], [h1, h2], opinions)
    assert [g.id for g in gaps] == ["gap-ev-high", "gap-ev-low"]


def test_unresolved_slot_gaps_respects_limit():
    items = [_evidence(f"ev-{i}", actor="farmers") for i in range(5)]
    gaps = unresolved_slot_gaps(items, [], {}, limit=2)
    assert len(gaps) == 2
