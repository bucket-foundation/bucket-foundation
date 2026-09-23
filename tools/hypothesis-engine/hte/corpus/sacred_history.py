from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..concepts import Slot, Vocabulary, other_id
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval, Uncertainty
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

_LOGGER = logging.getLogger(__name__)

DEFAULT_CORPUS_PATH = Path(__file__).resolve().parents[4] / "src" / "data" / "sacred-history.json"
SACRED_HISTORY_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-seed-sacred-history.json"

_ACTION_BY_KIND: dict[str, str] = {
    "figure-mapping": "maps-to",
    "motif-parallel": "parallels",
    "structural": "structurally-echoes",
    "textual-borrowing": "borrows-from",
    "chronological": "precedes-chronologically",
    "shared-source-hypothesis": "derives-from-common-source",
    "etymological": "shares-etymology-with",
}

_NON_ATTESTING_STANCES = frozenset({"contested", "rejected", "fringe"})

_EXTERNAL_TRADITION_ANCHORS: dict[str, int] = {
    "mesopotamian": -1200,
    "greek": -700,
}

_TIER_BY_SOURCE: dict[str, Tier] = {
    "entity-graph-resolver": Tier.T4,
    "llm-branch-analysis": Tier.T4,
    "human-curated": Tier.T3,
}
_DEFAULT_CORRELATION_TIER = Tier.T4

def load_vocab() -> Vocabulary:
    return Vocabulary.load(SACRED_HISTORY_VOCAB_PATH)

def _locate(raw_text: str, needle: str) -> tuple[int, int]:
    idx = raw_text.find(needle)
    if idx < 0:
        raise ValueError(f"sacred-history adapter: text not found verbatim in the source file: {needle[:80]!r}")
    return idx, idx + len(needle)

def _tradition_spans(timeline: list[dict[str, Any]]) -> tuple[dict[str, tuple[int, int]], frozenset[str]]:
    spans: dict[str, tuple[int, int]] = {}
    for event in timeline:
        year = event.get("year")
        if year is None:
            continue
        for tradition in event.get("traditions", []):
            lo, hi = spans.get(tradition, (year, year))
            spans[tradition] = (min(lo, year), max(hi, year))
    anchored = frozenset(tradition for tradition in _EXTERNAL_TRADITION_ANCHORS if tradition not in spans)
    for tradition, anchor_year in _EXTERNAL_TRADITION_ANCHORS.items():
        spans.setdefault(tradition, (anchor_year, anchor_year))
    return spans, anchored

def _correlation_interval(
    a_span: tuple[int, int] | None, b_span: tuple[int, int] | None,
) -> tuple[Interval | None, bool | None, str | None]:
    if a_span is not None and b_span is not None:
        a_lo, a_hi = a_span
        b_lo, b_hi = b_span
        overlap_lo, overlap_hi = max(a_lo, b_lo), min(a_hi, b_hi)
        if overlap_lo <= overlap_hi:
            lo, hi, is_overlap, rule = overlap_lo, overlap_hi, True, "overlap"
        else:
            lo, hi, is_overlap, rule = min(a_lo, b_lo), max(a_lo, b_lo), False, "transmission_window"
        return Interval(start=lo, end=hi, uncertainty=Uncertainty.uniform(lo, hi)), is_overlap, rule
    span = a_span if a_span is not None else b_span
    if span is None:
        return None, None, None
    lo, hi = span
    return Interval(start=lo, end=hi, uncertainty=Uncertainty.uniform(lo, hi)), None, "anchor"

def _resolved_or_other(vocab: Vocabulary, slot: Slot, value: str | None) -> str:
    if value is not None and vocab.get(slot, value) is not None:
        return value
    return other_id(slot)

def _add_stemma_parent(source: Source, parent_id: str) -> None:
    if parent_id not in source.stemma_parents:
        source.stemma_parents.append(parent_id)

def _build_sources(traditions: list[str], spans: dict[str, tuple[int, int]], correlations: list[dict[str, Any]]) -> dict[str, Source]:
    sources: dict[str, Source] = {
        tradition: Source(
            id=tradition, kind=EvidenceKind.TEXTUAL,
            date=str(spans[tradition][0]) if tradition in spans else None,
        )
        for tradition in traditions
    }
    for corr in correlations:
        a_trad = corr.get("sideA", {}).get("tradition")
        b_trad = corr.get("sideB", {}).get("tradition")
        if not a_trad or not b_trad or a_trad == b_trad or a_trad not in sources or b_trad not in sources:
            continue
        direction = corr.get("direction")
        if direction == "a→b":
            _add_stemma_parent(sources[b_trad], a_trad)
        elif direction == "b→a":
            _add_stemma_parent(sources[a_trad], b_trad)
        else:
            _add_stemma_parent(sources[a_trad], b_trad)
            _add_stemma_parent(sources[b_trad], a_trad)
    return sources

def _counter_consideration_items(
    corr: dict[str, Any], raw: str, *, actor: str, action: str, obj: str, place: str, mechanism: str, interval: Interval | None, tier: Tier,
) -> list[EvidenceItem]:
    items: list[EvidenceItem] = []
    for i, caveat in enumerate(corr.get("counterConsiderations", []) or []):
        start, end = _locate(raw, caveat)
        items.append(EvidenceItem(
            id=f"{corr['id']}-counter-{i}", kind=EvidenceKind.TEXTUAL, tier=tier,
            source_id=place,
            span=EvidenceSpan(doc_id="sacred-history.json", locator=f"correlations/{corr['id']}/counterConsiderations[{i}]", quote=caveat, char_start=start, char_end=end, doc_length=len(raw)),
            provenance="sacred-history-counter-consideration",
            actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
            interval=interval, stance=Stance.NEGATIVE,
        ))
    return items

