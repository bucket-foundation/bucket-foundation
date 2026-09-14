"""`hte.temporal_consistency`: the Allen-relations check (PLAN.md section
10 item 7). A sequence hypothesis's claimed relation against what `hte.
timeline.relate` derives from its own two placements' dated intervals.
"""
from __future__ import annotations

from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from hte.corpus import sacred_history
from hte.generate import neighbors
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.temporal_consistency import (
    TemporalInconsistency,
    check_hypotheses,
    check_sequence,
    flag_hypothesis,
)
from hte.timeline import AllenRelation, Interval


def _vocab() -> Vocabulary:
    # A bare vocabulary carries only its own OTHER placeholder per slot
    # (`hte.concepts.other_id`); every distinct ACTOR label these tests
    # use to tell two placements apart in an assertion's own message
    # needs a registered concept of its own.
    vocab = Vocabulary()
    for actor_id in ("actor-a", "actor-b", "event-earlier", "event-later"):
        vocab.add(Concept(actor_id, Slot.ACTOR, actor_id, 0.0, ConsensusStatus.CONSENSUS))
    return vocab


VOCAB = _vocab()


def _placement(interval: Interval, *, actor: str = "actor-a") -> Placement:
    return Placement(
        actor=actor, action=other_id(Slot.ACTION), object=other_id(Slot.OBJECT),
        place=other_id(Slot.PLACE), mechanism=other_id(Slot.MECHANISM), interval=interval,
    )


def _sequence_hypothesis(first: Placement, relation: AllenRelation, second: Placement) -> Hypothesis:
    return Hypothesis.from_sequence(Sequence(first=first, relation=relation, second=second), VOCAB)


# --------------------------------------------------------------------------
# check_sequence
# --------------------------------------------------------------------------


def test_check_sequence_none_for_non_sequence_hypothesis():
    h = Hypothesis.from_placement(_placement(Interval(start=100, end=100)), VOCAB)
    assert check_sequence(h) is None


def test_check_sequence_none_when_relation_matches_intervals():
    first = _placement(Interval(start=-500, end=-401))
    second = _placement(Interval(start=-300, end=-201), actor="actor-b")
    # -401 < -300, so `first` ends strictly before `second` starts: BEFORE.
    h = _sequence_hypothesis(first, AllenRelation.BEFORE, second)
    assert check_sequence(h) is None


def test_check_sequence_flags_inconsistent_relation():
    first = _placement(Interval(start=-500, end=-401))
    second = _placement(Interval(start=-300, end=-201), actor="actor-b")
    # The intervals imply BEFORE; claim something else instead.
    h = _sequence_hypothesis(first, AllenRelation.OVERLAPS, second)
    flag = check_sequence(h)
    assert flag is not None
    assert isinstance(flag, TemporalInconsistency)
    assert flag.claimed_relation == "overlaps"
    assert flag.actual_relation == "before"
    assert "actor-a" in flag.first
    assert "-500" in flag.first and "-401" in flag.first
    assert "actor-b" in flag.second
    assert "-300" in flag.second and "-201" in flag.second


def test_check_sequence_to_dict_shape():
    first = _placement(Interval(start=0, end=0))
    second = _placement(Interval(start=10, end=10), actor="actor-b")
    h = _sequence_hypothesis(first, AllenRelation.AFTER, second)  # the true relation is before
    flag = check_sequence(h)
    assert flag.to_dict() == {
        "first": flag.first, "second": flag.second,
        "claimed_relation": "after", "actual_relation": "before",
    }


# --------------------------------------------------------------------------
# flag_hypothesis
# --------------------------------------------------------------------------


def test_flag_hypothesis_sets_meta_only_when_inconsistent():
    first = _placement(Interval(start=-500, end=-401))
    second = _placement(Interval(start=-300, end=-201), actor="actor-b")
    h = _sequence_hypothesis(first, AllenRelation.OVERLAPS, second)
    flagged = flag_hypothesis(h)
    assert flagged is h  # the same object, mutated and returned
    assert "temporal_inconsistency" in h.meta
    assert h.meta["temporal_inconsistency"]["actual_relation"] == "before"


def test_flag_hypothesis_leaves_meta_untouched_when_consistent():
    first = _placement(Interval(start=-500, end=-401))
    second = _placement(Interval(start=-300, end=-201), actor="actor-b")
    h = _sequence_hypothesis(first, AllenRelation.BEFORE, second)
    flag_hypothesis(h)
    assert h.meta == {}


