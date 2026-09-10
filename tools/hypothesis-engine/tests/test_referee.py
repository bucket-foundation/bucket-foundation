import shutil
import uuid
from pathlib import Path

import pytest

from hte import referee

FIXTURE_DIR = Path(__file__).parent / "fixtures" / "referee-paper"
LLM_CACHE = str(Path(__file__).parent / "fixtures" / "llm-cache")
SCRATCH_ROOT = Path(__file__).parent.parent / "runs"


@pytest.fixture
def paper_dir():
    """A fresh copy of `tests/fixtures/referee-paper/` under this
    package's own (gitignored) `runs/` directory, kept out of pytest's
    own `tmp_path`: `agf-lint-voice`'s `.voiceallow` lookup walks upward from
    the linted file's own directory to `$HOME`
    (`papers/PAPER-STANDARDS.md`'s own documented gotcha), so a copy
    outside this repository would never see `bucket-foundation`'s own
    allowlist and could misreport a real term as a violation."""
    dest = SCRATCH_ROOT / f"_test-referee-{uuid.uuid4().hex[:8]}"
    shutil.copytree(FIXTURE_DIR, dest)
    yield dest
    shutil.rmtree(dest, ignore_errors=True)


@pytest.fixture(autouse=True)
def _real_llm_mode(monkeypatch):
    """This file's two end-to-end tests below (`LLM_CACHE`, `replay_
    only=True`) assert the real cache-replay contract (a hit returns the
    seeded response, a miss raises `LLMCacheMissError`); an ambient
    `HTE_LLM_MODE=fake` would dispatch straight to `hte.fakellm` instead,
    which has no stand-in for the `referee` role at all and raises
    `KeyError` rather than either outcome those tests check for. Pinning
    it unset here keeps this file correct under `env -u HTE_LLM_MODE make
    test` and `HTE_LLM_MODE=fake make test` alike; harmless for every
    other test in this file, none of which touch `HTE_LLM_MODE`."""
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)


# --------------------------------------------------------------------------
# Pure checks, no build, no LLM call
# --------------------------------------------------------------------------


def test_check_section_order_ignores_appendix_sections():
    tex = r"""
\section{Introduction}
\section{Related work}
\section{Preliminaries}
\section{Method}
\section{Results}
\section{Calibration}
\section{Limitations}
\appendix
\section{Glossary}
"""
    result = referee.check_section_order(tex)
    assert result["ok"] is True
    assert "glossary" not in result["found"]


def test_check_section_order_flags_mismatch():
    result = referee.check_section_order(r"\section{Introduction}\section{Results}")
    assert result["ok"] is False
    assert result["found"] == ["introduction", "results"]


def test_check_bare_ref_counts_and_fix_bare_ref_rewrites():
    tex = r"See \ref{sec:a} and \Cref{sec:b} and \ref{sec:c}."
    check = referee.check_bare_ref(tex)
    assert check["ok"] is False
    assert check["count"] == 2

    fixed = referee.fix_bare_ref(tex)
    assert referee.check_bare_ref(fixed)["ok"] is True
    assert r"\Cref{sec:b}" in fixed  # untouched, already a Cref
    assert fixed.count(r"\Cref{") == 3


def test_check_bibliography_accepts_doi_and_documented_exception(tmp_path):
    bib = tmp_path / "refs.bib"
    bib.write_text(
        "@article{good1953population,\n"
        "  author = {Good, I. J.},\n"
        "  title  = {The population frequencies of species},\n"
        "  doi    = {10.1093/biomet/40.3-4.237},\n"
        "}\n"
        "@unpublished{internalreport,\n"
        "  author = {{Bucket Foundation}},\n"
        "  title  = {An internal report},\n"
        "  note   = {Unpublished manuscript, no DOI or arXiv id.},\n"
        "}\n"
    )
    result = referee.check_bibliography(bib)
    assert result["ok"] is True
    assert result["problems"] == []
    assert result["documented_exceptions"] == ["internalreport"]
    assert result["n_entries"] == 2


