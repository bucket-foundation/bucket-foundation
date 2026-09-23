from __future__ import annotations

from types import SimpleNamespace

from hypothesis import given, settings
from hypothesis import strategies as st

from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.belief import Opinion
from hte.hypothesis import Hypothesis
from hte.synth import SMALL_WORLD_KWARGS, make_world, score_against_truth

_BASE_KWARGS = dict(SMALL_WORLD_KWARGS)

def _run_artifacts(world, hypotheses: list[Hypothesis], opinions: dict[int, Opinion]) -> SimpleNamespace:
    return SimpleNamespace(
        corpus=world.corpus,
        hypotheses=hypotheses,
        opinions=opinions,
        elos={},
        manifest={"time_binning": {"span_start": DEFAULT_SPAN_START, "bin_width": DEFAULT_BIN_WIDTH, "bin_labels": {}}},
    )

@given(seed=st.integers(min_value=0, max_value=100_000))
@settings(max_examples=300)
def test_make_world_is_deterministic_per_seed(seed):
    first = make_world(seed, **_BASE_KWARGS)
    second = make_world(seed, **_BASE_KWARGS)
    assert first.corpus.to_dict() == second.corpus.to_dict()
    assert first.true_placements == second.true_placements
    assert first.exotic_actor_ids == second.exotic_actor_ids
    assert first.config == second.config

@given(seed_a=st.integers(min_value=0, max_value=100_000), seed_b=st.integers(min_value=0, max_value=100_000))
@settings(max_examples=300)
def test_make_world_different_seeds_do_not_collide_on_content(seed_a, seed_b):
    if seed_a == seed_b:
        return
    first = make_world(seed_a, **_BASE_KWARGS)
    second = make_world(seed_b, **_BASE_KWARGS)
    assert first.corpus.to_dict() != second.corpus.to_dict()

@given(seed=st.integers(min_value=0, max_value=100_000), exotic_rate=st.sampled_from([0.0, 0.02, 0.05, 0.1, 0.25, 0.5]))
@settings(max_examples=300)
def test_make_world_honors_exotic_rate_exactly(seed, exotic_rate):
    world = make_world(seed, **{**_BASE_KWARGS, "exotic_rate": exotic_rate})
    n_exotic = sum(1 for e in world.corpus.evidence if e.provenance == "synthetic-exotic")
    n_corroborating = sum(1 for e in world.corpus.evidence if e.provenance in ("synthetic-copy", "synthetic-corroboration"))
    assert n_exotic == round(exotic_rate * n_corroborating)

_N_AGGREGATE_SEEDS = 60
_TOLERANCE = 0.06

def _aggregate_rate(rate_kwarg: str, value: float, predicate) -> float:
    hits = 0
    total = 0
    for seed in range(_N_AGGREGATE_SEEDS):
        world = make_world(seed, **{**_BASE_KWARGS, rate_kwarg: value})
        for item in world.corpus.evidence:
            if item.provenance not in ("synthetic-copy", "synthetic-corroboration"):
                continue
            total += 1
            if predicate(item):
                hits += 1
    assert total > 200, f"only {total} corroborating items aggregated, too few to bound sampling error"
    return hits / total

def _is_copy(item) -> bool:
    return item.provenance == "synthetic-copy"

@given(copy_rate=st.sampled_from([0.1, 0.3, 0.6, 0.85]))
@settings(max_examples=30, deadline=None)
def test_make_world_honors_copy_rate_within_tolerance(copy_rate):
    observed = _aggregate_rate("copy_rate", copy_rate, _is_copy)
    assert abs(observed - copy_rate) <= _TOLERANCE

@given(refute_rate=st.sampled_from([0.05, 0.2, 0.4, 0.7]))
@settings(max_examples=30, deadline=None)
def test_make_world_honors_refute_rate_within_tolerance(refute_rate):
    from hte.evidence import Stance
    observed = _aggregate_rate("refute_rate", refute_rate, lambda item: item.stance == Stance.NEGATIVE)
    assert abs(observed - refute_rate) <= _TOLERANCE

@given(retract_rate=st.sampled_from([0.05, 0.2, 0.4]))
@settings(max_examples=30, deadline=None)
def test_make_world_honors_retract_rate_within_tolerance(retract_rate):
    observed = _aggregate_rate("retract_rate", retract_rate, lambda item: item.is_absence)
    assert abs(observed - retract_rate) <= _TOLERANCE

@given(noise=st.sampled_from([0.05, 0.2, 0.4, 0.7]))
@settings(max_examples=30, deadline=None)
def test_make_world_honors_noise_rate_within_tolerance(noise):
    from hte.synth import make_world as _make_world

    hits = 0
    total = 0
    for seed in range(_N_AGGREGATE_SEEDS):
        world = _make_world(seed, **{**_BASE_KWARGS, "noise": noise})
        true_by_id = {t.event_id: t for t in world.true_placements}
        for item in world.corpus.evidence:
            if item.provenance not in ("synthetic-copy", "synthetic-corroboration"):
                continue
            event_id = item.id.split("-c")[0]
            t = true_by_id.get(event_id)
            if t is None:
                continue
            total += 1
            differs = (
                item.actor != t.actor or item.action != t.action or item.object != t.object
                or item.place != t.place or item.mechanism != t.mechanism
            )
            if differs:
                hits += 1
    assert total > 200
    observed = hits / total
    assert abs(observed - noise) <= _TOLERANCE

@given(seed=st.integers(min_value=0, max_value=100_000))
@settings(max_examples=300)
def test_score_against_truth_coverage_is_one_when_population_is_exactly_the_truth(seed):
    world = make_world(seed, **_BASE_KWARGS)
    hyps = [Hypothesis.from_placement(t.placement(), world.vocab) for t in world.true_placements]
    opinions = {h.address: Opinion(b=1.0, d=0.0, u=0.0, a=0.5) for h in hyps}
    artifacts = _run_artifacts(world, hyps, opinions)

    result = score_against_truth(artifacts, world)
    assert result["coverage_of_truth"] == 1.0
    assert result["n_matched"] == result["n_true_events"] == len(world.true_placements)

@given(seed=st.integers(min_value=0, max_value=100_000))
@settings(max_examples=300)
def test_score_against_truth_coverage_is_zero_when_population_is_empty(seed):
    world = make_world(seed, **_BASE_KWARGS)
    artifacts = _run_artifacts(world, [], {})

    result = score_against_truth(artifacts, world)
    assert result["coverage_of_truth"] == 0.0
    assert result["n_matched"] == 0
