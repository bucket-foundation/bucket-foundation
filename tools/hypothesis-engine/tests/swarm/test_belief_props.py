"""Property tests over `hte.belief`: the opinion algebra, diminishing
returns, the cross-kind bonus, stemma effective count (cycles and
self-references included), and detectability scaling."""
from __future__ import annotations

import math

import pytest
from conftest import cyclic_sources, evidence_item, evidence_kinds_st, evidence_weights, positive_W, simplex_points, unit_floats
from hypothesis import assume, given
from hypothesis import strategies as st

from hte import belief
from hte.evidence import EvidenceKind, Tier


# --------------------------------------------------------------------------
# Opinion.from_evidence: b + d + u == 1, each term in [0, 1]
# --------------------------------------------------------------------------


@given(evidence_weights, evidence_weights, positive_W, unit_floats)
def test_opinion_from_evidence_sums_to_one(r, s, W, a):
    o = belief.Opinion.from_evidence(r, s, W, a)
    assert math.isclose(o.b + o.d + o.u, 1.0, rel_tol=0, abs_tol=1e-9)
    assert 0.0 - 1e-12 <= o.b <= 1.0 + 1e-12
    assert 0.0 - 1e-12 <= o.d <= 1.0 + 1e-12
    assert 0.0 - 1e-12 <= o.u <= 1.0 + 1e-12


@given(evidence_weights, evidence_weights, positive_W, unit_floats)
def test_opinion_project_is_in_unit_interval(r, s, W, a):
    o = belief.Opinion.from_evidence(r, s, W, a)
    assert -1e-12 <= o.project() <= 1.0 + 1e-12


def test_opinion_from_evidence_at_zero_evidence_is_the_prior_with_full_uncertainty():
    o = belief.Opinion.from_evidence(0.0, 0.0, W=2.0, a=0.37)
    assert o.u == pytest.approx(1.0)
    assert o.project() == pytest.approx(0.37)


@given(st.floats(max_value=-1e-9, allow_nan=False), positive_W, unit_floats)
def test_opinion_from_evidence_rejects_negative_r(r, W, a):
    with pytest.raises(ValueError):
        belief.Opinion.from_evidence(r, 0.0, W, a)


@given(positive_W, unit_floats)
def test_opinion_from_evidence_rejects_non_positive_W(a, extra):
    with pytest.raises(ValueError):
        belief.Opinion.from_evidence(1.0, 1.0, 0.0, a)


# --------------------------------------------------------------------------
# fuse: commutative, associative (shared base rate), vacuous identity
# --------------------------------------------------------------------------


@st.composite
def opinions_with_base_rate(draw, a):
    b, d, u = draw(simplex_points())
    return belief.Opinion(b=b, d=d, u=u, a=a)


@given(unit_floats, simplex_points(), simplex_points())
def test_fuse_is_commutative(a, p1, p2):
    o1 = belief.Opinion(b=p1[0], d=p1[1], u=p1[2], a=a)
    o2 = belief.Opinion(b=p2[0], d=p2[1], u=p2[2], a=a)
    f1 = belief.fuse(o1, o2)
    f2 = belief.fuse(o2, o1)
    assert f1.b == pytest.approx(f2.b, abs=1e-9)
    assert f1.d == pytest.approx(f2.d, abs=1e-9)
    assert f1.u == pytest.approx(f2.u, abs=1e-9)
    assert f1.a == pytest.approx(f2.a, abs=1e-9)


@given(unit_floats, simplex_points(), simplex_points(), simplex_points())
def test_fuse_is_associative_for_a_shared_base_rate(a, p1, p2, p3):
    # Excludes any opinion at u == 0 exactly (fully dogmatic): fusing two
    # such opinions that DISAGREE still collapses to the fully-vacuous
    # opinion by design (FINDING-2026-09-10-003's fix only preserves the
    # AGREEING dogmatic case, which has a principled answer; two dogmatic
    # opinions that disagree still have none under cumulative fusion), so
    # this general property keeps its own dedicated exclusion rather than
    # asserting associativity through that irreducible collapse.
    assume(p1[2] > 1e-9 and p2[2] > 1e-9 and p3[2] > 1e-9)
    o1 = belief.Opinion(b=p1[0], d=p1[1], u=p1[2], a=a)
    o2 = belief.Opinion(b=p2[0], d=p2[1], u=p2[2], a=a)
    o3 = belief.Opinion(b=p3[0], d=p3[1], u=p3[2], a=a)
    left = belief.fuse(belief.fuse(o1, o2), o3)
    right = belief.fuse(o1, belief.fuse(o2, o3))
    assert left.b == pytest.approx(right.b, abs=1e-6)
    assert left.d == pytest.approx(right.d, abs=1e-6)
    assert left.u == pytest.approx(right.u, abs=1e-6)


