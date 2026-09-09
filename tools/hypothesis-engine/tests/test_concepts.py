import pytest

from hte.concepts import (
    Concept,
    ConsensusStatus,
    Slot,
    Vocabulary,
    load_seed_vocabulary,
    other_concept,
    other_id,
)


def test_every_slot_gets_other_on_construction():
    vocab = Vocabulary()
    for slot in Slot:
        concepts = vocab.concepts(slot)
        assert any(c.id == other_id(slot) for c in concepts)


def test_lookup_other_always_succeeds():
    # Bucket.Concept.lookup_other_succeeds, generalized: for a freshly built
    # vocabulary and for one loaded from the seed file, every slot's OTHER
    # placeholder resolves.
    for vocab in [Vocabulary(), load_seed_vocabulary()]:
        for slot in Slot:
            concept = vocab.get(slot, other_id(slot))
            assert concept == other_concept(slot)


def test_add_rejects_duplicate_id():
    vocab = Vocabulary()
    vocab.add(Concept("a1", Slot.ACTOR, "A1", 0.0, ConsensusStatus.CONSENSUS))
    with pytest.raises(ValueError):
        vocab.add(Concept("a1", Slot.ACTOR, "A1 again", 1.0, ConsensusStatus.CONSENSUS))


def test_vocab_index_is_append_order_and_stable():
    vocab = Vocabulary()
    vocab.add(Concept("a1", Slot.ACTOR, "A1", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("a2", Slot.ACTOR, "A2", 0.0, ConsensusStatus.CONSENSUS))
    idx_a1_before = vocab.vocab_index(Slot.ACTOR, "a1")
    vocab.add(Concept("a3", Slot.ACTOR, "A3", 0.0, ConsensusStatus.CONSENSUS))
    # Appending a3 must not shift a1's or a2's already-issued index.
    assert vocab.vocab_index(Slot.ACTOR, "a1") == idx_a1_before
    assert vocab.vocab_index(Slot.ACTOR, "a2") == idx_a1_before + 1
    assert vocab.vocab_index(Slot.ACTOR, "a3") == idx_a1_before + 2


def test_vocab_index_raises_on_unknown_id():
    vocab = Vocabulary()
    with pytest.raises(KeyError):
        vocab.vocab_index(Slot.ACTOR, "does-not-exist")


def test_new_concept_probability_shrinks_as_slot_fills():
    vocab = Vocabulary()
    p0 = vocab.new_concept_probability(Slot.ACTOR)
    vocab.add(Concept("a1", Slot.ACTOR, "A1", 0.0, ConsensusStatus.CONSENSUS))
    p1 = vocab.new_concept_probability(Slot.ACTOR)
    vocab.add(Concept("a2", Slot.ACTOR, "A2", 0.0, ConsensusStatus.CONSENSUS))
    p2 = vocab.new_concept_probability(Slot.ACTOR)
    assert p0 > p1 > p2 > 0


def test_vocabulary_json_roundtrip(tmp_path):
    vocab = Vocabulary()
    vocab.add(Concept("a1", Slot.ACTOR, "A1", 1.25, ConsensusStatus.CONTESTED, definition_url="https://example.org/a1"))
    path = tmp_path / "vocab.json"
    vocab.save(path)
    loaded = Vocabulary.load(path)
    assert loaded.get(Slot.ACTOR, "a1") == vocab.get(Slot.ACTOR, "a1")
    assert loaded.vocab_index(Slot.ACTOR, "a1") == vocab.vocab_index(Slot.ACTOR, "a1")


def test_seed_vocabulary_shape():
    vocab = load_seed_vocabulary()
    # 12 actors including the OTHER placeholder + the five non-consensus actors.
    actors = vocab.concepts(Slot.ACTOR)
    assert len(actors) == 13  # 12 seeded + OTHER
    non_consensus_ids = {
        "extraterrestrials", "lost-advanced-civilization", "deity-literal-agent",
        "natural-cataclysm", "unknown-actor",
    }
    seeded_ids = {c.id for c in actors}
    assert non_consensus_ids <= seeded_ids

    assert len(vocab.concepts(Slot.ACTION)) == 11  # 10 seeded + OTHER
    assert len(vocab.concepts(Slot.OBJECT)) == 11
    assert len(vocab.concepts(Slot.PLACE)) == 11
    assert len(vocab.concepts(Slot.MECHANISM)) == 7  # 6 seeded + OTHER
