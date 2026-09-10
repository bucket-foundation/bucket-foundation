"""Property tests over `hte.hypothesis`: Placement/Sequence addressing,
prior_logit summation, and Hypothesis JSON round trips."""
from __future__ import annotations

import pytest
from tests.swarm.conftest import unicode_nonempty_labels
from hypothesis import given
from hypothesis import strategies as st

from hte.address import CONCEPT_SLOT_ORDER
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.timeline import AllenRelation, Interval


def _vocab_with_priors(priors: dict[str, float]) -> Vocabulary:
    vocab = Vocabulary()
    for slot in CONCEPT_SLOT_ORDER:
        vocab.add(Concept(
            id=f"{slot.value}-p", slot=slot, label=f"{slot.value} p",
            prior_logit=priors[slot.value], consensus_status=ConsensusStatus.CONSENSUS,
        ))
    return vocab


priors_dict = st.fixed_dictionaries({
    slot.value: st.floats(min_value=-20.0, max_value=20.0, allow_nan=False, allow_infinity=False)
    for slot in CONCEPT_SLOT_ORDER
})


def _placement(priors: dict[str, float], start: int = 100, end: int = 100) -> Placement:
    return Placement(
        actor="actor-p", action="action-p", object="object-p", place="place-p",
        mechanism="mechanism-p", interval=Interval(start=start, end=end),
    )


# --------------------------------------------------------------------------
# prior_logit sums exactly the five concept-bearing slots; TIME_BIN never
# contributes
# --------------------------------------------------------------------------


@given(priors_dict)
def test_placement_prior_logit_equals_sum_of_its_five_slots(priors):
    vocab = _vocab_with_priors(priors)
    placement = _placement(priors)
    # Both sides sum the same five floats in a different order (dict
    # insertion order here vs. hte.hypothesis's own CONCEPT_SLOT_ORDER
    # iteration), so an exact `==` is a float-summation-order trap in this
    # test, unrelated to the code under test; approx equality is the
    # right check here.
    assert placement.prior_logit(vocab) == pytest.approx(sum(priors.values()), abs=1e-9)


@given(priors_dict, st.integers(min_value=-5000, max_value=5000), st.integers(min_value=-5000, max_value=5000))
def test_placement_prior_logit_is_unaffected_by_time_bin(priors, start1, offset):
    vocab = _vocab_with_priors(priors)
    end1 = start1
    end2 = start1 + abs(offset)
    p1 = _placement(priors, start=start1, end=end1)
    p2 = _placement(priors, start=start1, end=end2)
    assert p1.prior_logit(vocab) == p2.prior_logit(vocab)


@given(priors_dict, priors_dict)
def test_sequence_prior_logit_is_sum_of_both_placements(priors_a, priors_b):
    vocab_a = _vocab_with_priors(priors_a)
    # Sequence.prior_logit resolves both placements against the SAME
    # vocabulary, so build one vocab whose ids disambiguate the two members.
    vocab = Vocabulary()
    for slot in CONCEPT_SLOT_ORDER:
        vocab.add(Concept(id=f"{slot.value}-first", slot=slot, label="f", prior_logit=priors_a[slot.value], consensus_status=ConsensusStatus.CONSENSUS))
        vocab.add(Concept(id=f"{slot.value}-second", slot=slot, label="s", prior_logit=priors_b[slot.value], consensus_status=ConsensusStatus.CONSENSUS))
    first = Placement(actor="actor-first", action="action-first", object="object-first", place="place-first", mechanism="mechanism-first", interval=Interval(0, 0))
    second = Placement(actor="actor-second", action="action-second", object="object-second", place="place-second", mechanism="mechanism-second", interval=Interval(10, 10))
    seq = Sequence(first=first, relation=AllenRelation.BEFORE, second=second)
    assert seq.prior_logit(vocab) == pytest.approx(sum(priors_a.values()) + sum(priors_b.values()), abs=1e-9)


# --------------------------------------------------------------------------
# JSON round trip: Hypothesis.to_dict / from_dict, placement and sequence
# --------------------------------------------------------------------------


@given(
    unicode_nonempty_labels, unicode_nonempty_labels, unicode_nonempty_labels,
    unicode_nonempty_labels, unicode_nonempty_labels,
    st.integers(min_value=-5000, max_value=5000), st.integers(min_value=0, max_value=500),
    st.lists(st.text(min_size=1, max_size=10), max_size=3),
    st.lists(st.integers(min_value=1, max_value=10_000), max_size=3),
)
def test_placement_hypothesis_to_dict_from_dict_round_trips(actor, action, obj, place, mech, start, length, claims, depends_on):
    vocab = Vocabulary()
    for slot, value in zip(CONCEPT_SLOT_ORDER, [actor, action, obj, place, mech]):
        vocab.add(Concept(id=f"{slot.value}::{value}", slot=slot, label=value, prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    placement = Placement(
        actor=f"actor::{actor}", action=f"action::{action}", object=f"object::{obj}",
        place=f"place::{place}", mechanism=f"mechanism::{mech}", interval=Interval(start, start + length),
    )
    h = Hypothesis.from_placement(placement, vocab, claims=claims, depends_on=depends_on)
    h.meta["generator"] = "evidence-cluster"
    restored = Hypothesis.from_dict(h.to_dict())
    assert restored.address == h.address
    assert restored.claims == h.claims
    assert restored.depends_on == h.depends_on
    assert restored.meta == h.meta
    assert restored.content == h.content
    assert restored.is_sequence is False
    assert restored.short_id == h.short_id


def test_sequence_hypothesis_to_dict_from_dict_round_trips():
    vocab = Vocabulary()
    for slot in CONCEPT_SLOT_ORDER:
        vocab.add(Concept(id=f"{slot.value}-first", slot=slot, label="f", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
        vocab.add(Concept(id=f"{slot.value}-second", slot=slot, label="s", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    first = Placement(actor="actor-first", action="action-first", object="object-first", place="place-first", mechanism="mechanism-first", interval=Interval(0, 0))
    second = Placement(actor="actor-second", action="action-second", object="object-second", place="place-second", mechanism="mechanism-second", interval=Interval(10, 10))
    seq = Sequence(first=first, relation=AllenRelation.OVERLAPS, second=second)
    h = Hypothesis.from_sequence(seq, vocab)
    restored = Hypothesis.from_dict(h.to_dict())
    assert restored.is_sequence is True
    assert restored.address == h.address
    assert restored.content == h.content


def test_hypothesis_from_dict_rejects_unknown_kind():
    import pytest
    with pytest.raises(ValueError):
        Hypothesis.from_dict({"address": 1, "kind": "not-a-kind", "content": {}})


def test_hypothesis_default_meta_is_empty_dict():
    vocab = Vocabulary()
    for slot in CONCEPT_SLOT_ORDER:
        vocab.add(Concept(id=f"{slot.value}-only", slot=slot, label="x", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    placement = Placement(actor="actor-only", action="action-only", object="object-only", place="place-only", mechanism="mechanism-only", interval=Interval(0, 0))
    h = Hypothesis.from_placement(placement, vocab)
    assert h.meta == {}
