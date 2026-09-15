"""Allen-relations check: a sequence hypothesis's claimed relation against
what its own two placements' dated intervals imply.

PLAN.md section 10 item 7 (Allen 1983, doi:10.1145/182.358434): the address
scheme already carries a sequence hypothesis's RELATION slot as a free
value, one of the thirteen `hte.timeline.AllenRelation`s, alongside the two
placements it joins (`hte.address.encode_sequence_indices`,
`hte.hypothesis.Sequence`). Nothing upstream of this module checks that
value against the two placements' own `interval` fields: `hte.generate.
neighbors`'s relation-mutation branch deliberately builds every other
Allen relation on the same fixed pair of placements, to let the tournament
weigh an alternate-ordering hypothesis on its evidence merit, and every one
of those alternates but the true one is, by construction, inconsistent
with the intervals its own two placements already carry.

`check_sequence` is the check: `hte.timeline.relate` recomputes the actual
relation from `Sequence.first.interval`/`Sequence.second.interval` and
compares it to `Sequence.relation`, the claimed one. `flag_hypothesis`
attaches the result to `Hypothesis.meta["temporal_inconsistency"]` when,
and only when, the two disagree; a consistent sequence, and every
non-sequence hypothesis, is left with no such key, so a plain `"meta" ==
{}` check keeps meaning what it already means elsewhere in this package.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .hypothesis import Hypothesis, Placement
from .timeline import relate


def _placement_label(p: Placement) -> str:
    """A human-readable identifier for one placement: its own concept ids
    plus the astronomical-year interval it names, `hte.hypothesis.
    Placement` carries no id field of its own to read instead."""
    return f"{p.actor}/{p.action}/{p.object}@{p.interval.start}..{p.interval.end}"


@dataclass(frozen=True)
class TemporalInconsistency:
    """One sequence hypothesis whose claimed Allen relation does not match
    the relation `hte.timeline.relate` derives from its own two
    placements' dated intervals: the pair, each placement's own label
    (`_placement_label`), the claimed relation, and the actual one."""
    first: str
    second: str
    claimed_relation: str
    actual_relation: str

    def to_dict(self) -> dict[str, str]:
        return {
            "first": self.first, "second": self.second,
            "claimed_relation": self.claimed_relation, "actual_relation": self.actual_relation,
        }


def check_sequence(hypothesis: Hypothesis) -> TemporalInconsistency | None:
    """`None` for a non-sequence hypothesis, or a sequence hypothesis whose
    claimed relation matches `relate(first.interval, second.interval)`
    exactly. A `TemporalInconsistency` otherwise, naming both placements
    and both relations, never raised: an inconsistent claim is a fact
    about the hypothesis worth surfacing (the same reading `hte.belief.
    weight`'s own docstring gives a different malformed-input case,
    keeping it visible in a caller's downstream totals instead of
    dropping it silently)."""
    if not hypothesis.is_sequence:
        return None
    seq = hypothesis.content
    actual = relate(seq.first.interval, seq.second.interval)
    if actual == seq.relation:
        return None
    return TemporalInconsistency(
        first=_placement_label(seq.first),
        second=_placement_label(seq.second),
        claimed_relation=seq.relation.value,
        actual_relation=actual.value,
    )


def flag_hypothesis(hypothesis: Hypothesis) -> Hypothesis:
    """Runs `check_sequence` against `hypothesis` and, only when it finds
    an inconsistency, sets `hypothesis.meta["temporal_inconsistency"]` to
    that finding's own `to_dict()`. Mutates `hypothesis.meta` in place
    (`Hypothesis.meta`'s own "open, additive extension point" contract)
    and returns the same object, so a caller can use this in a generator
    pipeline's own yield expression. A no-op, `meta` left exactly as it
    was, for a consistent sequence or a non-sequence hypothesis."""
    flag = check_sequence(hypothesis)
    if flag is not None:
        hypothesis.meta["temporal_inconsistency"] = flag.to_dict()
    return hypothesis


def check_hypotheses(hypotheses: Iterable[Hypothesis]) -> list[TemporalInconsistency]:
    """Every `TemporalInconsistency` `check_sequence` finds across
    `hypotheses`, in iteration order, for a campaign-level report; a
    non-sequence or consistent hypothesis contributes nothing."""
    found: list[TemporalInconsistency] = []
    for h in hypotheses:
        flag = check_sequence(h)
        if flag is not None:
            found.append(flag)
    return found


__all__ = [
    "TemporalInconsistency",
    "check_sequence",
    "flag_hypothesis",
    "check_hypotheses",
]
