"""`hte.provenance`: `collect`/`collect_from_corpus` over `EvidenceItem`s
and `Source`s carrying `production_id`/`learner_id` as plain instance
attributes (`hte.corpus.research_os_outbox._stamp_corpus_provenance`'s own
stamp), and `stamp_manifest`'s `MANIFEST.json` patch (`docs/PRIVACY.md`).
"""
from __future__ import annotations

import json

import pytest

from hte import provenance
from hte.corpus import Corpus
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier


def _span(quote: str, doc_id: str = "doc-1") -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="l", quote=quote, char_start=0, char_end=len(quote))


def _item(item_id: str, *, source_id: str, quote: str, production_id: str | None = None, learner_id: str | None = None, actor: str | None = None) -> EvidenceItem:
    item = EvidenceItem(id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T4, source_id=source_id, span=_span(quote), provenance="test", actor=actor)
    if production_id is not None:
        item.production_id = production_id
    if learner_id is not None:
        item.learner_id = learner_id
    return item


def test_collect_returns_none_for_empty_evidence():
    assert provenance.collect([]) is None


def test_collect_reads_source_ids_even_without_provenance_attributes():
    """An `EvidenceItem` no `research_os_outbox` code ever touched (every
    other corpus adapter) carries neither attribute; `collect` still
    reports its `source_id`, just no production/learner id."""
    item = _item("ev-1", source_id="src-1", quote="q")
    result = provenance.collect([item])
    assert result == {"source_ids": ["src-1"], "production_ids": [], "learner_ids": []}


def test_collect_dedupes_and_sorts_across_items():
    items = [
        _item("ev-1", source_id="src-b", quote="q1", production_id="prod-2", learner_id="learner-2"),
        _item("ev-2", source_id="src-a", quote="q2", production_id="prod-1", learner_id="learner-1"),
        _item("ev-3", source_id="src-a", quote="q3", production_id="prod-1", learner_id="learner-1"),
    ]
    result = provenance.collect(items)
    assert result == {
        "source_ids": ["src-a", "src-b"],
        "production_ids": ["prod-1", "prod-2"],
        "learner_ids": ["learner-1", "learner-2"],
    }


def test_collect_from_corpus_builds_by_production_with_quotes_and_labels():
    item_a = _item("ev-1", source_id="src-a", quote="quote A", production_id="prod-a", learner_id="learner-a", actor="astronomer")
    item_b = _item("ev-2", source_id="src-b", quote="quote B", production_id="prod-b", learner_id="learner-b")
    corpus = Corpus(sources={"prod-a": Source(id="prod-a", kind=EvidenceKind.TEXTUAL), "prod-b": Source(id="prod-b", kind=EvidenceKind.TEXTUAL)}, evidence=[item_a, item_b])
    corpus.sources["prod-a"].production_id = "prod-a"
    corpus.sources["prod-a"].learner_id = "learner-a"
    corpus.sources["prod-b"].production_id = "prod-b"
    corpus.sources["prod-b"].learner_id = "learner-b"

    result = provenance.collect_from_corpus(corpus)
    assert result["production_ids"] == ["prod-a", "prod-b"]
    assert result["learner_ids"] == ["learner-a", "learner-b"]
    assert result["by_production"]["prod-a"]["learner_id"] == "learner-a"
    assert result["by_production"]["prod-a"]["quotes"] == ["quote A"]
    assert result["by_production"]["prod-a"]["labels"] == ["astronomer"]
    assert result["by_production"]["prod-b"]["quotes"] == ["quote B"]
    assert result["by_production"]["prod-b"]["labels"] == []


def test_collect_from_corpus_over_an_empty_corpus_is_all_empty():
    result = provenance.collect_from_corpus(Corpus())
    assert result == {"source_ids": [], "production_ids": [], "learner_ids": [], "by_production": {}}


def test_stamp_manifest_patches_provenance_and_skipped_rows(tmp_path):
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"counts": {"hypotheses": 3}}))

    item = _item("ev-1", source_id="src-a", quote="q", production_id="prod-a", learner_id="learner-a")
    corpus = Corpus(evidence=[item])
    manifest = provenance.stamp_manifest(run_dir, corpus, skipped_rows=[{"production_id": "prod-bad", "reason": "bad status"}])

    assert manifest["counts"] == {"hypotheses": 3}
    assert manifest["provenance"]["production_ids"] == ["prod-a"]
    assert manifest["skipped_rows"] == [{"production_id": "prod-bad", "reason": "bad status"}]

    on_disk = json.loads((run_dir / "MANIFEST.json").read_text())
    assert on_disk == manifest


def test_stamp_manifest_without_skipped_rows_leaves_that_key_absent(tmp_path):
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({}))
    manifest = provenance.stamp_manifest(run_dir, Corpus())
    assert "skipped_rows" not in manifest


def test_stamp_manifest_raises_when_manifest_is_missing(tmp_path):
    with pytest.raises(FileNotFoundError):
        provenance.stamp_manifest(tmp_path / "no-run-here", Corpus())
