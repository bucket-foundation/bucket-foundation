"""Contract tests for signoff_core.py (the canon human sign-off tool,
GOVERNANCE.md's "Canon sign-off" section). Offline and deterministic: every
test builds its own fixture bucket-canon/ tree under tmp_path and points
signoff_core's functions at it via their `root=`/`index_path=` parameters,
touching no real repo file. `approve()` is always called with
offline=True; no network call happens anywhere in this file.
"""
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import signoff_core as core  # noqa: E402


def _rec(id_, title, score=70, doi="10.1/x", signoff="pending: gianyrox"):
    r = {
        "id": id_,
        "title": title,
        "authors": [{"family": "Doe", "given": "J"}],
        "year": 2020,
        "venue": {"name": "Nature"},
        "doi": doi,
        "canonical_url": f"https://doi.org/{doi}" if doi else None,
        "citation_count": 10,
        "concepts": ["X"],
        "sources_consulted": ["openalex"],
        "fetched_at": "2026-09-10T00:00:00Z",
        "canon_score": score,
        "canon_score_reasons": ["+30 peer-reviewed type"],
        "canon_branch_hints": ["07-mind"],
    }
    if signoff is not None:
        r["provenance_signoff"] = signoff
    return r


def _write(folder: Path, *records):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "primary-papers.yaml").write_text(yaml.safe_dump({"records": list(records)}, sort_keys=False))


@pytest.fixture
def canon_tree(tmp_path):
    root = tmp_path / "bucket-canon"
    _write(
        root / "07-mind" / "memory-systems",
        _rec("bkt-aaa", "Memory Paper One", score=85, doi="10.1/aaa"),
        _rec("bkt-bbb", "Memory Paper Two (approved already)", score=80, doi="10.1/bbb", signoff="approved: alice 2026-01-01"),
    )
    _write(
        root / "07-mind" / "sub-outcomes" / "education",
        _rec("bkt-ccc", "Outcome Paper", score=60, doi="10.1/ccc"),
    )
    _write(
        root / "04-information" / "no-doi-concept",
        _rec("bkt-ddd", "No DOI Paper", score=70, doi=None),
    )
    index = tmp_path / "CANON-INGESTION-INDEX.md"
    index.write_text("# Bucket Foundation\n\nCanon Ingestion Index.\n")
    return root, index


# ---------------------------------------------------------------------------
# list_pending / list_records
# ---------------------------------------------------------------------------


def test_list_pending_finds_every_nested_record(canon_tree):
    root, _ = canon_tree
    pending = core.list_pending(root=root)
    ids = {r.id for r in pending}
    # bkt-bbb is already approved and must not appear.
    assert ids == {"bkt-aaa", "bkt-ccc", "bkt-ddd"}


def test_list_pending_tags_outcome_tier_from_sub_outcomes_path(canon_tree):
    root, _ = canon_tree
    pending = {r.id: r for r in core.list_pending(root=root)}
    assert pending["bkt-ccc"].tier == "outcome"
    assert pending["bkt-aaa"].tier == "canon"


def test_list_pending_sorted_by_score_desc(canon_tree):
    root, _ = canon_tree
    pending = core.list_pending(root=root)
    scores = [r.canon_score for r in pending]
    assert scores == sorted(scores, reverse=True)


# ---------------------------------------------------------------------------
# find_record resolution
# ---------------------------------------------------------------------------


def test_find_record_by_bare_id(canon_tree):
    root, _ = canon_tree
    loc = core.find_record("bkt-aaa", root=root)
    assert loc.record["id"] == "bkt-aaa"


def test_find_record_by_path_hash_id(canon_tree):
    root, _ = canon_tree
    loc = core.find_record("07-mind/memory-systems/primary-papers.yaml#bkt-aaa", root=root)
    assert loc.record["id"] == "bkt-aaa"


def test_find_record_by_bare_path_with_one_pending(canon_tree):
    root, _ = canon_tree
    loc = core.find_record("04-information/no-doi-concept", root=root)
    assert loc.record["id"] == "bkt-ddd"


