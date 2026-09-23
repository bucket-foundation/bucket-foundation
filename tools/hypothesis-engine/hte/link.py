from __future__ import annotations

import difflib
import re
import unicodedata
from typing import Sequence

from .belief import edge_strength
from .concepts import Slot, Vocabulary
from .evidence import EvidenceItem, Stance
from .generate import PLACEMENT_CONCEPT_SLOTS
from .hypothesis import Hypothesis, Placement
from .timeline import AllenRelation, relate

_DISJOINT_RELATIONS = frozenset({AllenRelation.BEFORE, AllenRelation.AFTER})

def _normalize(text: str) -> str:
    stripped = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return stripped.lower()

def _item_slot_value(item: EvidenceItem, slot: Slot) -> str | None:
    return getattr(item, slot.value)

def _hyp_slot_value(placement: Placement, slot: Slot) -> str:
    return getattr(placement, slot.value)

def _label(vocab: Vocabulary, slot: Slot, concept_id_or_label: str) -> str:
    concept = vocab.get(slot, concept_id_or_label)
    return concept.label if concept is not None else concept_id_or_label

_TOKEN_RE = re.compile(r"[a-z0-9]+")

MIN_TOKEN_LEN = 3

TOKEN_RATIO_FLOOR = 0.85

def _tokenize(text: str) -> tuple[str, ...]:
    return tuple(_TOKEN_RE.findall(text))

def _token_ratio(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if len(a) < MIN_TOKEN_LEN or len(b) < MIN_TOKEN_LEN:
        return 0.0
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    return ratio if ratio >= TOKEN_RATIO_FLOOR else 0.0

def slot_match_score(item_value: str, hyp_value: str, vocab: Vocabulary, slot: Slot) -> float:
    if item_value == hyp_value:
        return 1.0
    a = _normalize(_label(vocab, slot, item_value))
    b = _normalize(_label(vocab, slot, hyp_value))
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    tokens_a, tokens_b = _tokenize(a), _tokenize(b)
    if not tokens_a or not tokens_b or len(tokens_a) != len(tokens_b):
        return 0.0
    return min(_token_ratio(x, y) for x, y in zip(tokens_a, tokens_b))

def _effective_score(raw_score: float, strength: float) -> float:
    if raw_score >= 1.0:
        return 1.0
    return raw_score * strength

def link_evidence(
    items: Sequence[EvidenceItem],
    hypotheses: Sequence[Hypothesis],
    vocab: Vocabulary,
    *,
    threshold: float = 0.6,
) -> None:
    placements = [h for h in hypotheses if not h.is_sequence]
    for item in items:
        present = [slot for slot in PLACEMENT_CONCEPT_SLOTS if _item_slot_value(item, slot) is not None]
        if not present and item.interval is None:
            continue

        strength = edge_strength(item)
        if strength <= 0.0:
            continue

        for h in placements:
            p = h.content
            scores = {
                slot: _effective_score(
                    slot_match_score(_item_slot_value(item, slot), _hyp_slot_value(p, slot), vocab, slot),
                    strength,
                )
                for slot in present
            }
            mismatched = [slot for slot, score in scores.items() if score < threshold]
            all_match = not mismatched

            if item.interval is not None:
                interval_relation = relate(item.interval, p.interval)
                disjoint = interval_relation in _DISJOINT_RELATIONS
            else:
                disjoint = False

            if all_match and disjoint:
                _append_unique(item.refutes, h.address)
            elif all_match:
                target = item.refutes if item.stance == Stance.NEGATIVE else item.supports
                _append_unique(target, h.address)
            elif len(mismatched) == 1 and item.stance == Stance.NEGATIVE and not disjoint:
                _append_unique(item.refutes, h.address)

def _append_unique(bucket: list[int], address: int) -> None:
    if address not in bucket:
        bucket.append(address)

__all__ = ["link_evidence", "slot_match_score"]
