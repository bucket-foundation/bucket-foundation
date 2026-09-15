import json
import random

import pytest

from hte import belief as belief_module
from hte.belief import (
    Constants,
    D,
    Opinion,
    cluster_weight,
    detectability,
    detectability_scale,
    edge_strength,
    effective_count,
    fuse,
    load_constants,
    load_detectability_table,
    opinion_clears_floor,
    pooled_weight,
    score,
    sigmoid,
    weight,
)
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier, TIER_WEIGHT
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval


# --------------------------------------------------------------------------
# Opinion algebra
# --------------------------------------------------------------------------


def test_opinion_masses_sum_to_one():
    rng = random.Random(11)
    for _ in range(500):
        r = rng.uniform(0, 50)
        s = rng.uniform(0, 50)
        a = rng.uniform(0, 1)
        op = Opinion.from_evidence(r, s, 2.0, a)
        assert op.b + op.d + op.u == pytest.approx(1.0)
        p = op.project()
        assert -1e-9 <= p <= 1 + 1e-9


def test_opinion_u_is_one_at_zero_evidence():
    op = Opinion.from_evidence(0.0, 0.0, 2.0, 0.37)
    assert op.u == pytest.approx(1.0)
    assert op.b == 0.0
    assert op.d == 0.0
    assert op.project() == pytest.approx(0.37)


def test_opinion_rejects_bad_inputs():
    with pytest.raises(ValueError):
        Opinion.from_evidence(-1.0, 0.0, 2.0, 0.5)
    with pytest.raises(ValueError):
        Opinion.from_evidence(0.0, 0.0, 0.0, 0.5)


# --------------------------------------------------------------------------
# lift and tipping_prior (STATISTICAL-AUDIT-2026-09-15.md, audit item 1:
# evidence-only lift and a tipping-point prior on every claim surface)
# --------------------------------------------------------------------------


def test_lift_equals_b_minus_d_and_is_invariant_to_the_prior():
    rng = random.Random(23)
    for _ in range(200):
        r, s = rng.uniform(0, 50), rng.uniform(0, 50)
        a1, a2 = rng.uniform(0, 1), rng.uniform(0, 1)
        op1 = Opinion.from_evidence(r, s, 2.0, a1)
        op2 = Opinion.from_evidence(r, s, 2.0, a2)  # same evidence, swapped prior
        assert op1.lift() == pytest.approx(op1.b - op1.d)
        assert op1.lift() == pytest.approx(op2.lift())  # `a` never enters `lift`


@pytest.mark.parametrize("op", [
    Opinion(b=0.7, d=0.3, u=0.0, a=0.5),  # u == 0: no prior left to move
    Opinion(b=0.8, d=0.0, u=0.2, a=0.5),  # floor < b: cleared at a=0 already
    Opinion(b=0.1, d=0.0, u=0.1, a=0.5),  # floor > b + u: unreachable even at a=1
])
def test_tipping_prior_is_none_when_no_achievable_prior_crosses_the_floor(op):
    assert op.tipping_prior(0.6) is None


def test_tipping_prior_finds_the_real_crossing_value():
    op = Opinion(b=0.502, d=0.0, u=0.498, a=0.882)
    tip = op.tipping_prior(0.6)
    assert tip == pytest.approx((0.6 - 0.502) / 0.498)
    assert Opinion(b=op.b, d=op.d, u=op.u, a=tip).project() == pytest.approx(0.6)


def test_opinion_to_dict_carries_lift_and_tipping_prior_and_from_dict_round_trips():
    op = Opinion(b=0.502, d=0.0, u=0.498, a=0.882)
    d = op.to_dict()
    assert d["lift"] == pytest.approx(op.lift())
    assert d["tipping_prior_0_6"] == pytest.approx(op.tipping_prior(0.6))
    # from_dict reads only the four core fields; the derived ones are
    # recomputed on demand rather than round-tripped as stored state.
    assert Opinion.from_dict(d) == op


