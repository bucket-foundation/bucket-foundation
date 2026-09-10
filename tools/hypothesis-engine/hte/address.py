"""Gödel prime encoding for hypothesis addresses.

Mirrors `Bucket.Address` (`papers/history-hypothesis-engine/lean/Bucket/Address.lean`)
and `TIMELINE-AND-COMBINATORICS-SPEC.md` §3: the address of a slot assignment
is the product of each slot's fixed prime raised to the assignment's
vocabulary index plus one, decodable by trial division alone.

Two layers live here. `SlotTuple`/`encode_indices`/`decode_indices` (and their
sequence counterparts) mirror `Bucket.Address.SlotTuple`/`encode` exactly,
operating on plain integer indices with no concept lookup. `encode`/`decode`
are the friendlier, concept-id-facing wrappers a caller holding a
`hte.concepts.Vocabulary` reaches for directly.
"""
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

# The first thirteen primes, fixed in slot order: six for a placement, one
# for the Allen relation, six more for a sequence's second placement
# (`def:address`).
PRIMES: tuple[int, ...] = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41)

# ACTOR/ACTION/OBJECT/PLACE/MECHANISM, the five slots resolved through a
# `Vocabulary` concept lookup. TIME_BIN sits between PLACE and MECHANISM in
# `Bucket.Address.SlotTuple` and `Eq. placement-space`'s six-slot order, but
# is numeric rather than concept-indexed (`hte.timeline.time_bin_index`), so
# it is threaded through `encode`/`decode` as its own argument instead of
# living in this tuple.
CONCEPT_SLOT_ORDER: tuple[Slot, ...] = (
    Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM,
)

# The fixed index order for the RELATION slot: `AllenRelation`'s declaration
# order in `hte.timeline`, reused unchanged as the vocabulary this address
# scheme indexes into for a sequence's relation slot.
ALLEN_RELATION_ORDER: tuple[AllenRelation, ...] = tuple(AllenRelation)


@dataclass(frozen=True)
class SlotTuple:
    """A placement's six vocabulary-index tuple, ACTOR/ACTION/OBJECT/PLACE/
    TIME_BIN/MECHANISM order (`Bucket.Address.SlotTuple`). Each field is that
    slot's 0-based vocabulary index; resolving a concept id or a dated
    interval into that index is the caller's job
    (`hte.concepts.Vocabulary.vocab_index`, `hte.timeline.time_bin_index`)."""
    actor: int
    action: int
    object: int
    place: int
    time_bin: int
    mechanism: int

    def as_tuple(self) -> tuple[int, int, int, int, int, int]:
        return (self.actor, self.action, self.object, self.place, self.time_bin, self.mechanism)


def encode_indices(t: SlotTuple) -> int:
    """`Eq. address` / `Bucket.Address.encode`: the product of each slot's
    fixed prime raised to the tuple's index at that slot, plus one."""
    n = 1
    for prime, idx in zip(PRIMES[:6], t.as_tuple()):
        if idx < 0:
            raise ValueError(f"vocabulary index must be >= 0, got {idx}")
        n *= prime ** (idx + 1)
    return n


def decode_indices(n: int) -> SlotTuple:
    """Trial division by the six fixed placement primes recovers the slot-
    index tuple `encode_indices` produced (`lem:injective`'s proof: unique
    prime factorization means each prime's exponent recovers exactly one
    slot index, independent of every other prime's exponent)."""
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
    """`Eq. sequence-space`: a sequence address appends the Allen-relation
    index (prime 17) and the second placement's six indices (primes 19..41)
    after the first placement's six (primes 2..13)."""
    if relation_index < 0:
        raise ValueError(f"relation index must be >= 0, got {relation_index}")
    idxs = first.as_tuple() + (relation_index,) + second.as_tuple()
    n = 1
    for prime, idx in zip(PRIMES, idxs):
        n *= prime ** (idx + 1)
    return n


def decode_sequence_indices(n: int) -> tuple[SlotTuple, int, SlotTuple]:
    """The sequence counterpart of `decode_indices`: recovers the first
    placement's tuple, the relation index, and the second placement's
    tuple, by trial division over all thirteen fixed primes."""
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
    """A stable 16-hex short id for filenames, the first 16 hex characters of
    `sha256(str(address))`. The paper's own `address_hash` is the full
    SHA-256 (`lem:injective`'s discussion of why the prime address is what
    decodes); this truncates it for a shorter filename. The address integer
    stays the canonical, decodable id; this alias exists only for a
    filename."""
    return hashlib.sha256(str(address).encode("utf-8")).hexdigest()[:16]


# --------------------------------------------------------------------------
# Concept-id-facing wrappers
# --------------------------------------------------------------------------

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
    """The Gödel address of a slot assignment (`address(slots)`,
    `TIMELINE-AND-COMBINATORICS-SPEC.md` §3). `slots` gives concept ids for
    ACTOR/ACTION/OBJECT/PLACE/MECHANISM; `time_bin` gives the numeric
    century-bin index for TIME_BIN (`hte.timeline.time_bin_index`), kept
    separate from `slots` because TIME_BIN is not a named-concept
    vocabulary. Passing `relation`, `second_slots`, and `second_time_bin`
    addresses a sequence hypothesis instead, per `Eq. sequence-space`.
    """
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
    """The inverse of `encode`: a placement address decodes to `(slots,
    time_bin)`; a sequence address (`sequence=True`) decodes to `(slots,
    time_bin, relation, second_slots, second_time_bin)`."""
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
