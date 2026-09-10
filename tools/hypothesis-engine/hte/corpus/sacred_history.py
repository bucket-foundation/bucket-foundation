"""Ingest `src/data/sacred-history.json` (this repo's own compiled
cross-tradition figure, correlation, and timeline export, built by
`_intake/sacred-history-corpus/tools/build-entity-graph.py`) into an
`hte.corpus.Corpus`, the first *build-history* corpus: a cross-tradition
record of figures, sacred-timeline events, and AI-scored correlation
claims between them, rather than one chapter's own prose the way
`hte.corpus.quantum_history` reads.

`src/data/sacred-history.json` is a compiled bundle, a smaller shape than
the full file-per-node tree `_intake/sacred-history-corpus/spec/
TAXONOMY.md` describes (`traditions/<id>/texts/<id>/...`): as of
2026-09-10 it carries
only `traditions` (13 tradition ids, no per-tradition object), `figures`
(22 figure nodes), `correlations` (49 AI-branch-analysis cross-tradition
claims), and `timeline` (21 dated sacred-history events). No `text`,
`witness`, `translation`, or `lineage` node exists in this export yet, so
this module's own `Source`/`EvidenceItem`/`GroundTruthEvent` mapping
below reads what the bundle carries rather than the full spec.

## Sources

One `Source` per tradition (13), keyed by the tradition's own id
(`"judaism"`, `"hinduism"`, ...). `Source.date` is the earliest year any
`timeline` event names for that tradition, `None` for a tradition this
bundle's own timeline never dates (`"greek"`, `"mesopotamian"`, both
correlation-only traditions with no founding, council, or life-event
entry as of 2026-09-10).

## Stemma

`src/data/sacred-history.json` carries no `derives_from` or
`transmission` field (`ENTITY-MODEL.md`'s `lineage` node type, the place
such an edge would live, is not populated in this export). This module's
own reading of "a transmission edge" is inferred instead from the
correlation graph itself: for a correlation whose two sides sit in
traditions with two different, both-known earliest-attested years
(`Source.date` above), the later tradition's `Source` lists the earlier
one as a `stemma_parents` entry, standing in for a hypothesized
transmission or shared-antecedent reading. This is inference from dating
asymmetry, never a verdict (`ENTITY-MODEL.md`'s own "the corpus stores
the disagreement, never a verdict" rule): `hte.belief.pooled_weight`'s
stemma discount reads the edge as correlated evidence between the two
traditions, the same role a real `derives_from` edge would play, without
this module asserting which tradition transmitted to which.

## Evidence items

One `EvidenceItem` per correlation (49), id = the correlation's own id
(already unique, `"clm-corr-figure-mapping-8d76c0b84f"`-style). Kind
`TEXTUAL` (a scored comparison over two figures' own textual/Wikidata
descriptions; `hte.corpus.literature`'s own `MODEL_PRIOR` reading stays
reserved for a pooled statistical estimate instead); tier `T4` ("modern
synthesis": an
AI-branch-analysis correlation candidate, the corpus's own least-reliable
rung by this module's reading of the tier ladder, distinct from a
`T2` primary-text or `T3` later-commentary source, neither of which this
bundle's compiled `correlations[]` carries yet). `views["blended_a"]`
carries the correlation's own `confidence` field verbatim: `_intake/
sacred-history-corpus/tools/build-entity-graph.py`'s own formula,
`min(0.99, 0.40*cos + 0.25*(fuzzy/100) + 0.10*len(motif_overlap))`, is
already `main.tex` §Belief model's `e_i_blended_A` formula (the paper's
own `0.40 cos + 0.25 fuz + 0.10 motif`, `hte.belief.edge_strength`'s own
documented reading), so this module carries it through as evidence
weight `e_i` rather than recomputing it, and never reads it as a
probability of truth (`ENTITY-MODEL.md` claim invariant 3, "`confidence`
!= truth. It is the corpus's weight of cited support").

Slots, read from the entity model (`ENTITY-MODEL.md` §5-6):

- **ACTOR** = the correlation's `sideA.node` (a figure id).
- **ACTION** = the correlation's own `kind`/`correlation_kind` (the
  claim's predicate: `"figure-mapping"` -> `maps-to`, `"motif-parallel"`
  -> `parallels`, `"structural"` -> `structurally-echoes`, and four more
  from `ENTITY-MODEL.md` §6's own enum carried for forward compatibility,
  `_ACTION_BY_KIND` below).
- **OBJECT** = the correlation's `sideB.node` (the other figure id).
- **PLACE** = the correlation's `sideA.tradition` (a tradition standing
  in for place/context, this corpus's own closest analog to a population
  or setting, the same reading `hte.corpus.literature`'s own `_PLACE_
  LEXICON` gives a study's population).
- **MECHANISM** = the correlation's own `provenance.method`, when it
  resolves to a known vocabulary concept (`"entity-graph-resolver"` for
  every correlation this bundle ships as of 2026-09-10); `OTHER`
  otherwise, per this task's own "MECHANISM = OTHER unless named" rule.
- **interval**, from the correlation's own two tradition dates (`Source.
  date` above): both known gives a `UNIFORM`-uncertainty interval
  spanning the earlier to the later; exactly one known gives a `POINT`
  interval at that one year; neither known leaves `interval=None` (an
  undated correlation between two traditions this bundle's own timeline
  never dates, `"greek"`/`"mesopotamian"` as of 2026-09-10) rather than
  a fabricated date, `hte.link.link_evidence` still matching it by slot
  alone.

Every correlation's own non-empty `counterConsiderations` (a caveat
against the correlation, `ENTITY-MODEL.md`'s free-text field, distinct
from the spec's `counter_claims[]` list of opposing claim ids, which this
bundle's compiled `correlations[]` does not carry) becomes one additional
`EvidenceItem` per caveat, same slots, `stance=NEGATIVE`, so `hte.link.
link_evidence`'s existing "a full slot match under a NEGATIVE stance
refutes" reading turns it into a `refutes` edge on the correlation's own
address, this module's own reading of "counter-claims as refutes" against
what this bundle's own field carries.

## Ground truth

A `timeline` event becomes one `GroundTruthEvent` when its own `disputed`
field reads `False` (11 of 21 as of 2026-09-10): "claims marked
accepted," this bundle's own closest field to that reading, since no
timeline event carries a `stance`/`status` field of its own. A
correlation additionally qualifies when its own `evidence[]` sub-list (a
field this compiled bundle DOES carry per correlation, distinct from the
`EvidenceItem` this module builds one of per correlation) names two or
more distinct `kind` values excluding a shared `"ai-derived"` reading
(`main.tex`'s "attested by two independent kinds"), AND its own `stance`
is not `contested`/`rejected`/`fringe`. Every one of this bundle's 49
correlations carries `stance="contested"` as of 2026-09-10, so this
second path contributes zero events today; the code path is kept for a
future correlation the corpus ingests under a stronger stance.

## Vocabulary

Registered as corpus `sacred-history`, vocabulary at `hte/data/vocab-
seed-sacred-history.json`, induced by reading this bundle's own `figures`
(22, ACTOR and OBJECT both) and `traditions` (13, PLACE) arrays directly,
plus five non-consensus ACTOR concepts, this corpus's own domain-
appropriate analog of the ancient-history seed vocabulary's
"extraterrestrials"-style row and quantum-history's "quantum-mysticism-
popularizers" row: a reading of *why* a correlation holds (a literal
deity, a purely legendary figure, a modern channeled continuity, an
originally-human deification, a wholesale narrative borrowing), never a
claim about whether a named figure existed (that axis is `historicity`,
folded into each figure's own per-figure ACTOR/OBJECT prior instead, per
`ENTITY-MODEL.md`'s own "historicity is never asserted flat" rule).
"""
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