def test_opinion_clears_floor_ignores_the_prior():
    # Same shared predicate `select_above_floor` and `bridge_export`
    # both call: identical (b, d, u), different a, same verdict either way.
    high_a = Opinion(b=0.502, d=0.0, u=0.498, a=0.882)
    low_a = Opinion(b=0.502, d=0.0, u=0.498, a=0.121)
    floors = {"floor_P": 0.0, "floor_u_max": 1.0}
    assert opinion_clears_floor(high_a, lift_floor=0.25, **floors)
    assert opinion_clears_floor(low_a, lift_floor=0.25, **floors)
    assert not opinion_clears_floor(high_a, lift_floor=0.6, **floors)
    assert not opinion_clears_floor(low_a, lift_floor=0.6, **floors)


def test_fuse_dogmatic_pair_returns_neutral():
    o1 = Opinion(b=1.0, d=0.0, u=0.0, a=0.5)
    o2 = Opinion(b=0.0, d=1.0, u=0.0, a=0.5)
    fused = fuse(o1, o2)
    assert fused.u == pytest.approx(1.0)


def test_fuse_with_uncertain_opinion_is_identity_like():
    o1 = Opinion(b=0.3, d=0.1, u=0.6, a=0.4)
    o2 = Opinion(b=0.0, d=0.0, u=1.0, a=0.4)  # total ignorance
    fused = fuse(o1, o2)
    assert fused.b == pytest.approx(o1.b)
    assert fused.d == pytest.approx(o1.d)
    assert fused.u == pytest.approx(o1.u)


def test_sigmoid_bounds_and_midpoint():
    assert sigmoid(0.0) == pytest.approx(0.5)
    assert 0 < sigmoid(-50) < 1e-6
    assert 1 - 1e-6 < sigmoid(50) <= 1.0


# --------------------------------------------------------------------------
# D
# --------------------------------------------------------------------------


def test_D_matches_worked_example_values():
    assert D(2) == pytest.approx(1.549, abs=1e-3)
    assert D(1) == pytest.approx(1.347, abs=1e-3)


# --------------------------------------------------------------------------
# Cross-kind bonus removed (item 6): single-kind pooled weight is
# unaffected, multi-kind drops by exactly the old bonus factor.
# --------------------------------------------------------------------------


def _pooled_support(span_id: str, kind: EvidenceKind, tier: Tier, blended_a: float, address: int) -> EvidenceItem:
    return EvidenceItem(
        id=span_id, kind=kind, tier=tier, source_id="s",
        span=EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1),
        provenance="manual", supports=[address], views={"blended_a": blended_a},
    )


def test_pooled_weight_single_kind_is_unaffected_by_the_bonus_removal():
    """One kind never triggered the old bonus (no cross-family pair to
    sum over), so pooled weight is the plain `D(n_eff) * sum(s_i)`."""
    items = [
        _pooled_support("e1", EvidenceKind.MATERIAL, Tier.T1, 0.8, address=1),
        _pooled_support("e2", EvidenceKind.MATERIAL, Tier.T2, 0.4, address=1),
    ]
    s_plus, s_minus = pooled_weight(items, 1)
    expected = D(2) * (TIER_WEIGHT[Tier.T1] * 0.8 + TIER_WEIGHT[Tier.T2] * 0.4)
    assert s_plus == pytest.approx(expected)
    assert s_minus == 0.0


def test_pooled_weight_multi_kind_no_longer_gets_the_cross_kind_bonus():
    """Two single-item kinds from different families: the removed bonus
    would have multiplied this sum by `1 + 0.3*1 = 1.3` (one cross-
    family pair); the plain sum below, with no multiplier, is what
    `pooled_weight` returns now."""
    items = [
        _pooled_support("e1", EvidenceKind.MATERIAL, Tier.T1, 0.8, address=1),
        _pooled_support("e2", EvidenceKind.TEXTUAL, Tier.T3, 0.6, address=1),
    ]
    s_plus, _ = pooled_weight(items, 1)
    expected_no_bonus = D(1) * (TIER_WEIGHT[Tier.T1] * 0.8) + D(1) * (TIER_WEIGHT[Tier.T3] * 0.6)
    assert s_plus == pytest.approx(expected_no_bonus)
    assert s_plus < expected_no_bonus * 1.3  # the removed bonus would have multiplied by 1 + 0.3 * one pair