def test_fuse_of_two_agreeing_dogmatic_opinions_should_preserve_their_verdict():
    # FINDING-2026-09-10-003 resolved: fuse() now special-cases two fully
    # dogmatic (u == 0) opinions that agree to their shared verdict
    # unchanged, before reaching the zero-denominator fallback, which now
    # fires only for the disagreeing-dogmatic case that has no fused
    # answer of its own.
    a = 0.0
    o1 = belief.Opinion(b=1.0, d=0.0, u=0.0, a=a)
    o2 = belief.Opinion(b=1.0, d=0.0, u=0.0, a=a)
    o3 = belief.Opinion(b=0.0, d=0.5, u=0.5, a=a)
    left = belief.fuse(belief.fuse(o1, o2), o3)
    right = belief.fuse(o1, belief.fuse(o2, o3))
    assert left.b == pytest.approx(right.b, abs=1e-6)
    assert left.d == pytest.approx(right.d, abs=1e-6)
    assert left.u == pytest.approx(right.u, abs=1e-6)


@given(unit_floats, simplex_points())
def test_fuse_has_the_vacuous_opinion_as_identity(a, p):
    # Excludes the narrow band just below u == 1 where FINDING-2026-09-10-004
    # (below) shows the combined base-rate formula loses catastrophic
    # precision; u == 1.0 exactly is unaffected (it takes the safe
    # average-of-two-base-rates branch instead).
    assume(p[2] == 1.0 or abs(1.0 - p[2]) > 1e-6)
    o = belief.Opinion(b=p[0], d=p[1], u=p[2], a=a)
    vacuous = belief.Opinion(b=0.0, d=0.0, u=1.0, a=a)
    fused = belief.fuse(o, vacuous)
    assert fused.b == pytest.approx(o.b, abs=1e-9)
    assert fused.d == pytest.approx(o.d, abs=1e-9)
    assert fused.u == pytest.approx(o.u, abs=1e-9)
    assert fused.a == pytest.approx(o.a, abs=1e-9)


def test_fuse_vacuous_identity_holds_just_below_u_equals_one():
    # FINDING-2026-09-10-004 resolved: fuse()'s combined base-rate formula
    # now checks a_denom = u1 + u2 - 2*u1*u2 against a relative epsilon
    # (1e-9) rather than exact zero, so a u1 a few ULPs below 1.0 against
    # a u2 == 1.0 vacuous opinion falls into the epsilon-guarded
    # (1-u)-weighted fallback instead of running the division and
    # catastrophically amplifying the rounding error already in u1.
    a = 0.75
    o = belief.Opinion(b=0.0, d=2.220446049250313e-16, u=0.9999999999999998, a=a)
    vacuous = belief.Opinion(b=0.0, d=0.0, u=1.0, a=a)
    fused = belief.fuse(o, vacuous)
    assert fused.a == pytest.approx(a, abs=1e-6)


def test_fuse_of_two_fully_dogmatic_opinions_returns_neutral_rather_than_dividing_by_zero():
    o1 = belief.Opinion(b=1.0, d=0.0, u=0.0, a=0.5)
    o2 = belief.Opinion(b=0.0, d=1.0, u=0.0, a=0.5)
    fused = belief.fuse(o1, o2)
    assert fused.u == 1.0
    assert fused.b == 0.0
    assert fused.d == 0.0


# --------------------------------------------------------------------------
# D(n): monotone and concave
# --------------------------------------------------------------------------


@given(st.floats(min_value=0.0, max_value=1000.0, allow_nan=False), st.floats(min_value=0.0, max_value=1000.0, allow_nan=False))
def test_D_is_monotone_nondecreasing(n1, n2):
    lo, hi = (n1, n2) if n1 <= n2 else (n2, n1)
    assert belief.D(lo) <= belief.D(hi) + 1e-12


@given(
    st.floats(min_value=0.0, max_value=300.0, allow_nan=False),
    st.floats(min_value=0.01, max_value=300.0, allow_nan=False),
    st.floats(min_value=0.01, max_value=300.0, allow_nan=False),
)
def test_D_is_concave_via_decreasing_slopes(n1, gap1, gap2):
    n2 = n1 + gap1
    n3 = n2 + gap2
    slope_1 = (belief.D(n2) - belief.D(n1)) / (n2 - n1)
    slope_2 = (belief.D(n3) - belief.D(n2)) / (n3 - n2)
    assert slope_1 >= slope_2 - 1e-9


