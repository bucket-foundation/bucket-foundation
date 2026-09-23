import pytest

from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier, TIER_WEIGHT
from hte.timeline import Interval

def _span() -> EvidenceSpan:
    return EvidenceSpan(doc_id="doc-1", locator="p.4", quote="a hand-tool mark", char_start=10, char_end=27)

def test_evidence_span_rejects_bad_range():
    with pytest.raises(ValueError):
        EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=10, char_end=5)

def test_evidence_span_doc_length_is_optional():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1000)
    assert span.doc_length is None

def test_evidence_span_accepts_char_end_at_doc_length():
    span = EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=4, doc_length=4)
    assert span.doc_length == 4

def test_evidence_span_refuses_char_end_past_doc_length():
    with pytest.raises(ValueError, match="exceeds doc_id"):
        EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=5, doc_length=4)

def test_evidence_span_rejects_negative_doc_length():
    with pytest.raises(ValueError):
        EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1, doc_length=-1)

def test_evidence_span_roundtrip():
    span = _span()
    assert EvidenceSpan.from_dict(span.to_dict()) == span

def test_evidence_span_roundtrip_carries_doc_length():
    span = EvidenceSpan(doc_id="doc-1", locator="p.4", quote="a hand-tool mark", char_start=10, char_end=27, doc_length=100)
    back = EvidenceSpan.from_dict(span.to_dict())
    assert back == span
    assert back.doc_length == 100

def test_evidence_span_from_dict_without_doc_length_defaults_to_none():
    old_shape = {"doc_id": "d", "locator": "l", "quote": "q", "char_start": 0, "char_end": 1}
    span = EvidenceSpan.from_dict(old_shape)
    assert span.doc_length is None

def test_tier_weight_table_matches_paper():
    assert TIER_WEIGHT[Tier.T1] == 2.0
    assert TIER_WEIGHT[Tier.T2] == 1.5
    assert TIER_WEIGHT[Tier.T3] == 1.0
    assert TIER_WEIGHT[Tier.T4] == 0.5
    assert TIER_WEIGHT[Tier.T5] == 0.25
    assert TIER_WEIGHT[Tier.T6] == 0.1

def test_source_roundtrip():
    src = Source(id="src-1", kind=EvidenceKind.MATERIAL, date="2019", stemma_parents=["src-0"])
    back = Source.from_dict(src.to_dict())
    assert back == src

def test_evidence_item_roundtrip():
    item = EvidenceItem(
        id="ev-1", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="src-1",
        span=_span(), provenance="manual", supports=[7], refutes=[9],
        views={"blended_a": 0.9}, is_absence=False,
    )
    back = EvidenceItem.from_dict(item.to_dict())
    assert back == item

def test_evidence_item_unnamed_slots_default_to_none_and_positive_stance():
    item = EvidenceItem(id="ev-2", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src-1",
                         span=_span(), provenance="manual")
    assert item.actor is None
    assert item.interval is None
    assert item.stance == Stance.POSITIVE

def test_evidence_item_slots_roundtrip():
    item = EvidenceItem(
        id="ev-3", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="src-1",
        span=_span(), provenance="manual",
        actor="planck", action="proposed", object="blackbody-spectrum",
        place="solvay-brussels", mechanism="quantization",
        interval=Interval(start=1900, end=1900), stance=Stance.NEGATIVE,
    )
    back = EvidenceItem.from_dict(item.to_dict())
    assert back == item
    assert back.interval == Interval(start=1900, end=1900)
    assert back.stance == Stance.NEGATIVE
