from __future__ import annotations

import logging
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from ..concepts import ConsensusStatus, Slot, Vocabulary
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..generate import PLACEMENT_CONCEPT_SLOTS
from ..timeline import Interval
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

_LOGGER = logging.getLogger(__name__)

DEFAULT_CORPUS_DIR = Path(__file__).resolve().parents[4] / "quantum" / "07-history"
QUANTUM_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-seed-quantum-history.json"

_TITLE_RE = re.compile(r"^#\s*(?P<title>.+?)\s*·\s*(?P<doc_id>[\w-]+)\s*$")
_YEAR_RE = re.compile(r"(?<!\d)(1[6-9]\d{2}|20\d{2})(?!\d)")
_TIER_RE = re.compile(r"\bT([1-6])\b")
_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
_BULLET_RE = re.compile(r"^-\s+(.+)$")
_CROSS_REF_RE = re.compile(r"\bT-[a-z0-9]+\b")
_WORD_RE = re.compile(r"[a-z0-9]+")

_STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for",
    "with", "by", "its", "is", "was", "are", "were", "be", "as", "that",
    "quantum",
})

_SLOT_MATCH_MIN_SCORE = 0.4

_NEGATION_CUES = (
    "no independent confirmation", "not confirmed", "disputes", "disputed",
    "refutes", "rejects", "downgraded", "unconfirmed", "no evidence",
    "did not", "failed to", "contested", "disproven", "ruled out",
)

def _normalize_text(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in stripped if not unicodedata.combining(ch)).lower()

def _words(text: str) -> set[str]:
    return set(_WORD_RE.findall(_normalize_text(text))) - _STOPWORDS

def _best_concept_match(bullet_words: set[str], vocab: Vocabulary, slot: Slot) -> str | None:
    best_id, best_score = None, 0.0
    for concept in vocab.concepts(slot):
        if concept.consensus_status == ConsensusStatus.OTHER:
            continue
        label_words = _words(concept.label)
        if not label_words:
            continue
        overlap = len(label_words & bullet_words) / len(label_words)
        if overlap > best_score:
            best_score, best_id = overlap, concept.id
    return best_id if best_score >= _SLOT_MATCH_MIN_SCORE else None

def _extract_interval(text: str) -> Interval | None:
    years = [int(y) for y in _YEAR_RE.findall(text)]
    if not years:
        return None
    return Interval(start=min(years), end=max(years))

def _infer_stance(text: str) -> Stance:
    lowered = _normalize_text(text)
    return Stance.NEGATIVE if any(cue in lowered for cue in _NEGATION_CUES) else Stance.POSITIVE

def _extract_slots(text: str, vocab: Vocabulary) -> dict[str, object]:
    words = _words(text)
    slots = {slot.value: _best_concept_match(words, vocab, slot) for slot in PLACEMENT_CONCEPT_SLOTS}
    slots["interval"] = _extract_interval(text)
    slots["stance"] = _infer_stance(text)
    return slots

def _split_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        m = _HEADING_RE.match(line)
        if m:
            current = m.group(1).strip()
            sections[current] = []
            continue
        if current is not None:
            sections[current].append(line)
    return sections

def _bullets(lines: Iterable[str]) -> list[str]:
    out = []
    for line in lines:
        m = _BULLET_RE.match(line.strip())
        if m:
            out.append(m.group(1).strip())
    return out

def _parse_tier(text: str, default: Tier = Tier.T4) -> Tier:
    m = _TIER_RE.search(text)
    return Tier(f"T{m.group(1)}") if m else default

def _parse_year(text: str) -> int | None:
    m = _YEAR_RE.search(text)
    return int(m.group(1)) if m else None

def _locate(raw_text: str, needle: str) -> tuple[int, int]:
    idx = raw_text.find(needle)
    if idx < 0:
        raise ValueError(f"bullet text not found verbatim in its own source file: {needle[:80]!r}")
    return idx, idx + len(needle)

