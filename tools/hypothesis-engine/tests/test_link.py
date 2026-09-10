from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Stance, Tier
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.link import link_evidence, slot_match_score
from hte.timeline import AllenRelation, Interval


def _vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept("farmers", Slot.ACTOR, "Farmers", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("aliens", Slot.ACTOR, "Aliens", -4.0, ConsensusStatus.FRINGE))
    vocab.add(Concept("built", Slot.ACTION, "Built", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("shrine", Slot.OBJECT, "Shrine", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("site", Slot.PLACE, "Site", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("labor", Slot.MECHANISM, "Labor", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("tech", Slot.MECHANISM, "Tech", -2.5, ConsensusStatus.FRINGE))
    return vocab


def _hyp(vocab: Vocabulary, mechanism="labor", interval=None) -> Hypothesis:
    placement = Placement(
        actor="farmers", action="built", object="shrine", place="site",
        mechanism=mechanism, interval=interval or Interval(-7000, -6901),
    )
    return Hypothesis.from_placement(placement, vocab)


def _item(**overrides) -> EvidenceItem:
    span = EvidenceSpan("doc", "loc", "quote", 0, 5)
    defaults = dict(id="ev-1", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s1", span=span, provenance="manual")
    defaults.update(overrides)
    return EvidenceItem(**defaults)


def test_item_with_no_slots_and_no_interval_is_left_unlinked():
    vocab = _vocab()
    h = _hyp(vocab)
    item = _item()
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.supports == []
    assert item.refutes == []


def test_full_slot_and_interval_match_supports():
    vocab = _vocab()
    h = _hyp(vocab)
    item = _item(actor="farmers", action="built", object="shrine", place="site", mechanism="labor",
                 interval=Interval(-7000, -6901))
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.supports == [h.address]
    assert item.refutes == []


def test_full_slot_match_with_disjoint_interval_refutes():
    vocab = _vocab()
    h = _hyp(vocab)  # interval [-7000, -6901]
    item = _item(actor="farmers", action="built", object="shrine", place="site", mechanism="labor",
                 interval=Interval(-6800, -6701))  # strictly after h's interval
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.refutes == [h.address]
    assert item.supports == []


def test_full_match_with_negative_stance_refutes_instead_of_supports():
    vocab = _vocab()
    h = _hyp(vocab)
    item = _item(actor="farmers", action="built", object="shrine", place="site", mechanism="labor",
                 interval=Interval(-7000, -6901), stance=Stance.NEGATIVE)
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.refutes == [h.address]
    assert item.supports == []


def test_one_mismatched_slot_with_negative_stance_refutes():
    vocab = _vocab()
    h = _hyp(vocab, mechanism="labor")
    item = _item(actor="farmers", action="built", object="shrine", place="site", mechanism="tech",
                 interval=Interval(-7000, -6901), stance=Stance.NEGATIVE)
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.refutes == [h.address]
    assert item.supports == []


def test_one_mismatched_slot_with_positive_stance_is_left_unlinked():
    vocab = _vocab()
    h = _hyp(vocab, mechanism="labor")
    item = _item(actor="farmers", action="built", object="shrine", place="site", mechanism="tech",
                 interval=Interval(-7000, -6901), stance=Stance.POSITIVE)
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.supports == []
    assert item.refutes == []


def test_two_mismatched_slots_is_left_unlinked_even_under_negative_stance():
    vocab = _vocab()
    h = _hyp(vocab, mechanism="labor")
    item = _item(actor="aliens", action="built", object="shrine", place="site", mechanism="tech",
                 interval=Interval(-7000, -6901), stance=Stance.NEGATIVE)
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.supports == []
    assert item.refutes == []


def test_fuzzy_label_match_resolves_a_raw_label_to_the_same_concept():
    vocab = _vocab()
    h = _hyp(vocab)
    # "Farmers" is the concept's own *label* rather than its id
    # ("farmers"); the fuzzy fallback should still resolve it.
    item = _item(actor="Farmers", action="built", object="shrine", place="site", mechanism="labor",
                 interval=Interval(-7000, -6901))
    link_evidence([item], [h], vocab, threshold=0.6)
    assert item.supports == [h.address]


def test_sequence_hypotheses_are_skipped_not_raised_on():
    vocab = _vocab()
    first = Placement(actor="farmers", action="built", object="shrine", place="site", mechanism="labor",
                       interval=Interval(-13000, -12901))
    second = Placement(actor="farmers", action="built", object="shrine", place="site", mechanism="labor",
                        interval=Interval(-9800, -9701))
    seq = Hypothesis.from_sequence(Sequence(first=first, relation=AllenRelation.BEFORE, second=second), vocab)
    item = _item(actor="farmers", interval=Interval(-13000, -12901))
    link_evidence([item], [seq], vocab, threshold=0.6)  # must not raise
    assert item.supports == []
    assert item.refutes == []


def test_link_evidence_mutates_items_in_place_and_returns_none():
    vocab = _vocab()
    h = _hyp(vocab)
    item = _item(actor="farmers", action="built", object="shrine", place="site", mechanism="labor",
                 interval=Interval(-7000, -6901))
    result = link_evidence([item], [h], vocab, threshold=0.6)
    assert result is None
    assert item.supports == [h.address]  # the same object was mutated


def test_slot_match_score_exact_id_is_one():
    vocab = _vocab()
    assert slot_match_score("farmers", "farmers", vocab, Slot.ACTOR) == 1.0


def test_slot_match_score_unrelated_labels_is_low():
    vocab = _vocab()
    assert slot_match_score("farmers", "aliens", vocab, Slot.ACTOR) < 0.5


def test_slot_match_score_numeric_index_suffix_does_not_cross_link():
    # `bkt-hte-linker-fuzzy-fix`: two different concepts sharing a long
    # common prefix and differing only in a short numeric suffix must
    # never read as the same slot value, the exact defect `hte.synth`'s
    # own `_random_label` was written to dodge (see that module's
    # docstring).
    vocab = Vocabulary()
    vocab.add(Concept("actor-5", Slot.ACTOR, "Actor 5", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("actor-10", Slot.ACTOR, "Actor 10", 0.0, ConsensusStatus.CONSENSUS))
    assert slot_match_score("Actor 5", "Actor 10", vocab, Slot.ACTOR) == 0.0
    assert slot_match_score("actor-5", "actor-10", vocab, Slot.ACTOR) == 0.0


def test_slot_match_score_year_suffixed_label_does_not_cross_link():
    # Same defect, a different shape: a bare name against that name plus
    # an appended year/index is a different token count, never a match.
    vocab = Vocabulary()
    vocab.add(Concept("planck", Slot.ACTOR, "Planck", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("planck-1900", Slot.ACTOR, "Planck-1900", 0.0, ConsensusStatus.CONSENSUS))
    assert slot_match_score("planck", "planck-1900", vocab, Slot.ACTOR) == 0.0
    assert slot_match_score("Planck", "Planck-1900", vocab, Slot.ACTOR) == 0.0


def test_slot_match_score_near_miss_spelling_still_matches():
    # A real spelling/pluralization variant of a long-enough word still
    # gets fuzzy credit; the fix above targets short disambiguating
    # tokens and token-count mismatches only.
    vocab = _vocab()
    score = slot_match_score("Farmer", "Farmers", vocab, Slot.ACTOR)
    assert score > 0.85


def test_a_weak_item_needs_a_cleaner_fuzzy_match_than_a_strong_one():
    vocab = _vocab()
    h = _hyp(vocab)
    # "Farmer" (near-miss spelling) is close to "Farmers" but not identical;
    # a weak item (low blended_a) should fail to link on it while a
    # strong item (no views at all, the flat-strength default) still can.
    weak = _item(actor="Farmer", action="built", object="shrine", place="site", mechanism="labor",
                 interval=Interval(-7000, -6901), views={"blended_a": 0.3})
    strong = _item(id="ev-2", actor="Farmer", action="built", object="shrine", place="site", mechanism="labor",
                   interval=Interval(-7000, -6901))
    link_evidence([weak, strong], [h], vocab, threshold=0.85)
    assert weak.supports == []
    assert strong.supports == [h.address]
