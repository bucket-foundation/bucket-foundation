from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from hypothesis import strategies as st

from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.timeline import Interval

YEAR_MIN = -50_000
YEAR_MAX = 50_000

years = st.integers(min_value=YEAR_MIN, max_value=YEAR_MAX)
small_nonneg = st.integers(min_value=0, max_value=5_000)
small_pos = st.integers(min_value=1, max_value=5_000)

@st.composite
def intervals(draw, *, allow_zero_length: bool = True):
    start = draw(years)
    length = draw(small_nonneg if allow_zero_length else small_pos)
    return Interval(start=start, end=start + length)

@st.composite
def interval_pairs(draw, *, allow_zero_length: bool = True):
    a = draw(intervals(allow_zero_length=allow_zero_length))
    b = draw(intervals(allow_zero_length=allow_zero_length))
    return a, b

unicode_labels = st.text(min_size=0, max_size=40)
unicode_nonempty_labels = st.text(min_size=1, max_size=40)

def fresh_vocabulary() -> Vocabulary:
    return Vocabulary()

def vocabulary_with_other_preseeded() -> Vocabulary:
    from hte.concepts import other_concept

    by_slot = {slot: [other_concept(slot)] for slot in Slot}
    return Vocabulary(by_slot=by_slot)

def vocabulary_with_extra(slot: Slot, labels: list[str], *, alpha: float = 1.0) -> Vocabulary:
    vocab = Vocabulary(default_alpha=alpha)
    for i, label in enumerate(labels):
        vocab.add(Concept(
            id=f"{slot.value}-extra-{i}", slot=slot, label=label,
            prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS,
        ))
    return vocab

consensus_statuses = st.sampled_from(list(ConsensusStatus))
slots_st = st.sampled_from(list(Slot))

unit_floats = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)

@st.composite
def simplex_points(draw):
    if draw(st.booleans()):
        return draw(st.sampled_from([(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]))
    x = draw(unit_floats)
    y = draw(unit_floats)
    lo, hi = min(x, y), max(x, y)
    b, d, u = lo, hi - lo, 1.0 - hi
    return b, d, u

evidence_weights = st.floats(min_value=0.0, max_value=1_000_000.0, allow_nan=False, allow_infinity=False)
positive_W = st.floats(min_value=1e-6, max_value=1_000.0, allow_nan=False, allow_infinity=False)

def cyclic_sources(prefix: str, n: int, *, kind: EvidenceKind = EvidenceKind.TEXTUAL) -> list[Source]:
    ids = [f"{prefix}-{i}" for i in range(n)]
    return [
        Source(id=ids[i], kind=kind, stemma_parents=[ids[(i + 1) % n]])
        for i in range(n)
    ]

def evidence_span(text: str = "quoted text", doc_id: str = "doc-1") -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="p1", quote=text, char_start=0, char_end=len(text))

def evidence_item(
    item_id: str,
    *,
    kind: EvidenceKind = EvidenceKind.TEXTUAL,
    tier: Tier = Tier.T3,
    source_id: str = "src-1",
    supports: list[int] | None = None,
    refutes: list[int] | None = None,
    is_absence: bool = False,
    stance: Stance = Stance.POSITIVE,
) -> EvidenceItem:
    return EvidenceItem(
        id=item_id, kind=kind, tier=tier, source_id=source_id,
        span=evidence_span(), provenance="test-fixture",
        supports=list(supports or []), refutes=list(refutes or []),
        is_absence=is_absence, stance=stance,
    )

evidence_kinds_st = st.sampled_from(list(EvidenceKind))
tiers_st = st.sampled_from(list(Tier))
