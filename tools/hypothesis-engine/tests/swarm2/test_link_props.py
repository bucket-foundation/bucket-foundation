"""`hte.link.link_evidence`: idempotency, never SUPPORTING a hypothesis
whose interval is disjoint from the item's own (a disjoint, otherwise
fully slot-matching item can still *refute* that hypothesis, a documented
"competing date" reading, `link_evidence`'s own docstring; it is the
`supports` side this property scopes to, see `test_link_props.py`'s own
note below), and near-identical labels (`"Actor 5"`/`"Actor 10"`,
`"planck"`/`"planck-1900"`, `"bell"`/`"bell-inequality"`) never
cross-link two different concepts as the same slot value.
"""
from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from hte.concepts import Slot
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Stance, Tier
from hte.hypothesis import Hypothesis
from hte.link import link_evidence
from hte.timeline import AllenRelation, Interval, relate

from tests.swarm2.conftest import (
    NEAR_LABEL_PAIRS,
    hypothesis_for,
    near_label_pairs_vocab,
    small_vocab,
)

_DISJOINT = frozenset({AllenRelation.BEFORE, AllenRelation.AFTER})

# --------------------------------------------------------------------------
# Strategies over `small_vocab()`'s own fixed concept set
# --------------------------------------------------------------------------

_VOCAB = small_vocab()
_ACTORS = [c.id for c in _VOCAB.concepts(Slot.ACTOR)]
_ACTIONS = [c.id for c in _VOCAB.concepts(Slot.ACTION)]
_OBJECTS = [c.id for c in _VOCAB.concepts(Slot.OBJECT)]
_PLACES = [c.id for c in _VOCAB.concepts(Slot.PLACE)]
_MECHANISMS = [c.id for c in _VOCAB.concepts(Slot.MECHANISM)]

_SLOT_POOLS = {
    Slot.ACTOR: _ACTORS, Slot.ACTION: _ACTIONS, Slot.OBJECT: _OBJECTS,
    Slot.PLACE: _PLACES, Slot.MECHANISM: _MECHANISMS,
}


def _maybe_id(pool: list[str]):
    return st.one_of(st.none(), st.sampled_from(pool))


item_slots_st = st.fixed_dictionaries({
    "actor": _maybe_id(_ACTORS), "action": _maybe_id(_ACTIONS), "object": _maybe_id(_OBJECTS),
    "place": _maybe_id(_PLACES), "mechanism": _maybe_id(_MECHANISMS),
})

hyp_slots_st = st.fixed_dictionaries({
    "actor": st.sampled_from(_ACTORS), "action": st.sampled_from(_ACTIONS), "object": st.sampled_from(_OBJECTS),
    "place": st.sampled_from(_PLACES), "mechanism": st.sampled_from(_MECHANISMS),
})

years_st = st.integers(min_value=1000, max_value=1200)
lengths_st = st.integers(min_value=0, max_value=20)
stances_st = st.sampled_from(list(Stance))


@st.composite
def intervals_st(draw):
    start = draw(years_st)
    return Interval(start=start, end=start + draw(lengths_st))


def _item(item_id: str, slots: dict, interval: Interval | None, stance: Stance) -> EvidenceItem:
    span = EvidenceSpan("doc", "loc", "q", 0, 1)
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="s1", span=span, provenance="p",
        actor=slots["actor"], action=slots["action"], object=slots["object"],
        place=slots["place"], mechanism=slots["mechanism"], interval=interval, stance=stance,
    )


def _hyp(hyp_id: str, slots: dict, interval: Interval) -> Hypothesis:
    return hypothesis_for(_VOCAB, actor=slots["actor"], action=slots["action"], object_=slots["object"],
                           place=slots["place"], mechanism=slots["mechanism"], interval=interval)


# --------------------------------------------------------------------------
# Idempotency: a second call changes nothing.
# --------------------------------------------------------------------------


@given(
    item_slots=item_slots_st, item_interval=st.one_of(st.none(), intervals_st()), stance=stances_st,
    hyp_slots_list=st.lists(hyp_slots_st, min_size=1, max_size=4), hyp_interval=intervals_st(),
)
@settings(max_examples=300)
def test_link_evidence_is_idempotent(item_slots, item_interval, stance, hyp_slots_list, hyp_interval):
    item = _item("ev-1", item_slots, item_interval, stance)
    hyps = [_hyp(f"h{i}", slots, hyp_interval) for i, slots in enumerate(hyp_slots_list)]

    link_evidence([item], hyps, _VOCAB, threshold=0.6)
    supports_1, refutes_1 = list(item.supports), list(item.refutes)

    link_evidence([item], hyps, _VOCAB, threshold=0.6)
    supports_2, refutes_2 = list(item.supports), list(item.refutes)

    assert supports_1 == supports_2
    assert refutes_1 == refutes_2


