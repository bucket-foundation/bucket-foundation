from __future__ import annotations

from pathlib import Path

from hte import cli, question_map

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "question-map"
PLAN_BASE = FIXTURES_DIR / "plan-base.md"
PLAN_NEW_QUESTION = FIXTURES_DIR / "plan-new-question.md"
PLAN_RENUMBERED = FIXTURES_DIR / "plan-renumbered.md"
REGISTRY_BASE = FIXTURES_DIR / "registry-base.json"
REGISTRY_BAD_CORPUS = FIXTURES_DIR / "registry-bad-corpus.json"
DOC_LEGACY = FIXTURES_DIR / "doc-legacy.md"

FIXTURE_CORPUS_NAMES = {"fixture-corpus", "quantum-history"}

def test_parse_questions_reads_four_questions_across_two_sections():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    assert [q.id for q in questions] == ["1", "2", "10", "11"]
    assert [q.section for q in questions] == ["Alpha section", "Alpha section", "Beta section", "Beta section"]

def test_parse_questions_skips_the_pre_registered_annotation_line():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    q1 = next(q for q in questions if q.id == "1")
    assert "Pre-registered" not in q1.text
    assert q1.text == "Does alpha cause beta? Study: alpha study."

def test_parse_questions_skips_the_source_line():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    ids = [q.id for q in questions]
    assert "2" in ids and "papers" not in " ".join(q.text for q in questions)

def test_parse_questions_handles_multi_digit_ids_without_off_by_one_matches():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    q10 = next(q for q in questions if q.id == "10")
    q11 = next(q for q in questions if q.id == "11")
    assert q10.text.startswith("Does the parser assign item 10 its own two-digit id")
    assert q11.text.startswith("Does eleven follow ten")

def test_parse_questions_ignores_the_h1_title():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    assert all(q.section != "Fixture Plan: Open Questions" for q in questions)

def test_load_registry_splits_meta_from_entries():
    meta, entries = question_map.load_registry(REGISTRY_BASE)
    assert "note" in meta
    assert set(entries) == {"1", "2", "10", "11"}
    assert "_meta" not in entries

def test_compute_diff_is_clean_when_plan_and_registry_match():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BASE)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    assert diff.is_clean()
    assert diff.lines() == []

def test_compute_diff_flags_a_planted_new_question():
    questions = question_map.parse_questions(PLAN_NEW_QUESTION.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BASE)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    assert not diff.is_clean()
    assert diff.new == ["12"]
    assert diff.renumbered == []
    assert diff.vanished == []
    assert any("question 12 is new" in line for line in diff.lines())

def test_check_fails_on_a_planted_new_question():
    rc = question_map.cmd_check(
        questions_path=PLAN_NEW_QUESTION,
        registry_path=REGISTRY_BASE,
        corpus_names=FIXTURE_CORPUS_NAMES,
    )
    assert rc == 1

def test_check_passes_when_plan_and_registry_match():
    rc = question_map.cmd_check(
        questions_path=PLAN_BASE,
        registry_path=REGISTRY_BASE,
        corpus_names=FIXTURE_CORPUS_NAMES,
    )
    assert rc == 0

def test_compute_diff_detects_a_renumbered_question():
    questions = question_map.parse_questions(PLAN_RENUMBERED.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BASE)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    assert diff.renumbered == [("2", "12")]
    assert diff.new == []
    assert diff.vanished == []
    assert any("question 2 was renumbered to 12" in line for line in diff.lines())

def test_compute_diff_flags_an_unregistered_corpus():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BAD_CORPUS)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    assert diff.unregistered_corpora == [("10", "not-a-real-corpus")]
    assert not diff.is_clean()

def test_render_section_includes_every_question_and_the_count_line():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BASE)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    section = question_map.render_section(questions, registry, diff)
    assert "## Question map" in section
    assert "### Alpha section" in section
    assert "### Beta section" in section
    for qid in ("1", "2", "10", "11"):
        assert f"| {qid} |" in section
    assert "### Count" in section
    assert "No drift detected" in section

def test_render_section_reports_drift_in_the_changelog_instead():
    questions = question_map.parse_questions(PLAN_NEW_QUESTION.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BASE)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    section = question_map.render_section(questions, registry, diff)
    assert "No drift detected" not in section
    assert "question 12 is new" in section

def test_render_section_only_adds_a_slot_frame_column_where_used():
    questions = question_map.parse_questions(PLAN_BASE.read_text())
    _meta, registry = question_map.load_registry(REGISTRY_BASE)
    diff = question_map.compute_diff(questions, registry, FIXTURE_CORPUS_NAMES)
    section = question_map.render_section(questions, registry, diff)
    alpha_table = section.split("### Alpha section")[1].split("### Beta section")[0]
    beta_table = section.split("### Beta section")[1]
    assert "Slot frame" not in alpha_table
    assert "Slot frame" in beta_table

