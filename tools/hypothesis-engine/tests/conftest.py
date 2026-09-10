import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from hypothesis import settings

# ---------------------------------------------------------------------------
# Hypothesis profiles
# ---------------------------------------------------------------------------
# `fast` runs on every commit: 40 examples per property, no per-example
# deadline. `full` is opt-in via `HTE_TEST_PROFILE=full` (or `make
# test-full`) and restores the 300-example depth the property swarm was
# written against. This is the one place either profile gets registered;
# `tests/swarm/conftest.py` and `tests/swarm2/conftest.py` used to each
# load their own hard-coded 300-example profile, which is exactly the
# per-commit cost this file now splits out. `settings.load_profile` sets
# the process-wide default, and pytest imports `tests/conftest.py` before
# any subdirectory conftest, so this selection stands for every `@given`
# test that does not pin its own `max_examples`. A handful of tests in
# the swarm do pin one (a fixture-heavy property, an LLM-shaped one), and
# stay at their pinned example count under either profile by design.
settings.register_profile("fast", max_examples=40, deadline=None)
settings.register_profile("full", max_examples=300, deadline=None)
settings.load_profile(os.environ.get("HTE_TEST_PROFILE", "fast"))


# ---------------------------------------------------------------------------
# `slow` marking, by measured duration
# ---------------------------------------------------------------------------
# Every node id below took longer than 2 seconds under the `fast` profile,
# measured with `pytest --durations=0` on 2026-09-10 (`make test-durations`
# reproduces the measurement). A test lands here for its own reason: a
# pinned `max_examples=300` decorator that the `fast` profile can't lower,
# a real fixture cost (subprocess LaTeX/matplotlib renders, on-disk parquet
# writes, a 20-seed campaign fixture), or plain per-example work. The list
# is a static set of strings, so re-measuring after a change to the suite
# is a find-and-replace of this one set rather than a hunt through test
# files for `@pytest.mark.slow`.
_SLOW_NODEIDS: frozenset[str] = frozenset({
    "tests/campaigns/test_random_campaigns.py::test_same_seed_twice_gives_identical_summary_entries",
    "tests/swarm/test_paper_props.py::test_emit_paper_produces_a_tex_with_no_dangling_reference",
    "tests/swarm/test_pipeline_props.py::test_from_run_with_a_real_manifest_attempts_emit_paper",
    "tests/swarm2/test_corpus_education_atlas_props.py::test_load_filtered_by_countries_and_years_is_a_subset_of_unfiltered",
    "tests/swarm2/test_corpus_education_atlas_props.py::test_load_filtered_by_years_is_a_subset_of_unfiltered",
    "tests/swarm2/test_corpus_education_atlas_props.py::test_load_filtered_by_years_keeps_only_in_range_ground_truth",
    "tests/swarm2/test_parallel_props.py::test_pmap_ordered_output_independent_of_worker_count",
    "tests/swarm2/test_parallel_props.py::test_pmap_preserves_order_under_random_per_item_delays",
    "tests/swarm2/test_synth_props.py::test_score_against_truth_coverage_is_one_when_population_is_exactly_the_truth",
    "tests/test_calibrate.py::test_holdout_kfold_coverage_on_synthetic_worlds_is_at_least_0_8",
    "tests/test_calibrate.py::test_fit_constants_pooled_never_returns_a_worse_loss_than_the_baseline",
    "tests/test_calibrate.py::test_fit_constants_pooled_history_includes_the_baseline_first",
    "tests/test_calibrate.py::test_fit_constants_pooled_respects_a_custom_start_vector",
    "tests/test_calibrate.py::test_fit_constants_pooled_respects_parameter_bounds",
    "tests/test_paper.py::test_emit_paper_and_build_pdf_over_a_real_run",
    "tests/test_pipeline.py::test_run_pipeline_end_to_end_from_a_real_run_dry_run",
    "tests/test_referee.py::test_referee_end_to_end_fixes_bare_ref_and_antithesis_replay_only",
})


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    for item in items:
        if item.nodeid in _SLOW_NODEIDS:
            item.add_marker(pytest.mark.slow)
