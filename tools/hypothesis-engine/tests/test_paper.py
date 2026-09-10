import json
import shutil
import uuid
from pathlib import Path

import pytest

from hte import paper

REAL_RUN_DIR = Path(__file__).parent.parent / "runs" / "quantum-history-real" / "20260910T001819Z"
SCRATCH_ROOT = Path(__file__).parent.parent / "runs"

requires_real_run = pytest.mark.skipif(
    not (REAL_RUN_DIR / "MANIFEST.json").is_file(),
    reason="tools/hypothesis-engine/runs/quantum-history-real/20260910T001819Z is not present in this checkout",
)


def _minimal_run(tmp_path, *, with_calibration: bool = True) -> Path:
    run_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": "camp", "timestamp": "20260101T000000Z", "corpus": "fixtures",
        "models": {"roles": {"generator": "sonnet", "critic": "sonnet"}},
        "config": {"seeds": 1, "generate_n": 2, "combinatorial_max_items": 5, "max_hypotheses": 8,
                   "tournament_rounds": 1, "resolution": "century"},
        "extraction": None,
        "counts": {
            "campaign": "camp", "n_sources": 2, "n_evidence": 6, "n_hypotheses_generated": 10,
            "n_survivors": 4, "vocab_added": [{"slot": "actor", "id": "uu-x", "label": "X", "rationale": "r"}],
            "coverage": {"observed": 10, "chao1_estimate": 10.0, "missing_mass": 0.1, "coverage_low": 0.8, "coverage_high": 1.0},
            "robustness_stable_fraction": 0.75, "surprise_rate": 0.1,
            "calibration_brier": 0.02 if with_calibration else None,
            "target_blind": {"rate": 0.5, "prior_rate": None, "steady": True, "first_run": True},
            "meta_review": {"summary": "a summary.", "flags": ["a flag"], "recommended_actions": ["an action"]},
        },
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    timeline = {
        "bins": [{"time_bin": {"index": 1}, "ranked_hypotheses": [
            {"hypothesis_id": "abc123", "address": 1, "slots": {}, "posterior": 0.9, "elo": 1500.0},
            {"hypothesis_id": "def456", "address": 2, "slots": {}, "posterior": 0.6, "elo": 1400.0},
        ]}],
        "event_views": [{"event": {"object": "o", "place": "p"}, "competing_placements": ["abc123"]}],
        "pair_views": [],
    }
    (run_dir / "timeline.json").write_text(json.dumps(timeline))
    if with_calibration:
        # `hte.calibrate.write_calibration`'s own current (post-`bkt-hte-
        # calibration-redesign`) shape: `n_holdout_events`/
        # `n_covered_events`, replacing the pre-redesign `n_sources` this
        # fixture used to carry (`hte.artifacts`'s own module docstring
        # names that exact drift as this contract's motivating bug).
        calibration = {
            "mode": "discovery_date", "cutoff_years": 1950, "n_holdout_events": 2, "n_covered_events": 2,
            "brier_score": 0.02,
            "calibration_curve": [{"bin_low": 0.8, "bin_high": 0.9, "count": 1, "mean_predicted": 0.85, "mean_observed": 1.0}],
            "constants": {"W": 2.0, "lam": 0.5},
        }
        (run_dir / "calibration.json").write_text(json.dumps(calibration))
    self_report = {
        "assumptions": ["an assumption"], "incomplete_vocabularies": ["actor"],
        "missing_mass_estimate": 0.1, "calibration_summary": "fine.",
        "target_blind_steady": True, "target_blind_note": "note.",
    }
    (run_dir / "self-report.json").write_text(json.dumps(self_report))
    return run_dir


def test_tex_escape_escapes_every_special_character():
    assert paper.tex_escape("a_b & c% $d #e {f} ~g ^h \\i") == (
        r"a\_b \& c\% \$d \#e \{f\} \textasciitilde{}g \textasciicircum{}h \textbackslash{}i"
    )


def test_fmt_handles_none_bool_float_int():
    assert paper._fmt(None) == "not recorded"
    assert paper._fmt(True) == "true"
    assert paper._fmt(False) == "false"
    assert paper._fmt(0.12345) == "0.123"
    assert paper._fmt(0.12345, nd=1) == "0.1"
    assert paper._fmt(7) == "7"


def test_title_case_splits_on_hyphen_and_underscore():
    assert paper._title_case("quantum-history-real") == "Quantum History Real"
    assert paper._title_case("a_b-c") == "A B C"


def test_run_date_formats_timestamp_and_falls_back():
    assert paper._run_date("20260910T001819Z") == "2026-09-10"
    assert paper._run_date("") == "2026"
    assert paper._run_date("2026") == "2026"


def test_load_run_missing_manifest_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        paper.load_run(tmp_path / "no-such-run")


def test_load_run_reads_every_artifact(tmp_path):
    run_dir = _minimal_run(tmp_path)
    data = paper.load_run(run_dir)
    assert data.campaign == "camp"
    assert data.counts.n_survivors == 4
    assert data.calibration.brier_score == 0.02
    assert data.self_report.missing_mass_estimate == 0.1


