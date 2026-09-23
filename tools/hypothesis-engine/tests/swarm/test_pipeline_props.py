from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import pipeline

nonexistent_suffixes = st.text(alphabet="abcdefghijklmnop-", min_size=1, max_size=12)

def _run_once(config: dict) -> dict:
    tmp = tempfile.mkdtemp()
    try:
        config = {**config, "pipeline_out_dir": str(Path(tmp) / "pipe")}
        return pipeline.run_pipeline(config)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

@given(nonexistent_suffixes)
def test_missing_from_run_skips_choose_period_and_run_campaign_and_names_it(suffix):
    result = _run_once({"from_run": f"/tmp/does-not-exist-{suffix}"})
    assert result["stages"]["choose_period"]["ran"] is False
    assert result["stages"]["run_campaign"]["ran"] is False
    assert f"does-not-exist-{suffix}" in result["stages"]["choose_period"]["output"]["skipped"]

@given(nonexistent_suffixes)
def test_missing_from_run_leaves_no_paper_dir(suffix):
    result = _run_once({"from_run": f"/tmp/does-not-exist-{suffix}"})
    assert result["paper_dir"] is None
    assert result["stages"]["emit_paper"]["ran"] is False

def test_missing_from_run_error_reason_should_mention_the_path_that_was_given():
    result = _run_once({"from_run": "/tmp/does-not-exist-abc123"})
    reason = result["stages"]["emit_paper"]["error"]
    assert "does-not-exist-abc123" in reason
    assert result["stages"]["emit_paper"]["ok"] is False

def test_missing_from_run_outcome_should_read_error_not_ok():
    result = _run_once({"from_run": "/tmp/does-not-exist-abc123"})
    assert result["outcome"] == "error"

def _real_run_dir_from_test_paper_fixture() -> Path | None:
    candidate = Path(__file__).parent.parent.parent / "runs" / "quantum-history-real" / "20260910T001819Z"
    return candidate if (candidate / "MANIFEST.json").is_file() else None

@pytest.mark.allow_subprocess
def test_from_run_with_a_real_manifest_attempts_emit_paper():
    real_run = _real_run_dir_from_test_paper_fixture()
    if real_run is None:
        pytest.skip("no committed real run directory in this checkout")
    result = _run_once({"from_run": str(real_run), "dry_run": True})
    assert result["stages"]["choose_period"]["ran"] is False
    assert result["stages"]["run_campaign"]["ran"] is False
    assert result["stages"]["emit_paper"]["ran"] is True

@given(nonexistent_suffixes)
def test_pipeline_json_on_disk_matches_the_returned_summary(suffix):
    tmp = tempfile.mkdtemp()
    try:
        pipeline_dir = Path(tmp) / "pipe"
        config = {"from_run": f"/tmp/does-not-exist-{suffix}", "pipeline_out_dir": str(pipeline_dir)}
        result = pipeline.run_pipeline(config)
        on_disk = json.loads((pipeline_dir / "PIPELINE.json").read_text())
        assert on_disk == result
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