# --------------------------------------------------------------------------
# Never SUPPORTS a hypothesis whose interval is disjoint from the item's.
#
# `link_evidence`'s own docstring documents the opposite case on purpose:
# every slot matching but the interval sitting strictly before/after the
# hypothesis's own interval REFUTES it, "a competing date for an
# otherwise agreed-on event." So the property this file checks is scoped
# to `supports` alone: a disjoint interval is a documented, legitimate
# path INTO `refutes`, never into `supports`.
# --------------------------------------------------------------------------


@given(
    item_slots=hyp_slots_st,  # every slot named, to maximize the chance of an otherwise-full match
    item_interval=intervals_st(), stance=stances_st,
    hyp_slots_list=st.lists(hyp_slots_st, min_size=1, max_size=4), hyp_interval=intervals_st(),
)
@settings(max_examples=300)
def test_link_evidence_never_supports_a_disjoint_interval_hypothesis(item_slots, item_interval, stance, hyp_slots_list, hyp_interval):
    item = _item("ev-1", item_slots, item_interval, stance)
    hyps = [_hyp(f"h{i}", slots, hyp_interval) for i, slots in enumerate(hyp_slots_list)]
    link_evidence([item], hyps, _VOCAB, threshold=0.6)

    for h in hyps:
        if relate(item.interval, h.content.interval) in _DISJOINT:
            assert h.address not in item.supports


# --------------------------------------------------------------------------
# Near-identical labels do not cross-link.
# --------------------------------------------------------------------------


@given(pair_idx=st.integers(min_value=0, max_value=len(NEAR_LABEL_PAIRS) - 1), use_raw_label=st.booleans())
@settings(max_examples=300)
def test_near_identical_labels_do_not_cross_link_as_a_positive_match(pair_idx, use_raw_label):
    """An item naming one member of a near-identical-label pair (by id, or
    by its raw label text, simulating an unresolved extraction) never
    reads as matching a hypothesis naming the OTHER member: with every
    other slot and the interval held identical between item and
    hypothesis, a POSITIVE-stance item is left entirely unlinked (one
    slot mismatches, `link_evidence`'s own "exactly one mismatch under a
    POSITIVE stance... is left unlinked" branch), never counted as a
    `supports` match."""
    vocab = near_label_pairs_vocab()
    slot, id_a, id_b = NEAR_LABEL_PAIRS[pair_idx]
    concept_a = vocab.get(slot, id_a)

    fixed_slots = {
        "actor": "actor-five", "action": "planck-plain", "object": "bell-plain",
        "place": "place-1", "mechanism": "mech-1",
    }
    item_slots = dict(fixed_slots)
    item_slots[slot.value] = concept_a.label if use_raw_label else id_a

    interval = Interval(1900, 1900)
    item = _item("ev-1", item_slots, interval, Stance.POSITIVE)

    hyp_slots = dict(fixed_slots)
    hyp_slots[slot.value] = id_b
    h = hypothesis_for(
        vocab, actor=hyp_slots["actor"], action=hyp_slots["action"], object_=hyp_slots["object"],
        place=hyp_slots["place"], mechanism=hyp_slots["mechanism"], interval=interval,
    )

    link_evidence([item], [h], vocab, threshold=0.6)
    assert h.address not in item.supports
    assert h.address not in item.refutes  # positive stance: a single mismatch leaves it unlinked entirely


@given(pair_idx=st.integers(min_value=0, max_value=len(NEAR_LABEL_PAIRS) - 1))
@settings(max_examples=300)
def test_near_identical_labels_still_permit_an_explicit_negative_correction(pair_idx):
    """The mirror case: a NEGATIVE-stance item ("not member A, but
    something else") naming the OTHER member in every other respect DOES
    reach `refutes` for the hypothesis naming member A, `link_evidence`'s
    own "a corrected reading of one field" branch, which this file does
    not read as a cross-link (it names a different address on purpose,
    to deny it) but checks it still fires so the near-identical-label fix
    has not also silently broken this legitimate path."""
    vocab = near_label_pairs_vocab()
    slot, id_a, id_b = NEAR_LABEL_PAIRS[pair_idx]

    fixed_slots = {
        "actor": "actor-five", "action": "planck-plain", "object": "bell-plain",
        "place": "place-1", "mechanism": "mech-1",
    }
    item_slots = dict(fixed_slots)
    item_slots[slot.value] = id_b

    interval = Interval(1900, 1900)
    item = _item("ev-1", item_slots, interval, Stance.NEGATIVE)

    hyp_slots = dict(fixed_slots)
    hyp_slots[slot.value] = id_a
    h = hypothesis_for(
        vocab, actor=hyp_slots["actor"], action=hyp_slots["action"], object_=hyp_slots["object"],
        place=hyp_slots["place"], mechanism=hyp_slots["mechanism"], interval=interval,
    )

    link_evidence([item], [h], vocab, threshold=0.6)
    assert h.address in item.refutes
    assert h.address not in item.supports
