"""Property tests over `hte.concepts`: the append-only vocabulary, its
always-present `OTHER` placeholder, and the Dirichlet-process new-concept
probability."""
from __future__ import annotations

import pytest
from conftest import (
    fresh_vocabulary,
    unicode_nonempty_labels,
    vocabulary_with_extra,
    vocabulary_with_other_preseeded,
)
from hypothesis import given
from hypothesis import strategies as st

from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_concept, other_id


# --------------------------------------------------------------------------
# OTHER is always present, whether or not the input already carried it
# --------------------------------------------------------------------------


def test_fresh_vocabulary_carries_other_in_every_slot():
    vocab = fresh_vocabulary()
    for slot in Slot:
        assert vocab.get(slot, other_id(slot)) is not None


def test_preseeded_other_is_not_duplicated():
    vocab = vocabulary_with_other_preseeded()
    for slot in Slot:
        matches = [c for c in vocab.concepts(slot) if c.id == other_id(slot)]
        assert len(matches) == 1, f"slot {slot} carries {len(matches)} OTHER entries, expected exactly 1"


@given(st.sampled_from(list(Slot)), st.lists(unicode_nonempty_labels, min_size=0, max_size=5))
def test_other_stays_first_appended_concept_is_added_after_it(slot, labels):
    vocab = Vocabulary()
    for i, label in enumerate(labels):
        vocab.add(Concept(id=f"x-{i}", slot=slot, label=label, prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    concepts = vocab.concepts(slot)
    assert concepts[0].id == other_id(slot)
    assert vocab.vocab_index(slot, other_id(slot)) == 0


# --------------------------------------------------------------------------
# Append-only: an existing concept's vocab_index never moves
# --------------------------------------------------------------------------


@given(st.sampled_from(list(Slot)), st.integers(min_value=1, max_value=8), st.integers(min_value=1, max_value=8))
def test_appending_more_concepts_never_moves_an_existing_index(slot, n_before, n_after):
    vocab = Vocabulary()
    for i in range(n_before):
        vocab.add(Concept(id=f"early-{i}", slot=slot, label=f"Early {i}", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    frozen_indices = {f"early-{i}": vocab.vocab_index(slot, f"early-{i}") for i in range(n_before)}
    for i in range(n_after):
        vocab.add(Concept(id=f"late-{i}", slot=slot, label=f"Late {i}", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    for cid, idx in frozen_indices.items():
        assert vocab.vocab_index(slot, cid) == idx


def test_add_duplicate_id_raises():
    vocab = Vocabulary()
    vocab.add(Concept(id="dup", slot=Slot.ACTOR, label="A", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    with pytest.raises(ValueError):
        vocab.add(Concept(id="dup", slot=Slot.ACTOR, label="B", prior_logit=1.0, consensus_status=ConsensusStatus.FRINGE))


def test_vocab_index_missing_id_raises_keyerror():
    vocab = Vocabulary()
    with pytest.raises(KeyError):
        vocab.vocab_index(Slot.ACTOR, "no-such-id")


# --------------------------------------------------------------------------
# new_concept_probability: alpha / (alpha + N), N excludes OTHER, monotone
# decreasing as named concepts accumulate
# --------------------------------------------------------------------------


@given(st.floats(min_value=0.01, max_value=50.0, allow_nan=False, allow_infinity=False), st.integers(min_value=0, max_value=20))
def test_new_concept_probability_matches_closed_form(alpha, n_named):
    vocab = vocabulary_with_extra(Slot.ACTOR, [f"c{i}" for i in range(n_named)], alpha=alpha)
    expected = alpha / (alpha + n_named)
    assert vocab.new_concept_probability(Slot.ACTOR) == pytest.approx(expected, abs=1e-9)


@given(st.integers(min_value=0, max_value=15), st.integers(min_value=0, max_value=15))
def test_new_concept_probability_is_monotone_decreasing_in_named_count(n1, n2):
    lo, hi = (n1, n2) if n1 <= n2 else (n2, n1)
    p_lo = vocabulary_with_extra(Slot.ACTOR, [f"a{i}" for i in range(lo)]).new_concept_probability(Slot.ACTOR)
    p_hi = vocabulary_with_extra(Slot.ACTOR, [f"a{i}" for i in range(hi)]).new_concept_probability(Slot.ACTOR)
    assert p_hi <= p_lo + 1e-12


def test_new_concept_probability_ignores_the_other_placeholder_itself():
    empty = Vocabulary().new_concept_probability(Slot.ACTOR)
    assert empty == pytest.approx(1.0)  # alpha / (alpha + 0), OTHER excluded from N


# --------------------------------------------------------------------------
# to_dict / from_dict round trip, unicode labels included
# --------------------------------------------------------------------------


@given(unicode_nonempty_labels, st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False))
def test_concept_to_dict_from_dict_round_trips_with_unicode_label(label, prior):
    c = Concept(id="x", slot=Slot.PLACE, label=label, prior_logit=prior, consensus_status=ConsensusStatus.FRINGE, definition_url=None)
    assert Concept.from_dict(c.to_dict()) == c


def test_other_concept_has_zero_prior_and_other_status():
    for slot in Slot:
        oc = other_concept(slot)
        assert oc.prior_logit == 0.0
        assert oc.consensus_status == ConsensusStatus.OTHER
        assert oc.id == other_id(slot)
