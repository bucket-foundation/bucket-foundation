"""Property tests over `hte.unknowns`: Good-Turing/Chao1, prior-profile
`OTHER` preservation, surprise tracking, and value-of-information sums."""
from __future__ import annotations

import pytest
from tests.swarm.conftest import fresh_vocabulary, vocabulary_with_extra
from hypothesis import given
from hypothesis import strategies as st

from hte import unknowns
from hte.belief import Opinion
from hte.concepts import ConsensusStatus, Slot
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval
from hte.unknowns import GapNode


# --------------------------------------------------------------------------
# Good-Turing missing mass and Chao1
# --------------------------------------------------------------------------


counts_st = st.dictionaries(
    st.integers(min_value=1, max_value=10_000), st.integers(min_value=1, max_value=50), min_size=0, max_size=30,
)


@given(counts_st)
def test_good_turing_missing_mass_is_in_unit_interval(counts):
    m = unknowns.good_turing_missing_mass(counts)
    assert 0.0 <= m <= 1.0


def test_good_turing_missing_mass_of_empty_counts_is_zero():
    assert unknowns.good_turing_missing_mass({}) == 0.0


@given(counts_st)
def test_chao1_is_at_least_observed_count(counts):
    s_obs = len(counts)
    assert unknowns.chao1(counts) >= s_obs - 1e-9


def test_chao1_of_empty_counts_is_zero():
    assert unknowns.chao1({}) == 0.0


def test_chao1_of_all_singletons_uses_the_f2_zero_branch():
    counts = {i: 1 for i in range(5)}
    # f2 == 0 branch: S_obs + f1*(f1-1)/2 = 5 + 5*4/2 = 15
    assert unknowns.chao1(counts) == pytest.approx(15.0)


# --------------------------------------------------------------------------
# coverage_interval: low <= high, always
# --------------------------------------------------------------------------


run_counts_st = st.lists(counts_st, min_size=1, max_size=6)


@given(run_counts_st)
def test_coverage_interval_low_never_exceeds_high(run_counts):
    result = unknowns.coverage_interval(run_counts)
    assert result["coverage_low"] <= result["coverage_high"] + 1e-9


@given(run_counts_st)
def test_coverage_interval_bounds_are_fractions(run_counts):
    result = unknowns.coverage_interval(run_counts)
    assert 0.0 <= result["coverage_low"] <= 1.0 + 1e-9
    assert 0.0 <= result["coverage_high"] <= 1.0 + 1e-9
    assert 0.0 <= result["missing_mass"] <= 1.0 + 1e-9


def test_coverage_interval_of_no_runs_reads_as_fully_uncertain_zero_observed():
    result = unknowns.coverage_interval([])
    assert result["observed"] == 0
    assert result["coverage_low"] <= result["coverage_high"]


# --------------------------------------------------------------------------
# prior_profiles: every profile preserves the OTHER concept unchanged
# --------------------------------------------------------------------------


@given(st.integers(min_value=0, max_value=5))
def test_prior_profiles_preserves_other_unchanged_in_every_slot(n_extra):
    from hte.concepts import other_id

    vocab = vocabulary_with_extra(Slot.ACTOR, [f"extra-{i}" for i in range(n_extra)])
    profiles = unknowns.prior_profiles(vocab)
    assert set(profiles) == {"consensus", "skeptic", "fringe", "uniform"}
    for name, profile_vocab in profiles.items():
        for slot in Slot:
            original_other = vocab.get(slot, other_id(slot))
            shifted_other = profile_vocab.get(slot, other_id(slot))
            assert shifted_other is not None, f"{name}/{slot} lost its OTHER concept"
            assert shifted_other.prior_logit == 0.0
            assert shifted_other.label == original_other.label
            assert shifted_other.consensus_status == original_other.consensus_status


@given(st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False))
def test_prior_profiles_uniform_zeroes_every_concept_regardless_of_status(prior):
    from hte.concepts import Concept

    vocab = fresh_vocabulary()
    vocab.add(Concept(id="x1", slot=Slot.ACTOR, label="x1", prior_logit=prior, consensus_status=ConsensusStatus.FRINGE))
    uniform = unknowns.prior_profiles(vocab)["uniform"]
    for c in uniform.concepts(Slot.ACTOR):
        assert c.prior_logit == 0.0


@given(st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False))
def test_prior_profiles_fringe_and_skeptic_mirror_each_other_for_fringe_status(v):
    from hte.concepts import Concept

    vocab = fresh_vocabulary()
    vocab.add(Concept(id="fringe-1", slot=Slot.ACTOR, label="f", prior_logit=v, consensus_status=ConsensusStatus.FRINGE))
    profiles = unknowns.prior_profiles(vocab)
    skeptic_v = next(c for c in profiles["skeptic"].concepts(Slot.ACTOR) if c.id == "fringe-1").prior_logit
    fringe_v = next(c for c in profiles["fringe"].concepts(Slot.ACTOR) if c.id == "fringe-1").prior_logit
    assert fringe_v == pytest.approx(-skeptic_v)


# --------------------------------------------------------------------------
# surprise: empty when every item is linked to a materialized hypothesis
# --------------------------------------------------------------------------


def _placement_hypothesis(address: int) -> Hypothesis:
    placement = Placement(actor="a", action="b", object="c", place="d", mechanism="e", interval=Interval(0, 0))
    return Hypothesis(address=address, content=placement)


@given(st.lists(st.integers(min_value=1, max_value=1000), min_size=1, max_size=8, unique=True))
def test_surprise_is_empty_when_every_item_is_linked(addresses):
    from tests.swarm.conftest import evidence_item

    hyps = [_placement_hypothesis(a) for a in addresses]
    items = [evidence_item(f"e{i}", supports=[a]) for i, a in enumerate(addresses)]
    assert unknowns.surprise(items, hyps) == []


def test_surprise_flags_an_item_naming_no_materialized_address():
    from tests.swarm.conftest import evidence_item

    hyps = [_placement_hypothesis(1)]
    stray = evidence_item("stray", refutes=[999])
    silent = evidence_item("silent", supports=[], refutes=[])
    assert unknowns.surprise([stray, silent], hyps) == [stray]


# --------------------------------------------------------------------------
# value_of_information: sums u^2 over addresses with both a hypothesis and
# an opinion on file
# --------------------------------------------------------------------------


@given(st.lists(st.floats(min_value=0.0, max_value=1.0, allow_nan=False), min_size=0, max_size=6))
def test_value_of_information_sums_u_squared_over_known_addresses(u_values):
    hyps = [_placement_hypothesis(i + 1) for i in range(len(u_values))]
    opinions = {i + 1: Opinion(b=0.0, d=0.0, u=u, a=0.5) for i, u in enumerate(u_values)}
    gap = GapNode(id="g1", kind="site", description="d", would_move=[i + 1 for i in range(len(u_values))])
    result = unknowns.value_of_information(gap, hyps, opinions)
    assert result == pytest.approx(sum(u * u for u in u_values), abs=1e-9)


def test_value_of_information_ignores_addresses_missing_a_hypothesis_or_an_opinion():
    hyps = [_placement_hypothesis(1)]
    opinions = {1: Opinion(b=0.0, d=0.0, u=0.5, a=0.5)}
    gap = GapNode(id="g1", kind="site", description="d", would_move=[1, 2, 3])
    assert unknowns.value_of_information(gap, hyps, opinions) == pytest.approx(0.25)