def test_check_bibliography_flags_undocumented_missing_doi(tmp_path):
    bib = tmp_path / "refs.bib"
    bib.write_text(
        "@article{nodoientry,\n"
        "  author = {Someone},\n"
        "  title  = {A paper with no DOI and no exception note},\n"
        "}\n"
    )
    result = referee.check_bibliography(bib)
    assert result["ok"] is False
    assert result["problems"] == ["nodoientry"]


def test_check_bibliography_missing_file_reads_as_empty(tmp_path):
    result = referee.check_bibliography(tmp_path / "no-such-refs.bib")
    assert result == {"ok": True, "problems": [], "documented_exceptions": [], "n_entries": 0}


# --------------------------------------------------------------------------
# Targeted-rewrite plumbing, monkeypatched LLM call
# --------------------------------------------------------------------------


def test_apply_targeted_rewrites_skips_non_unique_excerpt(tmp_path, monkeypatch):
    (tmp_path / "main.tex").write_text("duplicate duplicate text here")
    calls = []
    monkeypatch.setattr(referee.llm, "complete", lambda *a, **k: calls.append(1) or {"rewritten_snippet": "x", "rationale": "r"})

    findings = referee._apply_targeted_rewrites(
        tmp_path, [{"line": 1, "category": "antithesis", "description": "d", "excerpt": "duplicate"}],
        cache_dir="/tmp/hte-referee-test-cache", replay_only=False,
    )
    assert not calls  # never called: "duplicate" occurs twice, so it fails the uniqueness check
    assert "not auto-fixed" in findings[0]["fix"]


def test_apply_targeted_rewrites_applies_unique_rewrite(tmp_path, monkeypatch):
    (tmp_path / "main.tex").write_text("The flagged phrase, not another one, sits here.")
    monkeypatch.setattr(
        referee.llm, "complete",
        lambda *a, **k: {"rewritten_snippet": ", replacing the flagged phrase", "rationale": "r"},
    )

    findings = referee._apply_targeted_rewrites(
        tmp_path, [{"line": 1, "category": "antithesis", "description": "d", "excerpt": ", not another one"}],
        cache_dir="/tmp/hte-referee-test-cache", replay_only=False,
    )
    content = (tmp_path / "main.tex").read_text()
    assert ", not another one" not in content
    assert ", replacing the flagged phrase" in content
    assert "rewrote it" in findings[0]["fix"]


# --------------------------------------------------------------------------
# End-to-end referee() over the fixture paper, replay-only against the
# committed cache (seeded once by a real `claude -p` call).
# --------------------------------------------------------------------------


@pytest.mark.allow_subprocess  # referee() always calls run_voice_lint's real `agf-lint-voice` subprocess
def test_referee_end_to_end_fixes_bare_ref_and_antithesis_replay_only(paper_dir):
    before = (paper_dir / "main.tex").read_text()
    assert r"\ref{sec:intro}" in before
    assert ", not speculation" in before

    result = referee.referee(paper_dir, cache_dir=LLM_CACHE, replay_only=True)

    assert result["latex_clean"] is True
    assert result["voice_clean"] is True
    assert result["page_count"] == 1
    assert Path(result["review_path"]).is_file()

    after = (paper_dir / "main.tex").read_text()
    assert r"\ref{sec:intro}" not in after
    assert r"\Cref{sec:intro}" in after
    assert ", not speculation" not in after

    fix_descriptions = " ".join(f["fix"] for f in result["findings"])
    assert "replaced every bare" in fix_descriptions
    assert "referee role rewrote it" in fix_descriptions

    review_text = (paper_dir / "REVIEW.md").read_text()
    assert "Referee report" in review_text
    assert "zero remaining violations" in review_text


def test_referee_replay_only_raises_on_true_cache_miss(paper_dir):
    # A fresh excerpt this cache was never seeded for: replay_only=True
    # must not shell out to `claude -p`.
    with pytest.raises(referee.llm.LLMCacheMissError):
        referee._referee_rewrite(
            "an excerpt never seeded into the fixture cache", "antithesis", "d",
            cache_dir=LLM_CACHE, replay_only=True,
        )
