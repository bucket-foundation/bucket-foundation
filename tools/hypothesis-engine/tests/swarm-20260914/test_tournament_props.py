"""Property tests over `hte.tournament`: Elo seeding, the Swiss-style
debate rounds, and `critic_filter`, against generated hypothesis
populations and opinion maps. `tests/test_tournament.py` already covers
`run`/`critic_filter` with hand-picked two- and three-hypothesis fixtures;
this file drives the same functions across a wider, generated population
size and shape, and checks two invariants no existing test states: the
seed formula holds for every drawn opinion (not one worked example), and
the tournament's own pairwise Elo updates conserve the population's total
rating round over round, whatever the judge returns.
"""
from __future__ import annotations

import math

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte.belief import Opinion
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval
from hte.tournament import _ELO_BASE, _ELO_SCALE, _LOGIT_EPS, _logit, _seed_elo, critic_filter, run
from tests.swarm.conftest import simplex_points, unit_floats

# --------------------------------------------------------------------------
# A small, fixed vocabulary and a catalog of distinct hypotheses built by
# varying ACTOR and MECHANISM alone (every other slot pinned), the same
# shape `tests/test_tournament.py::_hypothesis` uses. Every (actor,
# mechanism) pair yields a distinct address, so a `unique=True` draw over
# the catalog gives a population with no address collision.
# --------------------------------------------------------------------------

_ACTORS = [f"actor-{i}" for i in range(4)]
_MECHS = [f"mech-{i}" for i in range(4)]
_INTERVAL = Interval(start=-7000, end=-6901)


def _vocab() -> Vocabulary:
    vocab = Vocabulary()
    for actor_id in _ACTORS:
        vocab.add(Concept(actor_id, Slot.ACTOR, actor_id, 0.0, ConsensusStatus.CONSENSUS))
    for mech_id in _MECHS:
        vocab.add(Concept(mech_id, Slot.MECHANISM, mech_id, 0.0, ConsensusStatus.CONSENSUS))
    return vocab


_VOCAB = _vocab()
_ALL_COMBOS = [(a, m) for a in _ACTORS for m in _MECHS]


def _hypothesis_for(actor: str, mechanism: str) -> Hypothesis:
    placement = Placement(
        actor=actor, action=other_id(Slot.ACTION), object=other_id(Slot.OBJECT),
        place=other_id(Slot.PLACE), mechanism=mechanism, interval=_INTERVAL,
    )
    return Hypothesis.from_placement(placement, _VOCAB)


@st.composite
def hypothesis_populations(draw, *, min_size: int = 1, max_size: int = 8):
    combos = draw(st.lists(st.sampled_from(_ALL_COMBOS), min_size=min_size, max_size=max_size, unique=True))
    return [_hypothesis_for(a, m) for a, m in combos]


@st.composite
def opinions_for(draw, hyps):
    """A partial opinion map: each hypothesis independently gets a real,
    simplex-valid `Opinion` or is left out entirely (`run`'s own
    documented `P = 0.5` default for an un-opined hypothesis)."""
    opinions: dict[int, Opinion] = {}
    for h in hyps:
        if draw(st.booleans()):
            b, d, u = draw(simplex_points())
            a = draw(unit_floats)
            opinions[h.address] = Opinion(b=b, d=d, u=u, a=a)
    return opinions


def _hash_judge(a: Hypothesis, b: Hypothesis, _ctx: dict) -> float:
    """A deterministic, bounded `Judge` with no fixed constant score, so
    generated runs exercise real Elo movement instead of every pair
    scoring a draw. Python's `hash` of an `int` is identity-based and not
    subject to string hash randomization, so this is stable within and
    across processes for the same address pair."""
    h = hash((a.address, b.address)) & 0xFFFFFFFF
    return (h % 1000) / 999.0


# --------------------------------------------------------------------------
# _logit
# --------------------------------------------------------------------------


@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False), st.floats(min_value=0.0, max_value=1.0, allow_nan=False))
def test_logit_is_monotonic_nondecreasing_in_p(p1, p2):
    lo, hi = min(p1, p2), max(p1, p2)
    assert _logit(lo) <= _logit(hi) + 1e-9


@given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False))
def test_logit_stays_within_the_clamped_bands_own_bounds(p):
    floor = math.log(_LOGIT_EPS / (1.0 - _LOGIT_EPS))
    ceiling = math.log((1.0 - _LOGIT_EPS) / _LOGIT_EPS)
    assert floor - 1e-9 <= _logit(p) <= ceiling + 1e-9


@given(st.floats(min_value=_LOGIT_EPS, max_value=1.0 - _LOGIT_EPS, allow_nan=False))
def test_logit_matches_the_unclamped_formula_inside_the_band(p):
    assert _logit(p) == pytest.approx(math.log(p / (1.0 - p)))


# --------------------------------------------------------------------------
# _seed_elo / run(rounds=0): the seed formula, for every drawn opinion
# --------------------------------------------------------------------------