def test_find_record_by_bare_path_with_multiple_pending_is_ambiguous(canon_tree):
    root, _ = canon_tree
    _write(
        root / "07-mind" / "memory-systems",
        _rec("bkt-aaa", "Memory Paper One", score=85, doi="10.1/aaa"),
        _rec("bkt-zzz", "Memory Paper Three", score=50, doi="10.1/zzz"),
    )
    with pytest.raises(core.SignoffError, match="pending"):
        core.find_record("07-mind/memory-systems", root=root)


def test_find_record_not_found(canon_tree):
    root, _ = canon_tree
    with pytest.raises(core.SignoffError, match="no record found"):
        core.find_record("bkt-nonexistent", root=root)


# ---------------------------------------------------------------------------
# approve
# ---------------------------------------------------------------------------


def test_approve_offline_writes_approved_value_and_only_that_line(canon_tree):
    root, index = canon_tree
    yaml_path = root / "07-mind" / "memory-systems" / "primary-papers.yaml"
    before = yaml_path.read_text()

    result = core.approve("bkt-aaa", "gianyrox", offline=True, root=root, index_path=index)

    assert result["action"] == "approved"
    assert result["value"] == result["value"]  # sanity
    assert result["value"].startswith("approved: gianyrox ")

    after = yaml_path.read_text()
    # The untouched sibling record's line must be byte-identical.
    assert "provenance_signoff: 'approved: alice 2026-01-01'" in after
    # Only bkt-aaa's line changed.
    before_lines = before.splitlines()
    after_lines = after.splitlines()
    assert len(before_lines) == len(after_lines)
    changed = [i for i, (b, a) in enumerate(zip(before_lines, after_lines)) if b != a]
    assert len(changed) == 1
    assert "approved: gianyrox" in after_lines[changed[0]]

    docs = yaml.safe_load(after)
    rec = next(r for r in docs["records"] if r["id"] == "bkt-aaa")
    assert rec["provenance_signoff"].startswith("approved: gianyrox ")


def test_approve_appends_ingestion_index_entry(canon_tree):
    root, index = canon_tree
    core.approve("bkt-aaa", "gianyrox", offline=True, root=root, index_path=index)
    text = index.read_text()
    assert "## Canon sign-off," in text
    assert "**approved**: `bucket-canon/07-mind/memory-systems/primary-papers.yaml#bkt-aaa`" in text
    assert "by gianyrox on" in text


def test_approve_twice_is_idempotent_noop(canon_tree):
    root, index = canon_tree
    first = core.approve("bkt-aaa", "gianyrox", offline=True, root=root, index_path=index)
    second = core.approve("bkt-aaa", "gianyrox", offline=True, root=root, index_path=index)
    assert first["action"] == "approved"
    assert second["action"] == "noop"
    assert "already approved" in second["message"]
    # Only one index entry was appended (the noop must not append again).
    assert index.read_text().count("## Canon sign-off,") == 1


def test_approve_already_approved_record_is_noop(canon_tree):
    root, index = canon_tree
    result = core.approve("bkt-bbb", "gianyrox", offline=True, root=root, index_path=index)
    assert result["action"] == "noop"
    assert "alice" in result["value"]


def test_approve_requires_by(canon_tree):
    root, index = canon_tree
    with pytest.raises(core.SignoffError, match="--by"):
        core.approve("bkt-aaa", "", offline=True, root=root, index_path=index)


def test_approve_without_offline_refuses_when_no_doi(canon_tree):
    root, index = canon_tree
    with pytest.raises(core.SignoffError, match="no DOI"):
        core.approve("bkt-ddd", "gianyrox", offline=False, root=root, index_path=index)


def test_approve_without_offline_checks_doi_head(canon_tree, monkeypatch):
    root, index = canon_tree
    monkeypatch.setattr(core, "_doi_resolves", lambda doi, timeout=10.0: False)
    with pytest.raises(core.SignoffError, match="did not resolve"):
        core.approve("bkt-aaa", "gianyrox", offline=False, root=root, index_path=index)

    monkeypatch.setattr(core, "_doi_resolves", lambda doi, timeout=10.0: True)
    result = core.approve("bkt-aaa", "gianyrox", offline=False, root=root, index_path=index)
    assert result["action"] == "approved"
    assert "DOI verified" in index.read_text()


