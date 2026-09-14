"""Ingest `hte/data/younger-dryas/*.md` (47 open-metadata cards on the
Younger Dryas boundary, 12.9-11.7 ka BP, the impact-hypothesis debate)
into an `hte.corpus.Corpus`: the engine's first *contested-science*
campaign corpus, where the proponent and critic sides of a live scientific
dispute are both represented on purpose, rather than one settled
narrative (`hte.corpus.quantum_history`) or one curator's own graded
evidence set (`hte.corpus.literature`).

## Cards

One `.md` file per paper under `DEFAULT_CARDS_DIR`, named `<doi-slug>.md`
(`hte/data/younger-dryas/<slug>.md`), each carrying real, DOI-verified
metadata (title, authors, year, venue, an abstract or a metadata-only
note when Crossref carries none) plus a `doi_check` field recording the
Crossref API resolution check every card in this corpus was built
against (`docs/YOUNGER-DRYAS.md` "DOI verification"). `side` is one of
`proponent` (the impact hypothesis), `critic` (against it), `alternative`
(the meltwater-routing explanation and other non-impact triggers), or
`neutral` (ice-core/radiocarbon chronology papers neither side disputes).
`kind` is one of six `hte.evidence.EvidenceKind` values this domain's own
evidence takes a form of: `astronomical` (impact-marker
geochemistry: platinum, iridium, nanodiamonds, meltglass), `geological`
(ice-core and lake-sediment stratigraphy, the platinum/spherule
*terrestrial* record), `material` (archaeological: Clovis, Abu Hureyra,
black mats), `genetic` (ancient-DNA megafauna dating), `model_prior`
(AMOC/meltwater circulation modeling), and `textual` (a review or
synthesis argued in prose rather than reporting a primary measurement).
No card in this corpus reads as `linguistic`, `oral_tradition`, or
`iconographic`: none of those three evidence modalities has a form a
Younger Dryas boundary-geology paper could take, so this corpus's own
kind distribution covers the six kinds the domain offers
(`docs/YOUNGER-DRYAS.md`'s own kind-coverage table names the other three
and why each one is absent).

## Claims, slots, and stance

Unlike `hte.corpus.literature`, which infers ACTOR/ACTION/OBJECT/PLACE/
MECHANISM from a card's free prose by keyword lexicon, every claim in
this corpus is authored with its own slot values already attached: a
`claims:` list item is one compact record,
`"ACTOR=<id> | ACTION=<id> | OBJECT=<id> | PLACE=<id> | MECHANISM=<id> |
STANCE=positive|negative | INTERVAL_KA=<a>-<b> :: <claim text>"`,
`_parse_claim_line` below the only extraction step this module runs (no
lexicon, no LLM call). `STANCE=negative` marks a claim that denies or
downgrades another paper's finding (`hte.evidence.Stance.NEGATIVE`): a
rebuttal's own claim reads this way once linked, a field this module
scopes to the claim's own denial, never a graded verdict on the
underlying phenomenon.

`INTERVAL_KA=<a>-<b>` is the claim's own dated span in "ka" (kiloannum
before present, the `hte.timeline.ka_to_astronomical` convention this
whole package already uses for `tab:pilot-periods`'s Younger Dryas row);
`_claim_interval` converts it to an `Interval` on the astronomical-year
axis, ordering `(a, b)` by magnitude first (a claim naming the older,
larger-ka end first or last dates identically either way) and reading a
degenerate `a == b` span as `Uncertainty.point()`, any wider span as
`Uncertainty.uniform(start, end)` (`hte.corpus.sacred_history`'s own "no
invented precision" rule: a claim naming a one-point date is never read
as more, or less, precise than it states).

## Stemma: rebuttal and replication edges

Every card carries its own `rebuts:`/`replicates:` frontmatter lists,
each a list of other cards' slugs (filenames without `.md`) in this same
corpus: an explicit, curator-read edge, a different foundation from
`hte.corpus.literature`'s own surname-substring stemma detection (that
module's own documented "two Kuliks" false-positive gap this module
avoids by construction). `rebuts` means this card's own claims
dispute or contradict a named card's findings (LeCompte and colleagues
2012's own title, "Independent evaluation of conflicting microspherule
results," rebuts Surovell and colleagues 2009 by name); `replicates`
means this card's own findings corroborate, extend, or constructively
respond to a named card without contradicting it (Moore and colleagues
2017's own platinum-anomaly survey replicates Petaev and colleagues
2013's ice-core platinum spike in terrestrial sediment). Both edges fold
into `Source.stemma_parents` (`hte.belief.effective_count`'s stemma
discount reads that field regardless of which of the two produced it,
the same "correlated evidence between two sources" role
`hte.corpus.sacred_history`'s own mutual-pair reading gives an
undirected `shared_source` edge): a rebuttal and a replication both mean
two sources are not independent draws on the question, whichever
direction the correlation runs.

## Ground truth: corroboration, never a verdict

This corpus's own claims are, by design, still contested: whether a
cosmic impact happened is exactly the question the corpus's two sides
disagree on, so "ground truth" here can never mean "the impact
hypothesis is true" or "false" (`hte.corpus.sacred_history`'s own rule,
"the corpus stores the disagreement, never a verdict," applies here at
least as much as it does there). Two kinds of `GroundTruthEvent` this
module does emit, neither one a verdict on the causal debate:

1. **The boundary chronology itself.** The Younger Dryas onset (12.9 ka,
   `hte/data/periods-seed.json`'s own `younger-dryas-boundary` row)
   anchors to Rasmussen and colleagues 2006's own common ice-core
   stratigraphic timescale; the termination (11.7 ka) anchors to
   Steffensen and colleagues 2008's own direct dating of the transition's
   abruptness. Both sides of this corpus's own debate accept the ice-core
   chronology without dispute: no card here, proponent or critic, argues
   the chronology itself is wrong, only what caused the transition it
   dates.
2. **Cross-card corroboration** (`_corroborated_card_slugs`, this
   module's own analogue of `hte.corpus.literature`'s method 3): two or
   more cards, from independent first authors, naming the same
   `(mechanism, object)` reading, where **neither card is itself a
   rebuttal target** anywhere else in the corpus (no other card's own
   `rebuts:` list names it) qualify. Excluding a rebutted card is this
   module's own tightening past `hte.corpus.literature`'s original
   method 3, load-bearing here because this corpus is contested: without
   it, Kennett and colleagues 2009's nanodiamond
   claim and Firestone and colleagues 2007's founding claim would both
   read as "independently corroborated" ground truth despite each
   being the direct target of a later, unresolved rebuttal
   (Daulton and colleagues 2010, 2017; van Hoesel and colleagues 2014;
   Pinter and colleagues 2011) still standing in this same corpus.
   Surviving groups include the meltglass, platinum-anomaly, and
   AMOC-routing corroboration chains (`docs/YOUNGER-DRYAS.md`'s
   "Ground truth" table names every surviving group).

   **Known gap, carried over from `hte.corpus.literature`'s own
   documented one:** "independent first author" here is a first-author
   *surname* check, the same simple, false-positive-prone proxy
   `hte.corpus.literature`'s own "two Kuliks" gap already accepts rather
   than building a real co-authorship-network check to avoid. This
   corpus's own proponent-side authors overlap heavily (Bunch, Moore,
   Wittke, Kennett, and LeCompte are frequent co-authors of one
   another's papers): the meltglass corroboration group this rule
   credits (Bunch and colleagues 2012, Moore and colleagues 2020) passes
   the surname check while still drawing on a shared collaborator
   network, a corroboration this rule reads as more independent than a
   coauthorship-aware version would. A live run adding a real
   coauthorship graph to this check is `docs/YOUNGER-DRYAS.md`'s own
   first-listed next step.

## Tier

`T3` for the one card in this corpus shaped as a book chapter rather than
a refereed journal article (Boslough and colleagues 2013's own AGU
Geophysical Monograph Series chapter, `venue_type: "book-chapter"`); `T2`
for every other card, a refereed journal article, `venue_type:
"journal-article"` read straight off every DOI's own Crossref `type` field.
No card in this corpus reads as `T4`+: unlike `hte.corpus.literature`'s
one preprint or `hte.corpus.sacred_history`'s AI-scored correlations,
every card here is a refereed primary paper or refereed review, the
open-metadata search this corpus was built from (Crossref, OpenAlex)
turning up no preprint or non-refereed source worth including among the
47.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from ..concepts import Vocabulary, other_id
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval, Uncertainty, ka_to_astronomical
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

# `tools/hypothesis-engine/hte/corpus/younger_dryas.py` -> parents[1] is
# `hte/`, the same one-level-up-from-`corpus/` convention every other
# adapter's own `*_VOCAB_PATH` uses.
YOUNGER_DRYAS_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-seed-younger-dryas.json"
DEFAULT_CARDS_DIR = Path(__file__).resolve().parents[1] / "data" / "younger-dryas"

EVIDENCE_PROVENANCE_TAG = "younger-dryas"
RETRIEVAL_RUN_ID = "fixture-younger-dryas-ingest"

# This corpus's own two uncontested chronology anchors (module
# docstring, "Ground truth," item 1): Rasmussen and colleagues 2006's
# common NGRIP/GRIP stratigraphic timescale spans the onset within its
# own 14.8-7.9 kyr range; Steffensen and colleagues 2008's own
# deuterium-excess record dates the termination directly, at the same
# 1-to-3-year resolution its own claim states.
_YD_ONSET_ANCHOR_SLUG = "rasmussen-2006"
_YD_TERMINATION_ANCHOR_SLUG = "steffensen-2008"

# `hte/data/periods-seed.json`'s own `younger-dryas-boundary` row: "12.9
# to 11.7 ka BP, the Younger Dryas Impact Hypothesis window."
YOUNGER_DRYAS_ONSET_KA = 12.9
YOUNGER_DRYAS_TERMINATION_KA = 11.7


def load_vocab() -> Vocabulary:
    """The Younger Dryas seed vocabulary (`hte/data/vocab-seed-younger-
    dryas.json`): one consensus ACTOR (`meltwater-pulse`) plus the five
    non-consensus ACTORs this module's own top docstring and
    `docs/YOUNGER-DRYAS.md` name, four ACTIONs, fourteen OBJECTs, eight
    PLACEs, and seventeen MECHANISMs, five of them graded contested or
    fringe to match their own ACTOR (a claim's `cosmic-airburst`
    MECHANISM reads at the same contested grade as its own `cosmic-
    impact` ACTOR, so `hte.unknowns.prior_profiles`'s skeptic/fringe
    shift moves both together rather than only the ACTOR slot)."""
    return Vocabulary.load(YOUNGER_DRYAS_VOCAB_PATH)


# --------------------------------------------------------------------------
# Card: the lossless parse of one card file
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Claim:
    """One `claims:` list item, already carrying its own slot values (this
    module's own top docstring, "Claims, slots, and stance"): no lexicon
    or LLM call resolves them the way `hte.corpus.literature`'s four
    classifiers do."""
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
    """One Younger Dryas card, parsed losslessly from its own frontmatter
    and file location; `_build_corpus` below is the lossy projection onto
    `hte.corpus.Corpus`."""
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

    @property
    def first_author_surname(self) -> str:
        """The text before the first comma in this card's own first-listed
        author (`"Firestone, R. B."` -> `"Firestone"`), the same simple
        proxy `hte.corpus.literature.Card.first_author_surname` uses, and
        the same "two same-surname authors are read as one" known gap
        this module's own top docstring documents under "Ground truth."""
        first = self.authors[0] if self.authors else ""
        return first.split(",", 1)[0].strip()


# --------------------------------------------------------------------------
# frontmatter parsing (no general YAML parser, `hte.corpus.literature`'s
# own zero-dependency stance: this module's own independent copy of the
# same three scalar/list/block-scalar shapes, plus `_parse_claim_line`
# below for the one shape literature's own cards never carry, a
# structured claim record packed into a single quoted list item)
# --------------------------------------------------------------------------

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
    """`(1-based line number, char offset of this line's own first
    character, line text including its own trailing newline)` for every
    line in `raw`."""
    out: list[tuple[int, int, str]] = []
    cursor = 0
    for lineno, line in enumerate(raw.splitlines(keepends=True), start=1):
        out.append((lineno, cursor, line))
        cursor += len(line)
    return out


def _split_frontmatter_fields(fm_lines: list[tuple[int, int, str]]) -> list[tuple[str, list[tuple[int, int, str]]]]:
    """Group frontmatter lines into `(key, [its own lines])` chunks: a
    line with no leading whitespace opens a new field; every line
    starting with whitespace, or a blank line, belongs to the field
    before it."""
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
    """`"12.9-12.9"` -> a degenerate `Uncertainty.point()` interval;
    `"14.7-11.7"` -> a `Uncertainty.uniform()` span, the two ka values
    ordered by magnitude first (the larger, older ka end always becomes
    `Interval.start`'s astronomical year, the smaller, younger ka end
    `Interval.end`'s, since a larger ka-before-present value is an
    *earlier*, more negative astronomical year); `"none"` -> `None`."""
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
    """`raw_content` is the still-escaped text between a `claims:` list
    item's own quotes (`_LIST_ITEM_RE` group 1, matched before
    `_unescape`); `content_offset` is that content's own file-relative
    char offset. `EvidenceSpan`'s own field-level grounding contract
    (`hte.evidence.EvidenceSpan`'s own docstring) locates the claim's own
    prose alone, the free text past the `ACTOR=... | ... ::` slot
    header, so this function reads `_CLAIM_LINE_RE`'s own `text` group's
    own position inside `raw_content` before unescaping (`m.span("text")`,
    matching `hte.corpus.literature._parse_claims`'s own "match, then
    unescape" order) and returns a char range spanning only that group."""
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
    # Every offset/line-number below is relative to `fm_text`, sliced past
    # the opening `"---\n"` line; shift by that line's own length (4
    # chars) and one line, so `Claim.char_start`/`char_end`/`line_start`/
    # `line_end` all land on `raw`, the file's own full text.
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
    )