@given(st.data())
def test_seed_elo_matches_the_paper_formula_for_every_present_opinion(data):
    hyps = data.draw(hypothesis_populations())
    opinions = data.draw(opinions_for(hyps))
    seeded = _seed_elo(hyps, opinions)
    for h in hyps:
        opinion = opinions.get(h.address)
        p = opinion.project() if opinion is not None else 0.5
        expected = _ELO_BASE + _ELO_SCALE * _logit(p)
        assert seeded[h.address] == pytest.approx(expected)


@given(hypothesis_populations())
def test_seed_elo_reads_1500_for_every_unopined_hypothesis(hyps):
    seeded = _seed_elo(hyps, {})
    for h in hyps:
        assert seeded[h.address] == pytest.approx(1500.0)


@given(st.data())
def test_run_with_zero_rounds_returns_exactly_the_seeded_elo(data):
    hyps = data.draw(hypothesis_populations())
    opinions = data.draw(opinions_for(hyps))
    assert run(hyps, opinions, _hash_judge, rounds=0) == _seed_elo(hyps, opinions)


# --------------------------------------------------------------------------
# run: every address survives, determinism, and the zero-sum invariant
# --------------------------------------------------------------------------


@given(st.data(), st.integers(min_value=0, max_value=4))
def test_run_returns_exactly_one_rating_per_input_address(data, rounds):
    hyps = data.draw(hypothesis_populations())
    opinions = data.draw(opinions_for(hyps))
    result = run(hyps, opinions, _hash_judge, rounds=rounds)
    assert set(result) == {h.address for h in hyps}


@given(st.data(), st.integers(min_value=0, max_value=4), st.integers(min_value=-1000, max_value=1000))
def test_run_is_deterministic_for_a_fixed_seed(data, rounds, seed):
    hyps = data.draw(hypothesis_populations())
    opinions = data.draw(opinions_for(hyps))
    first = run(hyps, opinions, _hash_judge, rounds=rounds, seed=seed)
    second = run(hyps, opinions, _hash_judge, rounds=rounds, seed=seed)
    assert first == second


@given(st.data(), st.integers(min_value=0, max_value=5))
def test_run_conserves_the_populations_total_elo_across_every_round(data, rounds):
    """Every round's update moves each paired hypothesis by `+delta`/
    `-delta` (`run`'s own `elo[addr_a] = elo_a + delta`, `elo[addr_b] =
    elo_b - delta`); a bye leaves its own hypothesis untouched. Either way
    the sum over the whole population never moves, whatever a judge (or
    `judge_batch`) returns, since no round-trip introduces or removes
    rating mass. This holds for `_hash_judge`'s own varied, non-constant
    scores just as it does for a null judge."""
    hyps = data.draw(hypothesis_populations(min_size=1, max_size=8))
    opinions = data.draw(opinions_for(hyps))
    seeded_total = sum(_seed_elo(hyps, opinions).values())
    result = run(hyps, opinions, _hash_judge, rounds=rounds)
    assert sum(result.values()) == pytest.approx(seeded_total, abs=1e-6)


@given(st.data(), st.integers(min_value=0, max_value=4))
def test_run_with_judge_batch_matches_the_equivalent_single_judge(data, rounds):
    hyps = data.draw(hypothesis_populations())
    opinions = data.draw(opinions_for(hyps))

    def batch(pairs):
        return [_hash_judge(a, b, ctx) for a, b, ctx in pairs]

    without_batch = run(hyps, opinions, _hash_judge, rounds=rounds, seed=3)
    with_batch = run(hyps, opinions, _hash_judge, rounds=rounds, seed=3, judge_batch=batch)
    assert without_batch == with_batch


# --------------------------------------------------------------------------
# critic_filter
# --------------------------------------------------------------------------


@given(st.data())
def test_critic_filter_keeps_exactly_the_nonrejected_hypotheses_in_order(data):
    hyps = data.draw(hypothesis_populations(min_size=1))
    rejects = data.draw(st.lists(st.booleans(), min_size=len(hyps), max_size=len(hyps)))
    reject_map = dict(zip((h.address for h in hyps), rejects))

    def critic(h, _as_dict):
        return {"reject": reject_map[h.address]}

    survivors = critic_filter(hyps, critic)
    expected = [h for h in hyps if not reject_map[h.address]]
    assert [h for h, _report in survivors] == expected


@given(st.data())
def test_critic_filter_report_is_exactly_what_the_critic_returned(data):
    hyps = data.draw(hypothesis_populations(min_size=1))

    def critic(h, _as_dict):
        return {"reject": False, "addr": h.address, "note": "kept"}

    survivors = critic_filter(hyps, critic)
    for h, report in survivors:
        assert report == {"reject": False, "addr": h.address, "note": "kept"}


@given(hypothesis_populations())
def test_critic_filter_passes_the_hypotheses_own_to_dict_alongside_the_object(hyps):
    seen: dict[int, dict] = {}

    def critic(h, as_dict):
        seen[h.address] = as_dict
        return {"reject": False}

    critic_filter(hyps, critic)
    for h in hyps:
        assert seen[h.address] == h.to_dict()
