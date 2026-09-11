"""`hte-synth realsweep`: random sub-campaign sweeps over a real corpus
(`hte.cli_synth`'s counterpart to `run`/`sweep`'s own synthetic-world
sweeps, which carry planted truth `realsweep` has no analog for).

Every campaign below runs in fake mode: `run_one_realsweep_seed` wraps its
own `run_campaign` call in `_fake_llm_mode()` regardless of the ambient
environment, so no test here needs to set `HTE_LLM_MODE` itself. `--corpus
production`/`literature` are used throughout for speed (a few hundredths
of a second per seed against the shipped fixtures); `education-atlas` is
exercised only for its own sub-corpus builder (`_build_education_atlas_
subcorpus`), never through a full `run_one_realsweep_seed`/`_cmd_realsweep`
call, which would pull in `hte.link.link_evidence`'s own real per-fold cost
at that corpus's size (`hte.calibrate.build_pooled_fit_corpora`'s own
docstring measured a single such call past a minute at the full 25-country
sample; even this module's own 5-12-country draw range costs tens of
seconds a seed).
"""
from __future__ import annotations

import json
import random

import pytest

from hte import cli_synth, runner
from hte.corpus import production


def test_build_production_subcorpus_respects_grade_band_and_status_min_bounds():
    rng = random.Random(0)
    corpus, params = cli_synth._build_production_subcorpus(rng)
    assert params["status_min"] in production._STATUS_ORDER
    assert 1 <= len(params["grade_bands"]) <= 4
    assert set(params["grade_bands"]).issubset({"3-5", "6-8", "9-10", "11-12"})
    # every evidence item's own production id (the id prefix before "-c")
    # must belong to a production whose grade_band was one of the chosen ones
    all_productions = {p.id: p.grade_band for p in production.load_raw()}
    for item in corpus.evidence:
        prod_id = item.id.split("-c", 1)[0]
        assert all_productions[prod_id] in params["grade_bands"]


def test_build_literature_subcorpus_respects_branch_bounds():
    rng = random.Random(1)
    _corpus, params = cli_synth._build_literature_subcorpus(rng)
    assert 1 <= len(params["branches"]) <= 3
    assert set(params["branches"]).issubset(
        {"educational-methods", "hci-human-ai-collaboration", "ai-and-researchers"}
    )


def test_build_literature_subcorpus_only_includes_chosen_branches():
    from hte.corpus import literature

    rng = random.Random(2)
    corpus, params = cli_synth._build_literature_subcorpus(rng)
    all_cards = {c.doi: c.relative_path.split("/", 1)[0] for c in literature.load_raw(literature.DEFAULT_FIXTURES_DIR)}
    for doi in corpus.sources:
        assert all_cards[doi] in params["branches"]


def test_build_education_atlas_subcorpus_respects_country_and_year_bounds():
    rng = random.Random(3)
    corpus, params = cli_synth._build_education_atlas_subcorpus(rng)
    assert 5 <= len(params["countries"]) <= 12
    start, end = params["years"]
    length = end - start + 1
    assert 8 <= length <= 15
    assert 2010 <= start
    assert end <= 2024


def test_education_atlas_country_codes_reads_all_twenty_five():
    codes = cli_synth._education_atlas_country_codes()
    assert len(codes) == 25
    assert codes == sorted(codes)


# --------------------------------------------------------------------------
# run_one_realsweep_seed
# --------------------------------------------------------------------------


def test_run_one_realsweep_seed_production_succeeds(tmp_path):
    row = cli_synth.run_one_realsweep_seed(runner, "production", 0, tmp_path)
    assert row["crashed"] is False
    assert row["error"] is None
    assert row["params"] is not None
    assert row["n_evidence"] is not None
    assert row["elapsed_s"] >= 0.0


def test_run_one_realsweep_seed_literature_succeeds(tmp_path):
    row = cli_synth.run_one_realsweep_seed(runner, "literature", 0, tmp_path)
    assert row["crashed"] is False
    assert row["n_survivors"] is not None


def test_run_one_realsweep_seed_never_leaks_the_temporary_corpus_loader(tmp_path):
    before = set(runner._CORPUS_LOADERS)
    cli_synth.run_one_realsweep_seed(runner, "production", 0, tmp_path)
    assert set(runner._CORPUS_LOADERS) == before


def test_run_one_realsweep_seed_catches_a_crashing_builder(tmp_path, monkeypatch):
    def _boom(rng):
        raise RuntimeError("synthetic failure for this test")

    monkeypatch.setitem(cli_synth.REALSWEEP_BUILDERS, "production", _boom)
    row = cli_synth.run_one_realsweep_seed(runner, "production", 0, tmp_path)
    assert row["crashed"] is True
    assert "synthetic failure for this test" in row["error"]
    assert row["traceback"] is not None
    assert "RuntimeError" in row["traceback"]
    # every other field stays at its own declared default rather than
    # a half-populated row from the part of the try block that did run
    assert row["coverage_of_truth"] is None
    assert row["brier_score"] is None