# --------------------------------------------------------------------------
# load_raw / load
# --------------------------------------------------------------------------


def load_raw(cards_dir: str | Path | None = None) -> list[Card]:
    """Every card under `cards_dir` (default `DEFAULT_CARDS_DIR`), parsed
    losslessly, sorted by filename for a deterministic build order.
    Raises `FileNotFoundError` for a missing directory: `Path.glob` on a
    directory that does not exist silently yields nothing rather than
    raising, the same "read the wrong thing quietly" failure mode `hte.
    corpus.sacred_history.ingest`'s own explicit-file-read check exists
    to close off for its own corpus."""
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
    # This module's own top docstring, "Tier": every card is a refereed
    # journal article (`T2`) except the one AGU Geophysical Monograph
    # Series chapter (`T3`), both read straight off Crossref's own `type`.
    "journal-article": Tier.T2,
    "book-chapter": Tier.T3,
}


def _corroborated_card_slugs(cards: list[Card]) -> set[str]:
    """Slugs of every card contributing to a qualifying cross-card
    corroboration group (this module's own top docstring, "Ground
    truth," item 2): two or more cards, from independent first authors,
    name the same `(mechanism, object)` reading, and none of the
    contributing cards is itself a rebuttal target elsewhere in the
    corpus. Mirrors `hte.corpus.literature._corroborated_dois`'s own
    flat-set shape: one `GroundTruthEvent` per member card
    (`_build_corpus` below) rather than one merged event per group, so
    `hte.calibrate.run_holdout`'s own `ev_by_id.get(g.id)` lookup always
    resolves to a real, slot-carrying evidence item (`docs/YOUNGER-
    DRYAS.md`'s own "Ground truth" section names why this matters: an
    event id with no matching evidence item id holds out nothing a
    discovery-date holdout could ever cover)."""
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
        sources[card.doi] = Source(id=card.doi, kind=EvidenceKind(card.kind), date=str(card.year), stemma_parents=stemma_parents)
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
                ),
                provenance=EVIDENCE_PROVENANCE_TAG,
                actor=claim.actor, action=claim.action, object=claim.object, place=claim.place,
                mechanism=claim.mechanism, interval=claim.interval, stance=claim.stance,
            ))
            if card.slug not in first_item_id:
                first_item_id[card.slug] = item_id

    # `GroundTruthEvent.id` must name a real `EvidenceItem.id`: `hte.
    # calibrate.run_holdout`'s own `ev_by_id.get(g.id)` lookup is how a
    # held-out event's own slots and interval are read back for scoring
    # (`hte.corpus.literature`'s own `id=first_item_id` convention, this
    # module's own top docstring, "Ground truth," explains why).
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
        # A chronology anchor (Rasmussen 2006, Steffensen 2008) that also
        # sits in a corroboration group would otherwise seed a second,
        # duplicate-id `GroundTruthEvent` naming the same evidence item.
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
    """Zero-arg registration shape (`hte/cli.py`, `hte/runner.py`):
    parse every card under `cards_dir` (default `DEFAULT_CARDS_DIR`, the
    47 shipped cards, no network fetch, unlike `hte.corpus.literature`'s
    GitHub-backed `load`) and project them onto one `Corpus`."""
    return _build_corpus(load_raw(cards_dir))