# `tools/hypothesis-engine/hte/corpus/sacred_history.py` -> parents[4] is
# the repo root (`bucket-foundation/`), the same depth `hte.corpus.
# quantum_history.DEFAULT_CORPUS_DIR` climbs from the sibling file at the
# same directory nesting.
DEFAULT_CORPUS_PATH = Path(__file__).resolve().parents[4] / "src" / "data" / "sacred-history.json"
SACRED_HISTORY_VOCAB_PATH = Path(__file__).resolve().parents[1] / "data" / "vocab-seed-sacred-history.json"

# `ENTITY-MODEL.md` §6's own `correlation_kind` enum, read as an ACTION
# predicate. `"figure-mapping"`/`"motif-parallel"`/`"structural"` are the
# only three this bundle ships as of 2026-09-10 (`kind` field); the other
# four are carried in the seed vocabulary for forward compatibility and
# mapped here for the day the corpus grows to include them.
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


def load_vocab() -> Vocabulary:
    """The sacred-history seed vocabulary (`hte/data/vocab-seed-sacred-
    history.json`); see this module's own top docstring, "Vocabulary,"
    for how it was induced and its five non-consensus ACTOR concepts."""
    return Vocabulary.load(SACRED_HISTORY_VOCAB_PATH)


def _locate(raw_text: str, needle: str) -> tuple[int, int]:
    idx = raw_text.find(needle)
    if idx < 0:
        raise ValueError(f"sacred-history adapter: text not found verbatim in the source file: {needle[:80]!r}")
    return idx, idx + len(needle)