def test_load_run_without_calibration_reads_none(tmp_path):
    run_dir = _minimal_run(tmp_path, with_calibration=False)
    data = paper.load_run(run_dir)
    assert data.calibration is None


@pytest.mark.allow_subprocess  # emit_paper shells out to a real `python3 figures/fig_*.py` render
def test_emit_paper_writes_every_expected_file(tmp_path):
    run_dir = _minimal_run(tmp_path)
    out_dir = tmp_path / "paper"
    result = paper.emit_paper(run_dir, out_dir)

    assert result["campaign"] == "camp"
    assert result["run_id"] == "20260101T000000Z"
    assert set(result["figures"]) == {"fig_bin_topk.py", "fig_calibration_curve.py", "fig_opinion_histogram.py"}

    for name in ["main.tex", "bucket.sty", "refs.bib", "common.bib", "Makefile"]:
        assert (out_dir / name).is_file(), name
    for name in result["figures"]:
        assert (out_dir / "figures" / name).is_file()
        assert (out_dir / "figures" / name.replace(".py", ".png")).is_file()

    tex = (out_dir / "main.tex").read_text()
    assert "Camp" in tex  # title-cased campaign name
    assert "4" in tex  # n_survivors, read straight from the artifact


@pytest.mark.allow_subprocess  # emit_paper shells out to a real `python3 figures/fig_*.py` render
def test_emit_paper_writes_no_absolute_paths_anywhere(tmp_path):
    """PR #4 review finding: `main.tex`'s `\\addbibresource` and every
    figure script's `RUN_DIR` used to bake this checkout's own absolute
    path, home directory and username included, into a file `emit_paper`
    writes (`COMMON_BIB`'s old `str(COMMON_BIB)` reference; each figure
    script's old `str(run_dir.resolve())`). A fresh synth run over a
    fake, tmp-path `run_dir`/`out_dir` (no LLM, no network, this
    package's own fake-mode fixture) still must not carry `/home/`, this
    checkout's own `REPO_ROOT`, or either fixture directory's own
    absolute string into any file this emitter writes."""
    run_dir = _minimal_run(tmp_path)
    out_dir = tmp_path / "paper"
    result = paper.emit_paper(run_dir, out_dir)

    emitted = [out_dir / "main.tex", out_dir / "refs.bib", out_dir / "common.bib", out_dir / "Makefile"]
    emitted += [out_dir / "figures" / name for name in result["figures"]]

    forbidden = {
        "/home/": "a home-directory path",
        str(paper.REPO_ROOT): "this checkout's own REPO_ROOT",
        str(run_dir.resolve()): "the fixture's own absolute run_dir",
        str(out_dir.resolve()): "the fixture's own absolute out_dir",
    }
    for path in emitted:
        assert path.is_file(), path
        text = path.read_text()
        for needle, label in forbidden.items():
            assert needle not in text, f"{path} carries {label} ({needle!r})"


@pytest.mark.allow_subprocess  # emit_paper shells out to a real `python3 figures/fig_*.py` render
def test_emit_paper_without_calibration_states_that_plainly(tmp_path):
    run_dir = _minimal_run(tmp_path, with_calibration=False)
    out_dir = tmp_path / "paper"
    paper.emit_paper(run_dir, out_dir)
    tex = (out_dir / "main.tex").read_text()
    assert "executed no discovery-date or k-fold holdout" in tex


def test_calibration_table_escapes_bin_bracket_so_it_does_not_eat_the_next_row():
    run_dir_data = paper.RunData(
        run_dir=Path("."), manifest=paper.ManifestArtifact(campaign="c"), timeline=paper.TimelineArtifact(),
        calibration=paper.CalibrationArtifact(
            mode="discovery_date", cutoff_years=1950, n_holdout_events=1, n_covered_events=1, brier_score=0.1,
            calibration_curve=[{"bin_low": 0.7, "bin_high": 0.8, "count": 1, "mean_predicted": 0.75, "mean_observed": 1.0}],
            constants={"W": 2.0, "lam": 0.5},
        ),
        self_report=paper.SelfReportArtifact(),
    )
    rendered = paper._calibration(run_dir_data)
    assert "{[}0.7, 0.8{)}" in rendered


@requires_real_run
@pytest.mark.allow_subprocess  # emit_paper's figure renders plus build_pdf's real `make pdf`/pdflatex
def test_emit_paper_and_build_pdf_over_a_real_run():
    dest = SCRATCH_ROOT / f"_test-paper-{uuid.uuid4().hex[:8]}"
    try:
        result = paper.emit_paper(REAL_RUN_DIR, dest)
        assert result["campaign"] == "quantum-history-real"

        build = paper.build_pdf(dest)
        assert build.ok, build.log[-2000:]
        assert build.page_count and build.page_count > 0
        assert (dest / "main.pdf").is_file()
    finally:
        shutil.rmtree(dest, ignore_errors=True)