# --------------------------------------------------------------------------
# Stemma effective count
# --------------------------------------------------------------------------


def test_effective_count_no_dependence():
    sources = [Source(id="s1", kind=EvidenceKind.MATERIAL), Source(id="s2", kind=EvidenceKind.MATERIAL)]
    assert effective_count(sources) == 2


def test_effective_count_collapses_a_copy():
    sources = [
        Source(id="s1", kind=EvidenceKind.TEXTUAL),
        Source(id="s2", kind=EvidenceKind.TEXTUAL, stemma_parents=["s1"]),
    ]
    n = effective_count(sources)
    assert n == 1
    assert n < len(sources)


def test_effective_count_respects_prune_threshold():
    sources = [
        Source(id="s1", kind=EvidenceKind.TEXTUAL),
        Source(id="s2", kind=EvidenceKind.TEXTUAL, stemma_parents=["s1"]),
    ]
    # A copy-confidence weight below theta_prune does not merge the pair.
    n = effective_count(sources, edge_weights={("s2", "s1"): 0.1}, theta_prune=0.6)
    assert n == 2


def test_effective_count_three_way_chain_collapses_to_one():
    sources = [
        Source(id="s1", kind=EvidenceKind.TEXTUAL),
        Source(id="s2", kind=EvidenceKind.TEXTUAL, stemma_parents=["s1"]),
        Source(id="s3", kind=EvidenceKind.TEXTUAL, stemma_parents=["s2"]),
    ]
    assert effective_count(sources) == 1


# --------------------------------------------------------------------------
# Detectability
# --------------------------------------------------------------------------


def test_load_detectability_table_has_expected_shape():
    table = load_detectability_table()
    assert ("classical", "textual") in table
    assert 0.0 <= table[("classical", "textual")] <= 1.0


def test_detectability_unknown_defaults_to_flat_tier():
    table = load_detectability_table()
    assert detectability(table, "no-such-period", EvidenceKind.MATERIAL) == 1.0


def test_detectability_scale_limits():
    assert detectability_scale(0.8, 0.0) == pytest.approx(0.0)
    assert detectability_scale(0.8, 1.0) == pytest.approx(0.8)


def test_low_detectability_gates_absence_evidence():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    absent = EvidenceItem(
        id="ev-absence", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src",
        span=span, provenance="manual", supports=[], refutes=[1], views={"blended_a": 0.9},
        is_absence=True,
    )
    table_low = {("upper-paleolithic", "textual"): 0.02}
    table_high = {("classical", "textual"): 0.9}
    w_low = cluster_weight(absent, table_low, "upper-paleolithic")
    w_high = cluster_weight(absent, table_high, "classical")
    assert w_low < w_high


# --------------------------------------------------------------------------
# Edge strength / weight
# --------------------------------------------------------------------------


def test_edge_strength_blended_a_wins():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(id="e", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                         span=span, provenance="manual", views={"blended_a": 0.7, "cosine": 0.1})
    assert edge_strength(item) == pytest.approx(0.7)


def test_edge_strength_falls_back_to_component_blend():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(id="e", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                         span=span, provenance="manual", views={"cosine": 0.934, "fuzzy": 0.176, "motif": 3.0})
    # HISTORY-HYPOTHESIS-ENGINE-SPEC.md §2 worked example.
    assert edge_strength(item) == pytest.approx(0.718, abs=1e-3)


def test_edge_strength_tier_only_fallback_is_one():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(id="e", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                         span=span, provenance="manual")
    assert edge_strength(item) == pytest.approx(1.0)


