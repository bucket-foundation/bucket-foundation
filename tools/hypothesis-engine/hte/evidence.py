from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from .timeline import Interval

class EvidenceKind(str, Enum):
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
    POSITIVE = "positive"
    NEGATIVE = "negative"

@dataclass(frozen=True)
class EvidenceSpan:
    doc_id: str
    locator: str
    quote: str
    char_start: int
    char_end: int
    doc_length: int | None = None

    def __post_init__(self) -> None:
        if self.char_start < 0:
            raise ValueError("char_start must be >= 0")
        if self.char_end < self.char_start:
            raise ValueError("char_end must be >= char_start")
        if self.doc_length is not None:
            if self.doc_length < 0:
                raise ValueError("doc_length must be >= 0")
            if self.char_end > self.doc_length:
                raise ValueError(
                    f"span char_end ({self.char_end}) exceeds doc_id {self.doc_id!r}'s own "
                    f"stored document length ({self.doc_length}); refusing a span that reads "
                    "past the end of its own document"
                )

    def to_dict(self) -> dict:
        return {
            "doc_id": self.doc_id, "locator": self.locator, "quote": self.quote,
            "char_start": self.char_start, "char_end": self.char_end,
            "doc_length": self.doc_length,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EvidenceSpan":
        return cls(
            doc_id=d["doc_id"], locator=d["locator"], quote=d["quote"],
            char_start=d["char_start"], char_end=d["char_end"],
            doc_length=d.get("doc_length"),
        )

@dataclass
class Source:
    id: str
    kind: EvidenceKind
    date: str | None = None
    stemma_parents: list[str] = field(default_factory=list)
    batches: list[str] = field(default_factory=list)
    retracted_by: str | None = None
    authors: list[str] = field(default_factory=list)
    lab: str | None = None
    method: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id, "kind": self.kind.value, "date": self.date,
            "stemma_parents": list(self.stemma_parents), "batches": list(self.batches),
            "retracted_by": self.retracted_by,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Source":
        return cls(id=d["id"], kind=EvidenceKind(d["kind"]), date=d.get("date"),
                    stemma_parents=list(d.get("stemma_parents", [])), batches=list(d.get("batches", [])),
                    retracted_by=d.get("retracted_by"))

@dataclass
class EvidenceItem:
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
    retracted_by: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id, "kind": self.kind.value, "tier": self.tier.value,
            "source_id": self.source_id, "span": self.span.to_dict(), "provenance": self.provenance,
            "supports": list(self.supports), "refutes": list(self.refutes),
            "views": dict(self.views), "is_absence": self.is_absence,
            "actor": self.actor, "action": self.action, "object": self.object,
            "place": self.place, "mechanism": self.mechanism,
            "interval": self.interval.to_dict() if self.interval is not None else None,
            "stance": self.stance.value, "retracted_by": self.retracted_by,
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
            retracted_by=d.get("retracted_by"),
        )
