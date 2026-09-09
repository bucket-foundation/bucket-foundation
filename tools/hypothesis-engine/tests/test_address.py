import random

import pytest

from hte.address import (
    ALLEN_RELATION_ORDER,
    CONCEPT_SLOT_ORDER,
    PRIMES,
    SlotTuple,
    decode,
    decode_indices,
    decode_sequence_indices,
    encode,
    encode_indices,
    encode_sequence_indices,
    short_id,
)
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.timeline import AllenRelation


def test_primes_fixed_order():
    assert PRIMES == (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41)


def test_encode_decode_indices_roundtrip():
    t = SlotTuple(actor=3, action=1, object=0, place=5, time_bin=42, mechanism=2)
    n = encode_indices(t)
    assert decode_indices(n) == t


def test_encode_matches_paper_formula():
    # Eq. address: address = product(prime_k ** (v_k + 1)).
    t = SlotTuple(actor=0, action=0, object=0, place=0, time_bin=0, mechanism=0)
    assert encode_indices(t) == 2 * 3 * 5 * 7 * 11 * 13

    t2 = SlotTuple(actor=1, action=0, object=0, place=0, time_bin=0, mechanism=0)
    assert encode_indices(t2) == (2 ** 2) * 3 * 5 * 7 * 11 * 13


def test_address_injectivity_bounded():
    # lem:injective / encode_injective_bounded: every slot index below 2
    # (matching the Lean bounded proof's Fin 2 exhaustive check).
    seen: dict[int, SlotTuple] = {}
    values = range(2)
    for actor in values:
        for action in values:
            for obj in values:
                for place in values:
                    for tbin in values:
                        for mech in values:
                            t = SlotTuple(actor, action, obj, place, tbin, mech)
                            n = encode_indices(t)
                            if n in seen:
                                assert seen[n] == t, (seen[n], t)
                            seen[n] = t
    assert len(seen) == 2 ** 6


def test_address_injectivity_random_wider_range():
    rng = random.Random(7)
    seen: dict[int, SlotTuple] = {}
    for _ in range(3000):
        t = SlotTuple(*(rng.randint(0, 30) for _ in range(6)))
        n = encode_indices(t)
        if n in seen:
            assert seen[n] == t
        seen[n] = t


def test_decode_rejects_leftover_factors():
    with pytest.raises(ValueError):
        decode_indices(2 * 3 * 5 * 7 * 11 * 13 * 43)  # a stray extra prime factor


def test_sequence_encode_decode_roundtrip():
    first = SlotTuple(1, 2, 3, 4, 5, 6)
    second = SlotTuple(6, 5, 4, 3, 2, 1)
    n = encode_sequence_indices(first, 7, second)
    back_first, rel_idx, back_second = decode_sequence_indices(n)
    assert back_first == first
    assert rel_idx == 7
    assert back_second == second


def test_short_id_is_16_hex_chars_and_stable():
    sid = short_id(123456789)
    assert len(sid) == 16
    int(sid, 16)  # must be valid hex
    assert short_id(123456789) == sid
    assert short_id(987654321) != sid


def _vocab_with(slot: Slot, ids: list[str]) -> Vocabulary:
    vocab = Vocabulary()
    for cid in ids:
        vocab.add(Concept(cid, slot, cid, 0.0, ConsensusStatus.CONSENSUS))
    return vocab


def test_encode_decode_placement_via_vocab():
    vocab = Vocabulary()
    vocab.add(Concept("actor-a", Slot.ACTOR, "A", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("action-a", Slot.ACTION, "A", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("object-a", Slot.OBJECT, "A", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("place-a", Slot.PLACE, "A", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("mechanism-a", Slot.MECHANISM, "A", 0.0, ConsensusStatus.CONSENSUS))

    slots = {
        Slot.ACTOR: "actor-a", Slot.ACTION: "action-a", Slot.OBJECT: "object-a",
        Slot.PLACE: "place-a", Slot.MECHANISM: "mechanism-a",
    }
    n = encode(slots, time_bin=5, vocab=vocab)
    decoded_slots, time_bin = decode(n, vocab)
    assert decoded_slots == slots
    assert time_bin == 5


def test_encode_decode_sequence_via_vocab():
    vocab = Vocabulary()
    for slot in CONCEPT_SLOT_ORDER:
        vocab.add(Concept(f"{slot.value}-1", slot, "1", 0.0, ConsensusStatus.CONSENSUS))
        vocab.add(Concept(f"{slot.value}-2", slot, "2", 0.0, ConsensusStatus.CONSENSUS))

    first_slots = {slot: f"{slot.value}-1" for slot in CONCEPT_SLOT_ORDER}
    second_slots = {slot: f"{slot.value}-2" for slot in CONCEPT_SLOT_ORDER}

    n = encode(
        first_slots, time_bin=1, vocab=vocab,
        relation=AllenRelation.BEFORE, second_slots=second_slots, second_time_bin=2,
    )
    decoded_first, tb1, relation, decoded_second, tb2 = decode(n, vocab, sequence=True)
    assert decoded_first == first_slots
    assert tb1 == 1
    assert relation == AllenRelation.BEFORE
    assert decoded_second == second_slots
    assert tb2 == 2


def test_allen_relation_order_has_all_thirteen():
    assert len(ALLEN_RELATION_ORDER) == 13
    assert set(ALLEN_RELATION_ORDER) == set(AllenRelation)
