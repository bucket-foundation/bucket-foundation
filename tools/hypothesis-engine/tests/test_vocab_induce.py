"""`hte.vocab_induce`: building a `Vocabulary` off a corpus's own evidence,
with no hand-written seed (the default case) or merged on top of one
(`docs/PRODUCTION-SCHEMA-ALIGNMENT.md`'s "wire it as the default... and as
a merge step" framing).
"""
from __future__ import annotations

from hte import vocab_induce
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from hte.corpus import Corpus, GroundTruthEvent
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.timeline import Interval


def _item(item_id: str, **slots: str | None) -> EvidenceItem:
    quote = f"evidence for {item_id}"
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id=f"src-{item_id}",
        span=EvidenceSpan(doc_id=f"src-{item_id}", locator="p0", quote=quote, char_start=0, char_end=len(quote)),
        provenance="test-fixture", stance=Stance.POSITIVE,
        actor=slots.get("actor"), action=slots.get("action"), object=slots.get("object"),
        place=slots.get("place"), mechanism=slots.get("mechanism"), interval=Interval(start=2020, end=2020),
    )


def _corpus(items: list[EvidenceItem], *, ground_truth: list[GroundTruthEvent] | None = None) -> Corpus:
    sources = {e.source_id: Source(id=e.source_id, kind=e.kind) for e in items}
    return Corpus(sources=sources, evidence=items, ground_truth=ground_truth or [], provenance=[], vocab=Vocabulary())


# --------------------------------------------------------------------------
# no-seed default
# --------------------------------------------------------------------------


def test_no_seed_induces_a_concept_per_distinct_raw_value():
    items = [
        _item("e0", actor="Tyndall (1869), On the blue colour of the sky", object="why-the-sky-is-blue"),
        _item("e1", actor="Tyndall (1869), On the blue colour of the sky"),  # same actor again, no new concept
    ]
    vocab = vocab_induce.induce(_corpus(items))
    actors = {c.id: c for c in vocab.concepts(Slot.ACTOR)}
    objects = {c.id: c for c in vocab.concepts(Slot.OBJECT)}
    # a raw label gets a slugified id...
    assert "tyndall-1869-on-the-blue-colour-of-the-sky" in actors
    assert actors["tyndall-1869-on-the-blue-colour-of-the-sky"].label == "Tyndall (1869), On the blue colour of the sky"
    # only one concept for the two evidence items that name the identical label
    assert sum(1 for c in vocab.concepts(Slot.ACTOR) if "tyndall" in c.id) == 1
    # ...an already id-shaped value is kept verbatim, humanized into a label
    assert "why-the-sky-is-blue" in objects
    assert objects["why-the-sky-is-blue"].label == "Why The Sky Is Blue"


def test_no_seed_still_carries_other_and_five_non_consensus_actors():
    vocab = vocab_induce.induce(_corpus([_item("e0", actor="some-actor")]))
    for slot in Slot:
        assert any(c.id == other_id(slot) for c in vocab.concepts(slot))
    non_consensus = [c for c in vocab.concepts(Slot.ACTOR) if c.consensus_status != ConsensusStatus.CONSENSUS and c.consensus_status != ConsensusStatus.OTHER]
    assert len(non_consensus) == vocab_induce.N_EXOTIC_ACTORS == 5


def test_empty_corpus_still_returns_a_working_vocabulary():
    vocab = vocab_induce.induce(_corpus([]))
    assert len(vocab.concepts(Slot.ACTOR)) == 1 + vocab_induce.N_EXOTIC_ACTORS  # OTHER + 5
    for slot in (Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM):
        assert len(vocab.concepts(slot)) == 1  # OTHER only


def test_none_and_other_values_are_never_induced():
    items = [_item("e0", actor=None, object=other_id(Slot.OBJECT))]
    vocab = vocab_induce.induce(_corpus(items))
    assert len(vocab.concepts(Slot.OBJECT)) == 1  # OTHER only, kept as the single existing concept


# --------------------------------------------------------------------------
# min_count denoising
# --------------------------------------------------------------------------


def test_min_count_drops_values_under_threshold():
    items = [_item("e0", mechanism="rare-mechanism"), _item("e1", mechanism="common-mechanism"), _item("e2", mechanism="common-mechanism")]
    vocab = vocab_induce.induce(_corpus(items), min_count=2)
    ids = {c.id for c in vocab.concepts(Slot.MECHANISM)}
    assert "common-mechanism" in ids
    assert "rare-mechanism" not in ids


def test_min_count_one_drops_nothing():
    items = [_item("e0", mechanism="only-once")]
    vocab = vocab_induce.induce(_corpus(items), min_count=1)
    assert "only-once" in {c.id for c in vocab.concepts(Slot.MECHANISM)}


