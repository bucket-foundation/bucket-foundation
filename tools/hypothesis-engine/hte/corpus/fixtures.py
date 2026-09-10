"""A tiny synthetic corpus, the same shape as `hte.corpus.quantum_history`,
for tests that should not depend on that chapter's exact prose.

Three sources, six evidence items with valid spans anchored into a
`FIXTURE_DOCS` dict of fabricated source text, and a ground-truth list
straddling a discovery-date cutoff, small enough that `hte.runner.
run_campaign` against it needs only a handful of distinct LLM calls to
seed a replay-only test fixture cache. The toy subject is an astronomical
sighting (a comet), deliberately picked over the package's own earlier
draft (a chemical-compound synthesis, dropped 2026-09-09 after it drew a
live safety refusal from the preservation-critic role on one combinatorial
placement): astronomy carries no dual-use reading, so every one of this
corpus's slot combinations reaches every role cleanly.
"""
from __future__ import annotations

from ..concepts import Concept, ConsensusStatus, Slot, Vocabulary
from ..evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier
from . import Corpus, GroundTruthEvent, RetrievalEnvelope

FIXTURE_DOCS: dict[str, str] = {
    "doc-alpha": (
        "In 1950, the Alpha Observatory reported the first confirmed sighting of "
        "comet Q, tracked by the Alpha team using the transit-timing method. "
        "A 1962 follow-up confirmed the sighting independently."
    ),
    "doc-beta": (
        "By 2010, the Beta Observatory had extended comet Q's tracked orbit "
        "tenfold, crediting the Beta team's photometric method. A contested 2015 "
        "press release claimed a further tenfold extension; independent "
        "confirmation as of 2020 had not been obtained."
    ),
    "doc-gamma": (
        "In 1955, an unverified observer reported a rival sighting of comet Q "
        "using an unspecified method. A 1970 review found no independent "
        "confirmation and downgraded the claim to unconfirmed."
    ),
}


def _vocab() -> Vocabulary:
    by_slot = {
        Slot.ACTOR: [
            Concept(id="alpha-team", slot=Slot.ACTOR, label="Alpha Observatory team", prior_logit=1.5, consensus_status=ConsensusStatus.CONSENSUS),
            Concept(id="beta-team", slot=Slot.ACTOR, label="Beta Observatory team", prior_logit=1.0, consensus_status=ConsensusStatus.CONSENSUS),
            Concept(id="unverified-observer", slot=Slot.ACTOR, label="Unverified observer", prior_logit=-2.0, consensus_status=ConsensusStatus.FRINGE),
        ],
        Slot.ACTION: [
            Concept(id="sighted", slot=Slot.ACTION, label="Sighted", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS),
            Concept(id="extended", slot=Slot.ACTION, label="Extended the tracked orbit of", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS),
        ],
        Slot.OBJECT: [
            Concept(id="comet-q", slot=Slot.OBJECT, label="Comet Q", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS),
        ],
        Slot.PLACE: [
            Concept(id="alpha-observatory", slot=Slot.PLACE, label="Alpha Observatory", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS),
            Concept(id="beta-observatory", slot=Slot.PLACE, label="Beta Observatory", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS),
        ],
        Slot.MECHANISM: [
            Concept(id="transit-timing-method", slot=Slot.MECHANISM, label="Transit-timing method", prior_logit=0.5, consensus_status=ConsensusStatus.CONSENSUS),
            Concept(id="photometric-method", slot=Slot.MECHANISM, label="Photometric method", prior_logit=0.5, consensus_status=ConsensusStatus.CONSENSUS),
        ],
    }
    return Vocabulary(by_slot=by_slot)