# ---------------------------------------------------------------------------
# reject
# ---------------------------------------------------------------------------


def test_reject_writes_rejected_value_with_reason(canon_tree):
    root, index = canon_tree
    result = core.reject("bkt-aaa", "gianyrox", "broken DOI, superseded", root=root, index_path=index)
    assert result["action"] == "rejected"
    assert "broken DOI, superseded" in result["value"]
    text = index.read_text()
    assert "**rejected**: `bucket-canon/07-mind/memory-systems/primary-papers.yaml#bkt-aaa`" in text
    assert "reason: broken DOI, superseded" in text


def test_reject_requires_reason(canon_tree):
    root, index = canon_tree
    with pytest.raises(core.SignoffError, match="--reason"):
        core.reject("bkt-aaa", "gianyrox", "", root=root, index_path=index)


def test_reject_twice_is_idempotent_noop(canon_tree):
    root, index = canon_tree
    core.reject("bkt-aaa", "gianyrox", "bad", root=root, index_path=index)
    second = core.reject("bkt-aaa", "gianyrox", "bad again", root=root, index_path=index)
    assert second["action"] == "noop"
    assert index.read_text().count("## Canon sign-off,") == 1


def test_rejected_record_is_excluded_from_list_pending(canon_tree):
    root, index = canon_tree
    core.reject("bkt-aaa", "gianyrox", "bad", root=root, index_path=index)
    pending_ids = {r.id for r in core.list_pending(root=root)}
    assert "bkt-aaa" not in pending_ids


def test_reject_then_approve_transition_allowed(canon_tree):
    root, index = canon_tree
    core.reject("bkt-aaa", "gianyrox", "bad DOI", root=root, index_path=index)
    result = core.approve("bkt-aaa", "gianyrox", offline=True, root=root, index_path=index)
    assert result["action"] == "approved"


# ---------------------------------------------------------------------------
# audit
# ---------------------------------------------------------------------------


def test_audit_reads_back_cli_events(canon_tree):
    root, index = canon_tree
    core.approve("bkt-aaa", "gianyrox", offline=True, root=root, index_path=index)
    core.reject("bkt-ccc", "gianyrox", "outcome tier, not foundation", root=root, index_path=index)
    result = core.audit(index_path=index)
    actions = {(e["action"], e["id"]) for e in result.cli_events}
    assert ("approved", "bkt-aaa") in actions
    assert ("rejected", "bkt-ccc") in actions


def test_audit_reads_engine_writeback_events(canon_tree):
    root, index = canon_tree
    index.write_text(
        index.read_text()
        + "\n## Recent additions, 2026-09-05\n\n"
        + "Build-history write-back. 3 hypothesis card(s) written from "
        + "`hte.canon_writeback.write_back` over `quantum-history` run "
        + "`20260905T000000Z`, `canon_tier: candidate` throughout. "
        + "Signed off by gianyrox.\n\n"
        + "| Title | Path | Type |\n|---|---|---|\n"
    )
    result = core.audit(index_path=index)
    assert len(result.engine_events) == 1
    assert result.engine_events[0]["by"] == "gianyrox"
    assert result.engine_events[0]["date"] == "2026-09-05"


def test_audit_empty_index_returns_no_events(tmp_path):
    index = tmp_path / "CANON-INGESTION-INDEX.md"
    index.write_text("# empty\n")
    result = core.audit(index_path=index)
    assert result.cli_events == []
    assert result.engine_events == []


# ---------------------------------------------------------------------------
# _status_of / vocabulary
# ---------------------------------------------------------------------------


def test_status_of_vocabulary():
    assert core._status_of("pending: gianyrox") == "pending"
    assert core._status_of("Pending: gianyrox") == "pending"
    assert core._status_of("approved: gianyrox 2026-09-10") == "approved"
    assert core._status_of("rejected: gianyrox 2026-09-10: bad doi") == "rejected"
    assert core._status_of(None) == "ungated"
    assert core._status_of("garbage") == "unknown"
