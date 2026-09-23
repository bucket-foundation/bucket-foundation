from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from hte.address import time_bin_index
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.generate import (
    PLACEMENT_CONCEPT_SLOTS,
    enumerate_placements,
    from_evidence,
    neighbors,
)
from hte.hypothesis import Hypothesis, Placement, Sequence
from hte.timeline import AllenRelation, Interval, Resolution

from tests.swarm2.conftest import small_vocab

def _preseeded_vocab(n_per_slot: dict[Slot, int]) -> Vocabulary:
    by_slot: dict[Slot, list[Concept]] = {}
    for slot, n in n_per_slot.items():
        by_slot[slot] = [
            Concept(id=f"{slot.value}-c{i}", slot=slot, label=f"{slot.value.title()} {i}",
                    prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS)
            for i in range(n)
        ]
    return Vocabulary(by_slot=by_slot)

small_counts_st = st.integers(min_value=1, max_value=3)

@given(
    n_actors=small_counts_st, n_actions=small_counts_st, n_objects=small_counts_st,
    n_places=small_counts_st, n_mechanisms=small_counts_st, n_bins=st.integers(min_value=1, max_value=3),
    max_items=st.integers(min_value=0, max_value=400),
)
@settings(max_examples=300)
def test_enumerate_placements_max_items_returns_exactly_that_many_or_the_full_space(
    n_actors, n_actions, n_objects, n_places, n_mechanisms, n_bins, max_items,
):
    vocab = _preseeded_vocab({
        Slot.ACTOR: n_actors, Slot.ACTION: n_actions, Slot.OBJECT: n_objects,
        Slot.PLACE: n_places, Slot.MECHANISM: n_mechanisms,
    })
    full_size = (n_actors + 1) * (n_actions + 1) * (n_objects + 1) * (n_places + 1) * (n_mechanisms + 1) * n_bins
    hyps = list(enumerate_placements(vocab, range(n_bins), max_items=max_items))
    assert len(hyps) == min(max_items, full_size)

@given(
    n_actors=small_counts_st, n_actions=small_counts_st, n_objects=small_counts_st,
    n_places=small_counts_st, n_mechanisms=small_counts_st, n_bins=st.integers(min_value=1, max_value=3),
)
@settings(max_examples=300)
def test_enumerate_placements_no_cap_returns_every_slot_size_product(
    n_actors, n_actions, n_objects, n_places, n_mechanisms, n_bins,
):
    vocab = _preseeded_vocab({
        Slot.ACTOR: n_actors, Slot.ACTION: n_actions, Slot.OBJECT: n_objects,
        Slot.PLACE: n_places, Slot.MECHANISM: n_mechanisms,
    })
    full_size = (n_actors + 1) * (n_actions + 1) * (n_objects + 1) * (n_places + 1) * (n_mechanisms + 1) * n_bins
    hyps = list(enumerate_placements(vocab, range(n_bins)))
    assert len(hyps) == full_size

@given(
    n_actors=small_counts_st, n_actions=small_counts_st, n_objects=small_counts_st,
    n_places=small_counts_st, n_mechanisms=small_counts_st,
)
@settings(max_examples=300)
def test_enumerate_placements_full_space_includes_other_in_every_slot(
    n_actors, n_actions, n_objects, n_places, n_mechanisms,
):
    vocab = _preseeded_vocab({
        Slot.ACTOR: n_actors, Slot.ACTION: n_actions, Slot.OBJECT: n_objects,
        Slot.PLACE: n_places, Slot.MECHANISM: n_mechanisms,
    })
    hyps = list(enumerate_placements(vocab, range(1)))
    seen = {slot: set() for slot in PLACEMENT_CONCEPT_SLOTS}
    for h in hyps:
        p = h.content
        seen[Slot.ACTOR].add(p.actor)
        seen[Slot.ACTION].add(p.action)
        seen[Slot.OBJECT].add(p.object)
        seen[Slot.PLACE].add(p.place)
        seen[Slot.MECHANISM].add(p.mechanism)
    for slot in PLACEMENT_CONCEPT_SLOTS:
        other_ids = {c.id for c in vocab.concepts(slot) if c.consensus_status == ConsensusStatus.OTHER}
        assert other_ids and other_ids <= seen[slot]

years_st = st.integers(min_value=1000, max_value=1800)

