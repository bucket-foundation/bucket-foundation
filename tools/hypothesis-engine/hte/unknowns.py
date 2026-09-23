from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Mapping, Sequence

from .belief import Opinion
from .concepts import Concept, ConsensusStatus, Vocabulary
from .evidence import EvidenceItem
from .hypothesis import Hypothesis

def good_turing_missing_mass(counts: Mapping[int, int]) -> float:
    n = sum(counts.values())
    if n == 0:
        return 0.0
    n1 = sum(1 for c in counts.values() if c == 1)
    return n1 / n

def chao1(counts: Mapping[int, int]) -> float:
    s_obs = len(counts)
    f1 = sum(1 for c in counts.values() if c == 1)
    f2 = sum(1 for c in counts.values() if c == 2)
    if f2 == 0:
        return s_obs + f1 * (f1 - 1) / 2
    return s_obs + (f1 ** 2) / (2 * f2)

def _chao1_variance(f1: int, f2: int) -> float:
    if f1 == 0:
        return 0.0
    ratio = f1 / f2
    return f2 * (0.5 * ratio ** 2 + ratio ** 3 + 0.25 * ratio ** 4)

DEFAULT_CHAO1_SEED_FLOOR = 5

def coverage_interval(
    run_counts: Sequence[Mapping[int, int]], *, seed_floor: int = DEFAULT_CHAO1_SEED_FLOOR
) -> dict:
    presence: dict[int, int] = {}
    total_membership = 0
    for run in run_counts:
        for address in run:
            presence[address] = presence.get(address, 0) + 1
            total_membership += 1

    s_obs = len(presence)
    f1 = sum(1 for c in presence.values() if c == 1)
    f2 = sum(1 for c in presence.values() if c == 2)
    missing_mass = (f1 / total_membership) if total_membership > 0 else 0.0
    n_seeds = len(run_counts)

    if n_seeds < seed_floor or f2 == 0:
        why = (
            f"only {n_seeds} seed(s), below the floor of {seed_floor}" if n_seeds < seed_floor
            else "no doubletons (f2=0) to estimate variance from"
        )
        return {
            "observed": s_obs,
            "chao1_estimate": None,
            "chao1_note": f"Chao1 needs independent samples; {why}. Good-Turing missing mass "
                          f"({missing_mass:.4f}) is the headline instead.",
            "missing_mass": missing_mass,
            "coverage_low": None,
            "coverage_high": None,
        }

    s_est = float(s_obs + (f1 ** 2) / (2 * f2))
    sd = math.sqrt(_chao1_variance(f1, f2))
    est_low = max(s_obs, s_est - 1.96 * sd)
    est_high = s_est + 1.96 * sd
    return {
        "observed": s_obs,
        "chao1_estimate": s_est,
        "chao1_note": None,
        "missing_mass": missing_mass,
        "coverage_low": (s_obs / est_high) if est_high > 0 else 0.0,
        "coverage_high": min(1.0, s_obs / est_low) if est_low > 0 else 1.0,
    }

def _shift(v: float, status: ConsensusStatus, profile: str) -> float:
    if profile == "uniform":
        return 0.0
    if status in (ConsensusStatus.CONSENSUS, ConsensusStatus.OTHER):
        return v
    if status == ConsensusStatus.CONTESTED:
        return min(v, 0.0) if profile == "skeptic" else v + 1.0 if profile == "fringe" else v
    if profile == "skeptic":
        return v - 2.0
    if profile == "fringe":
        return -v + 2.0
    return v

def prior_profiles(vocab: Vocabulary) -> dict[str, Vocabulary]:
    profiles: dict[str, Vocabulary] = {}
    for profile in ("consensus", "skeptic", "fringe", "uniform"):
        by_slot = {
            slot: [
                Concept(
                    id=c.id, slot=c.slot, label=c.label,
                    prior_logit=_shift(c.prior_logit, c.consensus_status, profile),
                    consensus_status=c.consensus_status, definition_url=c.definition_url,
                )
                for c in concepts
            ]
            for slot, concepts in vocab.by_slot.items()
        }
        profiles[profile] = Vocabulary(by_slot=by_slot, alpha=dict(vocab.alpha), default_alpha=vocab.default_alpha)
    return profiles

