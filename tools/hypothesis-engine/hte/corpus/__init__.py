"""Corpus ingestion: `Source`/`EvidenceItem` sets ready for `hte.belief`,
plus the ground-truth events `hte.calibrate` tests against and the
retrieval-provenance record `main.tex` §8 asks every fetch to carry.

`hte.corpus.quantum_history` ingests `quantum/07-history/*.md` (this
repo's own quantum-computing history atlas chapter). `hte.corpus.fixtures`
builds a tiny synthetic corpus of the same shape for tests that should not
depend on that chapter's exact prose.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..concepts import Vocabulary
from ..evidence import EvidenceItem, Source


@dataclass(frozen=True)
class GroundTruthEvent:
    """One dated event a corpus asserts happened, for
    `hte.calibrate`'s holdout tests. `discovery_year` is the astronomical
    year the claim entered the written record the corpus draws on; for
    `hte.corpus.quantum_history` this is documented as equal to the
    event's own headline year (`quantum_history.py`'s own module
    docstring), since the corpus's card format states an event's year and
    its citation's publication year in the same bullet and the two
    coincide in every card this ingestion reads: a card citing a later
    retrospective source for an earlier event would need a real
    discovery-date extraction this package does not build."""
    id: str
    label: str
    year: int
    doc_id: str
    discovery_year: int

    def to_dict(self) -> dict[str, Any]:
        return {"id": self.id, "label": self.label, "year": self.year, "doc_id": self.doc_id, "discovery_year": self.discovery_year}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "GroundTruthEvent":
        return cls(id=d["id"], label=d["label"], year=int(d["year"]), doc_id=d["doc_id"], discovery_year=int(d["discovery_year"]))


@dataclass(frozen=True)
class RetrievalEnvelope:
    """One immutable per-fetch provenance record (`main.tex` §8's
    retrieval envelope), linked to a `retrieval_run_id`.
    `bkt-hte-retrieval-provenance` ships fixture mode only in this pass:
    every envelope this package writes carries `fixture=True` and no
    network call backs it, so `manifest_fingerprint`, `protocol_version`,
    `citation_count`, and `lineage_count` are `None` or a best-effort
    local count rather than the x402-research-gateway's own manifest
    data. Once a mirror job routes a source through that gateway, the
    same fields fill in from its real manifest without changing this
    record's shape.
    """
    retrieval_run_id: str
    doc_id: str
    source_path: str
    fetched_at: str
    fixture: bool = True
    manifest_fingerprint: str | None = None
    protocol_version: str | None = None
    citation_count: int | None = None
    lineage_count: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "retrieval_run_id": self.retrieval_run_id, "doc_id": self.doc_id,
            "source_path": self.source_path, "fetched_at": self.fetched_at,
            "fixture": self.fixture, "manifest_fingerprint": self.manifest_fingerprint,
            "protocol_version": self.protocol_version, "citation_count": self.citation_count,
            "lineage_count": self.lineage_count,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "RetrievalEnvelope":
        return cls(
            retrieval_run_id=d["retrieval_run_id"], doc_id=d["doc_id"], source_path=d["source_path"],
            fetched_at=d["fetched_at"], fixture=bool(d.get("fixture", True)),
            manifest_fingerprint=d.get("manifest_fingerprint"), protocol_version=d.get("protocol_version"),
            citation_count=d.get("citation_count"), lineage_count=d.get("lineage_count"),
        )


@dataclass
class Corpus:
    """A whole ingested corpus: every `Source`, every `EvidenceItem`, the
    ground-truth events for calibration, the retrieval-provenance record
    per source, and the vocabulary the corpus's generator and scorer run
    against."""
    sources: dict[str, Source] = field(default_factory=dict)
    evidence: list[EvidenceItem] = field(default_factory=list)
    ground_truth: list[GroundTruthEvent] = field(default_factory=list)
    provenance: list[RetrievalEnvelope] = field(default_factory=list)
    vocab: Vocabulary = field(default_factory=Vocabulary)

    def to_dict(self) -> dict[str, Any]:
        return {
            "sources": {k: v.to_dict() for k, v in self.sources.items()},
            "evidence": [e.to_dict() for e in self.evidence],
            "ground_truth": [g.to_dict() for g in self.ground_truth],
            "provenance": [p.to_dict() for p in self.provenance],
            "vocab": self.vocab.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Corpus":
        return cls(
            sources={k: Source.from_dict(v) for k, v in d.get("sources", {}).items()},
            evidence=[EvidenceItem.from_dict(e) for e in d.get("evidence", [])],
            ground_truth=[GroundTruthEvent.from_dict(g) for g in d.get("ground_truth", [])],
            provenance=[RetrievalEnvelope.from_dict(p) for p in d.get("provenance", [])],
            vocab=Vocabulary.from_dict(d["vocab"]) if "vocab" in d else Vocabulary(),
        )

    def save(self, path: str | Path) -> None:
        import json
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))

    @classmethod
    def load(cls, path: str | Path) -> "Corpus":
        import json
        return cls.from_dict(json.loads(Path(path).read_text()))


__all__ = ["Corpus", "GroundTruthEvent", "RetrievalEnvelope"]
