"""Property tests over `hte.address`: the Gödel prime encoding, round
trips, and `short_id` collision pressure."""
from __future__ import annotations

import hashlib

from hypothesis import given, settings
from hypothesis import strategies as st

from hte import address as addr
from hte.timeline import AllenRelation

slot_index = st.integers(min_value=0, max_value=200)
slot_tuples = st.builds(
    addr.SlotTuple,
    actor=slot_index, action=slot_index, object=slot_index,
    place=slot_index, time_bin=slot_index, mechanism=slot_index,
)


@given(slot_tuples)
def test_encode_decode_indices_round_trips_for_every_slot_tuple(t):
    n = addr.encode_indices(t)
    decoded = addr.decode_indices(n)
    assert decoded == t


@given(slot_tuples, st.integers(min_value=0, max_value=12), slot_tuples)
def test_encode_decode_sequence_indices_round_trips(first, relation_index, second):
    n = addr.encode_sequence_indices(first, relation_index, second)
    d_first, d_relation, d_second = addr.decode_sequence_indices(n)
    assert d_first == first
    assert d_relation == relation_index
    assert d_second == second


@given(slot_tuples)
def test_encode_indices_is_injective_over_distinct_tuples(t):
    """A second, distinct tuple (one slot bumped by one) never encodes to
    the same address (`lem:injective`'s own unique-factorization guarantee):
    changing exactly one slot's index changes at least one prime's exponent,
    so the product cannot collide."""
    n = addr.encode_indices(t)
    bumped = addr.SlotTuple(
        actor=t.actor + 1, action=t.action, object=t.object,
        place=t.place, time_bin=t.time_bin, mechanism=t.mechanism,
    )
    assert addr.encode_indices(bumped) != n


@given(st.integers(min_value=-10, max_value=-1))
def test_encode_indices_rejects_negative_index(neg):
    t = addr.SlotTuple(actor=neg, action=0, object=0, place=0, time_bin=0, mechanism=0)
    import pytest
    with pytest.raises(ValueError):
        addr.encode_indices(t)


@given(st.integers(min_value=1, max_value=10_000))
def test_decode_indices_rejects_non_positive_or_malformed_address(n):
    import pytest
    # A number with no factor of 2 (the ACTOR prime) at all is not a valid
    # placement address (every real address has actor exponent >= 1).
    odd = n * 2 + 1
    with pytest.raises(ValueError):
        addr.decode_indices(odd)


def test_decode_indices_rejects_zero_and_negative():
    import pytest
    with pytest.raises(ValueError):
        addr.decode_indices(0)
    with pytest.raises(ValueError):
        addr.decode_indices(-5)


# --------------------------------------------------------------------------
# short_id: stable, and collision-free over 10,000 random tuples
# --------------------------------------------------------------------------


def test_short_id_is_first_16_hex_of_sha256_of_the_address_string():
    address = addr.encode_indices(addr.SlotTuple(1, 2, 3, 4, 5, 6))
    expected = hashlib.sha256(str(address).encode("utf-8")).hexdigest()[:16]
    assert addr.short_id(address) == expected


@given(slot_tuples)
def test_short_id_is_deterministic(t):
    n = addr.encode_indices(t)
    assert addr.short_id(n) == addr.short_id(n)


def test_short_id_has_no_collisions_over_10000_random_tuples():
    import random

    rng = random.Random(20260910)
    addresses = set()
    while len(addresses) < 10_000:
        t = addr.SlotTuple(
            actor=rng.randrange(0, 500), action=rng.randrange(0, 500),
            object=rng.randrange(0, 500), place=rng.randrange(0, 500),
            time_bin=rng.randrange(0, 500), mechanism=rng.randrange(0, 500),
        )
        addresses.add(addr.encode_indices(t))
    short_ids = [addr.short_id(a) for a in addresses]
    assert len(set(short_ids)) == len(short_ids), "16-hex short_id collided over 10,000 distinct addresses"


# --------------------------------------------------------------------------
# Concept-id-facing encode/decode wrappers
# --------------------------------------------------------------------------


def _vocab_with(n_per_slot: int):
    from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary

    vocab = Vocabulary()
    for slot in addr.CONCEPT_SLOT_ORDER:
        for i in range(n_per_slot):
            vocab.add(Concept(
                id=f"{slot.value}-{i}", slot=slot, label=f"{slot.value} {i}",
                prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS,
            ))
    return vocab


@given(
    st.integers(min_value=0, max_value=4), st.integers(min_value=0, max_value=4),
    st.integers(min_value=0, max_value=4), st.integers(min_value=0, max_value=4),
    st.integers(min_value=0, max_value=4), st.integers(min_value=0, max_value=39),
)
@settings(max_examples=100)
def test_placement_encode_decode_round_trips_through_concept_ids(a, b, c, d, e, tbin):
    vocab = _vocab_with(5)
    slots = {
        addr.CONCEPT_SLOT_ORDER[0]: f"actor-{a}", addr.CONCEPT_SLOT_ORDER[1]: f"action-{b}",
        addr.CONCEPT_SLOT_ORDER[2]: f"object-{c}", addr.CONCEPT_SLOT_ORDER[3]: f"place-{d}",
        addr.CONCEPT_SLOT_ORDER[4]: f"mechanism-{e}",
    }
    n = addr.encode(slots, tbin, vocab)
    decoded_slots, decoded_tbin = addr.decode(n, vocab)
    assert decoded_slots == slots
    assert decoded_tbin == tbin


def test_encode_sequence_needs_relation_second_slots_and_second_time_bin_together():
    import pytest

    vocab = _vocab_with(2)
    slots = {slot: f"{slot.value}-0" for slot in addr.CONCEPT_SLOT_ORDER}
    with pytest.raises(ValueError):
        addr.encode(slots, 0, vocab, relation=AllenRelation.BEFORE)