# --------------------------------------------------------------------------
# stable_id
# --------------------------------------------------------------------------


def test_stable_id_is_deterministic_and_slug_shaped():
    import re

    a = vocab_induce.stable_id("Rayleigh's lambda^-4 law")
    b = vocab_induce.stable_id("Rayleigh's lambda^-4 law")
    assert a == b
    assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", a)


def test_stable_id_strips_diacritics():
    assert vocab_induce.stable_id("Schrödinger") == "schrodinger"


def test_collision_disambiguated_with_numeric_suffix():
    # "A/B" and "A B" both slugify to "a-b"; the second occurrence gets -2.
    items = [_item("e0", place="A/B"), _item("e1", place="A B")]
    vocab = vocab_induce.induce(_corpus(items))
    ids = sorted(c.id for c in vocab.concepts(Slot.PLACE) if c.id != other_id(Slot.PLACE))
    assert ids == ["a-b", "a-b-2"]


# --------------------------------------------------------------------------
# merge with a seed
# --------------------------------------------------------------------------


def _seed() -> Vocabulary:
    by_slot = {
        Slot.ACTOR: [
            Concept(id="known-actor", slot=Slot.ACTOR, label="Known Actor", prior_logit=0.5, consensus_status=ConsensusStatus.CONSENSUS),
            Concept(id="seed-fringe", slot=Slot.ACTOR, label="Seed Fringe", prior_logit=-2.0, consensus_status=ConsensusStatus.FRINGE),
            Concept(id="seed-contested", slot=Slot.ACTOR, label="Seed Contested", prior_logit=-1.0, consensus_status=ConsensusStatus.CONTESTED),
            Concept(id="seed-fringe-2", slot=Slot.ACTOR, label="Seed Fringe 2", prior_logit=-2.0, consensus_status=ConsensusStatus.FRINGE),
            Concept(id="seed-contested-2", slot=Slot.ACTOR, label="Seed Contested 2", prior_logit=-1.0, consensus_status=ConsensusStatus.CONTESTED),
            Concept(id="seed-fringe-3", slot=Slot.ACTOR, label="Seed Fringe 3", prior_logit=-2.0, consensus_status=ConsensusStatus.FRINGE),
        ],
        Slot.OBJECT: [Concept(id="known-object", slot=Slot.OBJECT, label="Known Object", prior_logit=0.2, consensus_status=ConsensusStatus.CONSENSUS)],
    }
    return Vocabulary(by_slot=by_slot)


def test_seed_concepts_are_kept_verbatim_and_first():
    vocab = vocab_induce.induce(_corpus([_item("e0", actor="known-actor")]), seed_vocab=_seed())
    actors = vocab.concepts(Slot.ACTOR)
    known = next(c for c in actors if c.id == "known-actor")
    assert known.label == "Known Actor"
    assert known.prior_logit == 0.5
    assert known.consensus_status == ConsensusStatus.CONSENSUS
    # index 0 in the induced vocabulary too: seed order preserved
    assert vocab.vocab_index(Slot.ACTOR, "known-actor") == 0


def test_seed_already_carrying_five_non_consensus_actors_gets_no_extra():
    vocab = vocab_induce.induce(_corpus([_item("e0", actor="known-actor")]), seed_vocab=_seed())
    non_consensus = [c for c in vocab.concepts(Slot.ACTOR) if c.consensus_status in (ConsensusStatus.FRINGE, ConsensusStatus.CONTESTED)]
    assert len(non_consensus) == 5
    assert {c.id for c in non_consensus} == {"seed-fringe", "seed-contested", "seed-fringe-2", "seed-contested-2", "seed-fringe-3"}


def test_new_value_not_in_seed_is_appended():
    vocab = vocab_induce.induce(_corpus([_item("e0", object="a brand new finding")]), seed_vocab=_seed())
    objects = vocab.concepts(Slot.OBJECT)
    assert objects[0].id == "known-object"  # seed stays first
    assert any(c.label == "a brand new finding" for c in objects)


def test_value_already_a_known_seed_id_is_not_duplicated():
    vocab = vocab_induce.induce(_corpus([_item("e0", object="known-object")]), seed_vocab=_seed())
    assert sum(1 for c in vocab.concepts(Slot.OBJECT) if c.id == "known-object") == 1


def test_seed_alpha_and_default_alpha_carried_through():
    seed = _seed()
    seed.alpha[Slot.ACTOR] = 3.5
    vocab = vocab_induce.induce(_corpus([]), seed_vocab=seed)
    assert vocab.alpha[Slot.ACTOR] == 3.5
