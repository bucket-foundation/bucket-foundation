"""Concept ontology: slots, concept priors, and the open-world vocabulary.

Mirrors `Bucket.Concept` (`papers/history-hypothesis-engine/lean/Bucket/Concept.lean`),
`TIMELINE-AND-COMBINATORICS-SPEC.md` §2, and `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
§6a's open-world `OTHER` slot.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class Slot(str, Enum):
    """The seven hypothesis slots (`Bucket.Concept.Slot`). The first six fill
    a placement hypothesis; `RELATION` fills a sequence hypothesis only,
    drawn from `hte.timeline.AllenRelation` rather than a `Concept`
    vocabulary of its own."""
    ACTOR = "actor"
    ACTION = "action"
    OBJECT = "object"
    PLACE = "place"
    TIME = "time"
    MECHANISM = "mechanism"
    RELATION = "relation"


class ConsensusStatus(str, Enum):
    """Where a concept stands against the corpus's own reading
    (`Bucket.Concept.ConsensusStatus`). `OTHER` marks the open-world
    placeholder rather than a graded stance."""
    CONSENSUS = "consensus"
    CONTESTED = "contested"
    FRINGE = "fringe"
    OTHER = "other"


@dataclass(frozen=True)
class Concept:
    """A single slot value (`Bucket.Concept.Concept`, `def:slot`): an id, the
    slot it fills, a human-readable label, an editable base rate in log-odds
    (`prior_logit`), a consensus reading, and an optional link to a citable
    definition of the concept."""
    id: str
    slot: Slot
    label: str
    prior_logit: float
    consensus_status: ConsensusStatus
    definition_url: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "slot": self.slot.value,
            "label": self.label,
            "prior_logit": self.prior_logit,
            "consensus_status": self.consensus_status.value,
            "definition_url": self.definition_url,
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
        )


def other_id(slot: Slot) -> str:
    """The canonical id of a slot's open-world placeholder concept
    (`Bucket.Concept.otherId`)."""
    return f"other-{slot.value}"


def other_concept(slot: Slot) -> Concept:
    """The open-world placeholder concept for a slot (`Bucket.Concept.
    otherConcept`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6a): a near-neutral
    base rate and `ConsensusStatus.OTHER`, so a value outside the closed
    vocabulary still gets an address, a prior, and a place in the frontier."""
    return Concept(
        id=other_id(slot),
        slot=slot,
        label=f"Other ({slot.value}, unnamed)",
        prior_logit=0.0,
        consensus_status=ConsensusStatus.OTHER,
    )


@dataclass
class Vocabulary:
    """A slot-indexed concept vocabulary that always carries its `OTHER`
    placeholder (`Bucket.Concept.Vocabulary.hasOther`), plus a per-slot
    Dirichlet-process concentration constant `alpha` sizing the reserved
    probability mass for a concept not yet in that slot's vocabulary.

    `by_slot[slot]` is append-only, in the order concepts were added: a
    concept's vocabulary index (`vocab_index`, consumed by `hte.address`) is
    its position in that list, so appending a new concept never changes an
    existing one's index (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md`'s bias-audit
    row on frozen vocab indices); inserting or reordering would.
    """
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
        """Append a concept to its slot's vocabulary. Raises if the id
        already exists in that slot: the index contract is append-only, so
        an existing id can never be reissued a different concept."""
        bucket = self.by_slot[concept.slot]
        if any(c.id == concept.id for c in bucket):
            raise ValueError(f"concept id {concept.id!r} already exists in slot {concept.slot.value!r}")
        bucket.append(concept)

    def concepts(self, slot: Slot) -> list[Concept]:
        """All concepts in `slot`, in vocabulary-index order."""
        return list(self.by_slot.get(slot, []))

    def get(self, slot: Slot, concept_id: str) -> Concept | None:
        return next((c for c in self.by_slot.get(slot, []) if c.id == concept_id), None)

    def vocab_index(self, slot: Slot, concept_id: str) -> int:
        """The 0-based position of `concept_id` in `slot`'s vocabulary list,
        the index `hte.address.encode_indices` raises that slot's fixed
        prime to (`vocab_index`, `def:address`)."""
        for i, c in enumerate(self.by_slot.get(slot, [])):
            if c.id == concept_id:
                return i
        raise KeyError(f"{concept_id!r} not found in slot {slot.value!r}")

    def new_concept_probability(self, slot: Slot) -> float:
        """`P(new concept in slot) = alpha / (alpha + N)`
        (`Eq. new-concept`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6a), with `N`
        the count of named concept instances seen so far in that slot. The
        `OTHER` placeholder itself is excluded from `N`: it is the reserved
        mass this probability sizes, so counting it as an instance would
        size the reserve from itself."""
        n = sum(1 for c in self.by_slot.get(slot, []) if c.consensus_status != ConsensusStatus.OTHER)
        a = self.alpha.get(slot, self.default_alpha)
        return a / (a + n)

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
    """The small shipped seed vocabulary (`hte/data/vocab-seed.json`): 12
    actors including the five non-consensus actors named in
    `TIMELINE-AND-COMBINATORICS-SPEC.md` §2, 10 actions, 10 objects, 10
    places, and 6 mechanisms."""
    return Vocabulary.load(SEED_VOCAB_PATH)
