from __future__ import annotations

import json
from pathlib import Path

import pytest

from hte import artifacts, paper, runner, synth
from hte.cli_synth import run_one_seed

REPO_RUNS = Path(__file__).parent.parent / "runs"

def _real_run_dirs() -> list[Path]:
    dirs: list[Path] = []
    for campaign_dir in ("quantum-history", "default"):
        base = REPO_RUNS / campaign_dir
        if not base.is_dir():
            continue
        for run_dir in sorted(base.iterdir()):
            if run_dir.is_dir() and (run_dir / "MANIFEST.json").is_file():
                dirs.append(run_dir)
    return dirs

REAL_RUN_DIRS = _real_run_dirs()

requires_real_runs = pytest.mark.skipif(
    not REAL_RUN_DIRS,
    reason="no run directory with a MANIFEST.json under runs/quantum-history/ or runs/default/ in this checkout",
)

@pytest.fixture(scope="module")
def fresh_synth_run(tmp_path_factory) -> Path:
    out_dir = tmp_path_factory.mktemp("artifacts-contract-synth")
    row = run_one_seed(runner, 0, out_dir, dict(synth.SMALL_WORLD_KWARGS))
    return Path(row["run_dir"])

@requires_real_runs
@pytest.mark.parametrize("run_dir", REAL_RUN_DIRS, ids=[str(d.relative_to(REPO_RUNS)) for d in REAL_RUN_DIRS])
def test_load_run_succeeds_on_every_real_run_directory(run_dir):
    data = artifacts.load_run(run_dir)
    assert data.campaign
    assert data.manifest.campaign == data.campaign
    assert data.counts is not None
    assert data.calibration is None or isinstance(data.calibration, artifacts.CalibrationArtifact)

def test_load_run_succeeds_on_a_fresh_hte_synth_run(fresh_synth_run):
    data = artifacts.load_run(fresh_synth_run)
    assert data.manifest.run_artifact_version == artifacts.RUN_ARTIFACT_VERSION
    assert data.counts.n_survivors is not None
    assert data.counts.n_sources is not None

def test_fresh_hte_synth_run_timeline_carries_u_on_every_ranked_entry(fresh_synth_run):
    data = artifacts.load_run(fresh_synth_run)
    assert data.timeline.bins, "fresh_synth_run's own small-world preset should place at least one bin"

    seen_ranked_entries = 0
    for b in data.timeline.bins:
        for entry in b["ranked_hypotheses"]:
            assert "opinion" in entry
            if entry["opinion"] is not None:
                assert "u" in entry["opinion"]
                seen_ranked_entries += 1
    assert seen_ranked_entries > 0, "expected at least one opined ranked hypothesis in this fake-mode run"

    for ev in data.timeline.event_views:
        for placement_entry in ev.get("ranked_placements", []):
            assert "opinion" in placement_entry

@requires_real_runs
@pytest.mark.allow_subprocess
@pytest.mark.parametrize("run_dir", REAL_RUN_DIRS, ids=[str(d.relative_to(REPO_RUNS)) for d in REAL_RUN_DIRS])
def test_emit_paper_builds_a_tex_for_every_real_run_directory(run_dir, tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    out_dir = tmp_path / run_dir.name
    result = paper.emit_paper(run_dir, out_dir)
    assert (out_dir / "main.tex").is_file()
    assert result["campaign"]

@pytest.mark.allow_subprocess
def test_emit_paper_builds_a_tex_for_a_fresh_hte_synth_run(fresh_synth_run, tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    out_dir = tmp_path / "synth-paper"
    result = paper.emit_paper(fresh_synth_run, out_dir)
    assert (out_dir / "main.tex").is_file()
    assert result["campaign"] == "0"

@pytest.mark.slow
@pytest.mark.allow_subprocess
def test_make_pdf_builds_over_a_fresh_hte_synth_run(fresh_synth_run, tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    out_dir = tmp_path / "synth-pdf"
    paper.emit_paper(fresh_synth_run, out_dir)
    build = paper.build_pdf(out_dir)
    assert build.ok, build.log[-2000:]
    assert build.page_count and build.page_count > 0
    assert (out_dir / "main.pdf").is_file()

def test_calibration_artifact_reads_the_post_redesign_shape_not_the_retired_n_sources_key(tmp_path):
    run_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "camp"}))

    (run_dir / "calibration.json").write_text(json.dumps({
        "cutoff_years": 1950, "n_sources": 2, "brier_score": 0.02,
    }))
    old_shape = artifacts.load_run(run_dir)
    assert old_shape.calibration.n_holdout_events is None
    assert old_shape.calibration.brier_score == 0.02

    (run_dir / "calibration.json").write_text(json.dumps({
        "mode": "kfold", "n_holdout_events": 105, "n_covered_events": 17, "brier_score": 0.42,
    }))
    new_shape = artifacts.load_run(run_dir)
    assert new_shape.calibration.n_holdout_events == 105
    assert new_shape.calibration.n_covered_events == 17
    assert new_shape.calibration.brier_score == 0.42

def test_load_run_reads_survivors_artifact_when_present(fresh_synth_run):
    data = artifacts.load_run(fresh_synth_run)
    assert isinstance(data.survivors, artifacts.SurvivorsArtifact)
    assert data.survivors.campaign
    assert data.survivors.survivors
    entry = data.survivors.survivors[0]
    assert "hypothesis_id" in entry
    assert "opinion" in entry
    assert "robustness" in entry

def test_load_run_survivors_is_none_when_the_file_is_absent(tmp_path):
    run_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "camp"}))
    data = artifacts.load_run(run_dir)
    assert data.survivors is None