def _correlation_items(
    correlations: list[dict[str, Any]], raw: str, vocab: Vocabulary,
    spans: dict[str, tuple[int, int]], anchored_traditions: frozenset[str],
) -> tuple[list[EvidenceItem], list[GroundTruthEvent]]:
    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []

    for corr in correlations:
        side_a, side_b = corr.get("sideA", {}), corr.get("sideB", {})
        a_trad, b_trad = side_a.get("tradition"), side_b.get("tradition")
        actor = _resolved_or_other(vocab, Slot.ACTOR, side_a.get("node"))
        obj = _resolved_or_other(vocab, Slot.OBJECT, side_b.get("node"))
        place = _resolved_or_other(vocab, Slot.PLACE, a_trad)
        action_id = _ACTION_BY_KIND.get(corr.get("kind", ""))
        action = _resolved_or_other(vocab, Slot.ACTION, action_id)
        method = (corr.get("provenance") or {}).get("method")
        mechanism = _resolved_or_other(vocab, Slot.MECHANISM, method)
        interval, interval_is_overlap, interval_rule = _correlation_interval(spans.get(a_trad), spans.get(b_trad))
        tier = _TIER_BY_SOURCE.get(corr.get("source", ""), _DEFAULT_CORRELATION_TIER)

        statement = corr.get("statement", "")
        start, end = _locate(raw, statement)
        confidence = float(corr.get("confidence", 0.0))

        views: dict[str, float] = {"blended_a": min(0.99, confidence)}
        if interval_is_overlap is not None:
            views["interval_is_overlap"] = 1.0 if interval_is_overlap else 0.0
        if interval_rule is not None:
            views["interval_rule"] = interval_rule  # type: ignore[assignment]
        if a_trad in anchored_traditions or b_trad in anchored_traditions:
            views["anchor_used"] = 1.0

        evidence.append(EvidenceItem(
            id=corr["id"], kind=EvidenceKind.TEXTUAL, tier=tier, source_id=place,
            span=EvidenceSpan(doc_id="sacred-history.json", locator=f"correlations/{corr['id']}", quote=statement, char_start=start, char_end=end, doc_length=len(raw)),
            provenance="sacred-history-correlation",
            actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
            interval=interval, stance=Stance.POSITIVE,
            views=views,
        ))
        evidence.extend(_counter_consideration_items(
            corr, raw, actor=actor, action=action, obj=obj, place=place, mechanism=mechanism, interval=interval, tier=tier,
        ))

        raw_evidence_kinds = {e.get("kind") for e in corr.get("evidence", []) if e.get("kind") and e.get("kind") != "ai-derived"}
        attested_by_two_kinds = len({e.get("kind") for e in corr.get("evidence", []) if e.get("kind")}) >= 2 and bool(raw_evidence_kinds)
        if attested_by_two_kinds and corr.get("stance") not in _NON_ATTESTING_STANCES and interval is not None:
            ground_truth.append(GroundTruthEvent(
                id=corr["id"], label=corr.get("label", corr["id"]), year=interval.start,
                doc_id="sacred-history.json", discovery_year=interval.start,
            ))

    return evidence, ground_truth

def _timeline_ground_truth(timeline: list[dict[str, Any]]) -> list[GroundTruthEvent]:
    return [
        GroundTruthEvent(id=event["id"], label=event["label"], year=event["year"], doc_id="sacred-history.json", discovery_year=event["year"])
        for event in timeline
        if event.get("disputed") is False
    ]

def _merge_with_texts(corpus: Corpus, text_corpus: Corpus) -> Corpus:
    merged_sources = dict(corpus.sources)
    merged_sources.update(text_corpus.sources)
    return Corpus(
        sources=merged_sources,
        evidence=list(corpus.evidence) + list(text_corpus.evidence),
        ground_truth=list(corpus.ground_truth),
        provenance=list(corpus.provenance) + list(text_corpus.provenance),
        vocab=corpus.vocab,
    )

def ingest(
    corpus_path: str | Path | None = None, *, retrieval_run_id: str = "fixture-sacred-history-ingest",
    with_texts: bool = False,
) -> Corpus:
    path = Path(corpus_path) if corpus_path is not None else DEFAULT_CORPUS_PATH
    if not path.is_file():
        raise FileNotFoundError(f"sacred-history corpus file not found: {path}")

    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    vocab = load_vocab()

    traditions: list[str] = data.get("traditions", [])
    correlations: list[dict[str, Any]] = data.get("correlations", [])
    timeline: list[dict[str, Any]] = data.get("timeline", [])

    spans, anchored_traditions = _tradition_spans(timeline)
    sources = _build_sources(traditions, spans, correlations)
    correlation_evidence, correlation_ground_truth = _correlation_items(correlations, raw, vocab, spans, anchored_traditions)
    timeline_ground_truth = _timeline_ground_truth(timeline)

    fetched_at = datetime.now(timezone.utc).isoformat()
    total_stemma_edges = sum(len(source.stemma_parents) for source in sources.values())
    provenance = [RetrievalEnvelope(
        retrieval_run_id=retrieval_run_id, doc_id="sacred-history.json", source_path=str(path),
        fetched_at=fetched_at, fixture=True, citation_count=len(correlations), lineage_count=total_stemma_edges,
    )]

    corpus = Corpus(
        sources=sources, evidence=correlation_evidence,
        ground_truth=timeline_ground_truth + correlation_ground_truth,
        provenance=provenance, vocab=vocab,
    )
    if not with_texts:
        return corpus

    from . import sacred_history_texts
    return _merge_with_texts(corpus, sacred_history_texts.load())

__all__ = ["ingest", "load_vocab", "DEFAULT_CORPUS_PATH", "SACRED_HISTORY_VOCAB_PATH"]
