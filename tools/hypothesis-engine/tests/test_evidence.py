import pytest

from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier, TIER_WEIGHT


def _span() -> EvidenceSpan:
    return EvidenceSpan(doc_id="doc-1", locator="p.4", quote="a hand-tool mark", char_start=10, char_end=27)


def test_evidence_span_rejects_bad_range():
    with pytest.raises(ValueError):
        EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=10, char_end=5)


def test_evidence_span_roundtrip():
    span = _span()
    assert EvidenceSpan.from_dict(span.to_dict()) == span


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