def test_weight_signs_by_supports_refutes():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(id="e", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s",
                         span=span, provenance="manual", supports=[1], refutes=[2], views={"blended_a": 0.5})
    assert weight(item, 1) == pytest.approx(1.0)
    assert weight(item, 2) == pytest.approx(-1.0)
    assert weight(item, 3) == 0.0


# --------------------------------------------------------------------------
# The Çatalhöyük worked example (main.tex §Belief model, tab:worked-example)
# --------------------------------------------------------------------------


def _catalhoyuk_vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept("neolithic-farmers-anatolia", Slot.ACTOR, "Neolithic farmers, Anatolia", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("extraterrestrials", Slot.ACTOR, "Extraterrestrials", -4.0, ConsensusStatus.FRINGE))
    vocab.add(Concept("built", Slot.ACTION, "Built", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("catalhoyuk-shrine", Slot.OBJECT, "Çatalhöyük shrine", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("catalhoyuk", Slot.PLACE, "Çatalhöyük", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("organized-human-labor", Slot.MECHANISM, "Organized human labor", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("unknown-technology", Slot.MECHANISM, "Unknown technology", -2.5, ConsensusStatus.FRINGE))
    return vocab


def _catalhoyuk_hypotheses(vocab: Vocabulary) -> tuple[Hypothesis, Hypothesis]:
    interval = Interval(start=-7000, end=-6901)  # the -7000-century bin
    farmers = Placement(actor="neolithic-farmers-anatolia", action="built", object="catalhoyuk-shrine",
                         place="catalhoyuk", mechanism="organized-human-labor", interval=interval)
    aliens = Placement(actor="extraterrestrials", action="built", object="catalhoyuk-shrine",
                        place="catalhoyuk", mechanism="unknown-technology", interval=interval)
    return Hypothesis.from_placement(farmers, vocab), Hypothesis.from_placement(aliens, vocab)


def _catalhoyuk_evidence(hyp_farmers: Hypothesis, hyp_aliens: Hypothesis) -> list[EvidenceItem]:
    material_1 = EvidenceItem(
        id="ev-radiocarbon", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="src-radiocarbon",
        span=EvidenceSpan("doc-1", "fig 2", "radiocarbon-dated construction fill with hand-tool marks", 0, 10),
        provenance="manual", supports=[hyp_farmers.address], refutes=[hyp_aliens.address], views={"blended_a": 0.9},
    )
    material_2 = EvidenceItem(
        id="ev-microwear", kind=EvidenceKind.MATERIAL, tier=Tier.T2, source_id="src-microwear",
        span=EvidenceSpan("doc-2", "fig 3", "tool-mark microwear study", 0, 10),
        provenance="manual", supports=[hyp_farmers.address], refutes=[hyp_aliens.address], views={"blended_a": 0.5},
    )
    textual_1 = EvidenceItem(
        id="ev-silence", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src-silence",
        span=EvidenceSpan("doc-3", "S4", "documentary silence on a non-human builder", 0, 10),
        provenance="manual", supports=[hyp_farmers.address], refutes=[hyp_aliens.address], views={"blended_a": 0.6},
    )
    return [material_1, material_2, textual_1]


def test_worked_example_prior_logits():
    vocab = _catalhoyuk_vocab()
    hyp_farmers, hyp_aliens = _catalhoyuk_hypotheses(vocab)
    assert hyp_farmers.prior_logit(vocab) == pytest.approx(2.5)
    assert hyp_aliens.prior_logit(vocab) == pytest.approx(-6.5)


def test_worked_example_pooled_weight_matches_paper():
    """`main.tex`'s `tab:worked-example` computed this total WITH the
    now-removed cross-kind bonus (item 6): `6.186` was `4.759 * 1.3`,
    the bonus for one MATERIAL/TEXTUAL cross-family pair."""
    vocab = _catalhoyuk_vocab()
    hyp_farmers, hyp_aliens = _catalhoyuk_hypotheses(vocab)
    evidence = _catalhoyuk_evidence(hyp_farmers, hyp_aliens)

    s_plus_farmers, s_minus_farmers = pooled_weight(evidence, hyp_farmers.address)
    assert s_plus_farmers == pytest.approx(4.759, abs=2e-3)
    assert s_minus_farmers == 0.0

    s_plus_aliens, s_minus_aliens = pooled_weight(evidence, hyp_aliens.address)
    assert s_plus_aliens == 0.0
    assert s_minus_aliens == pytest.approx(4.759, abs=2e-3)


def test_worked_example_opinions_match_paper_table():
    """`main.tex`'s own table (farmers b=0.756/d=0/u=0.244/P=0.982;
    aliens b=0/d=0.756/u=0.244/P~0.00037) was computed WITH the now-
    removed cross-kind bonus (item 6); these are the same opinions over
    the bonus-free pooled weight."""
    vocab = _catalhoyuk_vocab()
    hyp_farmers, hyp_aliens = _catalhoyuk_hypotheses(vocab)
    evidence = _catalhoyuk_evidence(hyp_farmers, hyp_aliens)

    farmers_opinion = score(hyp_farmers, evidence, vocab)
    aliens_opinion = score(hyp_aliens, evidence, vocab)

    assert farmers_opinion.b == pytest.approx(0.704, abs=1e-3)
    assert farmers_opinion.d == pytest.approx(0.000, abs=1e-3)
    assert farmers_opinion.u == pytest.approx(0.296, abs=1e-3)
    assert farmers_opinion.project() == pytest.approx(0.978, abs=1e-3)

    assert aliens_opinion.b == pytest.approx(0.000, abs=1e-3)
    assert aliens_opinion.d == pytest.approx(0.704, abs=1e-3)
    assert aliens_opinion.u == pytest.approx(0.296, abs=1e-3)
    assert aliens_opinion.project() == pytest.approx(0.00044, abs=1e-5)


def test_worked_example_opinion_masses_still_sum_to_one():
    vocab = _catalhoyuk_vocab()
    hyp_farmers, hyp_aliens = _catalhoyuk_hypotheses(vocab)
    evidence = _catalhoyuk_evidence(hyp_farmers, hyp_aliens)
    for opinion in [score(hyp_farmers, evidence, vocab), score(hyp_aliens, evidence, vocab)]:
        assert opinion.b + opinion.d + opinion.u == pytest.approx(1.0)


def test_constants_defaults_match_paper():
    c = Constants()
    assert c.W == 2.0
    assert c.lam == 0.5
    assert c.mu == 0.5
    assert c.theta_prune == 0.6
    assert c.detectability_floor == 0.0


# --------------------------------------------------------------------------
# Constants serialization and load_constants (docs/CALIBRATION-FIT-2026-09-10.md)
# --------------------------------------------------------------------------


def test_constants_to_dict_from_dict_round_trips():
    c = Constants(W=3.1, lam=0.4, mu=0.7, alpha=1.2, theta_prune=0.5, detectability_floor=0.15)
    d = c.to_dict()
    assert d["tier_weight"] == {t.value: w for t, w in TIER_WEIGHT.items()}
    round_tripped = Constants.from_dict(d)
    assert round_tripped == c


def test_constants_from_dict_fills_missing_keys_from_defaults():
    round_tripped = Constants.from_dict({"W": 5.0})
    default = Constants()
    assert round_tripped.W == 5.0
    assert round_tripped.lam == default.lam
    assert round_tripped.detectability_floor == default.detectability_floor
    assert round_tripped.tier_weight == default.tier_weight


def test_load_constants_default_source_is_bare_constants():
    assert load_constants("default") == Constants()


def test_load_constants_bad_source_raises():
    with pytest.raises(ValueError, match="default.*fitted|fitted.*default"):
        load_constants("not-a-real-source")


def test_load_constants_fitted_reads_the_shipped_file_when_present():
    # `hte/data/constants-fitted.json` (docs/CALIBRATION-FIT-2026-09-10.md's
    # own fitted-or-defaults output) always exists after this package's own
    # fit ran (whether it carries fitted values that moved the Brier score
    # or a defaults copy annotated with why the fit did not clear its own
    # bar); either way, `load_constants("fitted")` should read it without
    # raising and
    # return a real `Constants` instance.
    result = load_constants("fitted")
    assert isinstance(result, Constants)


def test_load_constants_fitted_falls_back_to_defaults_with_no_file(tmp_path, monkeypatch):
    monkeypatch.setattr(belief_module, "FITTED_CONSTANTS_PATH", tmp_path / "does-not-exist.json")
    assert load_constants("fitted") == Constants()


def test_load_constants_fitted_reads_a_custom_file(tmp_path, monkeypatch):
    path = tmp_path / "constants-fitted.json"
    path.write_text(json.dumps(Constants(W=9.0).to_dict()))
    monkeypatch.setattr(belief_module, "FITTED_CONSTANTS_PATH", path)
    assert load_constants("fitted").W == 9.0


# --------------------------------------------------------------------------
# detectability_floor (docs/CALIBRATION-FIT-2026-09-10.md)
# --------------------------------------------------------------------------


def test_detectability_floor_raises_a_low_table_value_in_pooled_weight():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(
        id="ev-absence", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src",
        span=span, provenance="manual", supports=[1], refutes=[], views={"blended_a": 0.9},
        is_absence=True,
    )
    table = {("upper-paleolithic", "textual"): 0.02}
    s_plus_no_floor, _ = pooled_weight(
        [item], 1, detect_table=table, period="upper-paleolithic", constants=Constants(detectability_floor=0.0),
    )
    s_plus_floored, _ = pooled_weight(
        [item], 1, detect_table=table, period="upper-paleolithic", constants=Constants(detectability_floor=0.5),
    )
    assert s_plus_floored > s_plus_no_floor


def test_detectability_floor_zero_is_a_no_op():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(
        id="ev-absence", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src",
        span=span, provenance="manual", supports=[1], refutes=[], is_absence=True,
    )
    table = {("classical", "textual"): 0.85}
    default_result = pooled_weight([item], 1, detect_table=table, period="classical", constants=Constants())
    explicit_zero = pooled_weight(
        [item], 1, detect_table=table, period="classical", constants=Constants(detectability_floor=0.0),
    )
    assert default_result == explicit_zero


def test_detectability_floor_never_lowers_a_value_already_above_it():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1)
    item = EvidenceItem(
        id="ev-absence", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src",
        span=span, provenance="manual", supports=[1], refutes=[], is_absence=True,
    )
    table = {("classical", "textual"): 0.85}
    low_floor = pooled_weight([item], 1, detect_table=table, period="classical", constants=Constants(detectability_floor=0.1))
    default_result = pooled_weight([item], 1, detect_table=table, period="classical", constants=Constants())
    assert low_floor == default_result


def test_opinion_scored_is_false_at_its_prior_and_true_once_evidence_binds():
    unscored = Opinion.from_evidence(0.0, 0.0, 2.0, 0.7)
    assert unscored.u == 1.0 and unscored.project() == 0.7 and unscored.scored() is False
    assert unscored.to_dict()["scored"] is False
    scored = Opinion.from_evidence(1.0, 0.0, 2.0, 0.7)
    assert scored.scored() is True and scored.to_dict()["scored"] is True


def test_discrimination_scales_weight_by_likelihood_ratio_and_leaves_unrated_items_whole():
    from hte.belief import discrimination
    assert discrimination(None) == 1.0
    assert discrimination(1.0) == 0.0
    assert discrimination(10.0) == pytest.approx(0.9)
    assert discrimination(0.5) == 0.0
    items = [_pooled_support("e1", EvidenceKind.MATERIAL, Tier.T1, 0.8, address=1)]
    unrated, _ = pooled_weight(items, 1)
    none_rated, _ = pooled_weight(items, 1, likelihood_ratios={"e1": 1.0})
    strong, _ = pooled_weight(items, 1, likelihood_ratios={"e1": 10.0})
    assert none_rated == 0.0
    assert strong == pytest.approx(0.9 * unrated)
