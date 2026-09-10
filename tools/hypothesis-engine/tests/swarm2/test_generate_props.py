"""Property tests for `hte.generate`: `enumerate_placements` with
`max_items` returns exactly that many and (over the full, untruncated
combinatorial space of a small controlled vocabulary, "vocabulary-size
items" below) includes OTHER at least once per slot; `neighbors` never
returns the input; `from_evidence` produces at least one hypothesis per
evidence item carrying slots and is deterministic per seed.

A note on scope for the OTHER-coverage half of the first property: this
module's own docstring for `combinatorial_sample` documents, by name, a
"concrete, confirmed failure" of `enumerate_placements` under a SMALL
`max_items` relative to a large vocabulary: `itertools.product`'s own
left-to-right nesting (ACTOR slowest, TIME_BIN fastest) means a small cap
never advances ACTOR/ACTION/OBJECT/PLACE past their first vocabulary
entry at all, so OTHER (appended LAST by `Vocabulary.__post_init__` for
any vocabulary loaded from JSON, `hte.concepts.Vocabulary.from_dict`'s
own by_slot-before-OTHER order) would need a `max_items` on the order of
the FULL product size before ACTOR's own OTHER is ever reached.
`combinatorial_sample` exists to fix this by drawing each
axis independently rather than relying on iteration order. So this file
reads "the first vocabulary-size items" as the full, untruncated product
of a deliberately small controlled vocabulary (`max_items=None`). Testing
an artificially small cap over a large vocabulary instead would only
re-confirm the module's own already-documented, already-fixed-elsewhere
limitation, surfacing nothing new.
"""
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

# --------------------------------------------------------------------------
# A pre-seeded small vocabulary: named concepts are placed in `by_slot`
# BEFORE `Vocabulary.__post_init__` runs, so OTHER lands LAST in every
# slot's list (`Vocabulary.__post_init__`'s own "append if missing" rule),
# matching every real, JSON-loaded vocabulary this package ships rather
# than the OTHER-always-first shape a bare `Vocabulary(); vocab.add(...)`
# construction (`conftest.small_vocab`) produces.
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# enumerate_placements: max_items returns exactly that many
# --------------------------------------------------------------------------


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
    # +1 per slot for OTHER, which enumerate_placements always sweeps too.
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


# --------------------------------------------------------------------------
# enumerate_placements: OTHER appears at least once per slot, over the
# full (untruncated) product of a small controlled vocabulary.
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# neighbors: never returns the input, for a placement or a sequence
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# from_evidence: at least one hypothesis per evidence item carrying slots
# (a concept-bearing slot plus a dated interval, the two things
# `_hypothesis_from_evidence_slots` needs to build that item's own
# placement); deterministic per seed.
# --------------------------------------------------------------------------


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