def test_apply_to_doc_inserts_markers_around_the_legacy_section():
    doc_text = DOC_LEGACY.read_text()
    new_text = question_map.apply_to_doc(doc_text, "## Question map\n\nGenerated body.\n")
    assert question_map.BEGIN_MARKER in new_text
    assert question_map.END_MARKER in new_text
    assert "A hand-written line this function's legacy path replaces" not in new_text
    assert "Generated body." in new_text
    assert "An intro paragraph that `apply_to_doc` must leave alone." in new_text
    assert "Content after the question map that must survive every rewrite" in new_text

def test_apply_to_doc_is_idempotent_on_a_second_pass():
    doc_text = DOC_LEGACY.read_text()
    body = "## Question map\n\nGenerated body.\n"
    once = question_map.apply_to_doc(doc_text, body)
    twice = question_map.apply_to_doc(once, body)
    assert once == twice

def test_cmd_write_is_idempotent(tmp_path):
    doc_path = tmp_path / "doc.md"
    doc_path.write_text(DOC_LEGACY.read_text())

    rc1 = question_map.cmd_write(
        questions_path=PLAN_BASE,
        registry_path=REGISTRY_BASE,
        doc_path=doc_path,
        corpus_names=FIXTURE_CORPUS_NAMES,
    )
    assert rc1 == 0
    after_first = doc_path.read_text()

    rc2 = question_map.cmd_write(
        questions_path=PLAN_BASE,
        registry_path=REGISTRY_BASE,
        doc_path=doc_path,
        corpus_names=FIXTURE_CORPUS_NAMES,
    )
    assert rc2 == 0
    after_second = doc_path.read_text()

    assert after_first == after_second
    assert "Content after the question map that must survive every rewrite" in after_second

def test_cmd_write_content_survives_a_third_pass_with_no_growth():
    doc_text = DOC_LEGACY.read_text()
    body = "## Question map\n\nGenerated body.\n"
    text = doc_text
    for _ in range(3):
        text = question_map.apply_to_doc(text, body)
    once_more = question_map.apply_to_doc(text, body)
    assert text == once_more

def test_cli_question_map_check_accepts_the_check_flag(capsys):
    rc = cli.main(["question-map", "--check"])
    out = capsys.readouterr().out
    assert rc == 0
    assert "no drift detected" in out

def test_cli_question_map_defaults_to_check_with_no_flag(capsys):
    rc = cli.main(["question-map"])
    assert rc == 0

def test_cli_question_map_write_regenerates_the_real_doc(tmp_path, monkeypatch):
    real_doc = question_map.DEFAULT_DOC_PATH
    scratch_doc = tmp_path / "RESEARCH-OS-INTEGRATION.md"
    scratch_doc.write_text(real_doc.read_text())
    monkeypatch.setattr(question_map, "DEFAULT_DOC_PATH", scratch_doc)

    rc = cli.main(["question-map", "--write"])
    assert rc == 0
    written = scratch_doc.read_text()
    assert question_map.BEGIN_MARKER in written
    assert "## Question map" in written
    assert "### Count" in written

def test_shipped_registry_has_forty_nine_entries_with_valid_status():
    _meta, registry = question_map.load_registry(question_map.DEFAULT_REGISTRY_PATH)
    assert set(registry) == {str(i) for i in range(1, 50)}
    for qid, entry in registry.items():
        assert entry["status"] in ("runnable", "needs_adapter", "out_of_scope"), qid
        if entry["status"] == "runnable":
            assert entry["corpora"], f"question {qid} is runnable but names no corpus"
        if entry["status"] != "needs_adapter":
            assert entry["adapter_needed"] is None, qid

def test_shipped_registry_corpora_are_all_live_registered_names():
    from hte.cli import _CORPUS_LOADERS

    _meta, registry = question_map.load_registry(question_map.DEFAULT_REGISTRY_PATH)
    live_names = set(_CORPUS_LOADERS)
    for qid, entry in registry.items():
        for corpus in entry.get("corpora") or []:
            assert corpus in live_names, f"question {qid} names unregistered corpus {corpus!r}"

def test_shipped_registry_matches_the_real_plan_with_no_drift():
    questions = question_map.parse_questions(question_map.DEFAULT_QUESTIONS_PATH.read_text())
    _meta, registry = question_map.load_registry(question_map.DEFAULT_REGISTRY_PATH)
    from hte.cli import _CORPUS_LOADERS

    diff = question_map.compute_diff(questions, registry, set(_CORPUS_LOADERS))
    assert diff.is_clean(), diff.lines()