@given(
    actor=st.integers(0, 2), action=st.integers(0, 1), obj=st.integers(0, 1),
    place=st.integers(0, 1), mechanism=st.integers(0, 1), year=years_st,
)
@settings(max_examples=300)
def test_neighbors_never_returns_the_input_placement(actor, action, obj, place, mechanism, year):
    vocab = _preseeded_vocab({Slot.ACTOR: 3, Slot.ACTION: 2, Slot.OBJECT: 2, Slot.PLACE: 2, Slot.MECHANISM: 2})
    placement = Placement(
        actor=f"actor-c{actor}", action=f"action-c{action}", object=f"object-c{obj}",
        place=f"place-c{place}", mechanism=f"mechanism-c{mechanism}", interval=Interval(year, year),
    )
    h = Hypothesis.from_placement(placement, vocab)
    for n in neighbors(h, vocab):
        assert n.address != h.address
        assert n.content != h.content

@given(
    first_actor=st.integers(0, 1), second_actor=st.integers(0, 1),
    relation_idx=st.integers(0, len(list(AllenRelation)) - 1), year_a=years_st, year_b=years_st,
)
@settings(max_examples=300)
def test_neighbors_never_returns_the_input_sequence(first_actor, second_actor, relation_idx, year_a, year_b):
    vocab = _preseeded_vocab({Slot.ACTOR: 2, Slot.ACTION: 2, Slot.OBJECT: 2, Slot.PLACE: 2, Slot.MECHANISM: 2})
    relation = list(AllenRelation)[relation_idx]
    length = 5
    first = Placement(actor=f"actor-c{first_actor}", action="action-c0", object="object-c0",
                       place="place-c0", mechanism="mechanism-c0", interval=Interval(year_a, year_a + length))
    second = Placement(actor=f"actor-c{second_actor}", action="action-c0", object="object-c0",
                        place="place-c0", mechanism="mechanism-c0", interval=Interval(year_b, year_b + length))
    seq = Sequence(first=first, relation=relation, second=second)
    h = Hypothesis.from_sequence(seq, vocab)
    for n in neighbors(h, vocab):
        assert n.address != h.address
        assert n.content != h.content

def _slots_vocab() -> Vocabulary:
    return _preseeded_vocab({Slot.ACTOR: 3, Slot.ACTION: 2, Slot.OBJECT: 2, Slot.PLACE: 2, Slot.MECHANISM: 2})

@given(
    n_items=st.integers(min_value=1, max_value=6),
    seed=st.integers(min_value=0, max_value=1000),
    data=st.data(),
)
@settings(max_examples=300)
def test_from_evidence_yields_at_least_one_hypothesis_per_evidence_item_carrying_slots(n_items, seed, data):
    vocab = _slots_vocab()
    items = []
    for i in range(n_items):
        actor = data.draw(st.sampled_from(["actor-c0", "actor-c1", "actor-c2"]))
        year = data.draw(years_st)
        span = EvidenceSpan("doc", "loc", f"quote-{i}", 0, len(f"quote-{i}"))
        items.append(EvidenceItem(
            id=f"ev-{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="s1", span=span, provenance="p",
            actor=actor, action="action-c0", object="object-c0", place="place-c0", mechanism="mechanism-c0",
            interval=Interval(year, year),
        ))

    hyps = from_evidence(items, vocab, Resolution.CENTURY, seed=seed)
    covered = set()
    for h in hyps:
        for eid in h.meta.get("evidence", []):
            covered.add(eid)
    assert {item.id for item in items} <= covered

@given(
    n_items=st.integers(min_value=2, max_value=5),
    seed=st.integers(min_value=0, max_value=1000),
    data=st.data(),
)
@settings(max_examples=300)
def test_from_evidence_is_deterministic_per_seed(n_items, seed, data):
    vocab = _slots_vocab()
    items = []
    for i in range(n_items):
        actor = data.draw(st.sampled_from(["actor-c0", "actor-c1", "actor-c2"]))
        year = data.draw(years_st)
        span = EvidenceSpan("doc", "loc", f"quote-{i}", 0, len(f"quote-{i}"))
        items.append(EvidenceItem(
            id=f"ev-{i}", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="s1", span=span, provenance="p",
            actor=actor, action="action-c0", object="object-c0", place="place-c0", mechanism="mechanism-c0",
            interval=Interval(year, year),
        ))

    first = [(h.address, h.meta.get("generator"), tuple(h.meta.get("evidence", []))) for h in from_evidence(items, vocab, Resolution.CENTURY, seed=seed)]
    second = [(h.address, h.meta.get("generator"), tuple(h.meta.get("evidence", []))) for h in from_evidence(items, vocab, Resolution.CENTURY, seed=seed)]
    assert first == second
