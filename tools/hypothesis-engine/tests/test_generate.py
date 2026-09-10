from hte.address import time_bin_index
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.generate import PLACEMENT_CONCEPT_SLOTS, enumerate_placements, from_evidence, neighbors, sequences_from
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.timeline import AllenRelation, Interval, Resolution, relate


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


def _interval() -> Interval:
    return Interval(start=-7000, end=-6901)


def _placement(vocab: Vocabulary, actor="farmers", mechanism="labor", interval=None) -> Placement:
    return Placement(actor=actor, action="built", object="shrine", place="site",
                      mechanism=mechanism, interval=interval or _interval())


# --------------------------------------------------------------------------
# enumerate_placements
# --------------------------------------------------------------------------


def test_enumerate_placements_includes_other_in_every_slot():
    vocab = _small_vocab()
    tbin = time_bin_index(_interval().start)
    hyps = list(enumerate_placements(vocab, [tbin]))

    seen = {slot: set() for slot in PLACEMENT_CONCEPT_SLOTS}
    for h in hyps:
        seen[Slot.ACTOR].add(h.content.actor)
        seen[Slot.ACTION].add(h.content.action)
        seen[Slot.OBJECT].add(h.content.object)
        seen[Slot.PLACE].add(h.content.place)
        seen[Slot.MECHANISM].add(h.content.mechanism)

    for slot in PLACEMENT_CONCEPT_SLOTS:
        other_ids = {c.id for c in vocab.concepts(slot) if c.consensus_status == ConsensusStatus.OTHER}
        assert other_ids <= seen[slot]


def test_enumerate_placements_is_deterministic():
    vocab = _small_vocab()
    tbin = time_bin_index(_interval().start)
    first = [h.address for h in enumerate_placements(vocab, [tbin])]
    second = [h.address for h in enumerate_placements(vocab, [tbin])]
    assert first == second
    assert len(first) == len(set(first))  # every combo addresses uniquely


def test_enumerate_placements_size_matches_product_of_vocab_sizes():
    vocab = _small_vocab()
    tbin = time_bin_index(_interval().start)
    hyps = list(enumerate_placements(vocab, [tbin]))
    expected = 1
    for slot in PLACEMENT_CONCEPT_SLOTS:
        expected *= len(vocab.concepts(slot))
    assert len(hyps) == expected


def test_enumerate_placements_exclude_other():
    vocab = _small_vocab()
    tbin = time_bin_index(_interval().start)
    hyps = list(enumerate_placements(vocab, [tbin], include_other=False))
    for h in hyps:
        for slot in PLACEMENT_CONCEPT_SLOTS:
            value = {Slot.ACTOR: h.content.actor, Slot.ACTION: h.content.action,
                     Slot.OBJECT: h.content.object, Slot.PLACE: h.content.place,
                     Slot.MECHANISM: h.content.mechanism}[slot]
            assert not value.startswith("other-")


def test_enumerate_placements_respects_max_items():
    vocab = _small_vocab()
    tbin = time_bin_index(_interval().start)
    hyps = list(enumerate_placements(vocab, [tbin], max_items=5))
    assert len(hyps) == 5


# --------------------------------------------------------------------------
# neighbors
# --------------------------------------------------------------------------


def test_neighbors_count_matches_expected_sum_mid_span():
    vocab = _small_vocab()
    placement = _placement(vocab)  # interval start=-7000, bin idx=130: both shifts valid
    h = Hypothesis.from_placement(placement, vocab)
    expected = sum(len(vocab.concepts(s)) - 1 for s in PLACEMENT_CONCEPT_SLOTS) + 2
    assert len(list(neighbors(h, vocab))) == expected


def test_neighbors_count_at_span_start_has_one_time_shift():
    vocab = _small_vocab()
    interval0 = Interval(start=-20000, end=-19901)  # bin idx=0: only +1 shift is valid
    h = Hypothesis.from_placement(_placement(vocab, interval=interval0), vocab)
    expected = sum(len(vocab.concepts(s)) - 1 for s in PLACEMENT_CONCEPT_SLOTS) + 1
    assert len(list(neighbors(h, vocab))) == expected


def test_neighbors_are_all_distinct_addresses():
    vocab = _small_vocab()
    h = Hypothesis.from_placement(_placement(vocab), vocab)
    addresses = [n.address for n in neighbors(h, vocab)]
    assert h.address not in addresses
    assert len(addresses) == len(set(addresses))


def test_neighbors_of_sequence_includes_relation_changes():
    vocab = _small_vocab()
    first = _placement(vocab, interval=Interval(start=-13000, end=-12901))
    second = _placement(vocab, interval=Interval(start=-9800, end=-9701))
    seq = Sequence(first=first, relation=AllenRelation.BEFORE, second=second)
    h = Hypothesis.from_sequence(seq, vocab)
    relation_neighbors = [n for n in neighbors(h, vocab) if n.content.relation != seq.relation
                           and n.content.first == first and n.content.second == second]
    assert len(relation_neighbors) == len(list(AllenRelation)) - 1


# --------------------------------------------------------------------------
# from_evidence: the four evidence-driven generators
# --------------------------------------------------------------------------


