"""Property/behavior tests for `hte.question_map`'s own less-covered
branches: `tests/test_question_map.py` already exercises the parser, the
clean-diff case, and three planted-drift scenarios (new question,
renumbering, bad corpus) end to end through
`render_section`/`cmd_check`/`cmd_write`. It never plants a `vanished` or
`reworded` registry entry, never calls `DiffReport.lines()` when
`vanished`/`reworded`/`unregistered_corpora` is non-empty, never renders a
Count block with a status the plan carries zero questions for, never drives
`apply_to_doc` down its own missing-legacy-heading `ValueError` branch,
never calls `_live_corpus_names()` directly, and never runs `cmd_write` (or
the `--write` CLI path) against a plan with real drift. No defect found;
this is coverage-only, one new file, one PR.
"""
from __future__ import annotations

import runpy
import sys

import pytest

from hte import question_map

# --------------------------------------------------------------------------
# DiffReport.lines(): the vanished/reworded/unregistered_corpora branches
# --------------------------------------------------------------------------


def test_diff_report_lines_names_a_vanished_question():
    diff = question_map.DiffReport(vanished=["7"])
    lines = diff.lines()
    assert len(lines) == 1
    assert "registry question 7 vanished from the plan" in lines[0]


def test_diff_report_lines_names_a_reworded_question():
    diff = question_map.DiffReport(reworded=["3"])
    lines = diff.lines()
    assert len(lines) == 1
    assert "question 3's text changed in the plan" in lines[0]


def test_diff_report_lines_names_an_unregistered_corpus():
    diff = question_map.DiffReport(unregistered_corpora=[("9", "ghost-corpus")])
    lines = diff.lines()
    assert len(lines) == 1
    assert "registry question 9 names corpus 'ghost-corpus'" in lines[0]


def test_diff_report_lines_combines_every_kind_in_declared_order():
    diff = question_map.DiffReport(
        new=["1"],
        renumbered=[("2", "20")],
        vanished=["3"],
        reworded=["4"],
        unregistered_corpora=[("5", "x")],
    )
    lines = diff.lines()
    assert len(lines) == 5
    assert "question 1 is new" in lines[0]
    assert "renumbered to 20" in lines[1]
    assert "vanished" in lines[2]
    assert "text changed" in lines[3]
    assert "names corpus" in lines[4]


# --------------------------------------------------------------------------
# compute_diff: a real vanished entry and a real reworded entry, not just a
# hand-built DiffReport
# --------------------------------------------------------------------------


def test_compute_diff_flags_a_vanished_registry_question():
    # No live question at all: every registry id should read as vanished,
    # none as renumbered (nothing in the live set to match text against).
    registry = {"1": {"question_text": "Does alpha cause beta?"}}
    diff = question_map.compute_diff([], registry, {"quantum-history"})
    assert diff.vanished == ["1"]
    assert diff.renumbered == []
    assert not diff.is_clean()


def test_compute_diff_flags_a_reworded_registry_question():
    question = question_map.Question(id="1", text="A brand new phrasing.", section="Alpha")
    registry = {"1": {"question_text": "The original phrasing."}}
    diff = question_map.compute_diff([question], registry, {"quantum-history"})
    assert diff.reworded == ["1"]
    assert diff.new == []
    assert diff.vanished == []
    assert not diff.is_clean()


# --------------------------------------------------------------------------
# _format_id_ranges: the empty-list branch
# --------------------------------------------------------------------------


def test_format_id_ranges_of_an_empty_list_reads_none():
    assert question_map._format_id_ranges([]) == "(none)"


def test_render_section_count_block_reads_none_for_a_status_with_zero_questions():
    # A plan with one runnable question and nothing else: the "needs a new
    # adapter" and "out of scope" counts must both render "(none)" rather
    # than an empty range list or a crash.
    question = question_map.Question(id="1", text="Runs today.", section="Alpha")
    registry = {"1": {"status": "runnable", "corpora": ["quantum-history"], "note": ""}}
    diff = question_map.compute_diff([question], registry, {"quantum-history"})
    section = question_map.render_section([question], registry, diff)
    assert "Needs a new adapter: 0 (questions (none))" in section
    assert "Out of scope for hypothesis generation: 0 (questions (none))" in section


