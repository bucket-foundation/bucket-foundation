from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Mapping

from .concepts import Slot, Vocabulary
from .timeline import (
    DEFAULT_BIN_WIDTH,
    DEFAULT_SPAN_START,
    AllenRelation,
    time_bin_index,
)

PRIMES: tuple[int, ...] = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41)

CONCEPT_SLOT_ORDER: tuple[Slot, ...] = (
    Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM,
)

ALLEN_RELATION_ORDER: tuple[AllenRelation, ...] = tuple(AllenRelation)

@dataclass(frozen=True)
class SlotTuple:
    actor: int
    action: int
    object: int
    place: int
    time_bin: int
    mechanism: int

    def as_tuple(self) -> tuple[int, int, int, int, int, int]:
        return (self.actor, self.action, self.object, self.place, self.time_bin, self.mechanism)

def encode_indices(t: SlotTuple) -> int:
    n = 1
    for prime, idx in zip(PRIMES[:6], t.as_tuple()):
        if idx < 0:
            raise ValueError(f"vocabulary index must be >= 0, got {idx}")
        n *= prime ** (idx + 1)
    return n

def decode_indices(n: int) -> SlotTuple:
    if n < 1:
        raise ValueError("an address is a positive integer")
    idxs: list[int] = []
    remaining = n
    for prime in PRIMES[:6]:
        e = 0
        while remaining % prime == 0:
            remaining //= prime
            e += 1
        if e == 0:
            raise ValueError(f"address {n} is not a valid placement address: no factor of {prime}")
        idxs.append(e - 1)
    if remaining != 1:
        raise ValueError(f"address {n} carries leftover factors after decoding placement slots: {remaining}")
    return SlotTuple(*idxs)

def encode_sequence_indices(first: SlotTuple, relation_index: int, second: SlotTuple) -> int:
    if relation_index < 0:
        raise ValueError(f"relation index must be >= 0, got {relation_index}")
    idxs = first.as_tuple() + (relation_index,) + second.as_tuple()
    n = 1
    for prime, idx in zip(PRIMES, idxs):
        n *= prime ** (idx + 1)
    return n

def decode_sequence_indices(n: int) -> tuple[SlotTuple, int, SlotTuple]:
    if n < 1:
        raise ValueError("an address is a positive integer")
    idxs: list[int] = []
    remaining = n
    for prime in PRIMES:
        e = 0
        while remaining % prime == 0:
            remaining //= prime
            e += 1
        if e == 0:
            raise ValueError(f"address {n} is not a valid sequence address: no factor of {prime}")
        idxs.append(e - 1)
    if remaining != 1:
        raise ValueError(f"address {n} carries leftover factors after decoding sequence slots: {remaining}")
    return SlotTuple(*idxs[:6]), idxs[6], SlotTuple(*idxs[7:])

def short_id(address: int) -> str:
    return hashlib.sha256(str(address).encode("utf-8")).hexdigest()[:16]

PlacementSlots = Mapping[Slot, str]

def _placement_slot_tuple(
    slots: PlacementSlots,
    time_bin: int,
    vocab: Vocabulary,
) -> SlotTuple:
    actor, action, obj, place, mechanism = (
        vocab.vocab_index(slot, slots[slot]) for slot in CONCEPT_SLOT_ORDER
    )
    return SlotTuple(actor=actor, action=action, object=obj, place=place, time_bin=time_bin, mechanism=mechanism)

def encode(
    slots: PlacementSlots,
    time_bin: int,
    vocab: Vocabulary,
    *,
    relation: AllenRelation | None = None,
    second_slots: PlacementSlots | None = None,
    second_time_bin: int | None = None,
) -> int:
    first = _placement_slot_tuple(slots, time_bin, vocab)
    if relation is None and second_slots is None:
        return encode_indices(first)
    if relation is None or second_slots is None or second_time_bin is None:
        raise ValueError("a sequence address needs relation, second_slots, and second_time_bin together")
    second = _placement_slot_tuple(second_slots, second_time_bin, vocab)
    return encode_sequence_indices(first, ALLEN_RELATION_ORDER.index(relation), second)

def _slot_tuple_to_slots(t: SlotTuple, vocab: Vocabulary) -> dict[Slot, str]:
    indices = {Slot.ACTOR: t.actor, Slot.ACTION: t.action, Slot.OBJECT: t.object,
               Slot.PLACE: t.place, Slot.MECHANISM: t.mechanism}
    return {slot: vocab.concepts(slot)[indices[slot]].id for slot in CONCEPT_SLOT_ORDER}

def decode(n: int, vocab: Vocabulary, *, sequence: bool = False):
    if not sequence:
        t = decode_indices(n)
        return _slot_tuple_to_slots(t, vocab), t.time_bin
    first, rel_idx, second = decode_sequence_indices(n)
    return (
        _slot_tuple_to_slots(first, vocab),
        first.time_bin,
        ALLEN_RELATION_ORDER[rel_idx],
        _slot_tuple_to_slots(second, vocab),
        second.time_bin,
    )

__all__ = [
    "PRIMES",
    "CONCEPT_SLOT_ORDER",
    "ALLEN_RELATION_ORDER",
    "SlotTuple",
    "encode_indices",
    "decode_indices",
    "encode_sequence_indices",
    "decode_sequence_indices",
    "short_id",
    "encode",
    "decode",
    "DEFAULT_SPAN_START",
    "DEFAULT_BIN_WIDTH",
    "time_bin_index",
]
