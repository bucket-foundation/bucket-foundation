"""Contract tests for `hte.artifacts`.

`bkt-hte-artifact-contract`'s own motivating incident (`hte.artifacts`'s
module docstring): `hte.calibrate`'s `bkt-hte-calibration-redesign`
rewrite changed `calibration.json`'s real shape (`n_sources` ->
`n_holdout_events`/`n_covered_events`), and nothing caught the drift
because `tests/test_paper.py`'s own real-run fixture
(`runs/quantum-history-real/20260910T001819Z`) predates that rewrite and
still carries the old shape; every run written after it crashed
`emit_paper` with `KeyError: 'n_sources'`.

This file closes that gap: it loads `hte.runner.run_campaign`'s own real
output instead of a hand-rolled fixture, so any future rewrite of a
writer's own artifact shape that `hte.artifacts` is not updated to match
fails one of the tests below immediately.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from hte import artifacts, paper, runner, synth
from hte.cli_synth import run_one_seed

REPO_RUNS = Path(__file__).parent.parent / "runs"


def _real_run_dirs() -> list[Path]:
    """Every run directory under `runs/quantum-history/` and
    `runs/default/` that carries a `MANIFEST.json`, sorted for a stable
    parametrize order. Excludes a directory with no manifest at all
    (`runs/quantum-history/20260910T083617Z` as of 2026-09-10, an
    interrupted run this checkout happens to carry): `hte.artifacts.
    load_run`'s own contract for that case is `FileNotFoundError`,
    already covered by `tests/test_paper.py::
    test_load_run_missing_manifest_raises`; this file's own claim is
    scoped to every real run that has a manifest to load."""
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

# `runs/` is this package's own `.gitignore` entry (`hte.publish`'s
# module docstring), so a fresh checkout carries none of these; the
# parametrized tests below skip rather than fail in that case, the same
# `requires_real_run`-style guard `tests/test_paper.py`, `tests/
# test_pipeline.py`, and `tests/test_referee.py` each already use for
# their own single real-run fixture.
requires_real_runs = pytest.mark.skipif(
    not REAL_RUN_DIRS,
    reason="no run directory with a MANIFEST.json under runs/quantum-history/ or runs/default/ in this checkout",
)


@pytest.fixture(scope="module")
def fresh_synth_run(tmp_path_factory) -> Path:
    """One freshly generated campaign run, `hte.cli_synth.run_one_seed`
    (the same call `hte-synth run` itself makes, `README.md`'s own
    "Running the tests" section), over `hte.synth`'s small-world preset
    in fake LLM mode: a ~1-2s campaign, module-scoped so every test below
    that needs one real run directory shares it rather than each paying
    its own generation cost."""
    out_dir = tmp_path_factory.mktemp("artifacts-contract-synth")
    row = run_one_seed(runner, 0, out_dir, dict(synth.SMALL_WORLD_KWARGS))
    return Path(row["run_dir"])


# --------------------------------------------------------------------------
# load_run over every real run directory this checkout carries
# --------------------------------------------------------------------------


@requires_real_runs
@pytest.mark.parametrize("run_dir", REAL_RUN_DIRS, ids=[str(d.relative_to(REPO_RUNS)) for d in REAL_RUN_DIRS])
def test_load_run_succeeds_on_every_real_run_directory(run_dir):
    data = artifacts.load_run(run_dir)
    assert data.campaign
    assert data.manifest.campaign == data.campaign
    # `RunCounts`/`CalibrationArtifact` are always present as typed
    # objects (defaulted, never `None`) even when a field inside them is
    # missing; `calibration` alone may be the whole-file `None` this
    # contract documents for "no holdout ran".
    assert data.counts is not None
    assert data.calibration is None or isinstance(data.calibration, artifacts.CalibrationArtifact)


def test_load_run_succeeds_on_a_fresh_hte_synth_run(fresh_synth_run):
    data = artifacts.load_run(fresh_synth_run)
    assert data.manifest.run_artifact_version == artifacts.RUN_ARTIFACT_VERSION
    assert data.counts.n_survivors is not None
    assert data.counts.n_sources is not None


# --------------------------------------------------------------------------
# emit_paper over every one of those same run directories
# --------------------------------------------------------------------------


@requires_real_runs
@pytest.mark.allow_subprocess  # emit_paper shells out to a real `python3 figures/fig_*.py` render
@pytest.mark.parametrize("run_dir", REAL_RUN_DIRS, ids=[str(d.relative_to(REPO_RUNS)) for d in REAL_RUN_DIRS])
def test_emit_paper_builds_a_tex_for_every_real_run_directory(run_dir, tmp_path, monkeypatch):
    # `emit_paper` itself makes no LLM call (`hte/paper.py` imports
    # neither `hte.llm` nor `hte.roles`); `HTE_LLM_MODE=fake` is set here
    # anyway, matching the task's own contract, so this test can never
    # reach a live `claude -p` call by accident if that ever changes.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    out_dir = tmp_path / run_dir.name
    result = paper.emit_paper(run_dir, out_dir)
    assert (out_dir / "main.tex").is_file()
    assert result["campaign"]


@pytest.mark.allow_subprocess  # emit_paper shells out to a real `python3 figures/fig_*.py` render
def test_emit_paper_builds_a_tex_for_a_fresh_hte_synth_run(fresh_synth_run, tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    out_dir = tmp_path / "synth-paper"
    result = paper.emit_paper(fresh_synth_run, out_dir)
    assert (out_dir / "main.tex").is_file()
    assert result["campaign"] == "0"  # hte.cli_synth._campaign_config names a seed's own campaign str(seed)


@pytest.mark.slow
@pytest.mark.allow_subprocess  # emit_paper's figure renders plus build_pdf's real `make pdf`/pdflatex
def test_make_pdf_builds_over_a_fresh_hte_synth_run(fresh_synth_run, tmp_path, monkeypatch):
    """`make pdf` on one run directory (the fresh synth one: cheap,
    deterministic, and independent of which real run directories a given
    checkout happens to carry) confirms every number this contract feeds
    `hte.paper` renders into LaTeX `pdflatex`/`biber` can build end to
    end, not only that `main.tex` gets written."""
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    out_dir = tmp_path / "synth-pdf"
    paper.emit_paper(fresh_synth_run, out_dir)
    build = paper.build_pdf(out_dir)
    assert build.ok, build.log[-2000:]
    assert build.page_count and build.page_count > 0
    assert (out_dir / "main.pdf").is_file()


# --------------------------------------------------------------------------
# The exact regression this contract closes: `calibration.json`'s
# pre-redesign `n_sources` shape vs. the real post-redesign shape
# --------------------------------------------------------------------------


def test_calibration_artifact_reads_the_post_redesign_shape_not_the_retired_n_sources_key(tmp_path):
    """`hte.calibrate.write_calibration`'s real shape today carries
    `n_holdout_events`/`n_covered_events`; the retired pre-`bkt-hte-
    calibration-redesign` shape carried `n_sources` instead (module
    docstring). Both must load without a `KeyError`: the retired key is
    silently unmodeled, so `n_holdout_events` falls back to `None`
    (logged as a missing optional field), while the real key reads its
    own value once a run's own calibration.json carries it."""
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
