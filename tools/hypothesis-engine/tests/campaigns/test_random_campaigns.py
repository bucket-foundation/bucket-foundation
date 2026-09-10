"""Random synthetic campaigns with planted truth, run end to end in fake
mode over many seeds: the engine's own
mechanics, generation, linking, critique, scoring, tournament, holdout
calibration, coverage interval, self-report, checked against a KNOWN
answer instead of against a corpus whose real facts nobody wrote down
anywhere machine-readable.

Every assertion here is checked against `hte.synth.SMALL_WORLD_KWARGS`
(the same "about 8 true events, 40 evidence items" preset `hte-synth run`
uses by default), and the threshold itself stays fixed regardless of
outcome: an assertion that fails on the current engine gets
`xfail(strict=True)` plus a numbered finding in
`tests/swarm/FINDINGS-2026-09-10.md`, the bar is never lowered to make it
pass.
"""
from __future__ import annotations

import pytest

from hte import runner, synth
from hte.cli_synth import run_one_seed

SEEDS = list(range(20))
MIN_COVERAGE = 0.8
MAX_BRIER = 0.25
MAX_EXOTIC_FP = 0.1


@pytest.fixture(scope="module")
def campaign_rows(tmp_path_factory):
    """One `run_one_seed` row per seed in `SEEDS`, computed once and
    shared across every assertion in this module (each row is itself a
    ~1-2s fake-mode campaign; twenty of them dominate this module's own
    runtime, so every test below reads from this fixture rather than
    re-running its own batch)."""
    out_dir = tmp_path_factory.mktemp("random-campaigns")
    return [run_one_seed(runner, seed, out_dir, dict(synth.SMALL_WORLD_KWARGS)) for seed in SEEDS]


def _mean(rows: list[dict], key: str) -> float | None:
    values = [r[key] for r in rows if r.get(key) is not None]
    return sum(values) / len(values) if values else None


def test_twenty_seeds_all_ran_and_matched_at_least_one_true_event(campaign_rows):
    """A sanity floor under the three statistical assertions below: every
    seed produced a scoreable campaign at all. A `coverage_of_truth` of
    `None`, or zero survivors, would point at a problem in this test's
    own setup rather than in the engine under test."""
    assert len(campaign_rows) == len(SEEDS)
    for row in campaign_rows:
        assert row["coverage_of_truth"] is not None
        assert row["n_survivors"] > 0


def test_coverage_of_truth_mean_at_least_point_eight(campaign_rows):
    mean_coverage = _mean(campaign_rows, "coverage_of_truth")
    assert mean_coverage is not None
    assert mean_coverage >= MIN_COVERAGE, (
        f"mean coverage_of_truth {mean_coverage} over {len(campaign_rows)} seeds fell below {MIN_COVERAGE}; "
        f"per-seed: {[r['coverage_of_truth'] for r in campaign_rows]}"
    )


def test_mean_brier_at_most_point_two_five(campaign_rows):
    mean_brier = _mean(campaign_rows, "brier_true_only")
    assert mean_brier is not None
    assert mean_brier <= MAX_BRIER, (
        f"mean brier_true_only {mean_brier} over {len(campaign_rows)} seeds exceeded {MAX_BRIER}; "
        f"per-seed: {[r['brier_true_only'] for r in campaign_rows]}"
    )


def test_exotic_false_positive_rate_at_most_point_one(campaign_rows):
    mean_fp = _mean(campaign_rows, "exotic_false_positive_rate")
    assert mean_fp is not None
    assert mean_fp <= MAX_EXOTIC_FP, (
        f"mean exotic_false_positive_rate {mean_fp} over {len(campaign_rows)} seeds exceeded {MAX_EXOTIC_FP}; "
        f"per-seed: {[r['exotic_false_positive_rate'] for r in campaign_rows]}"
    )


def test_same_seed_twice_gives_identical_summary_entries(tmp_path):
    """Determinism: the same seed run through the whole engine loop
    twice, in two separate output directories, produces byte-identical
    `run_one_seed` rows on every field except the ones that are allowed
    to vary (the run directory's own timestamp-bearing path, and wall-
    clock elapsed time)."""
    row_a = run_one_seed(runner, 0, tmp_path / "a", dict(synth.SMALL_WORLD_KWARGS))
    row_b = run_one_seed(runner, 0, tmp_path / "b", dict(synth.SMALL_WORLD_KWARGS))
    compare_keys = [k for k in row_a if k not in ("run_dir", "elapsed_s")]
    for key in compare_keys:
        assert row_a[key] == row_b[key], f"seed 0 differed on {key!r} across two runs: {row_a[key]!r} != {row_b[key]!r}"