# --------------------------------------------------------------------------
# apply_to_doc: the missing-legacy-heading error branch
# --------------------------------------------------------------------------


def test_apply_to_doc_raises_when_no_markers_and_no_legacy_heading_exist():
    doc_text = "# Some doc\n\nNo question map heading here at all.\n"
    with pytest.raises(ValueError, match="Question map"):
        question_map.apply_to_doc(doc_text, "## Question map\n\nBody.\n")


def test_apply_to_doc_legacy_heading_at_end_of_file_replaces_to_eof():
    # No later `## ` heading follows the legacy one: `end` should fall back
    # to `len(lines)` rather than truncating early.
    doc_text = "Intro.\n\n## Question map\n\nOld body, no next heading follows.\n"
    new_text = question_map.apply_to_doc(doc_text, "## Question map\n\nNew body.\n")
    assert "Old body" not in new_text
    assert "New body." in new_text
    assert "Intro." in new_text


# --------------------------------------------------------------------------
# _live_corpus_names: the deferred-import helper, never called directly
# elsewhere in the suite (every other test passes an explicit corpus_names)
# --------------------------------------------------------------------------


def test_live_corpus_names_matches_the_real_cli_registry():
    from hte.cli import _CORPUS_LOADERS

    assert question_map._live_corpus_names() == set(_CORPUS_LOADERS)


def test_build_report_defaults_to_live_corpus_names_when_none_given():
    # No corpus_names kwarg at all: build_report must fall back to
    # _live_corpus_names() rather than raising or reading an empty set.
    questions, registry, diff = question_map.build_report()
    assert questions
    assert registry
    assert diff.is_clean(), diff.lines()


# --------------------------------------------------------------------------
# cmd_write against a plan that actually drifts from the registry: the
# "drift was rendered into the changelog" stderr branch
# --------------------------------------------------------------------------


def test_cmd_write_reports_drift_to_stderr_but_still_writes_the_doc(tmp_path, capsys):
    plan_path = tmp_path / "plan.md"
    plan_path.write_text("# Plan\n\n## Alpha\n\n1. A brand new question with no registry entry.\n")
    registry_path = tmp_path / "registry.json"
    registry_path.write_text('{"_meta": {}}')
    doc_path = tmp_path / "doc.md"
    doc_path.write_text("Intro.\n\n## Question map\n\nOld body.\n\n## Next section\n\nAfter.\n")

    rc = question_map.cmd_write(
        questions_path=plan_path,
        registry_path=registry_path,
        doc_path=doc_path,
        corpus_names={"quantum-history"},
    )
    assert rc == 0

    written = doc_path.read_text()
    assert "question 1 is new" in written  # rendered into the changelog block
    assert "## Next section" in written and "After." in written  # unrelated content still survives

    err = capsys.readouterr().err
    assert "drift was rendered into the changelog" in err
    assert "question 1 is new" in err


# --------------------------------------------------------------------------
# main(): the --write branch and the module execution guard
# --------------------------------------------------------------------------


def test_main_write_flag_routes_to_cmd_write(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(question_map, "cmd_write", lambda: calls.append("write") or 0)
    monkeypatch.setattr(question_map, "cmd_check", lambda: calls.append("check") or 0)
    rc = question_map.main(["--write"])
    assert rc == 0
    assert calls == ["write"]


def test_main_check_flag_routes_to_cmd_check(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(question_map, "cmd_write", lambda: calls.append("write") or 0)
    monkeypatch.setattr(question_map, "cmd_check", lambda: calls.append("check") or 0)
    rc = question_map.main(["--check"])
    assert rc == 0
    assert calls == ["check"]


def test_main_guard_raises_systemexit_with_the_subcommands_own_return_code(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["hte-question-map", "--check"])
    with pytest.raises(SystemExit) as exc_info:
        runpy.run_module("hte.question_map", run_name="__main__")
    assert exc_info.value.code == 0
