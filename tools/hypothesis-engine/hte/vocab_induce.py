from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from .concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from .corpus import Corpus

INDUCIBLE_SLOTS: tuple[Slot, ...] = (Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM)

_EVIDENCE_SLOT_FIELDS: tuple[str, ...] = tuple(slot.value for slot in INDUCIBLE_SLOTS)

_ID_SHAPED_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

_MAX_ID_LEN = 60
_MAX_LABEL_LEN = 140

_GENERIC_NON_CONSENSUS_ACTORS: tuple[tuple[str, str, ConsensusStatus], ...] = (
    ("induced-unverified-single-source", "An unverified single source, no independent corroboration", ConsensusStatus.FRINGE),
    ("induced-narrative-embellishment", "A story embellished in the retelling", ConsensusStatus.CONTESTED),
    ("induced-coincidental-correlation", "A coincidental correlation mistaken for a cause", ConsensusStatus.FRINGE),
    ("induced-measurement-artifact", "A measurement or instrument artifact standing in for a real effect", ConsensusStatus.CONTESTED),
    ("induced-unidentified-actor", "An actor this corpus's own evidence never identifies", ConsensusStatus.FRINGE),
)
N_EXOTIC_ACTORS = len(_GENERIC_NON_CONSENSUS_ACTORS)

def _strip_diacritics(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in stripped if not unicodedata.combining(ch))

def stable_id(value: str) -> str:
    folded = _strip_diacritics(value).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", folded).strip("-")
    slug = slug[:_MAX_ID_LEN].rstrip("-")
    return slug or "unlabeled"

def _looks_id_shaped(value: str) -> bool:
    return bool(_ID_SHAPED_RE.fullmatch(value))

def _humanize(id_value: str) -> str:
    return " ".join(word.capitalize() for word in id_value.split("-")) or id_value

def _truncate(text: str, limit: int = _MAX_LABEL_LEN) -> str:
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."

@dataclass
class _SlotBuild:
    concepts: list[Concept]
    ids: set[str]

    def has(self, concept_id: str) -> bool:
        return concept_id in self.ids

    def add(self, concept: Concept) -> None:
        self.concepts.append(concept)
        self.ids.add(concept.id)

def _seed_slot_build(slot: Slot, seed_vocab: Vocabulary | None) -> _SlotBuild:
    build = _SlotBuild(concepts=[], ids=set())
    if seed_vocab is None:
        return build
    for concept in seed_vocab.concepts(slot):
        if concept.consensus_status == ConsensusStatus.OTHER:
            continue
        build.add(concept)
    return build

def _collect_raw_values(corpus: Corpus) -> dict[Slot, list[tuple[str, int]]]:
    order: dict[Slot, list[str]] = {slot: [] for slot in INDUCIBLE_SLOTS}
    counts: dict[Slot, dict[str, int]] = {slot: {} for slot in INDUCIBLE_SLOTS}
    for item in corpus.evidence:
        for slot, field_name in zip(INDUCIBLE_SLOTS, _EVIDENCE_SLOT_FIELDS):
            value = getattr(item, field_name)
            if value is None or value == other_id(slot):
                continue
            bucket = counts[slot]
            if value not in bucket:
                order[slot].append(value)
            bucket[value] = bucket.get(value, 0) + 1
    return {slot: [(value, counts[slot][value]) for value in order[slot]] for slot in INDUCIBLE_SLOTS}

def _new_concept(slot: Slot, value: str, used_ids: set[str]) -> Concept:
    if _looks_id_shaped(value):
        base_id, label = value, _humanize(value)
    else:
        base_id, label = stable_id(value), _truncate(value)
    concept_id = base_id
    suffix = 2
    while concept_id in used_ids:
        concept_id = f"{base_id}-{suffix}"
        suffix += 1
    return Concept(id=concept_id, slot=slot, label=label, prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS)

def _ensure_non_consensus_actors(build: _SlotBuild) -> None:
    existing = sum(1 for c in build.concepts if c.consensus_status in (ConsensusStatus.FRINGE, ConsensusStatus.CONTESTED))
    if existing >= N_EXOTIC_ACTORS:
        return
    needed = N_EXOTIC_ACTORS - existing
    for concept_id, label, consensus_status in _GENERIC_NON_CONSENSUS_ACTORS:
        if needed <= 0:
            break
        if build.has(concept_id):
            continue
        build.add(Concept(id=concept_id, slot=Slot.ACTOR, label=label, prior_logit=-2.0, consensus_status=consensus_status))
        needed -= 1

def induce(corpus: Corpus, *, seed_vocab: Vocabulary | None = None, min_count: int = 1) -> Vocabulary:
    raw_values = _collect_raw_values(corpus)
    by_slot: dict[Slot, list[Concept]] = {}
    for slot in Slot:
        if slot not in INDUCIBLE_SLOTS:
            by_slot[slot] = []
            continue
        build = _seed_slot_build(slot, seed_vocab)
        for value, count in raw_values[slot]:
            if build.has(value) or count < min_count:
                continue
            build.add(_new_concept(slot, value, build.ids))
        if slot == Slot.ACTOR:
            _ensure_non_consensus_actors(build)
        by_slot[slot] = build.concepts

    alpha = dict(seed_vocab.alpha) if seed_vocab is not None else {}
    default_alpha = seed_vocab.default_alpha if seed_vocab is not None else 1.0
    return Vocabulary(by_slot=by_slot, alpha=alpha, default_alpha=default_alpha)

__all__ = ["induce", "stable_id", "INDUCIBLE_SLOTS", "N_EXOTIC_ACTORS"]
