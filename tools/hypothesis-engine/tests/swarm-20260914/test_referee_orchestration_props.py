"""Property/behavior tests for `hte.referee`'s own less-covered branches:
`tests/swarm/test_referee_props.py` already exercises the pure mechanical
checks (`check_section_order`, `check_bare_ref`/`fix_bare_ref`,
`check_bibliography`) and `tests/test_referee.py` exercises the targeted-
rewrite plumbing and one end-to-end replay-only run. Neither file touches
`check_run_provenance`'s two outcomes, `_parse_lint_output`'s own line
parsing, `_write_review`'s own branch-by-branch report text, or
`referee()`'s own per-check finding branches (section-order mismatch,
bibliography problems and documented exceptions, run-directory provenance
failure, the voice-lint-violations-trigger-a-rewrite-pass loop, and the
build-retry loop up to `MAX_ITERATIONS`). This file monkeypatches every
external boundary (`hte.artifacts.load_run`, `referee.run_voice_lint`,
`referee.build_pdf`, `referee._apply_targeted_rewrites`) so no real
subprocess, LaTeX build, or LLM call is needed. No defect found; this is
coverage-only, one new file, one PR.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st

from hte import referee
from hte.paper import BuildResult

# --------------------------------------------------------------------------
# check_run_provenance
# --------------------------------------------------------------------------


def test_check_run_provenance_ok_when_load_run_succeeds(tmp_path, monkeypatch):
    monkeypatch.setattr(referee.artifacts, "load_run", lambda run_dir: object())
    result = referee.check_run_provenance(tmp_path)
    assert result == {"ok": True, "run_dir": str(tmp_path)}


def test_check_run_provenance_reports_the_exception_when_load_run_fails(tmp_path, monkeypatch):
    def _boom(run_dir):
        raise FileNotFoundError("no such run directory")

    monkeypatch.setattr(referee.artifacts, "load_run", _boom)
    result = referee.check_run_provenance(tmp_path)
    assert result["ok"] is False
    assert result["run_dir"] == str(tmp_path)
    assert result["error"] == "FileNotFoundError: no such run directory"


# --------------------------------------------------------------------------
# find_run_dir
# --------------------------------------------------------------------------


def test_find_run_dir_reads_the_header_comment():
    # `_RUN_DIR_COMMENT_RE`'s `(\S+)` is one whitespace-delimited token, so
    # the run dir must follow `%` with no other word in between.
    tex = "% runs/default/20260101T000000Z). Load order matters.\n"
    assert referee.find_run_dir(tex) == Path("runs/default/20260101T000000Z")


def test_find_run_dir_is_none_without_the_comment():
    assert referee.find_run_dir("\\section{Introduction}\n") is None


# --------------------------------------------------------------------------
# _parse_lint_output
# --------------------------------------------------------------------------


def test_parse_lint_output_clean_run_is_ok():
    # `_parse_lint_output` stores `text` verbatim as `raw`; the `"\n"` join
    # between stdout and stderr happens one layer up, in `run_voice_lint`.
    result = referee._parse_lint_output("", 0)
    assert result == {"ok": True, "violations": [], "raw": ""}


def test_parse_lint_output_nonzero_returncode_with_no_violations_is_not_ok():
    result = referee._parse_lint_output("", 1)
    assert result["ok"] is False
    assert result["violations"] == []


def test_parse_lint_output_parses_a_well_formed_violation_line():
    line = "12  antithesis  bone responds to load, not cardio  the flagged excerpt"
    result = referee._parse_lint_output(line, 1)
    assert result["ok"] is False
    assert result["violations"] == [{
        "line": 12, "category": "antithesis",
        "description": "bone responds to load, not cardio", "excerpt": "the flagged excerpt",
    }]


def test_parse_lint_output_violation_line_with_no_excerpt_column():
    line = "3  banned-word  uses a filler adverb"
    result = referee._parse_lint_output(line, 1)
    assert result["violations"] == [{
        "line": 3, "category": "banned-word", "description": "uses a filler adverb", "excerpt": "",
    }]


def test_parse_lint_output_ignores_lines_that_do_not_match_the_violation_shape():
    text = "Checking main.tex...\nno violations found\nDone.\n"
    result = referee._parse_lint_output(text, 0)
    assert result["violations"] == []
    assert result["ok"] is True


def test_parse_lint_output_skips_a_numbered_line_with_too_few_columns():
    # `_VIOLATION_LINE_RE` matches (digits, whitespace, non-whitespace),
    # but a real violation needs 3+ double-space-separated columns.
    result = referee._parse_lint_output("7  onlyonecolumn", 1)
    assert result["violations"] == []


@given(st.integers(min_value=1, max_value=9999), st.text(alphabet="abcdefghijklmnop-", min_size=1, max_size=12))
def test_parse_lint_output_line_number_round_trips_as_an_int(line_no, category):
    line = f"{line_no}  {category}  some description  some excerpt"
    result = referee._parse_lint_output(line, 1)
    assert result["violations"][0]["line"] == line_no
    assert isinstance(result["violations"][0]["line"], int)


# --------------------------------------------------------------------------
# _write_review: every named section, every branch
# --------------------------------------------------------------------------


def _build(*, ok=True, page_count=3, returncode=0) -> BuildResult:
    return BuildResult(ok=ok, page_count=page_count, log="", returncode=returncode)


def test_write_review_no_findings_renders_the_placeholder_row(tmp_path):
    path = referee._write_review(
        tmp_path, [], {"n_entries": 0, "documented_exceptions": [], "problems": []},
        {"ok": True, "found": [], "expected": []}, {"ok": True, "violations": []}, _build(), 1,
    )
    text = path.read_text()
    assert "| - | - | no findings | - |" in text
    assert "Matches `papers/PAPER-STANDARDS.md`'s Structure list." in text
    assert "zero remaining violations" in text


def test_write_review_renders_one_finding_row(tmp_path):
    findings = [{"severity": "High", "location": "main.tex:5", "issue": "bad thing", "fix": "not auto-fixed"}]
    path = referee._write_review(
        tmp_path, findings, {"n_entries": 1, "documented_exceptions": [], "problems": []},
        {"ok": True, "found": [], "expected": []}, {"ok": True, "violations": []}, _build(), 2,
    )
    text = path.read_text()
    assert "| High | main.tex:5 | bad thing | not auto-fixed |" in text


def test_write_review_names_bibliography_exceptions_and_problems(tmp_path):
    bib_check = {"n_entries": 2, "documented_exceptions": ["okref"], "problems": ["badref"]}
    path = referee._write_review(
        tmp_path, [], bib_check, {"ok": True, "found": [], "expected": []},
        {"ok": True, "violations": []}, _build(), 1,
    )
    text = path.read_text()
    assert "`okref`" in text and "self-citation" in text
    assert "`badref`" in text and "carry neither a DOI nor an arXiv id" in text


def test_write_review_lists_remaining_voice_violations(tmp_path):
    voice_after = {"ok": False, "violations": [{"line": 9, "category": "antithesis", "description": "d", "excerpt": "x"}]}
    path = referee._write_review(
        tmp_path, [], {"n_entries": 0, "documented_exceptions": [], "problems": []},
        {"ok": True, "found": [], "expected": []}, voice_after, _build(), 1,
    )
    text = path.read_text()
    assert "still reports 1 violation(s)" in text
    assert "line 9 (antithesis): d" in text


def test_write_review_reports_section_order_mismatch(tmp_path):
    section_check = {"ok": False, "found": ["introduction"], "expected": referee.EXPECTED_SECTION_ORDER}
    path = referee._write_review(
        tmp_path, [], {"n_entries": 0, "documented_exceptions": [], "problems": []},
        section_check, {"ok": True, "violations": []}, _build(), 1,
    )
    text = path.read_text()
    assert "Does not match." in text
    assert "Found `['introduction']`" in text


def test_write_review_reports_unknown_page_count_on_a_failed_build(tmp_path):
    path = referee._write_review(
        tmp_path, [], {"n_entries": 0, "documented_exceptions": [], "problems": []},
        {"ok": True, "found": [], "expected": []}, {"ok": True, "violations": []},
        _build(ok=False, page_count=None, returncode=1), 4,
    )
    text = path.read_text()
    assert "return code 1 after 4 pass(es)" in text
    assert "unknown, build did not complete" in text


# --------------------------------------------------------------------------
# referee(): every per-check finding branch, every external call
# monkeypatched so no real subprocess/build/LLM call happens.
# --------------------------------------------------------------------------


@pytest.fixture
def clean_paper_dir(tmp_path, monkeypatch):
    """A paper_dir with a section-order-correct, bare-ref-free main.tex
    and a DOI-clean refs.bib, plus every referee() external dependency
    monkeypatched to a clean-pass default. Each test below overrides one
    dependency to drive one specific finding branch."""
    tex = "".join(f"\\section{{{s.title()}}}\n" for s in referee.EXPECTED_SECTION_ORDER)
    (tmp_path / "main.tex").write_text(tex)
    (tmp_path / "refs.bib").write_text("")

    monkeypatch.setattr(referee, "run_voice_lint", lambda paper_dir, *, fix: {"ok": True, "violations": []})
    monkeypatch.setattr(referee, "build_pdf", lambda paper_dir: _build())
    return tmp_path


def test_referee_fixes_a_bare_ref_and_flags_it_medium(clean_paper_dir):
    tex = (clean_paper_dir / "main.tex").read_text().replace("\\section{Introduction}", "\\section{Introduction}\nSee \\ref{sec:a}.")
    (clean_paper_dir / "main.tex").write_text(tex)

    result = referee.referee(clean_paper_dir)

    after = (clean_paper_dir / "main.tex").read_text()
    assert "\\ref{sec:a}" not in after
    assert "\\Cref{sec:a}" in after
    bare_ref_findings = [f for f in result["findings"] if f["location"] == "main.tex" and "bare" in f["issue"]]
    assert bare_ref_findings
    assert bare_ref_findings[0]["severity"] == "Medium"
    assert "replaced every bare" in bare_ref_findings[0]["fix"]


def test_apply_targeted_rewrites_flags_an_empty_rewrite_as_not_auto_fixed(tmp_path, monkeypatch):
    (tmp_path / "main.tex").write_text("The flagged phrase sits here alone.")
    monkeypatch.setattr(referee.llm, "complete", lambda *a, **k: {"rewritten_snippet": "", "rationale": "r"})

    findings = referee._apply_targeted_rewrites(
        tmp_path, [{"line": 1, "category": "antithesis", "description": "d", "excerpt": "flagged phrase"}],
        cache_dir="/tmp/hte-referee-test-cache", replay_only=False,
    )
    assert findings[0]["fix"] == "not auto-fixed: the referee role returned no usable rewrite"
    assert "flagged phrase" in (tmp_path / "main.tex").read_text()


def test_referee_flags_section_order_mismatch_as_high_unfixed(tmp_path, monkeypatch):
    (tmp_path / "main.tex").write_text("\\section{Introduction}\n")
    (tmp_path / "refs.bib").write_text("")
    monkeypatch.setattr(referee, "run_voice_lint", lambda paper_dir, *, fix: {"ok": True, "violations": []})
    monkeypatch.setattr(referee, "build_pdf", lambda paper_dir: _build())

    result = referee.referee(tmp_path)
    severities = {(f["severity"], "section order" in f["location"]) for f in result["findings"]}
    assert ("High", True) in severities


def test_referee_flags_undocumented_bibliography_problem_as_high(clean_paper_dir):
    (clean_paper_dir / "refs.bib").write_text(
        "@article{nodoi,\n  author = {Someone},\n}\n"
    )
    result = referee.referee(clean_paper_dir)
    problem_findings = [f for f in result["findings"] if f["location"] == "refs.bib" and f["severity"] == "High"]
    assert problem_findings
    assert "nodoi" in problem_findings[0]["issue"]


def test_referee_flags_documented_bibliography_exception_as_low(clean_paper_dir):
    (clean_paper_dir / "refs.bib").write_text(
        "@unpublished{internal,\n  author = {Someone},\n"
        "  note = {Unpublished manuscript, no DOI or arXiv id.},\n}\n"
    )
    result = referee.referee(clean_paper_dir)
    exception_findings = [f for f in result["findings"] if f["location"] == "refs.bib" and f["severity"] == "Low"]
    assert exception_findings
    assert "internal" in exception_findings[0]["issue"]


def test_referee_flags_run_provenance_failure_as_high(clean_paper_dir, monkeypatch):
    tex_with_run_dir = (clean_paper_dir / "main.tex").read_text() + "% runs/default/x). Load order matters.\n"
    (clean_paper_dir / "main.tex").write_text(tex_with_run_dir)
    monkeypatch.setattr(referee.artifacts, "load_run", lambda run_dir: (_ for _ in ()).throw(FileNotFoundError("gone")))

    result = referee.referee(clean_paper_dir)
    provenance_findings = [f for f in result["findings"] if f["location"] == "main.tex header comment"]
    assert provenance_findings
    assert provenance_findings[0]["severity"] == "High"
    assert "no longer loads" in provenance_findings[0]["issue"]


def test_referee_skips_run_provenance_check_without_a_header_comment(clean_paper_dir, monkeypatch):
    calls = []
    monkeypatch.setattr(referee.artifacts, "load_run", lambda run_dir: calls.append(run_dir))
    result = referee.referee(clean_paper_dir)
    assert not calls
    assert not [f for f in result["findings"] if f["location"] == "main.tex header comment"]


def test_referee_runs_a_second_voice_lint_pass_when_violations_remain_after_the_first_fix(clean_paper_dir, monkeypatch):
    calls = {"n": 0}
    violation = {"line": 1, "category": "antithesis", "description": "d", "excerpt": "flagged"}
    (clean_paper_dir / "main.tex").write_text((clean_paper_dir / "main.tex").read_text() + "flagged\n")

    def _voice_lint(paper_dir, *, fix):
        calls["n"] += 1
        # Every call reports clean except the first `fix=False` check (the
        # 2nd call overall): that one lingering violation is exactly what
        # drives referee()'s `if voice_after["violations"]:` retry branch;
        # the post-rewrite `fix=True`/`fix=False` pair (3rd/4th calls)
        # reports clean, so `voice_clean` ends up True.
        if not fix and calls["n"] == 2:
            return {"ok": False, "violations": [violation]}
        return {"ok": True, "violations": []}

    monkeypatch.setattr(referee, "run_voice_lint", _voice_lint)
    monkeypatch.setattr(
        referee, "_apply_targeted_rewrites",
        lambda paper_dir, violations, *, cache_dir, replay_only: [
            {"severity": "Low", "location": "main.tex:1", "issue": "antithesis: d", "fix": "referee role rewrote it to `x`"}
        ],
    )

    result = referee.referee(clean_paper_dir)
    # run_voice_lint called: fix=True, fix=False, [rewrite applied], fix=True, fix=False
    assert calls["n"] == 4
    assert result["voice_clean"] is True
    assert any("rewrote it" in f.get("fix", "") for f in result["findings"])


def test_referee_retries_the_build_up_to_max_iterations_and_flags_high_on_final_failure(clean_paper_dir, monkeypatch):
    build_calls = {"n": 0}

    def _fail_build(paper_dir):
        build_calls["n"] += 1
        return _build(ok=False, page_count=None, returncode=1)

    monkeypatch.setattr(referee, "build_pdf", _fail_build)
    result = referee.referee(clean_paper_dir)

    assert build_calls["n"] == referee.MAX_ITERATIONS
    assert result["latex_clean"] is False
    build_findings = [f for f in result["findings"] if f["location"] == "make pdf"]
    assert build_findings and build_findings[0]["severity"] == "High"
    assert f"after {referee.MAX_ITERATIONS} pass(es)" in build_findings[0]["issue"]


def test_referee_stops_retrying_the_build_as_soon_as_it_succeeds(clean_paper_dir, monkeypatch):
    build_calls = {"n": 0}

    def _succeed_on_second_try(paper_dir):
        build_calls["n"] += 1
        return _build(ok=(build_calls["n"] >= 2), page_count=1 if build_calls["n"] >= 2 else None)

    monkeypatch.setattr(referee, "build_pdf", _succeed_on_second_try)
    result = referee.referee(clean_paper_dir)

    assert build_calls["n"] == 2
    assert result["latex_clean"] is True
    assert not [f for f in result["findings"] if f["location"] == "make pdf"]


def test_referee_clean_paper_produces_no_findings_and_writes_a_review(clean_paper_dir):
    result = referee.referee(clean_paper_dir)
    assert result["findings"] == []
    assert result["latex_clean"] is True
    assert result["voice_clean"] is True
    assert Path(result["review_path"]).is_file()
