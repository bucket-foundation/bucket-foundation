"""Property tests over `hte.evidence`: `EvidenceSpan`'s range invariant,
and JSON round trips for `Source` and `EvidenceItem`, unicode text and
stemma self-references included."""
from __future__ import annotations

import pytest
from conftest import unicode_labels
from hypothesis import given
from hypothesis import strategies as st

from hte.evidence import (
    EvidenceItem,
    EvidenceKind,
    EvidenceSpan,
    Source,
    Stance,
    Tier,
)
from hte.timeline import Interval


# --------------------------------------------------------------------------
# EvidenceSpan's own invariant: 0 <= char_start <= char_end
# --------------------------------------------------------------------------


@given(st.integers(min_value=0, max_value=10_000), st.integers(min_value=0, max_value=200))
def test_evidence_span_accepts_valid_range(char_start, extra):
    span = EvidenceSpan(doc_id="d", locator="p1", quote="x", char_start=char_start, char_end=char_start + extra)
    assert span.char_start <= span.char_end


@given(st.integers(min_value=-1000, max_value=-1))
def test_evidence_span_rejects_negative_char_start(neg):
    with pytest.raises(ValueError):
        EvidenceSpan(doc_id="d", locator="p1", quote="x", char_start=neg, char_end=0)


@given(st.integers(min_value=0, max_value=1000), st.integers(min_value=1, max_value=1000))
def test_evidence_span_rejects_char_end_below_char_start(char_start, gap):
    with pytest.raises(ValueError):
        EvidenceSpan(doc_id="d", locator="p1", quote="x", char_start=char_start, char_end=char_start - gap)


@given(unicode_labels)
def test_evidence_span_to_dict_from_dict_round_trips_with_unicode_quote(quote):
    span = EvidenceSpan(doc_id="doc-é", locator="§ 1", quote=quote, char_start=0, char_end=len(quote))
    assert EvidenceSpan.from_dict(span.to_dict()) == span


# --------------------------------------------------------------------------
# Source: stemma self-reference is representable, and round trips
# --------------------------------------------------------------------------


def test_source_self_reference_is_representable():
    """A source naming itself as its own stemma parent is a malformed-but-
    representable input; the dataclass itself imposes no acyclicity
    invariant (that is `hte.belief.effective_count`'s union-find's job to
    survive, tested in tests/swarm/test_belief_props.py)."""
    s = Source(id="s1", kind=EvidenceKind.TEXTUAL, stemma_parents=["s1"])
    assert s.stemma_parents == ["s1"]


@given(st.lists(st.text(min_size=1, max_size=8), max_size=4))
def test_source_to_dict_from_dict_round_trips(parents):
    s = Source(id="s1", kind=EvidenceKind.MATERIAL, date="2026-01-01", stemma_parents=parents)
    restored = Source.from_dict(s.to_dict())
    assert restored == s


def test_source_default_date_and_parents():
    s = Source(id="s1", kind=EvidenceKind.GENETIC)
    assert s.date is None
    assert s.stemma_parents == []


# --------------------------------------------------------------------------
# EvidenceItem: JSON round trip over every optional field, including None
# slots and a present/absent interval
# --------------------------------------------------------------------------


evidence_kinds = st.sampled_from(list(EvidenceKind))
tiers = st.sampled_from(list(Tier))
stances = st.sampled_from(list(Stance))
optional_slot = st.one_of(st.none(), st.text(min_size=1, max_size=12))


@given(
    evidence_kinds, tiers, stances, st.booleans(),
    optional_slot, optional_slot, optional_slot, optional_slot, optional_slot,
    st.one_of(st.none(), st.integers(min_value=-500, max_value=500)),
    st.lists(st.integers(min_value=1, max_value=10_000), max_size=3),
    st.lists(st.integers(min_value=1, max_value=10_000), max_size=3),
)
def test_evidence_item_to_dict_from_dict_round_trips_every_field(
    kind, tier, stance, is_absence, actor, action, obj, place, mechanism, interval_start, supports, refutes,
):
    interval = Interval(interval_start, interval_start) if interval_start is not None else None
    item = EvidenceItem(
        id="e1", kind=kind, tier=tier, source_id="s1",
        span=EvidenceSpan(doc_id="d", locator="p1", quote="q", char_start=0, char_end=1),
        provenance="prov", supports=supports, refutes=refutes, is_absence=is_absence,
        actor=actor, action=action, object=obj, place=place, mechanism=mechanism,
        interval=interval, stance=stance,
    )
    restored = EvidenceItem.from_dict(item.to_dict())
    assert restored.kind == item.kind
    assert restored.tier == item.tier
    assert restored.stance == item.stance
    assert restored.is_absence == item.is_absence
    assert restored.actor == item.actor
    assert restored.action == item.action
    assert restored.object == item.object
    assert restored.place == item.place
    assert restored.mechanism == item.mechanism
    assert restored.interval == item.interval
    assert restored.supports == item.supports
    assert restored.refutes == item.refutes


def test_evidence_item_default_stance_is_positive_on_missing_key():
    item = EvidenceItem(
        id="e1", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="s1",
        span=EvidenceSpan(doc_id="d", locator="p", quote="q", char_start=0, char_end=1), provenance="p",
    )
    d = item.to_dict()
    del d["stance"]
    restored = EvidenceItem.from_dict(d)
    assert restored.stance == Stance.POSITIVE


def test_evidence_item_defaults_have_empty_slots_and_no_interval():
    item = EvidenceItem(
        id="e1", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="s1",
        span=EvidenceSpan(doc_id="d", locator="p", quote="q", char_start=0, char_end=1), provenance="p",
    )
    assert item.supports == []
    assert item.refutes == []
    assert item.views == {}
    assert item.is_absence is False
    assert item.actor is None
    assert item.interval is None
    assert item.stance == Stance.POSITIVE


def test_kind_family_covers_every_evidence_kind():
    from hte.evidence import KIND_FAMILY

    for kind in EvidenceKind:
        assert kind in KIND_FAMILY
