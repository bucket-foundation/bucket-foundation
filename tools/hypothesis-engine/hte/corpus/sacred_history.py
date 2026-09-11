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
(22 figure nodes), `correlations` (52 cross-tradition claims: 49
AI-branch-analysis candidates plus 3 human-curated, non-contested
additions, see "Ground truth" below), and `timeline` (21 dated
sacred-history events). No `text`, `witness`, `translation`, or
`lineage` node exists in this export yet, so this module's own
`Source`/`EvidenceItem`/`GroundTruthEvent` mapping below reads what the
bundle carries rather than the full spec.

## Sources and dating

One `Source` per tradition (13), keyed by the tradition's own id
(`"judaism"`, `"hinduism"`, ...). `Source.date` is the earliest year in
that tradition's own dated span (below), as a string. A tradition's span
is the `(earliest, latest)` year across every `timeline` event naming it
(`_tradition_spans`); `"greek"` and `"mesopotamian"` name no `timeline`
event at all as of 2026-09-10 (both are correlation-only traditions with
no founding, council, or life-event entry in this bundle), and
`ENTITY-MODEL.md`/`TAXONOMY.md` carry no dated text for either, so both
fall back to `_EXTERNAL_TRADITION_ANCHORS`, a documented, cited external
anchor per tradition (`mesopotamian`: the Standard Babylonian recension
of the Epic of Gilgamesh, compiled by Sîn-lēqi-unninni, conventionally
c. 1200 BCE, George, A.R., *The Babylonian Gilgamesh Epic* (Oxford
University Press, 2003); `greek`: the earliest surviving Greek
attestation of the Deucalion flood narrative, the Hesiodic *Catalogue of
Women* fragments, conventionally dated c. 700 BCE, West, M.L., *The
Hesiodic Catalogue of Women* (Oxford, Clarendon Press, 1985)). Both are
`precision: "century"` conventional placements: this module reads each
as a single anchor year, carrying the same century-level precision the
source itself claims, never a fabricated day- or decade-level date.

