from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

class Slot(str, Enum):
    ACTOR = "actor"
    ACTION = "action"
    OBJECT = "object"
    PLACE = "place"
    TIME = "time"
    MECHANISM = "mechanism"
    RELATION = "relation"

class ConsensusStatus(str, Enum):
    CONSENSUS = "consensus"
    CONTESTED = "contested"
    FRINGE = "fringe"
    OTHER = "other"

@dataclass(frozen=True)
class Concept:
    id: str
    slot: Slot
    label: str
    prior_logit: float
    consensus_status: ConsensusStatus
    definition_url: str | None = None
    introduced_year: int | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "slot": self.slot.value,
            "label": self.label,
            "prior_logit": self.prior_logit,
            "consensus_status": self.consensus_status.value,
            "definition_url": self.definition_url,
            "introduced_year": self.introduced_year,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Concept":
        return cls(
            id=d["id"],
            slot=Slot(d["slot"]),
            label=d["label"],
            prior_logit=float(d["prior_logit"]),
            consensus_status=ConsensusStatus(d["consensus_status"]),
            definition_url=d.get("definition_url"),
            introduced_year=int(d["introduced_year"]) if d.get("introduced_year") is not None else None,
        )

def other_id(slot: Slot) -> str:
    return f"other-{slot.value}"

def other_concept(slot: Slot) -> Concept:
    return Concept(
        id=other_id(slot),
        slot=slot,
        label=f"Other ({slot.value}, unnamed)",
        prior_logit=0.0,
        consensus_status=ConsensusStatus.OTHER,
    )

@dataclass
class Vocabulary:
    by_slot: dict[Slot, list[Concept]] = field(default_factory=dict)
    alpha: dict[Slot, float] = field(default_factory=dict)
    default_alpha: float = 1.0

    def __post_init__(self) -> None:
        for slot in Slot:
            bucket = self.by_slot.setdefault(slot, [])
            if not any(c.id == other_id(slot) for c in bucket):
                bucket.append(other_concept(slot))
            self.alpha.setdefault(slot, self.default_alpha)

    def add(self, concept: Concept) -> None:
        bucket = self.by_slot[concept.slot]
        if any(c.id == concept.id for c in bucket):
            raise ValueError(f"concept id {concept.id!r} already exists in slot {concept.slot.value!r}")
        bucket.append(concept)

    def concepts(self, slot: Slot) -> list[Concept]:
        return list(self.by_slot.get(slot, []))

    def get(self, slot: Slot, concept_id: str) -> Concept | None:
        return next((c for c in self.by_slot.get(slot, []) if c.id == concept_id), None)

    def vocab_index(self, slot: Slot, concept_id: str) -> int:
        for i, c in enumerate(self.by_slot.get(slot, [])):
            if c.id == concept_id:
                return i
        raise KeyError(f"{concept_id!r} not found in slot {slot.value!r}")

    def new_concept_probability(self, slot: Slot) -> float:
        n = sum(1 for c in self.by_slot.get(slot, []) if c.consensus_status != ConsensusStatus.OTHER)
        a = self.alpha.get(slot, self.default_alpha)
        return a / (a + n)

    def frozen_at(self, cutoff: int) -> "Vocabulary":
        return Vocabulary(
            by_slot={
                slot: [c for c in concepts if c.introduced_year is None or c.introduced_year < cutoff]
                for slot, concepts in self.by_slot.items()
            },
            alpha=dict(self.alpha), default_alpha=self.default_alpha,
        )

    def to_dict(self) -> dict:
        return {
            "by_slot": {slot.value: [c.to_dict() for c in concepts] for slot, concepts in self.by_slot.items()},
            "alpha": {slot.value: a for slot, a in self.alpha.items()},
            "default_alpha": self.default_alpha,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Vocabulary":
        by_slot = {Slot(k): [Concept.from_dict(c) for c in v] for k, v in d.get("by_slot", {}).items()}
        alpha = {Slot(k): float(v) for k, v in d.get("alpha", {}).items()}
        return cls(by_slot=by_slot, alpha=alpha, default_alpha=float(d.get("default_alpha", 1.0)))

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2, sort_keys=False))

    @classmethod
    def load(cls, path: str | Path) -> "Vocabulary":
        return cls.from_dict(json.loads(Path(path).read_text()))

SEED_VOCAB_PATH = Path(__file__).parent / "data" / "vocab-seed.json"

def load_seed_vocabulary() -> Vocabulary:
    return Vocabulary.load(SEED_VOCAB_PATH)