def _tradition_earliest_year(timeline: list[dict[str, Any]]) -> dict[str, int]:
    """The earliest `year` any timeline event names, per tradition it
    lists (a timeline event can name more than one tradition, `judaism`/
    `christianity`/`islam` all sharing `anc-hijra`-adjacent entries where
    that happens)."""
    earliest: dict[str, int] = {}
    for event in timeline:
        year = event.get("year")
        if year is None:
            continue
        for tradition in event.get("traditions", []):
            if tradition not in earliest or year < earliest[tradition]:
                earliest[tradition] = year
    return earliest


def _correlation_interval(a_year: int | None, b_year: int | None) -> Interval | None:
    """See this module's own top docstring, "Evidence items," `interval`:
    both known spans a `UNIFORM`-uncertainty interval between them, one
    known gives a `POINT` at that year, neither known gives `None`."""
    if a_year is not None and b_year is not None:
        lo, hi = min(a_year, b_year), max(a_year, b_year)
        if lo == hi:
            return Interval(start=lo, end=hi, uncertainty=Uncertainty.point())
        return Interval(start=lo, end=hi, uncertainty=Uncertainty.uniform(lo, hi))
    known = a_year if a_year is not None else b_year
    if known is None:
        return None
    return Interval(start=known, end=known, uncertainty=Uncertainty.point())


def _resolved_or_other(vocab: Vocabulary, slot: Slot, value: str | None) -> str:
    if value is not None and vocab.get(slot, value) is not None:
        return value
    return other_id(slot)


def _build_sources(traditions: list[str], earliest_year: dict[str, int], correlations: list[dict[str, Any]]) -> dict[str, Source]:
    sources: dict[str, Source] = {
        tradition: Source(
            id=tradition, kind=EvidenceKind.TEXTUAL,
            date=str(earliest_year[tradition]) if tradition in earliest_year else None,
        )
        for tradition in traditions
    }
    for corr in correlations:
        a_trad = corr.get("sideA", {}).get("tradition")
        b_trad = corr.get("sideB", {}).get("tradition")
        if not a_trad or not b_trad or a_trad == b_trad or a_trad not in sources or b_trad not in sources:
            continue
        a_year, b_year = earliest_year.get(a_trad), earliest_year.get(b_trad)
        if a_year is None or b_year is None or a_year == b_year:
            continue
        older, younger = (a_trad, b_trad) if a_year < b_year else (b_trad, a_trad)
        if older not in sources[younger].stemma_parents:
            sources[younger].stemma_parents.append(older)
    return sources


