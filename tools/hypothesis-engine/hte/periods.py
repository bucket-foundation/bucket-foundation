from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .belief import Opinion
from .hypothesis import Hypothesis
from .timeline import bce_to_astronomical, ce_to_astronomical, ka_to_astronomical
from .unknowns import GapNode, active_priority, value_of_information

PERIODS_SEED_PATH = Path(__file__).parent / "data" / "periods-seed.json"

DEFAULT_WEIGHTS: dict[str, float] = {
    "uncertainty": 0.2,
    "novelty": 0.2,
    "coverage_gap": 0.2,
    "historical_gap": 0.2,
    "disagreement": 0.2,
}

@dataclass(frozen=True)
class Period:
    id: str
    label: str
    corpus: str | None
    start_year: int
    end_year: int
    calendar_note: str
    expected_evidence_kinds: list[str]
    factors: dict[str, float]
    gaps: list[GapNode] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "corpus": self.corpus,
            "start_year": self.start_year,
            "end_year": self.end_year,
            "calendar_note": self.calendar_note,
            "expected_evidence_kinds": list(self.expected_evidence_kinds),
            "factors": dict(self.factors),
            "gaps": [
                {
                    "id": g.id, "kind": g.kind, "description": g.description,
                    "period_id": g.period_id, "would_move": list(g.would_move), "cost": g.cost,
                }
                for g in self.gaps
            ],
        }

def _resolve_calendar(entry: Mapping[str, Any]) -> tuple[int, int]:
    kind = entry["calendar"]
    if kind == "ka":
        a = ka_to_astronomical(entry["start_ka"])
        b = ka_to_astronomical(entry["end_ka"])
    elif kind == "bce":
        a = bce_to_astronomical(entry["start_bce"])
        b = bce_to_astronomical(entry["end_bce"])
    elif kind == "ce":
        a = ce_to_astronomical(entry["start_ce"])
        b = ce_to_astronomical(entry["end_ce"])
    else:
        raise ValueError(f"unknown calendar kind {kind!r} in periods-seed.json")
    lo, hi = (a, b) if a <= b else (b, a)
    return int(round(lo)), int(round(hi))

def load_periods(path: str | Path = PERIODS_SEED_PATH) -> list[Period]:
    raw = json.loads(Path(path).read_text())
    periods: list[Period] = []
    for entry in raw:
        start_year, end_year = _resolve_calendar(entry)
        gaps = [
            GapNode(
                id=g["id"], kind=g["kind"], description=g["description"],
                period_id=entry["id"], would_move=list(g.get("would_move", [])),
                cost=float(g.get("cost", 1.0)),
            )
            for g in entry.get("gaps", [])
        ]
        periods.append(Period(
            id=entry["id"], label=entry["label"], corpus=entry.get("corpus"),
            start_year=start_year, end_year=end_year,
            calendar_note=entry.get("calendar_note", ""),
            expected_evidence_kinds=list(entry.get("expected_evidence_kinds", [])),
            factors=dict(entry.get("factors", {})),
            gaps=gaps,
        ))
    return periods

def _select_gaps(
    gaps: Sequence[GapNode], factors: Mapping[str, float], weights: Mapping[str, float], budget: float,
) -> tuple[list[GapNode], float, float]:
    scored = []
    for gap in gaps:
        priority = active_priority(gap, weights=weights, **factors)
        ratio = priority / gap.cost if gap.cost > 0 else priority
        scored.append((ratio, priority, gap))
    scored.sort(key=lambda t: t[0], reverse=True)

    selected: list[GapNode] = []
    spent = 0.0
    priority_total = 0.0
    for _ratio, priority, gap in scored:
        if spent + gap.cost > budget:
            continue
        selected.append(gap)
        spent += gap.cost
        priority_total += priority
    return selected, spent, priority_total

def _rationale(candidates: Sequence[Period], scored: Sequence[dict[str, Any]], budget: float) -> str:
    by_id = {p.id: p for p in candidates}
    lines = [
        f"Ranked {len(scored)} candidate campaign periods under a retrieval "
        f"budget of {budget:g} cost units, by active_priority summed over "
        f"each period's affordable gaps plus value_of_information over any "
        f"hypotheses and opinions already on hand."
    ]
    for entry in scored:
        period = by_id[entry["id"]]
        lines.append(
            f"- {period.label} ({entry['id']}): score={entry['score']:.3f} "
            f"(active_priority={entry['priority_total']:.3f} + "
            f"value_of_information={entry['voi_total']:.3f}); "
            f"{entry['gap_count']}/{entry['of_total_gaps']} gaps affordable, "
            f"spent {entry['spent']:.2f} of {budget:g}."
        )
    if scored:
        top = scored[0]
        lines.append(
            f"Chosen: {by_id[top['id']].label} ({top['id']}), the highest-"
            f"scoring candidate at this budget."
        )
    else:
        lines.append("No candidates were given; nothing chosen.")
    return "\n".join(lines)

def choose_period(
    candidates: Sequence[Period],
    *,
    budget: float,
    hypotheses: Sequence[Hypothesis] | None = None,
    opinions: Mapping[int, Opinion] | None = None,
    weights: Mapping[str, float] | None = None,
) -> dict[str, Any]:
    resolved_weights = dict(weights or DEFAULT_WEIGHTS)
    hyps = list(hypotheses or [])
    ops = dict(opinions or {})

    scored: list[dict[str, Any]] = []
    for period in candidates:
        selected, spent, priority_total = _select_gaps(period.gaps, period.factors, resolved_weights, budget)
        voi_total = sum(value_of_information(gap, hyps, ops) for gap in selected)
        scored.append({
            "id": period.id,
            "label": period.label,
            "score": priority_total + voi_total,
            "priority_total": priority_total,
            "voi_total": voi_total,
            "selected_gaps": [g.id for g in selected],
            "spent": spent,
            "gap_count": len(selected),
            "of_total_gaps": len(period.gaps),
        })
    scored.sort(key=lambda c: c["score"], reverse=True)

    return {
        "chosen": scored[0]["id"] if scored else None,
        "budget": budget,
        "weights": resolved_weights,
        "candidates": scored,
        "rationale": _rationale(candidates, scored, budget),
    }

__all__ = ["Period", "load_periods", "choose_period", "DEFAULT_WEIGHTS", "PERIODS_SEED_PATH"]