def test_flag_hypothesis_leaves_meta_untouched_for_a_placement_hypothesis():
    h = Hypothesis.from_placement(_placement(Interval(start=1, end=1)), VOCAB)
    flag_hypothesis(h)
    assert h.meta == {}


# --------------------------------------------------------------------------
# check_hypotheses
# --------------------------------------------------------------------------


def test_check_hypotheses_collects_only_inconsistent_ones():
    consistent = _sequence_hypothesis(
        _placement(Interval(start=-500, end=-401)), AllenRelation.BEFORE,
        _placement(Interval(start=-300, end=-201), actor="actor-b"),
    )
    inconsistent = _sequence_hypothesis(
        _placement(Interval(start=-500, end=-401)), AllenRelation.OVERLAPS,
        _placement(Interval(start=-300, end=-201), actor="actor-b"),
    )
    non_sequence = Hypothesis.from_placement(_placement(Interval(start=1, end=1)), VOCAB)
    found = check_hypotheses([consistent, inconsistent, non_sequence])
    assert len(found) == 1
    assert found[0].actual_relation == "before"


# --------------------------------------------------------------------------
# generate.neighbors integration: the one generator path that can
# legitimately claim a relation the two placements' own intervals disagree
# with (PLAN.md section 10 item 7's own motivating case).
# --------------------------------------------------------------------------


def test_neighbors_relation_mutation_flags_every_alternate_but_the_true_one():
    first = _placement(Interval(start=-500, end=-401))
    second = _placement(Interval(start=-300, end=-201), actor="actor-b")
    h = _sequence_hypothesis(first, AllenRelation.BEFORE, second)  # the true relation
    relation_neighbors = [
        n for n in neighbors(h, VOCAB)
        if n.is_sequence and n.content.first == first and n.content.second == second
    ]
    assert len(relation_neighbors) == len(list(AllenRelation)) - 1
    for n in relation_neighbors:
        # every alternate relation here differs from BEFORE, the one
        # `relate` itself derives from these two fixed intervals, so every
        # one of them is flagged.
        assert "temporal_inconsistency" in n.meta
        assert n.meta["temporal_inconsistency"]["actual_relation"] == "before"
        assert n.meta["temporal_inconsistency"]["claimed_relation"] == n.content.relation.value


def test_neighbors_relation_mutation_does_not_flag_the_relation_matching_the_intervals():
    # Build a sequence whose claimed relation is itself already wrong
    # (claims BEFORE for intervals whose true relation is MEETS), so the
    # mutation loop's own alternates include the true relation among the
    # twelve it yields; exactly that one alternate should come back
    # unflagged.
    first = _placement(Interval(start=-500, end=-401))
    second = _placement(Interval(start=-401, end=-300), actor="actor-b")  # meets `first`
    h = _sequence_hypothesis(first, AllenRelation.BEFORE, second)  # wrong: the true relation is MEETS
    relation_neighbors = [
        n for n in neighbors(h, VOCAB)
        if n.is_sequence and n.content.first == first and n.content.second == second
    ]
    unflagged = [n for n in relation_neighbors if "temporal_inconsistency" not in n.meta]
    assert len(unflagged) == 1
    assert unflagged[0].content.relation == AllenRelation.MEETS


# --------------------------------------------------------------------------
# Against the sacred-history campaign's own dating fields
# --------------------------------------------------------------------------


def test_check_sequence_against_sacred_history_dating_fields():
    corpus = sacred_history.ingest()
    events = sorted(corpus.ground_truth, key=lambda g: g.year)
    assert len(events) >= 2
    earlier, later = events[0], events[-1]
    assert earlier.year < later.year

    earlier_placement = _placement(Interval(start=earlier.year, end=earlier.year), actor="event-earlier")
    later_placement = _placement(Interval(start=later.year, end=later.year), actor="event-later")

    # The dating fields imply BEFORE; claiming DURING against them is an
    # inconsistency this check must catch.
    wrong = _sequence_hypothesis(earlier_placement, AllenRelation.DURING, later_placement)
    flag = check_sequence(wrong)
    assert flag is not None
    assert flag.claimed_relation == "during"
    assert flag.actual_relation == "before"

    right = _sequence_hypothesis(earlier_placement, AllenRelation.BEFORE, later_placement)
    assert check_sequence(right) is None
