import os
import subprocess
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from hypothesis import settings

settings.register_profile("fast", max_examples=40, deadline=None)
settings.register_profile("full", max_examples=300, deadline=None)
settings.load_profile(os.environ.get("HTE_TEST_PROFILE", "fast"))

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

@pytest.fixture(autouse=True)
def _no_real_subprocess(request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch) -> None:
    if request.node.get_closest_marker("allow_subprocess") is not None:
        return

    def _forbidden(*args: Any, **kwargs: Any) -> Any:
        raise RuntimeError(
            "test attempted to spawn a subprocess; set HTE_LLM_MODE=fake or "
            "--replay-only, or opt out with the `allow_subprocess` marker"
        )

    monkeypatch.setattr(subprocess, "run", _forbidden)
    monkeypatch.setattr(subprocess, "Popen", _forbidden)