def _evidence_fixture(vocab: Vocabulary):
    near = _placement(vocab, actor="farmers", mechanism="labor")
    far = _placement(vocab, actor="farmers", mechanism="labor", interval=Interval(start=-13000, end=-12901))
    contested = _placement(vocab, actor="aliens", mechanism="tech")
    h_near = Hypothesis.from_placement(near, vocab)
    h_far = Hypothesis.from_placement(far, vocab)
    h_contested = Hypothesis.from_placement(contested, vocab)

    span = EvidenceSpan("doc", "loc", "quote", 0, 5)
    cluster_item = EvidenceItem(id="ev-cluster", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s1",
                                 span=span, provenance="manual", supports=[h_near.address])
    contradiction_item = EvidenceItem(id="ev-contra", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="s2",
                                       span=span, provenance="manual",
                                       supports=[h_near.address], refutes=[h_contested.address])
    cross_period_item = EvidenceItem(id="ev-cross", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s3",
                                      span=span, provenance="manual", supports=[h_far.address])
    return [cluster_item, contradiction_item, cross_period_item]


def test_from_evidence_each_generator_yields_at_least_one_hypothesis():
    vocab = _small_vocab()
    items = _evidence_fixture(vocab)
    generated = from_evidence(items, vocab, Resolution.CENTURY, seed=0)

    by_generator: dict[str, list] = {}
    for h in generated:
        by_generator.setdefault(h.meta.get("generator"), []).append(h)

    for name in ("evidence-cluster", "claim-gap", "contradiction", "cross-period-analogy"):
        assert name in by_generator
        assert len(by_generator[name]) >= 1


def test_from_evidence_claim_gap_sweeps_full_vocab_including_other():
    vocab = _small_vocab()
    items = _evidence_fixture(vocab)
    generated = from_evidence(items, vocab, Resolution.CENTURY, seed=0)
    gap_hyps = [h for h in generated if h.meta.get("generator") == "claim-gap"]
    mechanisms_seen = {h.content.mechanism for h in gap_hyps if h.meta.get("gap_slot") == "mechanism"}
    assert "other-mechanism" in mechanisms_seen


def test_from_evidence_contradiction_yields_both_readings():
    vocab = _small_vocab()
    items = _evidence_fixture(vocab)
    generated = from_evidence(items, vocab, Resolution.CENTURY, seed=0)
    contra_hyps = [h for h in generated if h.meta.get("generator") == "contradiction"]
    readings = {h.meta.get("reading") for h in contra_hyps}
    assert readings == {"supported", "refuted"}


def test_from_evidence_is_deterministic_given_seed():
    vocab = _small_vocab()
    items = _evidence_fixture(vocab)
    first = [(h.address, h.meta) for h in from_evidence(items, vocab, Resolution.CENTURY, seed=3)]
    second = [(h.address, h.meta) for h in from_evidence(items, vocab, Resolution.CENTURY, seed=3)]
    assert first == second


def test_from_evidence_ignores_undecodable_addresses():
    vocab = _small_vocab()
    span = EvidenceSpan("doc", "loc", "quote", 0, 5)
    bad_item = EvidenceItem(id="ev-bad", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="s1",
                             span=span, provenance="manual", supports=[999_999_999_999_999_999])
    # Should not raise, and contributes nothing.
    generated = from_evidence([bad_item], vocab, Resolution.CENTURY)
    assert generated == []


# --------------------------------------------------------------------------
# sequences_from
# --------------------------------------------------------------------------


def test_sequences_from_computes_allen_relation_from_intervals():
    vocab = _small_vocab()
    early = _placement(vocab, interval=Interval(start=-13000, end=-12901))
    late = _placement(vocab, interval=Interval(start=-9800, end=-9701))
    h_early = Hypothesis.from_placement(early, vocab)
    h_late = Hypothesis.from_placement(late, vocab)

    [seq_hyp] = list(sequences_from([h_early, h_late], max_pairs=5))
    assert seq_hyp.is_sequence
    assert seq_hyp.content.relation == relate(early.interval, late.interval)
    assert seq_hyp.content.first == early
    assert seq_hyp.content.second == late


def test_sequences_from_respects_max_pairs():
    vocab = _small_vocab()
    placements = [
        Hypothesis.from_placement(_placement(vocab, interval=Interval(start=y, end=y + 99)), vocab)
        for y in (-13000, -12000, -11000, -10000)
    ]
    pairs = list(sequences_from(placements, max_pairs=2))
    assert len(pairs) == 2


def test_sequences_from_address_matches_decode_sequence_indices():
    from hte.address import decode_sequence_indices

    vocab = _small_vocab()
    early = _placement(vocab, interval=Interval(start=-13000, end=-12901))
    late = _placement(vocab, interval=Interval(start=-9800, end=-9701))
    h_early = Hypothesis.from_placement(early, vocab)
    h_late = Hypothesis.from_placement(late, vocab)

    [seq_hyp] = list(sequences_from([h_early, h_late], max_pairs=5))
    decoded_first, _rel_idx, decoded_second = decode_sequence_indices(seq_hyp.address)
    assert decoded_first == early.slot_tuple(vocab)
    assert decoded_second == late.slot_tuple(vocab)


def test_sequences_from_needs_no_vocabulary_argument():
    import inspect

    params = inspect.signature(sequences_from).parameters
    assert "vocab" not in params
    assert "vocabulary" not in params