def _parse_card(path: Path, vocab: Vocabulary) -> tuple[Source, list[EvidenceItem], list[GroundTruthEvent], int]:
    raw = path.read_text()
    lines = raw.splitlines()
    title_match = _TITLE_RE.match(lines[0]) if lines else None
    doc_id = title_match.group("doc_id") if title_match else path.stem

    sections = _split_sections(raw)
    milestone_lines = sections.get("Milestone timeline", [])
    claims_lines = sections.get("Key graded claims", [])
    sources_lines = sections.get("Sources", [])

    stemma_parents = sorted({
        ref for line in sources_lines for ref in _CROSS_REF_RE.findall(line) if ref != doc_id
    })
    source = Source(id=doc_id, kind=EvidenceKind.TEXTUAL, date=None, stemma_parents=stemma_parents)

    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []

    for i, bullet in enumerate(_bullets(milestone_lines)):
        start, end = _locate(raw, bullet)
        tier = _parse_tier(bullet)
        year = _parse_year(bullet)
        evidence.append(EvidenceItem(
            id=f"{doc_id}-ms-{i}", kind=EvidenceKind.TEXTUAL, tier=tier, source_id=doc_id,
            span=EvidenceSpan(doc_id=doc_id, locator=f"milestone-timeline:{i}", quote=bullet, char_start=start, char_end=end, doc_length=len(raw)),
            provenance="quantum-history-card-milestone",
            **_extract_slots(bullet, vocab),
        ))
        if year is not None:
            ground_truth.append(GroundTruthEvent(
                id=f"{doc_id}-ms-{i}", label=bullet, year=year, doc_id=doc_id, discovery_year=year,
            ))

    for i, bullet in enumerate(_bullets(claims_lines)):
        start, end = _locate(raw, bullet)
        tier = _parse_tier(bullet)
        evidence.append(EvidenceItem(
            id=f"{doc_id}-claim-{i}", kind=EvidenceKind.TEXTUAL, tier=tier, source_id=doc_id,
            span=EvidenceSpan(doc_id=doc_id, locator=f"key-graded-claims:{i}", quote=bullet, char_start=start, char_end=end, doc_length=len(raw)),
            provenance="quantum-history-card-claim",
            **_extract_slots(bullet, vocab),
        ))

    return source, evidence, ground_truth, len(_bullets(sources_lines))

_BLOCKQUOTE_BULLET_RE = re.compile(r"^>\s*-\s+(.+)$")

def _parse_chapter(path: Path, vocab: Vocabulary) -> tuple[Source, list[EvidenceItem]]:
    raw = path.read_text()
    doc_id = "_CHAPTER"
    bullets = [m.group(1).strip() for m in (_BLOCKQUOTE_BULLET_RE.match(line) for line in raw.splitlines()) if m]
    evidence = []
    for i, bullet in enumerate(bullets):
        start, end = _locate(raw, bullet)
        evidence.append(EvidenceItem(
            id=f"{doc_id}-takeaway-{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id=doc_id,
            span=EvidenceSpan(doc_id=doc_id, locator=f"key-takeaways:{i}", quote=bullet, char_start=start, char_end=end, doc_length=len(raw)),
            provenance="quantum-history-chapter-takeaway",
            **_extract_slots(bullet, vocab),
        ))
    return Source(id=doc_id, kind=EvidenceKind.TEXTUAL, date=None, stemma_parents=[]), evidence

def load_vocab() -> Vocabulary:
    return Vocabulary.load(QUANTUM_VOCAB_PATH)

def _drop_dangling_stemma_parents(sources: dict[str, Source]) -> None:
    for key, source in sources.items():
        resolved = [p for p in source.stemma_parents if p in sources]
        dangling = [p for p in source.stemma_parents if p not in sources]
        for parent in dangling:
            _LOGGER.warning(
                "quantum_history.ingest: source %r cites stemma parent %r, "
                "not present in the ingested corpus; dropped as dangling", key, parent,
            )
        source.stemma_parents = resolved

def ingest(corpus_dir: str | Path | None = None, *, retrieval_run_id: str = "fixture-quantum-history-ingest") -> Corpus:
    directory = Path(corpus_dir) if corpus_dir is not None else DEFAULT_CORPUS_DIR
    if not directory.is_dir():
        raise FileNotFoundError(f"quantum-history corpus directory not found: {directory}")

    fetched_at = datetime.now(timezone.utc).isoformat()
    vocab = load_vocab()
    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []
    envelope_specs: list[tuple[str, str, int]] = []

    card_paths = sorted(p for p in directory.glob("T-*.md"))
    for path in card_paths:
        source, card_evidence, card_ground_truth, citation_count = _parse_card(path, vocab)
        sources[source.id] = source
        evidence.extend(card_evidence)
        ground_truth.extend(card_ground_truth)
        envelope_specs.append((source.id, str(path), citation_count))

    chapter_path = directory / "_CHAPTER.md"
    if chapter_path.is_file():
        chapter_source, chapter_evidence = _parse_chapter(chapter_path, vocab)
        sources[chapter_source.id] = chapter_source
        evidence.extend(chapter_evidence)
        envelope_specs.append((chapter_source.id, str(chapter_path), 0))

    _drop_dangling_stemma_parents(sources)

    provenance = [
        RetrievalEnvelope(
            retrieval_run_id=retrieval_run_id, doc_id=doc_id, source_path=source_path,
            fetched_at=fetched_at, fixture=True, citation_count=citation_count,
            lineage_count=len(sources[doc_id].stemma_parents),
        )
        for doc_id, source_path, citation_count in envelope_specs
    ]

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)

__all__ = ["ingest", "load_vocab", "DEFAULT_CORPUS_DIR"]
