from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from ..concepts import Vocabulary
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval, Uncertainty, ka_to_astronomical
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

YOUNGER_DRYAS_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-seed-younger-dryas.json"
DEFAULT_CARDS_DIR = Path(__file__).resolve().parents[1] / "data" / "younger-dryas"

EVIDENCE_PROVENANCE_TAG = "younger-dryas"
RETRIEVAL_RUN_ID = "fixture-younger-dryas-ingest"

_YD_ONSET_ANCHOR_SLUG = "rasmussen-2006"
_YD_TERMINATION_ANCHOR_SLUG = "steffensen-2008"

YOUNGER_DRYAS_ONSET_KA = 12.9
YOUNGER_DRYAS_TERMINATION_KA = 11.7

def load_vocab() -> Vocabulary:
    return Vocabulary.load(YOUNGER_DRYAS_VOCAB_PATH)

@dataclass(frozen=True)
class Claim:
    text: str
    actor: str
    action: str
    object: str
    place: str
    mechanism: str
    stance: Stance
    interval: Interval | None
    line_start: int
    line_end: int
    char_start: int
    char_end: int

@dataclass(frozen=True)
class Card:
    doi: str
    slug: str
    title: str
    authors: tuple[str, ...]
    year: int
    venue: str
    venue_type: str
    side: str
    kind: str
    cited_by_count: int
    doi_check: str
    rebuts: tuple[str, ...]
    replicates: tuple[str, ...]
    abstract: str
    claims: tuple[Claim, ...]
    relative_path: str
    doc_length: int | None = None

    @property
    def first_author_surname(self) -> str:
        first = self.authors[0] if self.authors else ""
        return first.split(",", 1)[0].strip()

_QUOTED_SCALAR_RE = re.compile(r'^(\w+):\s*"(.*)"\s*$')
_BARE_SCALAR_RE = re.compile(r'^(\w+):\s*(\S+)\s*$')
_LIST_ITEM_RE = re.compile(r'^  - "(.*)"\s*$')

_CLAIM_LINE_RE = re.compile(
    r"^ACTOR=(?P<actor>[\w-]+) \| ACTION=(?P<action>[\w-]+) \| OBJECT=(?P<object>[\w-]+) \| "
    r"PLACE=(?P<place>[\w-]+) \| MECHANISM=(?P<mechanism>[\w-]+) \| STANCE=(?P<stance>positive|negative) \| "
    r"INTERVAL_KA=(?P<interval>none|[\d.]+-[\d.]+) :: (?P<text>.*)$"
)

def _unescape(text: str) -> str:
    return text.replace('\\"', '"').replace("\\\\", "\\")

def _iter_lines_with_offsets(raw: str) -> list[tuple[int, int, str]]:
    out: list[tuple[int, int, str]] = []
    cursor = 0
    for lineno, line in enumerate(raw.splitlines(keepends=True), start=1):
        out.append((lineno, cursor, line))
        cursor += len(line)
    return out

def _split_frontmatter_fields(fm_lines: list[tuple[int, int, str]]) -> list[tuple[str, list[tuple[int, int, str]]]]:
    fields: list[tuple[str, list[tuple[int, int, str]]]] = []
    current_key: str | None = None
    current_lines: list[tuple[int, int, str]] = []
    for lineno, offset, line in fm_lines:
        stripped = line.rstrip("\n")
        if stripped == "":
            if current_key is not None:
                current_lines.append((lineno, offset, line))
            continue
        if not line[0].isspace():
            if current_key is not None:
                fields.append((current_key, current_lines))
            m = re.match(r"^(\w+):", line)
            if m is None:
                raise ValueError(f"younger-dryas adapter: unparseable frontmatter line {lineno}: {line!r}")
            current_key = m.group(1)
            current_lines = [(lineno, offset, line)]
        else:
            current_lines.append((lineno, offset, line))
    if current_key is not None:
        fields.append((current_key, current_lines))
    return fields

def _parse_scalar(field_lines: list[tuple[int, int, str]]) -> str:
    _, _, first_line = field_lines[0]
    m = _QUOTED_SCALAR_RE.match(first_line.rstrip("\n"))
    if m is not None:
        return _unescape(m.group(2))
    m = _BARE_SCALAR_RE.match(first_line.rstrip("\n"))
    if m is not None:
        return m.group(2)
    raise ValueError(f"younger-dryas adapter: unparseable scalar field: {first_line!r}")