def build() -> Corpus:
    """The fixture corpus: three `Source`s (`doc-alpha`, `doc-beta`,
    `doc-gamma`), each with milestone-style evidence anchored into
    `FIXTURE_DOCS`, and a matching `GroundTruthEvent` per evidence item,
    sharing that item's own id (the same 1:1 correspondence `hte.corpus.
    quantum_history` gets for free from its card format, built by hand
    here). `doc-alpha` and `doc-gamma` each straddle the year-1960
    discovery-date cutoff `tests/test_calibrate.py` exercises, with
    opposite outcomes: `doc-alpha`'s post-cutoff item corroborates its
    pre-cutoff claim, `doc-gamma`'s post-cutoff item (`is_absence=True`)
    downgrades it. `doc-beta` sits entirely after the cutoff and is not
    split-worthy at it, exercising `holdout_by_discovery_date`'s own
    "no split" case."""
    sources = {
        "doc-alpha": Source(id="doc-alpha", kind=EvidenceKind.TEXTUAL, date="1950", stemma_parents=[]),
        "doc-beta": Source(id="doc-beta", kind=EvidenceKind.TEXTUAL, date="2010", stemma_parents=["doc-alpha"]),
        "doc-gamma": Source(id="doc-gamma", kind=EvidenceKind.TEXTUAL, date="1955", stemma_parents=[]),
    }

    def span(doc_id: str, quote: str, locator: str) -> EvidenceSpan:
        text = FIXTURE_DOCS[doc_id]
        idx = text.find(quote)
        if idx < 0:
            raise ValueError(f"fixture quote not found in {doc_id}: {quote!r}")
        return EvidenceSpan(doc_id=doc_id, locator=locator, quote=quote, char_start=idx, char_end=idx + len(quote))

    evidence = [
        EvidenceItem(
            id="gt-alpha", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="doc-alpha",
            span=span("doc-alpha", "the first confirmed sighting of comet Q, tracked by the Alpha team using the transit-timing method", "sentence-1"),
            provenance="fixture",
        ),
        EvidenceItem(
            id="gt-alpha-confirm", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-alpha",
            span=span("doc-alpha", "A 1962 follow-up confirmed the sighting independently", "sentence-2"),
            provenance="fixture",
        ),
        EvidenceItem(
            id="gt-beta", kind=EvidenceKind.MATERIAL, tier=Tier.T2, source_id="doc-beta",
            span=span("doc-beta", "the Beta Observatory had extended comet Q's tracked orbit tenfold", "sentence-1"),
            provenance="fixture",
        ),
        EvidenceItem(
            id="gt-beta-contested", kind=EvidenceKind.TEXTUAL, tier=Tier.T5, source_id="doc-beta",
            span=span("doc-beta", "A contested 2015 press release claimed a further tenfold extension", "sentence-2"),
            provenance="fixture",
        ),
        EvidenceItem(
            id="gt-gamma", kind=EvidenceKind.MATERIAL, tier=Tier.T5, source_id="doc-gamma",
            span=span("doc-gamma", "an unverified observer reported a rival sighting of comet Q using an unspecified method", "sentence-1"),
            provenance="fixture",
        ),
        EvidenceItem(
            id="gt-gamma-downgrade", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="doc-gamma",
            span=span("doc-gamma", "A 1970 review found no independent confirmation and downgraded the claim to unconfirmed", "sentence-2"),
            provenance="fixture", is_absence=True,
        ),
    ]

    ground_truth = [
        GroundTruthEvent(id="gt-alpha", label="Comet Q first sighted", year=1950, doc_id="doc-alpha", discovery_year=1950),
        GroundTruthEvent(id="gt-alpha-confirm", label="Sighting independently confirmed", year=1962, doc_id="doc-alpha", discovery_year=1962),
        GroundTruthEvent(id="gt-beta", label="Comet Q's tracked orbit extended tenfold", year=2010, doc_id="doc-beta", discovery_year=2010),
        GroundTruthEvent(id="gt-beta-contested", label="Contested further tenfold extension, unconfirmed", year=2015, doc_id="doc-beta", discovery_year=2015),
        GroundTruthEvent(id="gt-gamma", label="Rival sighting of comet Q claimed", year=1955, doc_id="doc-gamma", discovery_year=1955),
        GroundTruthEvent(id="gt-gamma-downgrade", label="Rival claim downgraded, unconfirmed", year=1970, doc_id="doc-gamma", discovery_year=1970),
    ]

    provenance = [
        RetrievalEnvelope(retrieval_run_id="fixture-corpus", doc_id="doc-alpha", source_path="fixture:doc-alpha", fetched_at="2026-01-01T00:00:00Z", fixture=True, citation_count=0, lineage_count=0),
        RetrievalEnvelope(retrieval_run_id="fixture-corpus", doc_id="doc-beta", source_path="fixture:doc-beta", fetched_at="2026-01-01T00:00:00Z", fixture=True, citation_count=0, lineage_count=1),
        RetrievalEnvelope(retrieval_run_id="fixture-corpus", doc_id="doc-gamma", source_path="fixture:doc-gamma", fetched_at="2026-01-01T00:00:00Z", fixture=True, citation_count=0, lineage_count=0),
    ]

    return Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=_vocab())


__all__ = ["build", "FIXTURE_DOCS"]