def test_run_one_realsweep_seed_temporary_loader_cleaned_up_even_on_crash(tmp_path, monkeypatch):
    def _boom(rng):
        raise RuntimeError("boom")

    monkeypatch.setitem(cli_synth.REALSWEEP_BUILDERS, "literature", _boom)
    before = set(runner._CORPUS_LOADERS)
    cli_synth.run_one_realsweep_seed(runner, "literature", 0, tmp_path)
    assert set(runner._CORPUS_LOADERS) == before


# --------------------------------------------------------------------------
# aggregate / worst_seed
# --------------------------------------------------------------------------


def _row(seed, *, crashed=False, coverage=None, brier=None, error=None):
    return {
        "seed": seed, "crashed": crashed, "coverage_of_truth": coverage,
        "brier_score": brier, "error": error,
    }


def test_realsweep_aggregate_skips_crashed_and_none_rows():
    rows = [_row(0, coverage=0.5), _row(1, crashed=True), _row(2, coverage=None)]
    agg = cli_synth._realsweep_aggregate(rows, "coverage_of_truth")
    assert agg["n"] == 1
    assert agg["mean"] == 0.5


def test_realsweep_aggregate_empty_is_well_formed():
    agg = cli_synth._realsweep_aggregate([_row(0, crashed=True)], "coverage_of_truth")
    assert agg == {"mean": None, "median": None, "min": None, "max": None, "n": 0}


def test_realsweep_worst_seed_prefers_a_crash_over_any_score():
    rows = [_row(0, coverage=0.01, brier=0.9), _row(1, crashed=True, error="boom")]
    worst = cli_synth._realsweep_worst_seed(rows)
    assert worst["crashed"] is True
    assert worst["seed"] == 1
    assert worst["error"] == "boom"


def test_realsweep_worst_seed_picks_lowest_coverage_when_no_crash():
    rows = [_row(0, coverage=0.8, brier=0.1), _row(1, coverage=0.2, brier=0.3)]
    worst = cli_synth._realsweep_worst_seed(rows)
    assert worst["crashed"] is False
    assert worst["seed"] == 1


def test_realsweep_worst_seed_breaks_ties_on_higher_brier():
    rows = [_row(0, coverage=0.5, brier=0.1), _row(1, coverage=0.5, brier=0.4)]
    worst = cli_synth._realsweep_worst_seed(rows)
    assert worst["seed"] == 1


def test_realsweep_worst_seed_none_when_nothing_scored():
    assert cli_synth._realsweep_worst_seed([_row(0, coverage=None)]) is None


# --------------------------------------------------------------------------
# _cmd_realsweep / main() end to end
# --------------------------------------------------------------------------


def test_realsweep_cli_writes_summary_files_and_exits_zero(tmp_path):
    rc = cli_synth.main(["realsweep", "--corpus", "production", "--seeds", "0-2", "--out", str(tmp_path)])
    assert rc == 0
    summary = json.loads((tmp_path / "SUMMARY.json").read_text())
    assert summary["corpus"] == "production"
    assert len(summary["per_seed"]) == 3
    assert summary["aggregate"]["n_crashed"] == 0
    md = (tmp_path / "SUMMARY.md").read_text()
    assert "# hte-synth realsweep summary: production" in md
    assert "## Worst seed" in md


def test_realsweep_cli_default_out_dir_is_runs_realsweep_corpus(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    rc = cli_synth.main(["realsweep", "--corpus", "literature", "--seeds", "0-1"])
    assert rc == 0
    assert (tmp_path / "runs" / "realsweep" / "literature" / "SUMMARY.md").is_file()


def test_realsweep_cli_unknown_corpus_exits_two():
    with pytest.raises(SystemExit) as exc_info:
        cli_synth.main(["realsweep", "--corpus", "not-a-real-corpus", "--seeds", "0-1"])
    assert exc_info.value.code == 2


def test_realsweep_cli_exits_one_and_still_writes_summary_when_a_seed_crashes(tmp_path, monkeypatch):
    def _boom(rng):
        raise RuntimeError("forced crash for this test")

    monkeypatch.setitem(cli_synth.REALSWEEP_BUILDERS, "literature", _boom)
    rc = cli_synth.main(["realsweep", "--corpus", "literature", "--seeds", "0-2", "--out", str(tmp_path)])
    assert rc == 1
    summary = json.loads((tmp_path / "SUMMARY.json").read_text())
    assert summary["aggregate"]["n_crashed"] == 3
    assert summary["aggregate"]["worst_seed"]["crashed"] is True
    md = (tmp_path / "SUMMARY.md").read_text()
    assert "crashed" in md.lower()
