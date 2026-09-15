"""Property tests over `hte.temporal_consistency`: the Allen-relations
check (PLAN.md section 10 item 7) against `hte.timeline.relate`'s own
ground truth across the full interval space `tests.swarm.conftest.intervals`
draws, rather than the hand-picked pairs `tests/test_temporal_consistency.py`
already covers. No property or unit test in this package drives
`check_sequence`/`flag_hypothesis`/`check_hypotheses` through every one of
the thirteen `AllenRelation` values as the claimed relation before this
file; the hand-picked cases only ever claim one wrong relation at a time.
"""
from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.temporal_consistency import (
    check_hypotheses,
    check_sequence,
    flag_hypothesis,
)
from hte.timeline import AllenRelation, Interval, relate
from tests.swarm.conftest import intervals


def _vocab() -> Vocabulary:
    vocab = Vocabulary()
    for actor_id in ("actor-a", "actor-b"):
        vocab.add(Concept(actor_id, Slot.ACTOR, actor_id, 0.0, ConsensusStatus.CONSENSUS))
    return vocab


VOCAB = _vocab()

relations = st.sampled_from(list(AllenRelation))


def _placement(interval: Interval, *, actor: str = "actor-a") -> Placement:
    return Placement(
        actor=actor, action=other_id(Slot.ACTION), object=other_id(Slot.OBJECT),
        place=other_id(Slot.PLACE), mechanism=other_id(Slot.MECHANISM), interval=interval,
    )


def _sequence_hypothesis(first: Placement, relation: AllenRelation, second: Placement) -> Hypothesis:
    return Hypothesis.from_sequence(Sequence(first=first, relation=relation, second=second), VOCAB)


# --------------------------------------------------------------------------
# check_sequence against relate's own ground truth, every claimed relation
# --------------------------------------------------------------------------


@given(intervals(), intervals())
def test_check_sequence_is_none_when_the_claim_matches_relate(first_iv, second_iv):
    first = _placement(first_iv)
    second = _placement(second_iv, actor="actor-b")
    h = _sequence_hypothesis(first, relate(first_iv, second_iv), second)
    assert check_sequence(h) is None


@given(intervals(), intervals(), relations)
def test_check_sequence_agrees_with_relate_for_every_claimed_relation(first_iv, second_iv, claimed):
    first = _placement(first_iv)
    second = _placement(second_iv, actor="actor-b")
    true_relation = relate(first_iv, second_iv)
    h = _sequence_hypothesis(first, claimed, second)
    flag = check_sequence(h)
    if claimed == true_relation:
        assert flag is None
    else:
        assert flag is not None
        assert flag.claimed_relation == claimed.value
        assert flag.actual_relation == true_relation.value


@given(intervals())
def test_check_sequence_is_none_for_every_placement_only_hypothesis(interval):
    h = Hypothesis.from_placement(_placement(interval), VOCAB)
    assert check_sequence(h) is None


# --------------------------------------------------------------------------
# flag_hypothesis: mirrors check_sequence exactly, mutates in place, idempotent
# --------------------------------------------------------------------------


@given(intervals(), intervals(), relations)
def test_flag_hypothesis_meta_mirrors_check_sequence(first_iv, second_iv, claimed):
    first = _placement(first_iv)
    second = _placement(second_iv, actor="actor-b")
    h = _sequence_hypothesis(first, claimed, second)
    expected = check_sequence(h)
    flagged = flag_hypothesis(h)
    assert flagged is h
    if expected is None:
        assert h.meta == {}
    else:
        assert h.meta["temporal_inconsistency"] == expected.to_dict()


@given(intervals(), intervals(), relations)
def test_flag_hypothesis_is_idempotent(first_iv, second_iv, claimed):
    first = _placement(first_iv)
    second = _placement(second_iv, actor="actor-b")
    h = _sequence_hypothesis(first, claimed, second)
    flag_hypothesis(h)
    once = dict(h.meta)
    flag_hypothesis(h)
    assert h.meta == once


# --------------------------------------------------------------------------
# check_hypotheses: exactly the filter of check_sequence over the list, in order
# --------------------------------------------------------------------------


@given(st.lists(st.tuples(intervals(), intervals(), relations), min_size=0, max_size=8))
def test_check_hypotheses_matches_filtering_check_sequence_over_the_list(triples):
    hypotheses = [
        _sequence_hypothesis(_placement(fi), rel, _placement(si, actor="actor-b"))
        for fi, si, rel in triples
    ]
    expected = [f for f in (check_sequence(h) for h in hypotheses) if f is not None]
    found = check_hypotheses(hypotheses)
    assert [f.to_dict() for f in found] == [e.to_dict() for e in expected]


@given(st.lists(intervals(), min_size=0, max_size=5))
def test_check_hypotheses_ignores_every_placement_only_hypothesis(ivs):
    hypotheses = [Hypothesis.from_placement(_placement(iv), VOCAB) for iv in ivs]
    assert check_hypotheses(hypotheses) == []


# --------------------------------------------------------------------------
# TemporalInconsistency.to_dict(): exactly its own four fields, every time
# --------------------------------------------------------------------------


@given(intervals(), intervals(), relations)
def test_to_dict_carries_exactly_the_four_fields(first_iv, second_iv, claimed):
    first = _placement(first_iv)
    second = _placement(second_iv, actor="actor-b")
    true_relation = relate(first_iv, second_iv)
    h = _sequence_hypothesis(first, claimed, second)
    flag = check_sequence(h)
    if flag is None:
        return
    d = flag.to_dict()
    assert set(d) == {"first", "second", "claimed_relation", "actual_relation"}
    assert d["claimed_relation"] == claimed.value
    assert d["actual_relation"] == true_relation.value
