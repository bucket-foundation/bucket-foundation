"""Property/behavior tests for `hte.purge`'s own uncovered branches
(`tests/COVERAGE.md` names `hte/purge.py` as the least-covered of the
newer, unswarmed modules named in `bkt-hte-optimize-loop`'s own prompt:
`hte/propagate.py`/`hte/predict.py` are not on `main` yet;
`hte/question_map.py`/`hte/corpus/younger_dryas.py` sit a few points
higher). `tests/test_purge.py` already covers the end-to-end happy path,
the single-production delete, the not-found case, the learner-id
mismatch flag, one unreadable-manifest case, and one refused-redaction
case; this file targets the branches that pass left uncovered: escaped
redaction variants, an already-clean file, a corrupted cache index line,
a cache index entry naming a response file that is already gone, the
evidence-list half of `_shallow_matches`, an unreadable bridge/envelope
file surfacing through the top-level `purge()` orchestration (not just
the lower-level helper it wraps), and the remaining-learner-ids branch
`_purge_run` takes when a sibling production's own `by_production` entry
carries no `learner_id` at all. None of these is a defect; this is
coverage-only, matching this module's own header: a purge report must
never fold "could not check" into "nothing here," so every one of these
branches is load-bearing for that contract.
"""
from __future__ import annotations

import json

from hte import purge


# --------------------------------------------------------------------------
# _redaction_variants
# --------------------------------------------------------------------------


def test_redaction_variants_skips_an_empty_target():
    variants = purge._redaction_variants({"", "a real quote"})
    assert variants == ["a real quote"]


def test_redaction_variants_adds_the_json_escaped_form_when_it_differs():
    target = 'a quote with a "quote" inside it'
    variants = purge._redaction_variants({target})
    escaped = json.dumps(target)[1:-1]
    assert target in variants
    assert escaped in variants
    assert escaped != target


def test_redaction_variants_skips_the_escaped_form_when_it_matches_the_raw_target():
    target = "a plain quote with no special characters"
    variants = purge._redaction_variants({target})
    assert variants == [target]


def test_redaction_variants_sorts_longest_first():
    variants = purge._redaction_variants({"short", "a much longer quote here"})
    assert variants == ["a much longer quote here", "short"]


# --------------------------------------------------------------------------
# _redact_file
# --------------------------------------------------------------------------


def test_redact_file_reports_unchanged_when_no_variant_appears(tmp_path):
    path = tmp_path / "run.log"
    path.write_text("nothing interesting happened here")
    outcome = purge._redact_file(path, ["a quote never in the file"], "[redacted:x]", validate_json=False, dry_run=False)
    assert outcome == "unchanged"
    assert path.read_text() == "nothing interesting happened here"


def test_redact_file_reports_unchanged_for_a_missing_path(tmp_path):
    outcome = purge._redact_file(tmp_path / "does-not-exist.json", ["anything"], "[redacted:x]", validate_json=True, dry_run=False)
    assert outcome == "unchanged"


# --------------------------------------------------------------------------
# _purge_run
# --------------------------------------------------------------------------


def test_purge_run_returns_none_when_the_manifest_never_named_this_production(tmp_path):
    run_dir = tmp_path / "campaign" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest_path = run_dir / "MANIFEST.json"
    manifest_path.write_text(json.dumps({"provenance": {"production_ids": ["prod-other"]}}))
    result = purge._purge_run(manifest_path, "prod-aaa", dry_run=True)
    assert result is None


def test_purge_run_flags_an_unreadable_manifest(tmp_path):
    run_dir = tmp_path / "campaign" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest_path = run_dir / "MANIFEST.json"
    manifest_path.write_text("{not valid json")
    result = purge._purge_run(manifest_path, "prod-aaa", dry_run=True)
    assert result["action"] == "unreadable"
    assert result["error"] == "JSONDecodeError"
    assert result["path"] == str(manifest_path)