def _counter_consideration_items(
    corr: dict[str, Any], raw: str, *, actor: str, action: str, obj: str, place: str, mechanism: str, interval: Interval | None,
) -> list[EvidenceItem]:
    items: list[EvidenceItem] = []
    for i, caveat in enumerate(corr.get("counterConsiderations", []) or []):
        start, end = _locate(raw, caveat)
        items.append(EvidenceItem(
            id=f"{corr['id']}-counter-{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T4,
            source_id=place,
            span=EvidenceSpan(doc_id="sacred-history.json", locator=f"correlations/{corr['id']}/counterConsiderations[{i}]", quote=caveat, char_start=start, char_end=end),
            provenance="sacred-history-counter-consideration",
            actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
            interval=interval, stance=Stance.NEGATIVE,
        ))
    return items


def _correlation_items(
    correlations: list[dict[str, Any]], raw: str, vocab: Vocabulary, earliest_year: dict[str, int],
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
        interval = _correlation_interval(earliest_year.get(a_trad), earliest_year.get(b_trad))

        statement = corr.get("statement", "")
        start, end = _locate(raw, statement)
        confidence = float(corr.get("confidence", 0.0))

        evidence.append(EvidenceItem(
            id=corr["id"], kind=EvidenceKind.TEXTUAL, tier=Tier.T4, source_id=place,
            span=EvidenceSpan(doc_id="sacred-history.json", locator=f"correlations/{corr['id']}", quote=statement, char_start=start, char_end=end),
            provenance="sacred-history-correlation",
            actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
            interval=interval, stance=Stance.POSITIVE,
            views={"blended_a": min(0.99, confidence)},
        ))
        evidence.extend(_counter_consideration_items(
            corr, raw, actor=actor, action=action, obj=obj, place=place, mechanism=mechanism, interval=interval,
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


def ingest(corpus_path: str | Path | None = None, *, retrieval_run_id: str = "fixture-sacred-history-ingest") -> Corpus:
    """Parse `src/data/sacred-history.json` (default `DEFAULT_CORPUS_PATH`)
    into a `Corpus`: one `Source` per tradition, one `EvidenceItem` per
    correlation plus one per `counterConsiderations` caveat, one
    `GroundTruthEvent` per non-disputed timeline event (and, in principle,
    per two-independent-kind-attested correlation, none as of 2026-09-10),
    and one fixture `RetrievalEnvelope` for the whole bundle. Raises
    `FileNotFoundError` if `corpus_path` does not exist.

    No LLM call is made anywhere in this module, matching `hte.corpus.
    quantum_history`'s own "the structure already states what this module
    needs; no extraction pass would improve on reading it directly" stance:
    `src/data/sacred-history.json` is a compiled JSON bundle whose fields
    (`figures[].historicity`, `correlations[].confidence`, `timeline[].
    disputed`) already carry exactly the graded signal this module reads.
    """
    path = Path(corpus_path) if corpus_path is not None else DEFAULT_CORPUS_PATH
    if not path.is_file():
        raise FileNotFoundError(f"sacred-history corpus file not found: {path}")

    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    vocab = load_vocab()

    traditions: list[str] = data.get("traditions", [])
    correlations: list[dict[str, Any]] = data.get("correlations", [])
    timeline: list[dict[str, Any]] = data.get("timeline", [])

    earliest_year = _tradition_earliest_year(timeline)
    sources = _build_sources(traditions, earliest_year, correlations)
    correlation_evidence, correlation_ground_truth = _correlation_items(correlations, raw, vocab, earliest_year)
    timeline_ground_truth = _timeline_ground_truth(timeline)

    fetched_at = datetime.now(timezone.utc).isoformat()
    total_stemma_edges = sum(len(source.stemma_parents) for source in sources.values())
    provenance = [RetrievalEnvelope(
        retrieval_run_id=retrieval_run_id, doc_id="sacred-history.json", source_path=str(path),
        fetched_at=fetched_at, fixture=True, citation_count=len(correlations), lineage_count=total_stemma_edges,
    )]

    return Corpus(
        sources=sources, evidence=correlation_evidence,
        ground_truth=timeline_ground_truth + correlation_ground_truth,
        provenance=provenance, vocab=vocab,
    )


__all__ = ["ingest", "load_vocab", "DEFAULT_CORPUS_PATH", "SACRED_HISTORY_VOCAB_PATH"]
