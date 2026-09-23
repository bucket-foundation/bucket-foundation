from __future__ import annotations

from ..concepts import Concept, ConsensusStatus, Slot, Vocabulary
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from ..timeline import Interval
from . import Corpus, GroundTruthEvent

DOCS = {
    "v-claim": "In 1950 an unaffiliated observer reported comet Q over Beta Observatory by photometry.",
    "v-support": "A 1955 plate from Beta Observatory shows comet Q on the 1950 date the observer gave.",
    "v-wrong": "A 1960 review placed the same sighting in 1980, thirty years later than reported.",
    "c-claim": "In 1960 an unaffiliated observer reported comet Q over Alpha Observatory by photometry.",
    "c-support": "A 1962 note from Alpha Observatory repeated the 1960 report without a plate.",
    "c-refute": "A 1975 re-examination found no comet Q on any Alpha Observatory plate from 1960.",
}

def _vocab() -> Vocabulary:
    c = ConsensusStatus
    return Vocabulary(by_slot={
        Slot.ACTOR: [
            Concept(id="alpha-team", slot=Slot.ACTOR, label="Alpha Observatory team", prior_logit=1.0, consensus_status=c.CONSENSUS),
            Concept(id="unverified-observer", slot=Slot.ACTOR, label="Unaffiliated observer", prior_logit=-2.0, consensus_status=c.FRINGE),
        ],
        Slot.ACTION: [Concept(id="sighted", slot=Slot.ACTION, label="Sighted", prior_logit=0.0, consensus_status=c.CONSENSUS)],
        Slot.OBJECT: [Concept(id="comet-q", slot=Slot.OBJECT, label="Comet Q", prior_logit=0.0, consensus_status=c.CONSENSUS)],
        Slot.PLACE: [
            Concept(id="alpha-observatory", slot=Slot.PLACE, label="Alpha Observatory", prior_logit=0.0, consensus_status=c.CONSENSUS),
            Concept(id="beta-observatory", slot=Slot.PLACE, label="Beta Observatory", prior_logit=0.0, consensus_status=c.CONSENSUS),
        ],
        Slot.MECHANISM: [Concept(id="photometric-method", slot=Slot.MECHANISM, label="Photometric method", prior_logit=0.0, consensus_status=c.CONSENSUS)],
    })

def _item(doc: str, tier: Tier, place: str, year: int, *, stance: Stance = Stance.POSITIVE, kind: EvidenceKind = EvidenceKind.TEXTUAL) -> EvidenceItem:
    text = DOCS[doc]
    return EvidenceItem(
        id=doc, kind=kind, tier=tier, source_id=doc, provenance="fixture", stance=stance,
        span=EvidenceSpan(doc_id=doc, locator="sentence-1", quote=text, char_start=0, char_end=len(text), doc_length=len(text)),
        actor="unverified-observer", action="sighted", object="comet-q", place=place, mechanism="photometric-method",
        interval=Interval(start=year, end=year),
    )

def build() -> Corpus:
    sources = {doc: Source(id=doc, kind=EvidenceKind.TEXTUAL, date=str(y), stemma_parents=[])
               for doc, y in [("v-claim", 1950), ("v-support", 1955), ("v-wrong", 1960), ("c-claim", 1960), ("c-support", 1962), ("c-refute", 1975)]}
    evidence = [
        _item("v-claim", Tier.T3, "beta-observatory", 1950),
        _item("v-support", Tier.T1, "beta-observatory", 1950, kind=EvidenceKind.MATERIAL),
        _item("v-wrong", Tier.T2, "beta-observatory", 1980),
        _item("c-claim", Tier.T3, "alpha-observatory", 1960),
        _item("c-support", Tier.T3, "alpha-observatory", 1960),
        _item("c-refute", Tier.T1, "alpha-observatory", 1960, stance=Stance.NEGATIVE, kind=EvidenceKind.MATERIAL),
    ]
    ground_truth = [
        GroundTruthEvent(id="v-claim", label="Comet Q over Beta, fringe in 1950, accepted by 1970", year=1950, doc_id="v-claim", discovery_year=1950, acceptance_year=1970),
        GroundTruthEvent(id="v-support", label="1955 plate", year=1950, doc_id="v-support", discovery_year=1955),
        GroundTruthEvent(id="v-wrong", label="1960 misdating", year=1980, doc_id="v-wrong", discovery_year=1960),
        GroundTruthEvent(id="c-claim", label="Comet Q over Alpha, refuted by 1975", year=1960, doc_id="c-claim", discovery_year=1960, control=True),
        GroundTruthEvent(id="c-support", label="1962 repeat", year=1960, doc_id="c-support", discovery_year=1962),
        GroundTruthEvent(id="c-refute", label="1975 re-examination", year=1960, doc_id="c-refute", discovery_year=1975),
    ]
    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=[], vocab=_vocab())