def test_purge_run_remaining_learner_ids_skips_a_sibling_with_no_learner_id(tmp_path):
    """A sibling production's own `by_production` entry can carry no
    `learner_id` at all (the field is optional, per this module's own
    docstring: `--learner` is only ever a cross-check, never required to
    purge). `_purge_run`'s `remaining_learner_ids` rebuild must not raise
    or add a bogus entry when that happens; it should carry forward
    whatever real learner ids the OTHER remaining productions do name,
    over one that names none."""
    run_dir = tmp_path / "campaign" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "provenance": {
            "production_ids": ["prod-aaa", "prod-anon", "prod-bbb"],
            "learner_ids": ["learner-1", "learner-2"],
            "source_ids": ["src-aaa", "src-anon", "src-bbb"],
            "by_production": {
                "prod-aaa": {"quotes": ["aaa's quote"], "labels": [], "source_ids": ["src-aaa"], "learner_id": "learner-1"},
                "prod-anon": {"quotes": ["anon's quote"], "labels": [], "source_ids": ["src-anon"]},
                "prod-bbb": {"quotes": ["bbb's quote"], "labels": [], "source_ids": ["src-bbb"], "learner_id": "learner-2"},
            },
        },
    }
    manifest_path = run_dir / "MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest))
    (run_dir / "timeline.json").write_text("{}")
    (run_dir / "self-report.json").write_text("{}")
    (run_dir / "run.log").write_text("nothing to redact here\n")

    result = purge._purge_run(manifest_path, "prod-aaa", dry_run=False)

    assert result["action"] == "redacted"
    manifest_after = json.loads(manifest_path.read_text())
    assert manifest_after["provenance"]["production_ids"] == ["prod-anon", "prod-bbb"]
    assert manifest_after["provenance"]["learner_ids"] == ["learner-2"]
    assert manifest_after["provenance"]["source_ids"] == ["src-anon", "src-bbb"]
    assert "prod-aaa" not in manifest_after["provenance"]["by_production"]
    assert "prod-anon" in manifest_after["provenance"]["by_production"]


# --------------------------------------------------------------------------
# _purge_cache
# --------------------------------------------------------------------------


def test_purge_cache_keeps_a_corrupted_index_line_rather_than_dropping_it(tmp_path):
    """An `index.jsonl` line this module cannot parse is not attributable
    to any production id (it cannot even be read), so it is neither this
    production's own entry to remove nor a legitimate line to keep
    silently: `_purge_cache` keeps it verbatim (the same "cannot rule
    out" caution `purge()`'s own manifest loop applies, at the per-line
    level here rather than the per-file level `report["unreadable"]`
    tracks)."""
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    good_line = json.dumps({"production_ids": ["prod-aaa"], "cache_key": "key-aaa"})
    bad_line = "{not valid json"
    (cache_dir / "index.jsonl").write_text(good_line + "\n" + bad_line + "\n")
    (cache_dir / "key-aaa.json").write_text('{"ok": true}')

    result = purge._purge_cache(cache_dir, "prod-aaa", dry_run=False)

    assert result["index_lines_removed"] == 1
    assert result["entries_deleted"] == ["key-aaa"]
    remaining = cache_dir.joinpath("index.jsonl").read_text().splitlines()
    assert remaining == [bad_line]


def test_purge_cache_index_entry_naming_an_already_deleted_response_file(tmp_path):
    """A cache index line can name a `cache_key` whose own response file
    is already gone (deleted by an earlier, partial run, say): the index
    line is still dropped, but the missing file is never counted as a
    deleted entry, since nothing was removed from disk for it."""
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    line = json.dumps({"production_ids": ["prod-aaa"], "cache_key": "key-missing"})
    (cache_dir / "index.jsonl").write_text(line + "\n")

    result = purge._purge_cache(cache_dir, "prod-aaa", dry_run=False)

    assert result["index_lines_removed"] == 1
    assert result["entries_deleted"] == []
    assert cache_dir.joinpath("index.jsonl").read_text() == ""


def test_purge_cache_dry_run_does_not_delete_the_response_file(tmp_path):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    line = json.dumps({"production_ids": ["prod-aaa"], "cache_key": "key-aaa"})
    (cache_dir / "index.jsonl").write_text(line + "\n")
    (cache_dir / "key-aaa.json").write_text('{"ok": true}')

    result = purge._purge_cache(cache_dir, "prod-aaa", dry_run=True)

    assert result["entries_deleted"] == ["key-aaa"]
    assert (cache_dir / "key-aaa.json").is_file()
    assert cache_dir.joinpath("index.jsonl").read_text() == line + "\n"


