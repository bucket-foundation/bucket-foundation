"""Ingest `quantum/07-history/*.md` into an `hte.corpus.Corpus`.

That chapter is this repo's own quantum-computing history atlas: 15 `T-*.md`
milestone cards plus one `_CHAPTER.md` narrative, each card carrying a
`## Milestone timeline` list (a dated event, its actor, its significance,
and a `T1`-`T6` tier citation) and a `## Key graded claims` list (an
undated claim at its own tier) in the exact same evidence-schema style
`main.tex` and this package's own `hte.evidence` module use. That
structure is parsed directly by the regular expressions below; no LLM call
reads this corpus, since the card format already states kind-adjacent tier
and citation data no extraction pass would improve on.

Every card's own `date` in `## Milestone timeline` doubles as both the
event's year and, per this module's own documented simplification, the
year its evidence entered the written record (`GroundTruthEvent.
discovery_year` in `hte.corpus`): the card format states an event's year
and its citation's publication year in the same bullet, and the two
coincide in every card this ingestion reads.

No network call is made anywhere in this module (`bkt-hte-retrieval-
provenance`, fixture mode only): every `RetrievalEnvelope` this function
writes carries `fixture=True`, timestamped at ingestion time rather than
at any fetch time, since there was no fetch.

Every parsed bullet also gets a best-effort slot extraction
(`bkt-hte-evidence-slots`, `_extract_slots` below): a bullet's own free
text is scored against every concept label already in the quantum-
history vocabulary by word-overlap, no LLM call and no network access,
matching this module's own "no extraction pass would improve on reading
the card's structure directly" for the fields the card format states
outright. Slot extraction is a different question from those fields: a
milestone bullet states its own date and tier directly, but names its
actor, mechanism, and the rest only in prose, so this is where reading
that prose earns its keep. `hte.link.link_evidence` is the reader.
"""
from __future__ import annotations

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

DEFAULT_CORPUS_DIR = Path(__file__).resolve().parents[4] / "quantum" / "07-history"
QUANTUM_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-seed-quantum-history.json"

_TITLE_RE = re.compile(r"^#\s*(?P<title>.+?)\s*·\s*(?P<doc_id>[\w-]+)\s*$")
_YEAR_RE = re.compile(r"(?<!\d)(1[6-9]\d{2}|20\d{2})(?!\d)")
_TIER_RE = re.compile(r"\bT([1-6])\b")
_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
_BULLET_RE = re.compile(r"^-\s+(.+)$")
_CROSS_REF_RE = re.compile(r"\bT-[a-z0-9]+\b")
_WORD_RE = re.compile(r"[a-z0-9]+")

# Stopwords excluded from the word-overlap match below: generic enough
# (an article, a conjunction, a preposition) that sharing one with a
# vocabulary label says nothing about whether a bullet names that
# concept. `"quantum"` joins this list for a domain-specific reason
# rather than a grammatical one: this corpus is a history of quantum
# physics, so nearly every bullet contains the word, and a short label
# built from it (`"IBM Quantum"`, two content words) cleared
# `_SLOT_MATCH_MIN_SCORE` against bullets naming Yuri Manin, Wootters
# and Zurek, and other actors with no connection to IBM at all, purely
# because both the bullet and the label say "quantum" (confirmed empirically:
# `_best_concept_match` was attaching `ibm-quantum` to more than a
# third of this corpus's pre-1993 milestone bullets before this fix).
# A word this common across both a corpus's own bullets and its own
# vocabulary labels carries the same zero discriminative signal a
# grammatical stopword does, for this corpus's own domain.
_STOPWORDS = frozenset({
    "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for",
    "with", "by", "its", "is", "was", "are", "were", "be", "as", "that",
    "quantum",
})

# The word-overlap fraction (of a label's own content words found in the
# bullet) a slot match needs to clear. Set low enough that a bullet
# naming only one of a joint actor's names ("Heisenberg" alone, for
# "Heisenberg and Schrödinger") still matches, high enough that sharing
# one incidental word does not.
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
    """The concept in `slot` whose own label shares the largest fraction
    of its content words with `bullet_words`, at or above
    `_SLOT_MATCH_MIN_SCORE`; `None` when no concept clears it. `OTHER` is
    never a candidate: this keeps an unmatched slot read as "not
    asserted" (`hte.evidence.EvidenceItem`'s own docstring) rather than
    as an explicit open-world claim."""
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
    """The dated span `text` names: the min and max of every year it
    mentions (a lone year reads as a point interval; a range like
    "1980-1994" or "1980s-1990s" reads as spanning both ends), or `None`
    when it names no year at all."""
    years = [int(y) for y in _YEAR_RE.findall(text)]
    if not years:
        return None
    return Interval(start=min(years), end=max(years))


def _infer_stance(text: str) -> Stance:
    """`NEGATIVE` when `text` contains one of this module's own negation
    cues (a downgrade, a dispute, a failed confirmation); `POSITIVE`
    otherwise. A milestone or claim bullet is a positive assertion by
    default; the corpus's own "Key graded claims" status field
    ("contested", "unconfirmed", ...) and its downgrade-style milestone
    prose are the two places this reads as denying rather than
    asserting its own slot values."""
    lowered = _normalize_text(text)
    return Stance.NEGATIVE if any(cue in lowered for cue in _NEGATION_CUES) else Stance.POSITIVE