def _parse_list(field_lines: list[tuple[int, int, str]]) -> list[str]:
    items: list[str] = []
    for _, _, line in field_lines[1:]:
        m = _LIST_ITEM_RE.match(line.rstrip("\n"))
        if m is not None:
            items.append(_unescape(m.group(1)))
    return items

def _parse_block_scalar(field_lines: list[tuple[int, int, str]]) -> str:
    parts = [line.strip() for _, _, line in field_lines[1:] if line.strip()]
    return " ".join(parts)

def _claim_interval(spec: str) -> Interval | None:
    if spec == "none":
        return None
    a_str, b_str = spec.split("-")
    a_ka, b_ka = float(a_str), float(b_str)
    older_ka, younger_ka = max(a_ka, b_ka), min(a_ka, b_ka)
    start = round(ka_to_astronomical(older_ka))
    end = round(ka_to_astronomical(younger_ka))
    uncertainty = Uncertainty.point() if start == end else Uncertainty.uniform(start, end)
    return Interval(start=start, end=end, uncertainty=uncertainty)

def _parse_claim_line(raw_content: str, lineno: int, content_offset: int) -> Claim:
    m = _CLAIM_LINE_RE.match(raw_content)
    if m is None:
        raise ValueError(f"younger-dryas adapter: unparseable claim line {lineno}: {raw_content!r}")
    text_start, text_end = m.span("text")
    char_start = content_offset + text_start
    char_end = content_offset + text_end
    return Claim(
        text=_unescape(m.group("text")), actor=m.group("actor"), action=m.group("action"), object=m.group("object"),
        place=m.group("place"), mechanism=m.group("mechanism"),
        stance=Stance.POSITIVE if m.group("stance") == "positive" else Stance.NEGATIVE,
        interval=_claim_interval(m.group("interval")),
        line_start=lineno, line_end=lineno, char_start=char_start, char_end=char_end,
    )

def _parse_frontmatter(raw: str, relative_path: str, slug: str) -> Card:
    if not raw.startswith("---\n"):
        raise ValueError(f"younger-dryas adapter: {relative_path} has no frontmatter opening `---`")
    end = raw.find("\n---\n", 4)
    if end < 0:
        raise ValueError(f"younger-dryas adapter: {relative_path} has no frontmatter closing `---`")
    fm_text = raw[4:end]
    fm_lines = _iter_lines_with_offsets(fm_text)
    fm_lines = [(lineno + 1, offset + 4, line) for lineno, offset, line in fm_lines]
    fields = dict(_split_frontmatter_fields(fm_lines))

    try:
        doi = _parse_scalar(fields["doi"])
        title = _parse_scalar(fields["title"])
        authors = tuple(_parse_list(fields["authors"]))
        year = int(_parse_scalar(fields["year"]))
        venue = _parse_scalar(fields["venue"])
        venue_type = _parse_scalar(fields["venue_type"])
        side = _parse_scalar(fields["side"])
        kind = _parse_scalar(fields["kind"])
        cited_by_count = int(_parse_scalar(fields["cited_by_count"]))
        doi_check = _parse_scalar(fields["doi_check"])
        rebuts = tuple(_parse_list(fields["rebuts"])) if "rebuts" in fields else ()
        replicates = tuple(_parse_list(fields["replicates"])) if "replicates" in fields else ()
        abstract = _parse_block_scalar(fields["abstract"])
        claim_lines = fields["claims"][1:]
    except KeyError as exc:
        raise ValueError(f"younger-dryas adapter: {relative_path} is missing required field {exc}") from exc

    claims: list[Claim] = []
    for lineno, offset, line in claim_lines:
        m = _LIST_ITEM_RE.match(line.rstrip("\n"))
        if m is None:
            continue
        raw_content = m.group(1)
        content_offset = offset + m.start(1)
        claims.append(_parse_claim_line(raw_content, lineno, content_offset))

    return Card(
        doi=doi, slug=slug, title=title, authors=authors, year=year, venue=venue, venue_type=venue_type,
        side=side, kind=kind, cited_by_count=cited_by_count, doi_check=doi_check, rebuts=rebuts,
        replicates=replicates, abstract=abstract, claims=tuple(claims), relative_path=relative_path,
        doc_length=len(raw),
    )

def load_raw(cards_dir: str | Path | None = None) -> list[Card]:
    directory = Path(cards_dir) if cards_dir is not None else DEFAULT_CARDS_DIR
    if not directory.is_dir():
        raise FileNotFoundError(f"younger-dryas adapter: no such cards directory: {directory}")
    cards: list[Card] = []
    for path in sorted(directory.glob("*.md")):
        raw = path.read_text()
        slug = path.stem
        cards.append(_parse_frontmatter(raw, str(path.relative_to(directory.parent.parent)), slug))
    return cards

