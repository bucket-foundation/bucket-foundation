"""Evidence-to-hypothesis linking by slot matching (`bkt-hte-evidence-
slots`).

`main.tex` §9 assumes a prior generation pass has already linked evidence
to hypothesis addresses before belief scoring or calibration read
`EvidenceItem.supports`/`refutes`; no module in this package ran that pass
until this one. Without it, every survivor's pooled supporting and
refuting weight is `(0, 0)`, so `hte.belief.score` returns `u=1.0` for
every hypothesis regardless of the evidence on file, and the only signal
left to differentiate two hypotheses is the prior base rate `a`
(`hte.hypothesis.Hypothesis.prior_logit`). `link_evidence` closes that
gap: for each evidence item carrying at least one extracted slot value or
a dated interval (`hte.evidence.EvidenceItem.actor`/.../`interval`, set by
`hte.corpus.quantum_history`'s bullet parser and by `hte.roles.extract`'s
ensemble), it compares that item against every placement hypothesis on
the frontier and appends the hypothesis's address to `supports` or
`refutes` in place, mutating the evidence items it is handed rather than
returning a new list.
"""
from __future__ import annotations

import difflib
import unicodedata
from typing import Sequence

from .belief import edge_strength
from .concepts import Slot, Vocabulary
from .evidence import EvidenceItem, Stance
from .generate import PLACEMENT_CONCEPT_SLOTS
from .hypothesis import Hypothesis, Placement
from .timeline import AllenRelation, relate

# Every Allen relation except the two that put the two intervals fully
# apart in time (`BEFORE`/`AFTER`): a matched-slot item whose own interval
# holds one of these against a hypothesis's interval is read as dating the
# same event, even loosely (`MEETS`/`MET_BY` share a boundary instant, the
# rest overlap outright).
_DISJOINT_RELATIONS = frozenset({AllenRelation.BEFORE, AllenRelation.AFTER})


def _normalize(text: str) -> str:
    """Case- and diacritic-folded text (`"Schrödinger"` -> `"schrodinger"`)
    for a comparison that should not care whether an evidence item's own
    text or a vocabulary label spells a name with or without its accents."""
    stripped = unicodedata.normalize("NFKD", text)
    stripped = "".join(ch for ch in stripped if not unicodedata.combining(ch))
    return stripped.lower()


def _item_slot_value(item: EvidenceItem, slot: Slot) -> str | None:
    return getattr(item, slot.value)


def _hyp_slot_value(placement: Placement, slot: Slot) -> str:
    return getattr(placement, slot.value)


def _label(vocab: Vocabulary, slot: Slot, concept_id_or_label: str) -> str:
    """`concept_id_or_label`'s own vocabulary label when it resolves to a
    known concept id in `slot`; itself otherwise, the raw-label case an
    unresolved extraction (`hte.roles.extract`'s ensemble, or a corpus
    parser's own best-effort match) leaves for this module to compare by
    text instead of by id."""
    concept = vocab.get(slot, concept_id_or_label)
    return concept.label if concept is not None else concept_id_or_label


def slot_match_score(item_value: str, hyp_value: str, vocab: Vocabulary, slot: Slot) -> float:
    """`1.0` on an exact concept-id match; otherwise the label-similarity
    ratio (`difflib.SequenceMatcher`, diacritic- and case-folded) between
    the two values' own vocabulary labels, falling back to the raw value
    itself when it does not resolve to a known concept id. Neither
    `main.tex` nor `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` names a fixed
    fuzzy-match formula for slot identity (`hte.belief.edge_strength`'s
    own blended formula scores an item's evidentiary *strength*, a
    different question from whether two slot values name the same
    concept), so this ratio is this module's own documented choice.
    """
    if item_value == hyp_value:
        return 1.0
    a = _normalize(_label(vocab, slot, item_value))
    b = _normalize(_label(vocab, slot, hyp_value))
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def _effective_score(raw_score: float, strength: float) -> float:
    """An exact concept-id match (`raw_score == 1.0`) always counts at
    full strength; a fuzzy label match is discounted by the item's own
    multi-view evidentiary strength (`hte.belief.edge_strength`), so a
    weak, thinly-corroborated item needs a cleaner label match than a
    strong one to still count as naming the same slot value."""
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
    """Fills `supports`/`refutes` on every item in `items` in place, by
    slot matching against every placement hypothesis in `hypotheses`
    (sequence hypotheses carry no single slot tuple of their own to match
    against and are skipped, per this module's own scope: a sequence's
    two member placements are each addressable on their own and can be
    linked as ordinary placements wherever they also appear standalone in
    `hypotheses`).

    For each item with at least one extracted slot or a dated interval:

    - every present slot (`actor`/`action`/`object`/`place`/`mechanism`)
      matching a hypothesis (`slot_match_score`, discounted by the item's
      own `hte.belief.edge_strength` on a fuzzy match, at or above
      `threshold`) and the item's own interval, if it has one, not
      falling `before`/`after` the hypothesis's interval: the item
      *supports* that hypothesis, unless the item's own `stance` is
      `NEGATIVE`, in which case a full slot-and-date match *denies* the
      hypothesis instead, and it is added to `refutes`;
    - every slot matching but the item's own interval sitting strictly
      `before`/`after` the hypothesis's interval: the item *refutes* that
      hypothesis (a competing date for an otherwise agreed-on event),
      regardless of stance;
    - exactly one present slot mismatching (`score < threshold`) while
      every other present slot matches, and the item's own `stance` is
      `NEGATIVE`, and the interval (if present) does not sit `before`/
      `after`: the item *refutes* that hypothesis (a corrected reading of
      one field, "not X but Y", read against the address it denies).

    An item present in neither reading (two or more mismatched slots, or
    exactly one mismatch under a `POSITIVE` stance, an ambiguous partial
    match this module does not guess at) is left unlinked to that
    hypothesis. `threshold` is shared across every slot and every item;
    a caller wanting a per-slot or per-item threshold should pre-filter
    `hypotheses` or `items` before calling.
    """
    placements = [h for h in hypotheses if not h.is_sequence]
    for item in items:
        present = [slot for slot in PLACEMENT_CONCEPT_SLOTS if _item_slot_value(item, slot) is not None]
        if not present and item.interval is None:
            continue  # nothing extracted on this item to match against

        strength = edge_strength(item)
        if strength <= 0.0:
            continue  # a zero-strength item carries no signal to link with either reading

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
