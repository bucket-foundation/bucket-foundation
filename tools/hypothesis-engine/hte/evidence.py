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
    weight carried separately (`hte.belief.effective_count`)."""
    id: str
    kind: EvidenceKind
    date: str | None = None
    stemma_parents: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"id": self.id, "kind": self.kind.value, "date": self.date, "stemma_parents": list(self.stemma_parents)}

    @classmethod
    def from_dict(cls, d: dict) -> "Source":
        return cls(id=d["id"], kind=EvidenceKind(d["kind"]), date=d.get("date"),
                    stemma_parents=list(d.get("stemma_parents", [])))


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

    def to_dict(self) -> dict:
        return {
            "id": self.id, "kind": self.kind.value, "tier": self.tier.value,
            "source_id": self.source_id, "span": self.span.to_dict(), "provenance": self.provenance,
            "supports": list(self.supports), "refutes": list(self.refutes),
            "views": dict(self.views), "is_absence": self.is_absence,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EvidenceItem":
        return cls(
            id=d["id"], kind=EvidenceKind(d["kind"]), tier=Tier(d["tier"]),
            source_id=d["source_id"], span=EvidenceSpan.from_dict(d["span"]), provenance=d["provenance"],
            supports=list(d.get("supports", [])), refutes=list(d.get("refutes", [])),
            views=dict(d.get("views", {})), is_absence=bool(d.get("is_absence", False)),
        )