_TIER_BY_VENUE_TYPE: dict[str, Tier] = {
    "journal-article": Tier.T2,
    "book-chapter": Tier.T3,
}

def _corroborated_card_slugs(cards: list[Card]) -> set[str]:
    rebutted_slugs = {slug for card in cards for slug in card.rebuts}
    groups: dict[tuple[str, str], set[str]] = {}
    for card in cards:
        if card.slug in rebutted_slugs:
            continue
        for claim in card.claims:
            groups.setdefault((claim.mechanism, claim.object), set()).add(card.slug)
    by_slug = {c.slug: c for c in cards}
    qualifying: set[str] = set()
    for slugs in groups.values():
        surnames = {by_slug[s].first_author_surname for s in slugs}
        if len(surnames) >= 2:
            qualifying |= slugs
    return qualifying

def _build_corpus(cards: list[Card]) -> Corpus:
    sources: dict[str, Source] = {}
    evidence: list[EvidenceItem] = []
    provenance: list[RetrievalEnvelope] = []
    slug_to_doi = {card.slug: card.doi for card in cards}
    by_slug = {card.slug: card for card in cards}
    first_item_id: dict[str, str] = {}
    fetched_at = "2026-09-11T00:00:00Z"

    for card in cards:
        stemma_parents = sorted({slug_to_doi[s] for s in (*card.rebuts, *card.replicates) if s in slug_to_doi})
        sources[card.doi] = Source(
            id=card.doi, kind=EvidenceKind(card.kind), date=str(card.year), stemma_parents=stemma_parents,
            authors=list(card.authors),
        )
        provenance.append(RetrievalEnvelope(
            retrieval_run_id=RETRIEVAL_RUN_ID, doc_id=card.doi, source_path=card.relative_path,
            fetched_at=fetched_at, fixture=True, citation_count=card.cited_by_count, lineage_count=len(stemma_parents),
        ))
        tier = _TIER_BY_VENUE_TYPE.get(card.venue_type, Tier.T2)
        for i, claim in enumerate(card.claims):
            item_id = f"{card.slug}-c{i}"
            evidence.append(EvidenceItem(
                id=item_id, kind=EvidenceKind(card.kind), tier=tier, source_id=card.doi,
                span=EvidenceSpan(
                    doc_id=card.doi, locator=f"{card.slug}.md:claims[{i}] (line {claim.line_start})",
                    quote=claim.text, char_start=claim.char_start, char_end=claim.char_end,
                    doc_length=card.doc_length,
                ),
                provenance=EVIDENCE_PROVENANCE_TAG,
                actor=claim.actor, action=claim.action, object=claim.object, place=claim.place,
                mechanism=claim.mechanism, interval=claim.interval, stance=claim.stance,
            ))
            if card.slug not in first_item_id:
                first_item_id[card.slug] = item_id

    ground_truth: list[GroundTruthEvent] = []
    for anchor_slug, ka in (
        (_YD_ONSET_ANCHOR_SLUG, YOUNGER_DRYAS_ONSET_KA),
        (_YD_TERMINATION_ANCHOR_SLUG, YOUNGER_DRYAS_TERMINATION_KA),
    ):
        anchor = by_slug.get(anchor_slug)
        if anchor is None or anchor.slug not in first_item_id:
            continue
        ground_truth.append(GroundTruthEvent(
            id=first_item_id[anchor.slug], label=_truncate(anchor.title), year=round(ka_to_astronomical(ka)),
            doc_id=anchor.doi, discovery_year=anchor.year,
        ))

    seen_ids = {g.id for g in ground_truth}
    for slug in sorted(_corroborated_card_slugs(cards)):
        if first_item_id[slug] in seen_ids:
            continue
        card = by_slug[slug]
        claim = card.claims[0]
        year = claim.interval.start if claim.interval is not None else round(ka_to_astronomical(YOUNGER_DRYAS_ONSET_KA))
        ground_truth.append(GroundTruthEvent(
            id=first_item_id[slug], label=_truncate(card.title), year=year,
            doc_id=card.doi, discovery_year=card.year,
        ))

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=load_vocab())

def _truncate(text: str, limit: int = 80) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"

def load(cards_dir: str | Path | None = None) -> Corpus:
    return _build_corpus(load_raw(cards_dir))