Every correlation's own `interval` (see "Evidence items" below) is
derived from its two sides' own tradition spans, never invented: both
known gives the spans' overlap when they overlap in time, or their union
when they do not (two traditions that never coexisted still bound a
correlation's own interval, from the earlier span's own start to the
later span's own end); exactly one known gives that one tradition's own
full span; neither known leaves `interval=None`. Every non-`None`
correlation interval carries `uncertainty: uniform` over its own
`(start, end)`, per this module's own "no invented precision" rule: a
single-year anchor still reads as a degenerate uniform interval
(`Uncertainty.uniform(y, y)`, valid since `max_year >= min_year` allows
equality) rather than a `POINT` reading that would imply more confidence
in the exact year than either the anchor or the span carries.

## Stemma and transmission

`src/data/sacred-history.json` carries no `derives_from` or
`transmission` field, and no correlation in this bundle carries a
`direction` value (`ENTITY-MODEL.md` §6's own `direction` enum, `a→b` |
`b→a` | `undirected` | `common-source`, is defined at the spec layer but
dropped from every correlation this compiled bundle ships as of
2026-09-10; `_intake/sacred-history-corpus/tools/build-entity-graph.py`'s
own `_candidate_correlation` hardcodes `"undirected"` for every claim it
emits). This module reads `corr.get("direction")` when a future edition
of the bundle populates it: `"a→b"`/`"b→a"` emit a single directed
stemma edge (the named target tradition's `Source` lists the named
source tradition as its one `stemma_parents` entry, `ENTITY-MODEL.md`'s
own borrowing/diffusion reading, `hte.corpus.sacred_history._ACTION_BY_
KIND`'s `"textual-borrowing"`/`"chronological"` predicates being the
correlation kinds this would apply to). Every correlation this bundle
ships today falls to the second case, `direction` absent or
`"undirected"`/`"common-source"`: this module emits an undirected
`shared_source` relation, which it maps to a stemma edge in **both**
directions at once (each side's `Source` lists the other as a
`stemma_parents` entry). A mutual pair, an edge present on both sides at
once, is this module's own flag for "undirected": nothing in
`hte.evidence.Source`'s plain `list[str]` shape carries a per-edge
direction tag, so the presence of the edge on both ends is the signal a
future consumer reads instead of a dedicated field. `hte.belief.
effective_count`'s union-find treats a mutual pair exactly as it treats
one directed edge (both merge the same two components), so this choice
costs nothing there; it is a `hte.corpus.sacred_history`-side statement
that two traditions correlated through a common, unresolved antecedent,
never a claim about which one transmitted to which, kept distinct from
a real directed edge for the day a future ingestion or consumer reads
`stemma_parents` direction-aware. (`hte.runner.run_campaign` and `hte.
calibrate.holdout_kfold` do not thread `Corpus.sources` into `hte.
belief.score`'s optional `sources=` parameter as of 2026-09-10, so
`effective_count`'s discount is not live in either path yet; this
module's own `stemma_parents` data is ready for the day that wiring
lands, per this package's own "under active parallel edit elsewhere"
caution.) This is inference from the correlation graph's own tradition
pairing, never a verdict (`ENTITY-MODEL.md`'s own "the corpus stores
the disagreement, never a verdict" rule): `hte.belief.pooled_weight`'s
stemma discount reads the edge as correlated evidence between the two
traditions, the same role a real `derives_from` edge would play, without
this module asserting which tradition transmitted to which.

## Evidence items

One `EvidenceItem` per correlation (52), id = the correlation's own id
(already unique, `"clm-corr-figure-mapping-8d76c0b84f"`-style). Kind
`TEXTUAL` (a scored comparison over two figures' own textual/Wikidata
descriptions; `hte.corpus.literature`'s own `MODEL_PRIOR` reading stays
reserved for a pooled statistical estimate instead); tier read off the
correlation's own `source` field (`_TIER_BY_SOURCE`): `T4` ("modern
synthesis") for the 49 `"entity-graph-resolver"`/`"llm-branch-analysis"`
AI-derived candidates, this ladder rung's own least-reliable reading;
`T3` ("later commentary/synthesis") for the 3 `"human-curated"`
additions (below), a human scholarly comparison rather than a primary
text, still a real step above an AI embedding-similarity guess. No
correlation this bundle carries reaches `T2` (a primary-text source) as
of 2026-09-10. `views["blended_a"]`
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
  The 3 `"human-curated"` additions all resolve to the real,
  previously-unused `"human-scholarly-comparison"` concept the seed
  vocabulary already carried for exactly this case.
- **interval**, from the correlation's own two tradition spans ("Sources
  and dating" above): the spans' overlap when both are known and
  overlap, their union when both are known and do not, or the one known
  span when only one side is dated; `interval=None` when neither side's
  tradition is dated at all (not possible as of 2026-09-10, since every
  one of this bundle's 13 traditions now carries a span, timeline-derived
  or external-anchored). Every non-`None` interval carries `uncertainty:
  uniform`; `views["interval_is_overlap"]` records which reading
  produced it, `1.0` for the overlap case, `0.0` for the union case,
  omitted when only one side was dated (there is no overlap-or-union
  choice to record then).

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
is not `contested`/`rejected`/`fringe`, AND it carries a real `interval`
(a correlation whose own two traditions are both dated, which every
correlation in this bundle now satisfies).

This second path is why `GroundTruthEvent.id = corr["id"]` matters
(`_correlation_items` below): it is the SAME id the correlation's own
`EvidenceItem` carries, so `hte.calibrate`'s `ev_by_id.get(g.id)` lookup
(both `run_holdout` and `holdout_kfold`) resolves straight to that
item's own ACTOR/ACTION/OBJECT/PLACE/MECHANISM slots, the figure-
correlation slot shape the frontier's own combinatorial and evidence-
driven hypotheses already share, rather than to nothing at all (a
`timeline`-sourced `GroundTruthEvent`'s id, `"anc-..."`-shaped, never
matches any `EvidenceItem` id this module builds, so it can hold a real
dated fact and still score zero k-fold coverage; see `docs/BUILD-
HISTORY.md`'s "Data fixes" section). A correlation ground-truth event
therefore shares the frontier's own vocabulary by construction, once
one exists: what this bundle lacked through 2026-09-10 was not a slot-
shape mismatch but a populated `stance != contested` correlation for the
rule to ever fire.

Three correlations added 2026-09-10 (`"source": "human-curated"`,
`provenance.method: "human-scholarly-comparison"`, additive, the
original 49 untouched) satisfy this rule: `utnapishtim`↔`noah` (flood
and ark, `stance: "majority-scholarly"`, George 2003 and Tigay 1982),
`moses`↔`muhammad` (lawgiver and mountain-revelation,
`stance: "traditional"`, the Qur'an's own naming of Musa as a prior
messenger), and `confucius`↔`jesus` (the reciprocity/"Golden Rule"
maxim, `stance: "majority-scholarly"`, Jaspers's Axial Age thesis). Each
carries `evidence[]` with two locators (one per side) plus one
`"scholarly"`/`"traditional"`-kind comparison entry, `attested_by_two_
kinds` reading `{"primary", "scholarly"}` or `{"primary",
"traditional"}`, and one `counterConsiderations` caveat, whose own
`EvidenceItem` shares every slot (including `MECHANISM`) with the
correlation's own primary item: `hte.calibrate.holdout_kfold`'s own
stratified folds (`_stratified_folds`, `k=5` by default) shuffle then
deal items round-robin, so two specific items share a fold with
probability `1/k`; four folds out of five put the two apart, so the
counter-item's own placement candidate covers the primary item's own
ground-truth address in whichever fold holds the primary one out.

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

# Documented external dating anchors for the two traditions this bundle's
# own `timeline` never dates (`"greek"`, `"mesopotamian"`, both
# correlation-only as of 2026-09-10; see this module's own top docstring,
# "Sources and dating"). Each is the earliest surviving attestation of the
# motif this corpus's own correlations cite for that tradition, a single
# conventional-placement year, never a fabricated day- or decade-level
# date; `_tradition_spans` only ever reads one of these when the timeline
# itself names nothing for that tradition, so a future edition of `src/
# data/sacred-history.json` that dates either tradition directly
# supersedes it with no code change.
_EXTERNAL_TRADITION_ANCHORS: dict[str, int] = {
    # Standard Babylonian recension of the Epic of Gilgamesh (Tablet XI
    # carries the flood narrative this corpus's correlations cite),
    # compiled by the scribe Sîn-lēqi-unninni; conventionally placed
    # c. 1200 BCE (the wider scholarly range runs c. 1300-1000 BCE).
    # George, A.R., The Babylonian Gilgamesh Epic: Introduction, Critical
    # Edition and Cuneiform Texts (Oxford University Press, 2003).
    "mesopotamian": -1200,
    # The earliest surviving Greek attestation of the Deucalion flood
    # narrative, fragments of the Hesiodic Catalogue of Women naming
    # Deucalion and Pyrrha as the parents of Hellen; conventionally dated
    # c. 700 BCE. Hesiodic authorship and the exact date are both debated
    # among classicists; a later, securely dated attestation of the same
    # narrative survives in Pindar, Olympian 9 (468 BCE). West, M.L., The
    # Hesiodic Catalogue of Women: Its Nature, Structure, and Origins
    # (Oxford, Clarendon Press, 1985).
    "greek": -700,
}

# Tier by the correlation's own top-level `source` field (this module's
# own reading of "how was this claim record produced," distinct from the
# MECHANISM slot's `provenance.method`, "how does this record itself
# explain what happened"): the 49 AI-derived candidates read `T4`, the
# ladder's own least-reliable rung; the 3 human-curated additions (see
# this module's own top docstring, "Ground truth") read `T3`, a real step
# up: a human scholarly comparison, below `T2`'s own primary-text rung
# (which this bundle carries no correlation for as of 2026-09-10).
_TIER_BY_SOURCE: dict[str, Tier] = {
    "entity-graph-resolver": Tier.T4,
    "llm-branch-analysis": Tier.T4,
    "human-curated": Tier.T3,
}
_DEFAULT_CORRELATION_TIER = Tier.T4


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


def _tradition_spans(timeline: list[dict[str, Any]]) -> dict[str, tuple[int, int]]:
    """`(earliest, latest)` year across every `timeline` event naming a
    tradition (a timeline event can name more than one tradition,
    `judaism`/`christianity`/`islam` all sharing `anc-hijra`-adjacent
    entries where that happens), falling back to `_EXTERNAL_TRADITION_
    ANCHORS` (as a degenerate one-year span) for a tradition the
    timeline names nothing for at all. See this module's own top
    docstring, "Sources and dating"."""
    spans: dict[str, tuple[int, int]] = {}
    for event in timeline:
        year = event.get("year")
        if year is None:
            continue
        for tradition in event.get("traditions", []):
            lo, hi = spans.get(tradition, (year, year))
            spans[tradition] = (min(lo, year), max(hi, year))
    for tradition, anchor_year in _EXTERNAL_TRADITION_ANCHORS.items():
        spans.setdefault(tradition, (anchor_year, anchor_year))
    return spans


def _correlation_interval(
    a_span: tuple[int, int] | None, b_span: tuple[int, int] | None,
) -> tuple[Interval | None, bool | None]:
    """See this module's own top docstring, "Sources and dating": both
    spans known gives their overlap when the spans overlap, their union
    when they do not; one known span gives that span; neither known gives
    `(None, None)`. Every non-`None` interval carries `uncertainty:
    uniform`, never `POINT`, even when `start == end` (`Uncertainty.
    uniform` allows equal bounds). The second return value is this
    correlation's own `views["interval_is_overlap"]` reading: `True` for
    the overlap case, `False` for the union case, `None` when only one
    side was dated (no overlap-or-union choice was made)."""
    if a_span is not None and b_span is not None:
        a_lo, a_hi = a_span
        b_lo, b_hi = b_span
        overlap_lo, overlap_hi = max(a_lo, b_lo), min(a_hi, b_hi)
        if overlap_lo <= overlap_hi:
            lo, hi, is_overlap = overlap_lo, overlap_hi, True
        else:
            lo, hi, is_overlap = min(a_lo, b_lo), max(a_hi, b_hi), False
        return Interval(start=lo, end=hi, uncertainty=Uncertainty.uniform(lo, hi)), is_overlap
    span = a_span if a_span is not None else b_span
    if span is None:
        return None, None
    lo, hi = span
    return Interval(start=lo, end=hi, uncertainty=Uncertainty.uniform(lo, hi)), None


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
        # See this module's own top docstring, "Stemma and transmission":
        # a resolved direction emits one directed edge; every correlation
        # this bundle ships as of 2026-09-10 falls through to the
        # undirected `shared_source` case, a mutual pair flagging the
        # edge as undirected rather than a hypothesized transmission
        # direction.
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
            span=EvidenceSpan(doc_id="sacred-history.json", locator=f"correlations/{corr['id']}/counterConsiderations[{i}]", quote=caveat, char_start=start, char_end=end),
            provenance="sacred-history-counter-consideration",
            actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
            interval=interval, stance=Stance.NEGATIVE,
        ))
    return items


def _correlation_items(
    correlations: list[dict[str, Any]], raw: str, vocab: Vocabulary, spans: dict[str, tuple[int, int]],
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
        interval, interval_is_overlap = _correlation_interval(spans.get(a_trad), spans.get(b_trad))
        tier = _TIER_BY_SOURCE.get(corr.get("source", ""), _DEFAULT_CORRELATION_TIER)

        statement = corr.get("statement", "")
        start, end = _locate(raw, statement)
        confidence = float(corr.get("confidence", 0.0))

        views: dict[str, float] = {"blended_a": min(0.99, confidence)}
        if interval_is_overlap is not None:
            views["interval_is_overlap"] = 1.0 if interval_is_overlap else 0.0

        evidence.append(EvidenceItem(
            id=corr["id"], kind=EvidenceKind.TEXTUAL, tier=tier, source_id=place,
            span=EvidenceSpan(doc_id="sacred-history.json", locator=f"correlations/{corr['id']}", quote=statement, char_start=start, char_end=end),
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


def ingest(corpus_path: str | Path | None = None, *, retrieval_run_id: str = "fixture-sacred-history-ingest") -> Corpus:
    """Parse `src/data/sacred-history.json` (default `DEFAULT_CORPUS_PATH`)
    into a `Corpus`: one `Source` per tradition, one `EvidenceItem` per
    correlation plus one per `counterConsiderations` caveat, one
    `GroundTruthEvent` per non-disputed timeline event plus one per
    two-independent-kind-attested, non-contested correlation (3 as of
    2026-09-10, see this module's own top docstring, "Ground truth"), and
    one fixture `RetrievalEnvelope` for the whole bundle. Raises
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

    spans = _tradition_spans(timeline)
    sources = _build_sources(traditions, spans, correlations)
    correlation_evidence, correlation_ground_truth = _correlation_items(correlations, raw, vocab, spans)
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
