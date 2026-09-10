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
import re
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


_TOKEN_RE = re.compile(r"[a-z0-9]+")

# A token shorter than this many characters must match another token
# exactly to count as the same word; below this length, a single-digit
# or two-digit run is more likely a disambiguating suffix (`"Actor 5"`
# vs `"Actor 10"`, an era-name index, a short id fragment) than a
# real spelling variant, so no fuzzy credit is given for it. Chosen
# short of `hte.synth`'s own `_random_label`'s 14-character labels (a
# same-length full-word token is always eligible for the ratio floor
# below) and long enough that "5"/"10"/"14" all fall under it.
MIN_TOKEN_LEN = 3

# The per-token `difflib.SequenceMatcher` ratio a token pair at or above
# `MIN_TOKEN_LEN` must clear to count as the same word (a near-miss
# spelling or a pluralization, `"Farmer"`/`"Farmers"` scores `0.923`);
# short of this floor the token pair is read as two different words,
# not a partial match, so `_token_ratio` reports `0.0` rather than a
# low but nonzero number a caller's own threshold might still clear.
TOKEN_RATIO_FLOOR = 0.85


def _tokenize(text: str) -> tuple[str, ...]:
    return tuple(_TOKEN_RE.findall(text))


def _token_ratio(a: str, b: str) -> float:
    """`1.0` for identical tokens; the `difflib` ratio, clamped to `0.0`
    below `TOKEN_RATIO_FLOOR`, for a token pair both at least
    `MIN_TOKEN_LEN` long; `0.0` for anything shorter that isn't an exact
    match, since a short token (a number, an index suffix, an
    abbreviation) carries too little material for a character-ratio
    fuzzy match to mean anything."""
    if a == b:
        return 1.0
    if len(a) < MIN_TOKEN_LEN or len(b) < MIN_TOKEN_LEN:
        return 0.0
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    return ratio if ratio >= TOKEN_RATIO_FLOOR else 0.0


def slot_match_score(item_value: str, hyp_value: str, vocab: Vocabulary, slot: Slot) -> float:
    """`1.0` on an exact concept-id match or on two labels that tokenize
    identically after normalization; otherwise a token-level match
    between the two values' own vocabulary labels (diacritic- and
    case-folded, split into `[a-z0-9]+` runs), falling back to the raw
    value itself when it does not resolve to a known concept id. Two
    labels with a different number of tokens are never a match (`0.0`):
    `"planck"` (one token) against `"planck-1900"` (two) is a different
    concept: an index or a year appended to a shared name, regardless of
    how high a whole-string character ratio would read. Same token
    count: each position is compared by
    `_token_ratio`, and the match score is the WORST-scoring position
    (`min`), so one disambiguating token that fails to match (`"5"` vs
    `"10"` in `"Actor 5"`/`"Actor 10"`) drags the whole pair to `0.0`
    even when every other token lines up exactly. Neither `main.tex` nor
    `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` names a fixed fuzzy-match formula
    for slot identity (`hte.belief.edge_strength`'s own blended formula
    scores an item's evidentiary *strength*, a different question from
    whether two slot values name the same concept), so this scheme is
    this module's own documented choice.

    Fixed 2026-09-10 (`bkt-hte-linker-fuzzy-fix`): the previous
    whole-string `difflib.SequenceMatcher` ratio cross-linked near-
    identical labels sharing a long common prefix, `"Actor 5"`/`"Actor
    10"` scored `~0.8`, `"planck"`/`"planck-1900"` scored high enough to
    clear `link_evidence`'s own default `threshold=0.6` too, silently
    treating two different concepts as the same slot value. `hte.synth`'s
    own random-label generator (`_random_label`) was written around this
    exact defect for its synthetic worlds; this fix closes it in the
    comparator itself instead of only working around it at the label-
    generation layer.
    """
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