def _extract_slots(text: str, vocab: Vocabulary) -> dict[str, object]:
    """Best-effort `actor`/`action`/`object`/`place`/`mechanism`/
    `interval`/`stance` for one bullet's own text (`bkt-hte-evidence-
    slots`), read by `EvidenceItem(**_extract_slots(...))`. Each concept
    slot is `None` when nothing in `vocab` clears `_best_concept_match`'s
    own threshold against this text; `hte.link.link_evidence` reads a
    `None` slot as unasserted rather than as a claim of `OTHER`."""
    words = _words(text)
    slots = {slot.value: _best_concept_match(words, vocab, slot) for slot in PLACEMENT_CONCEPT_SLOTS}
    slots["interval"] = _extract_interval(text)
    slots["stance"] = _infer_stance(text)
    return slots


def _split_sections(text: str) -> dict[str, list[str]]:
    """`{heading -> [line, ...]}` for every `## heading` block in `text`."""
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
    """One `T-*.md` card into its `Source`, the evidence items its two
    bulleted sections carry, the ground-truth events its milestone bullets
    carry, and a citation count (the `## Sources` section's own bullet
    count) for that card's `RetrievalEnvelope`. `vocab` is the vocabulary
    each bullet's own slot extraction (`_extract_slots`) is read against."""
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
            span=EvidenceSpan(doc_id=doc_id, locator=f"milestone-timeline:{i}", quote=bullet, char_start=start, char_end=end),
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
            span=EvidenceSpan(doc_id=doc_id, locator=f"key-graded-claims:{i}", quote=bullet, char_start=start, char_end=end),
            provenance="quantum-history-card-claim",
            **_extract_slots(bullet, vocab),
        ))

    return source, evidence, ground_truth, len(_bullets(sources_lines))


_BLOCKQUOTE_BULLET_RE = re.compile(r"^>\s*-\s+(.+)$")


def _parse_chapter(path: Path, vocab: Vocabulary) -> tuple[Source, list[EvidenceItem]]:
    """`_CHAPTER.md`'s own `> **Key takeaways**` blockquote bullets, the
    one place the narrative chapter states graded-feeling claims as a
    bulleted list rather than as flowing prose. Tiered at `T3`
    (chapter-level synthesis, no per-claim tier of its own) since the
    chapter names no tier explicitly."""
    raw = path.read_text()
    doc_id = "_CHAPTER"
    bullets = [m.group(1).strip() for m in (_BLOCKQUOTE_BULLET_RE.match(line) for line in raw.splitlines()) if m]
    evidence = []
    for i, bullet in enumerate(bullets):
        start, end = _locate(raw, bullet)
        evidence.append(EvidenceItem(
            id=f"{doc_id}-takeaway-{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id=doc_id,
            span=EvidenceSpan(doc_id=doc_id, locator=f"key-takeaways:{i}", quote=bullet, char_start=start, char_end=end),
            provenance="quantum-history-chapter-takeaway",
            **_extract_slots(bullet, vocab),
        ))
    return Source(id=doc_id, kind=EvidenceKind.TEXTUAL, date=None, stemma_parents=[]), evidence


def load_vocab() -> Vocabulary:
    """The quantum-history seed vocabulary (`hte/data/vocab-seed-quantum-
    history.json`), a domain-matched counterpart to `hte.concepts.
    load_seed_vocabulary`'s ancient-history vocabulary: this corpus's
    actors are physicists and labs, so it needs its own slot vocabulary
    rather than reusing the shipped default's Neolithic farmers."""
    return Vocabulary.load(QUANTUM_VOCAB_PATH)


def ingest(corpus_dir: str | Path | None = None, *, retrieval_run_id: str = "fixture-quantum-history-ingest") -> Corpus:
    """Parse every `T-*.md` card and `_CHAPTER.md` under `corpus_dir`
    (default `DEFAULT_CORPUS_DIR`) into a `Corpus`: one `Source` per file,
    one `EvidenceItem` per milestone or claim bullet, one `GroundTruthEvent`
    per dated milestone bullet, and one fixture `RetrievalEnvelope` per
    file. Raises `FileNotFoundError` if `corpus_dir` does not exist, rather
    than returning a silently empty corpus."""
    directory = Path(corpus_dir) if corpus_dir is not None else DEFAULT_CORPUS_DIR
    if not directory.is_dir():
        raise FileNotFoundError(f"quantum-history corpus directory not found: {directory}")

    fetched_at = datetime.now(timezone.utc).isoformat()
    vocab = load_vocab()
    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []
    provenance: list[RetrievalEnvelope] = []

    card_paths = sorted(p for p in directory.glob("T-*.md"))
    for path in card_paths:
        source, card_evidence, card_ground_truth, citation_count = _parse_card(path, vocab)
        sources[source.id] = source
        evidence.extend(card_evidence)
        ground_truth.extend(card_ground_truth)
        provenance.append(RetrievalEnvelope(
            retrieval_run_id=retrieval_run_id, doc_id=source.id, source_path=str(path),
            fetched_at=fetched_at, fixture=True, citation_count=citation_count,
            lineage_count=len(source.stemma_parents),
        ))

    chapter_path = directory / "_CHAPTER.md"
    if chapter_path.is_file():
        chapter_source, chapter_evidence = _parse_chapter(chapter_path, vocab)
        sources[chapter_source.id] = chapter_source
        evidence.extend(chapter_evidence)
        provenance.append(RetrievalEnvelope(
            retrieval_run_id=retrieval_run_id, doc_id=chapter_source.id, source_path=str(chapter_path),
            fetched_at=fetched_at, fixture=True, citation_count=0, lineage_count=0,
        ))

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)


__all__ = ["ingest", "load_vocab", "DEFAULT_CORPUS_DIR"]
