import random

import pytest

from hte.belief import (
    Constants,
    D,
    Opinion,
    cluster_weight,
    cross_kind_bonus,
    detectability,
    detectability_scale,
    edge_strength,
    effective_count,
    fuse,
    load_detectability_table,
    pooled_weight,
    score,
    sigmoid,
    weight,
)
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier
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
# D, cross-kind bonus
# --------------------------------------------------------------------------


def test_D_matches_worked_example_values():
    assert D(2) == pytest.approx(1.549, abs=1e-3)
    assert D(1) == pytest.approx(1.347, abs=1e-3)


def test_cross_kind_bonus_within_family_is_one():
    assert cross_kind_bonus([EvidenceKind.MATERIAL, EvidenceKind.GENETIC]) == pytest.approx(1.0)


def test_cross_kind_bonus_cross_family_matches_worked_example():
    assert cross_kind_bonus([EvidenceKind.MATERIAL, EvidenceKind.TEXTUAL]) == pytest.approx(1.3)


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
    vocab = _catalhoyuk_vocab()
    hyp_farmers, hyp_aliens = _catalhoyuk_hypotheses(vocab)
    evidence = _catalhoyuk_evidence(hyp_farmers, hyp_aliens)

    s_plus_farmers, s_minus_farmers = pooled_weight(evidence, hyp_farmers.address)
    assert s_plus_farmers == pytest.approx(6.186, abs=2e-3)
    assert s_minus_farmers == 0.0

    s_plus_aliens, s_minus_aliens = pooled_weight(evidence, hyp_aliens.address)
    assert s_plus_aliens == 0.0
    assert s_minus_aliens == pytest.approx(6.186, abs=2e-3)


def test_worked_example_opinions_match_paper_table():
    """Reproduces `tab:worked-example` in `main.tex` §Belief model to 3
    decimals: farmers b=0.756, d=0.000, u=0.244, P=0.982; aliens b=0.000,
    d=0.756, u=0.244, P~0.00037."""
    vocab = _catalhoyuk_vocab()
    hyp_farmers, hyp_aliens = _catalhoyuk_hypotheses(vocab)
    evidence = _catalhoyuk_evidence(hyp_farmers, hyp_aliens)

    farmers_opinion = score(hyp_farmers, evidence, vocab)
    aliens_opinion = score(hyp_aliens, evidence, vocab)

    assert farmers_opinion.b == pytest.approx(0.756, abs=1e-3)
    assert farmers_opinion.d == pytest.approx(0.000, abs=1e-3)
    assert farmers_opinion.u == pytest.approx(0.244, abs=1e-3)
    assert farmers_opinion.project() == pytest.approx(0.982, abs=1e-3)

    assert aliens_opinion.b == pytest.approx(0.000, abs=1e-3)
    assert aliens_opinion.d == pytest.approx(0.756, abs=1e-3)
    assert aliens_opinion.u == pytest.approx(0.244, abs=1e-3)
    assert aliens_opinion.project() == pytest.approx(0.00037, abs=1e-5)


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