ScoreFn = Callable[[Hypothesis, Sequence[EvidenceItem], Vocabulary], Opinion]

def _project(result) -> float:
    project = getattr(result, "project", None)
    return project() if callable(project) else float(result)

def robustness(
    h: Hypothesis,
    evidence: Sequence[EvidenceItem],
    profiles: Mapping[str, Vocabulary],
    score_fn: ScoreFn,
    *,
    population: Sequence[Hypothesis] | None = None,
    stable_threshold: float = 0.5,
) -> dict:
    projections = {name: _project(score_fn(h, evidence, vocab)) for name, vocab in profiles.items()}
    spread = max(projections.values()) - min(projections.values())
    result = {
        "projections": projections,
        "spread": spread,
        "robustness": 1.0 - spread,
        "stable": spread < stable_threshold,
    }
    if population is not None:
        ranks: dict[str, int | None] = {}
        for name, vocab in profiles.items():
            scored = [(cand, _project(score_fn(cand, evidence, vocab))) for cand in population]
            ordered = sorted(scored, key=lambda pair: pair[1], reverse=True)
            addresses = [cand.address for cand, _ in ordered]
            ranks[name] = addresses.index(h.address) if h.address in addresses else None
        result["ranks"] = ranks
        found = [r for r in ranks.values() if r is not None]
        result["rank_spread"] = (max(found) - min(found)) if found else None
    return result

def surprise(evidence_items: Sequence[EvidenceItem], hypotheses: Sequence[Hypothesis]) -> list[EvidenceItem]:
    known = {h.address for h in hypotheses}
    out = []
    for item in evidence_items:
        named = set(item.supports) | set(item.refutes)
        if named and named.isdisjoint(known):
            out.append(item)
    return out

@dataclass(frozen=True)
class GapNode:
    id: str
    kind: str
    description: str
    period_id: str | None = None
    would_move: list[int] = field(default_factory=list)
    cost: float = 1.0

def value_of_information(
    gap: GapNode,
    hypotheses: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
) -> float:
    known = {h.address for h in hypotheses}
    total = 0.0
    for address in gap.would_move:
        if address not in known:
            continue
        opinion = opinions.get(address)
        if opinion is None:
            continue
        total += opinion.u * opinion.u
    return total

def active_priority(
    gap: GapNode,
    *,
    uncertainty: float,
    novelty: float,
    coverage_gap: float,
    historical_gap: float,
    disagreement: float,
    weights: Mapping[str, float],
) -> float:
    factors = {
        "uncertainty": uncertainty,
        "novelty": novelty,
        "coverage_gap": coverage_gap,
        "historical_gap": historical_gap,
        "disagreement": disagreement,
    }
    return sum(weights.get(name, 0.0) * value for name, value in factors.items())

_UNRESOLVED_SLOT_GAP_LIMIT = 25

def unresolved_slot_gaps(
    evidence_items: Sequence[EvidenceItem],
    hypotheses: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
    *,
    limit: int = _UNRESOLVED_SLOT_GAP_LIMIT,
) -> list[GapNode]:
    nodes: list[GapNode] = []
    for item in evidence_items:
        unresolved = [
            name for name, value in (
                ("actor", item.actor), ("action", item.action), ("object", item.object),
                ("place", item.place), ("mechanism", item.mechanism),
            ) if value is None
        ]
        if not unresolved:
            continue
        would_move = sorted(set(item.supports) | set(item.refutes))
        nodes.append(GapNode(
            id=f"gap-{item.id}", kind="unresolved-slot",
            description=f"evidence {item.id} names no value for: {', '.join(unresolved)}",
            would_move=would_move,
        ))
    scored = sorted(
        ((node, value_of_information(node, hypotheses, opinions)) for node in nodes),
        key=lambda pair: pair[1], reverse=True,
    )
    return [node for node, _voi in scored[:limit]]

__all__ = [
    "good_turing_missing_mass",
    "chao1",
    "coverage_interval",
    "DEFAULT_CHAO1_SEED_FLOOR",
    "prior_profiles",
    "robustness",
    "surprise",
    "GapNode",
    "value_of_information",
    "active_priority",
    "unresolved_slot_gaps",
]
