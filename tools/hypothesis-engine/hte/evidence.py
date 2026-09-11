"""Evidence items, field-level spans, and evidence sources.

`main.tex`'s `def:evidence` gives an evidence item no independent Lean type
of its own in this pass: its definitional weight, kind, tier, and strength
is exactly what `Eq. cluster-weight`'s `s_i = k(theta_i) * e_i` reduces it to
before it reaches `hte.belief.score`'s pooled `r`/`s`. This module carries
that plain-data shape, plus the field-level `EvidenceSpan`
(`bkt-hte-evidence-span`, `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` §3) and the
`Source` node a stemma (`bkt-hte-stemma-dependence`, `def:stemma`) is built
over in `hte.belief`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from .timeline import Interval


class EvidenceKind(str, Enum):
    """The nine independent evidence modalities (`main.tex` §Belief model).
    `MODEL_PRIOR` is the generating model's own trained-in sense of a period,
    tracked as one low-tier kind among the nine rather than an unaccounted
    background assumption (`main.tex` §Engine loop, §Limitations)."""
    MATERIAL = "material"
    TEXTUAL = "textual"
    GENETIC = "genetic"
    LINGUISTIC = "linguistic"
    ASTRONOMICAL = "astronomical"
    GEOLOGICAL = "geological"
    ORAL_TRADITION = "oral_tradition"
    ICONOGRAPHIC = "iconographic"
    MODEL_PRIOR = "model_prior"


class EvidenceFamily(str, Enum):
    """The three families `kind_distance` (`Eq. cross-kind`) groups the nine
    kinds into: a pair drawn from two different families counts 1; a pair
    from the same family counts 0."""
    MATERIAL_TRACE = "material_trace"
    TEXTUAL_TRACE = "textual_trace"
    INFERENCE = "inference"


KIND_FAMILY: dict[EvidenceKind, EvidenceFamily] = {
    EvidenceKind.MATERIAL: EvidenceFamily.MATERIAL_TRACE,
    EvidenceKind.GENETIC: EvidenceFamily.MATERIAL_TRACE,
    EvidenceKind.ICONOGRAPHIC: EvidenceFamily.MATERIAL_TRACE,
    EvidenceKind.TEXTUAL: EvidenceFamily.TEXTUAL_TRACE,
    EvidenceKind.LINGUISTIC: EvidenceFamily.TEXTUAL_TRACE,
    EvidenceKind.ORAL_TRADITION: EvidenceFamily.TEXTUAL_TRACE,
    EvidenceKind.ASTRONOMICAL: EvidenceFamily.INFERENCE,
    EvidenceKind.GEOLOGICAL: EvidenceFamily.INFERENCE,
    EvidenceKind.MODEL_PRIOR: EvidenceFamily.INFERENCE,
}


class Tier(str, Enum):
    """The six source-reliability tiers (`def:evidence`, `evidence-tier`)."""
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"
    T4 = "T4"
    T5 = "T5"
    T6 = "T6"


TIER_WEIGHT: dict[Tier, float] = {
    Tier.T1: 2.0, Tier.T2: 1.5, Tier.T3: 1.0, Tier.T4: 0.5, Tier.T5: 0.25, Tier.T6: 0.1,
}


class Stance(str, Enum):
    """Whether an evidence item asserts its own extracted slot values as
    true (`POSITIVE`, the default) or denies/downgrades them (`NEGATIVE`,
    a corrected claim, a downgraded confirmation, a "not X but Y" line).
    `hte.link.link_evidence` reads this to decide between a support and a
    refute reading when an item's slots match a hypothesis on all but
    one, per `bkt-hte-evidence-slots`."""
    POSITIVE = "positive"
    NEGATIVE = "negative"


@dataclass(frozen=True)
class EvidenceSpan:
    """The field-level grounding for one evidence item (`bkt-hte-evidence-
    span`, `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` §3's per-field addition): the
    document it comes from, a human-readable locator inside that document,
    the quoted text, and the exact character range the quote occupies at
    that locator."""
    doc_id: str
    locator: str
    quote: str
    char_start: int
    char_end: int

    def __post_init__(self) -> None:
        if self.char_start < 0:
            raise ValueError("char_start must be >= 0")
        if self.char_end < self.char_start:
            raise ValueError("char_end must be >= char_start")
        # TODO(bkt-hte-evidence-span-doc-length, filed BEADS-PENDING.jsonl,
        # PR #60 review): this checks only internal consistency between
        # char_start and char_end, never against doc_id's own stored
        # document length. hte.corpus.Source carries no document text or
        # length field yet, so there is nothing on hand here to check
        # against; a span pointing past the end of its own document would
        # pass today. Needs a document-length store keyed by doc_id before
        # this can validate for real.

    def to_dict(self) -> dict:
        return {
            "doc_id": self.doc_id, "locator": self.locator, "quote": self.quote,
            "char_start": self.char_start, "char_end": self.char_end,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EvidenceSpan":
        return cls(
            doc_id=d["doc_id"], locator=d["locator"], quote=d["quote"],
            char_start=d["char_start"], char_end=d["char_end"],
        )


@dataclass
class Source:
    """One evidence source and its position in the stemma (`bkt-hte-stemma-
    dependence`, `def:stemma`): `stemma_parents` names the sources this one
    copies from or shares an archetype with, each edge's copy-confidence
    weight carried separately (`hte.belief.effective_count`).

    `batches` is opt-in, multi-batch-corpus metadata: which named ingest
    batch (or batches, for a source a later batch's own dedup pass finds
    already present under an earlier batch's DOI) contributed this source.
    Empty for every adapter that ingests its corpus in one pass; `hte.
    corpus.literature` is the first populated case (`bkt-hte-literature-
    batch-two`), reads a caller-supplied list of card roots and tags each
    root's own cards with that root's position, `"batch-1"`/`"batch-2"`/....
    """
    id: str
    kind: EvidenceKind
    date: str | None = None
    stemma_parents: list[str] = field(default_factory=list)
    batches: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id, "kind": self.kind.value, "date": self.date,
            "stemma_parents": list(self.stemma_parents), "batches": list(self.batches),
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Source":
        return cls(id=d["id"], kind=EvidenceKind(d["kind"]), date=d.get("date"),
                    stemma_parents=list(d.get("stemma_parents", [])), batches=list(d.get("batches", [])))


@dataclass
class EvidenceItem:
    """One evidence item (`def:evidence`): a kind, tier, source, field-level
    grounding span, provenance pointer, the hypothesis addresses it supports
    or refutes, and its similarity views.

    `views` carries zero or more of `"blended_a"` (the corpus's original
    formula, `main.tex` §Belief model's `e_i_blended_A`), `"cosine"`,
    `"fuzzy"`, `"motif"` (the multiview split, `bkt-hte-multiview-evidence`),
    or any later view a new extractor contributes, each a plain
    `str -> float` entry; `hte.belief.edge_strength` reads it.

    `is_absence` marks an item asserting the absence of evidence rather than
    its presence, so `hte.belief.cluster_weight` knows to scale it by
    detectability (`Eq. detectability`) instead of treating it as an
    ordinary find.

    `actor`/`action`/`object`/`place`/`mechanism`/`interval` are this
    item's own extracted slot values (`bkt-hte-evidence-slots`), the
    field `hte.link.link_evidence` reads to decide which hypothesis
    addresses belong in `supports`/`refutes`: `main.tex` §9 assumes a
    prior generation pass has already linked evidence to hypothesis
    addresses, and nothing upstream of this field did that before it was
    added. Each concept slot is `None` when this item's own text names
    nothing for that slot (`hte.corpus.quantum_history`'s milestone and
    claim bullets rarely name all five), read as "not asserted" rather
    than "asserted as OTHER"; a concept id when a vocabulary lookup or a
    fuzzy label match resolved one, a raw label string otherwise, for
    `link_evidence`'s own fuzzy fallback to resolve at match time.
    `interval` is the dated span this item's own text names, `None` when
    it names no date at all. `stance` marks whether this item asserts its
    own slot values as true or denies/downgrades them.
    """
    id: str
    kind: EvidenceKind
    tier: Tier
    source_id: str
    span: EvidenceSpan
    provenance: str
    supports: list[int] = field(default_factory=list)
    refutes: list[int] = field(default_factory=list)
    views: dict[str, float] = field(default_factory=dict)
    is_absence: bool = False
    actor: str | None = None
    action: str | None = None
    object: str | None = None
    place: str | None = None
    mechanism: str | None = None
    interval: Interval | None = None
    stance: Stance = Stance.POSITIVE

    def to_dict(self) -> dict:
        return {
            "id": self.id, "kind": self.kind.value, "tier": self.tier.value,
            "source_id": self.source_id, "span": self.span.to_dict(), "provenance": self.provenance,
            "supports": list(self.supports), "refutes": list(self.refutes),
            "views": dict(self.views), "is_absence": self.is_absence,
            "actor": self.actor, "action": self.action, "object": self.object,
            "place": self.place, "mechanism": self.mechanism,
            "interval": self.interval.to_dict() if self.interval is not None else None,
            "stance": self.stance.value,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EvidenceItem":
        return cls(
            id=d["id"], kind=EvidenceKind(d["kind"]), tier=Tier(d["tier"]),
            source_id=d["source_id"], span=EvidenceSpan.from_dict(d["span"]), provenance=d["provenance"],
            supports=list(d.get("supports", [])), refutes=list(d.get("refutes", [])),
            views=dict(d.get("views", {})), is_absence=bool(d.get("is_absence", False)),
            actor=d.get("actor"), action=d.get("action"), object=d.get("object"),
            place=d.get("place"), mechanism=d.get("mechanism"),
            interval=Interval.from_dict(d["interval"]) if d.get("interval") is not None else None,
            stance=Stance(d["stance"]) if d.get("stance") is not None else Stance.POSITIVE,
        )