# --------------------------------------------------------------------------
# _shallow_matches: the evidence.{supports,refutes} branch
# --------------------------------------------------------------------------


def test_shallow_matches_finds_a_source_id_inside_evidence_supports():
    node = {"id": "h-1", "evidence": {"supports": ["src-aaa"], "refutes": []}}
    assert purge._shallow_matches(node, {"src-aaa"}, set()) is True


def test_shallow_matches_finds_a_source_id_inside_evidence_refutes():
    node = {"id": "h-1", "evidence": {"supports": [], "refutes": ["src-bbb"]}}
    assert purge._shallow_matches(node, {"src-bbb"}, set()) is True


def test_shallow_matches_evidence_with_no_matching_id_is_false():
    node = {"id": "h-1", "evidence": {"supports": ["src-unrelated"], "refutes": []}}
    assert purge._shallow_matches(node, {"src-aaa"}, set()) is False


def test_shallow_matches_ignores_a_non_dict_evidence_field():
    node = {"id": "h-1", "evidence": "not-a-dict"}
    assert purge._shallow_matches(node, {"src-aaa"}, set()) is False


# --------------------------------------------------------------------------
# _purge_json_file: unreadable bridge export / envelope
# --------------------------------------------------------------------------


def test_purge_json_file_flags_an_unreadable_file(tmp_path):
    path = tmp_path / "broken.bridge.json"
    path.write_text("{not valid json")
    result = purge._purge_json_file(path, {"src-aaa"}, set(), dry_run=True)
    assert result == {"path": str(path), "action": "unreadable", "error": "JSONDecodeError"}


def test_purge_json_file_returns_none_when_nothing_matches(tmp_path):
    path = tmp_path / "clean.bridge.json"
    path.write_text(json.dumps({"hypotheses": [{"id": "h-1", "evidenceCitations": [{"source_id": "src-unrelated"}]}]}))
    result = purge._purge_json_file(path, {"src-aaa"}, set(), dry_run=True)
    assert result is None


# --------------------------------------------------------------------------
# purge(): unreadable bridge export / envelope surfaces through the
# top-level orchestration that wraps `_purge_json_file`, the helper the
# section above tests directly
# --------------------------------------------------------------------------


def test_purge_orchestration_flags_an_unreadable_bridge_export(tmp_path):
    runs_root = tmp_path / "runs"
    run_dir = runs_root / "campaign" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "MANIFEST.json").write_text(json.dumps({"provenance": {"production_ids": ["prod-other"]}}))
    broken_bridge = runs_root / "broken.bridge.json"
    broken_bridge.write_text("{not valid json")

    report = purge.purge("prod-aaa", runs_root=runs_root, dry_run=True)

    assert report["complete"] is False
    assert any(entry["path"] == str(broken_bridge) and entry["error"] == "JSONDecodeError" for entry in report["unreadable"])
    assert report["warning"]


def test_purge_orchestration_flags_an_unreadable_feed402_envelope(tmp_path):
    runs_root = tmp_path / "runs"
    public_root = tmp_path / "public"
    public_root.mkdir(parents=True)
    broken_envelope = public_root / "run-broken.json"
    broken_envelope.write_text("{not valid json")

    report = purge.purge("prod-aaa", runs_root=runs_root, public_root=public_root, dry_run=True)

    assert report["complete"] is False
    assert any(entry["path"] == str(broken_envelope) and entry["error"] == "JSONDecodeError" for entry in report["unreadable"])
    assert report["warning"]


def test_purge_orchestration_no_bridge_or_envelope_trees_at_all_reports_complete(tmp_path):
    """Neither `runs_root` nor `public_root` needs to exist for a purge
    call to succeed cleanly (a fresh checkout that never ran a campaign,
    say): `purge()`'s own bridge/envelope walks both guard on `.exists()`
    first, so a missing tree reads as empty rather than unreadable."""
    runs_root = tmp_path / "runs-never-created"
    public_root = tmp_path / "public-never-created"

    report = purge.purge("prod-aaa", runs_root=runs_root, public_root=public_root, dry_run=True)

    assert report["bridge_exports"] == []
    assert report["envelopes"] == []
    assert report["unreadable"] == []
    assert report["complete"] is True
