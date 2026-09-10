import pytest

from hte.address import decode_indices, decode_sequence_indices
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.hypothesis import Hypothesis, Placement, Sequence, prior_logit_of
from hte.timeline import AllenRelation, Interval


def _small_vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept("farmers", Slot.ACTOR, "Farmers", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("aliens", Slot.ACTOR, "Aliens", -4.0, ConsensusStatus.FRINGE))
    vocab.add(Concept("built", Slot.ACTION, "Built", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("shrine", Slot.OBJECT, "Shrine", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("site", Slot.PLACE, "Site", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("labor", Slot.MECHANISM, "Labor", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("tech", Slot.MECHANISM, "Tech", -2.5, ConsensusStatus.FRINGE))
    return vocab


def test_placement_address_matches_manual_slot_tuple():
    vocab = _small_vocab()
    interval = Interval(start=-7000, end=-6901)
    placement = Placement(actor="farmers", action="built", object="shrine", place="site",
                           mechanism="labor", interval=interval)
    n = placement.address(vocab)
    t = decode_indices(n)
    assert vocab.concepts(Slot.ACTOR)[t.actor].id == "farmers"
    assert vocab.concepts(Slot.MECHANISM)[t.mechanism].id == "labor"


def test_placement_prior_logit_sums_concept_priors_only():
    vocab = _small_vocab()
    interval = Interval(start=-7000, end=-6901)
    farmers = Placement(actor="farmers", action="built", object="shrine", place="site",
                         mechanism="labor", interval=interval)
    aliens = Placement(actor="aliens", action="built", object="shrine", place="site",
                        mechanism="tech", interval=interval)
    assert farmers.prior_logit(vocab) == pytest.approx(2.5)
    assert aliens.prior_logit(vocab) == pytest.approx(-6.5)


def test_placement_json_roundtrip():
    interval = Interval(start=-7000, end=-6901)
    placement = Placement(actor="farmers", action="built", object="shrine", place="site",
                           mechanism="labor", interval=interval, period_id="per-early-holocene")
    d = placement.to_dict()
    back = Placement.from_dict(d)
    assert back == placement


def test_hypothesis_from_placement_roundtrip(tmp_path):
    vocab = _small_vocab()
    interval = Interval(start=-7000, end=-6901)
    placement = Placement(actor="farmers", action="built", object="shrine", place="site",
                           mechanism="labor", interval=interval)
    hyp = Hypothesis.from_placement(placement, vocab, claims=["clm-1"], depends_on=[])
    assert hyp.address == placement.address(vocab)
    assert len(hyp.short_id) == 16
    assert not hyp.is_sequence

    path = tmp_path / "hyp.json"
    hyp.save(path)
    loaded = Hypothesis.load(path)
    assert loaded.address == hyp.address
    assert loaded.content == hyp.content
    assert loaded.claims == hyp.claims


def test_sequence_address_and_roundtrip():
    vocab = _small_vocab()
    interval_a = Interval(start=-13000, end=-12901)
    interval_b = Interval(start=-9800, end=-9701)
    first = Placement(actor="farmers", action="built", object="shrine", place="site",
                       mechanism="labor", interval=interval_a)
    second = Placement(actor="farmers", action="built", object="shrine", place="site",
                        mechanism="labor", interval=interval_b)
    seq = Sequence(first=first, relation=AllenRelation.BEFORE, second=second)
    hyp = Hypothesis.from_sequence(seq, vocab)
    assert hyp.is_sequence

    decoded_first, rel_idx, decoded_second = decode_sequence_indices(hyp.address)
    assert decoded_first == first.slot_tuple(vocab)
    assert decoded_second == second.slot_tuple(vocab)

    d = hyp.to_dict()
    back = Hypothesis.from_dict(d)
    assert back.address == hyp.address
    assert back.content.relation == AllenRelation.BEFORE


def test_sequence_prior_logit_sums_both_placements():
    vocab = _small_vocab()
    interval = Interval(start=-7000, end=-6901)
    farmers = Placement(actor="farmers", action="built", object="shrine", place="site",
                         mechanism="labor", interval=interval)
    aliens = Placement(actor="aliens", action="built", object="shrine", place="site",
                        mechanism="tech", interval=interval)
    seq = Sequence(first=farmers, relation=AllenRelation.BEFORE, second=aliens)
    assert seq.prior_logit(vocab) == pytest.approx(2.5 + -6.5)


def test_prior_logit_of_free_function_matches_method():
    vocab = _small_vocab()
    interval = Interval(start=-7000, end=-6901)
    placement = Placement(actor="farmers", action="built", object="shrine", place="site",
                           mechanism="labor", interval=interval)
    hyp = Hypothesis.from_placement(placement, vocab)
    assert prior_logit_of(hyp, vocab) == hyp.prior_logit(vocab)