@given(st.floats(max_value=-1e-9, allow_nan=False, allow_infinity=False))
def test_D_rejects_negative_n(n):
    with pytest.raises(ValueError):
        belief.D(n)


# --------------------------------------------------------------------------
# cross_kind_bonus: 1 for a single kind, non-decreasing under set growth
# --------------------------------------------------------------------------


@given(evidence_kinds_st)
def test_cross_kind_bonus_is_one_for_a_single_kind(kind):
    assert belief.cross_kind_bonus([kind]) == 1.0


@given(st.lists(evidence_kinds_st, min_size=0, max_size=4), st.lists(evidence_kinds_st, min_size=0, max_size=4))
def test_cross_kind_bonus_is_nondecreasing_under_set_growth(subset, extra):
    superset = subset + extra
    assert belief.cross_kind_bonus(superset) >= belief.cross_kind_bonus(subset) - 1e-12


def test_cross_kind_bonus_empty_is_one():
    assert belief.cross_kind_bonus([]) == 1.0


# --------------------------------------------------------------------------
# effective_count: never exceeds raw count; survives cycles and
# self-references without hanging
# --------------------------------------------------------------------------


@given(st.integers(min_value=1, max_value=12))
def test_effective_count_of_a_self_reference_is_one(n_ignored):
    sources = cyclic_sources("solo", 1)  # a single source naming itself as its own parent
    assert belief.effective_count(sources) == 1


@given(st.integers(min_value=2, max_value=15))
def test_effective_count_of_a_full_cycle_collapses_to_one_component(n):
    sources = cyclic_sources("ring", n)
    assert belief.effective_count(sources) == 1


@given(st.integers(min_value=1, max_value=15))
def test_effective_count_never_exceeds_raw_source_count(n):
    sources = cyclic_sources("ring", n)
    assert belief.effective_count(sources) <= len(sources)


@given(st.integers(min_value=2, max_value=15), st.floats(min_value=0.0, max_value=0.59, allow_nan=False))
def test_effective_count_prunes_every_edge_below_theta_prune(n, weak_weight):
    """Every stemma edge weighted below the default `theta_prune` (0.6) is
    pruned, so a ring of `n` sources with every edge weak collapses to `n`
    separate components instead of one."""
    sources = cyclic_sources("ring", n)
    edge_weights = {(s.id, s.stemma_parents[0]): weak_weight for s in sources}
    assert belief.effective_count(sources, edge_weights) == n


def test_effective_count_disjoint_sources_have_no_edges():
    from hte.evidence import Source

    sources = [Source(id=f"solo-{i}", kind=EvidenceKind.TEXTUAL) for i in range(5)]
    assert belief.effective_count(sources) == 5


# --------------------------------------------------------------------------
# Detectability: absence weight scales with delta; at delta == 0, absence
# is never counted at all
# --------------------------------------------------------------------------


def test_detectability_gate_never_counts_absence_when_delta_is_zero():
    item = evidence_item("abs-1", is_absence=True, refutes=[42])
    table = {("period-x", EvidenceKind.TEXTUAL.value): 0.0}
    weight = belief.weight(item, 42, detect_table=table, period="period-x")
    assert weight == 0.0


@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False))
def test_detectability_scale_is_linear_in_delta(delta):
    assert belief.detectability_scale(1.0, delta) == pytest.approx(delta)


def test_detectability_defaults_to_flat_tier_when_pair_unlisted():
    table = {}
    assert belief.detectability(table, "unlisted-period", EvidenceKind.TEXTUAL) == 1.0


# FINDING-2026-09-10-002 resolved: the docstring's own claimed limit
# disagreed with main.tex's eq:detectability, so the docstring was fixed
# to state the formula's real limit.
def test_detectability_scale_matches_the_paper_equation_as_delta_approaches_zero():
    near_zero_delta_result = belief.detectability_scale(1.0, 1e-9)
    assert near_zero_delta_result == pytest.approx(0.0, abs=1e-6)


# --------------------------------------------------------------------------
# weight(): supports wins when an item malformedly names both
# --------------------------------------------------------------------------


def test_weight_supports_wins_when_item_names_both_supports_and_refutes():
    item = evidence_item("both-1", supports=[7], refutes=[7])
    w = belief.weight(item, 7)
    assert w > 0


def test_weight_is_zero_when_address_named_by_neither():
    item = evidence_item("neither-1", supports=[7], refutes=[8])
    assert belief.weight(item, 999) == 0.0
