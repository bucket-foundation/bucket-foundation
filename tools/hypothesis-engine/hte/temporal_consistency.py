from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .hypothesis import Hypothesis, Placement
from .timeline import relate

def _placement_label(p: Placement) -> str:
    return f"{p.actor}/{p.action}/{p.object}@{p.interval.start}..{p.interval.end}"

@dataclass(frozen=True)
class TemporalInconsistency:
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
    flag = check_sequence(hypothesis)
    if flag is not None:
        hypothesis.meta["temporal_inconsistency"] = flag.to_dict()
    return hypothesis

def check_hypotheses(hypotheses: Iterable[Hypothesis]) -> list[TemporalInconsistency]:
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
