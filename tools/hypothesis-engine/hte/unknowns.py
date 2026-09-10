"""Structural unknowns: missing-mass estimation, prior-profile robustness,
surprise tracking, and gap-node value of information.

Mirrors `Bucket.Unknowns` (`papers/history-hypothesis-engine/lean/Bucket/
Unknowns.lean`, Good-Turing and Chao1 only) and `main.tex` §Structural
unknowns / `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §5-8 for everything else,
gap nodes, prior profiles, robustness, and surprise, none of which has a
Lean counterpart yet.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Mapping, Sequence

from .belief import Opinion
from .concepts import Concept, ConsensusStatus, Vocabulary
from .evidence import EvidenceItem
from .hypothesis import Hypothesis

# --------------------------------------------------------------------------
# Good-Turing and Chao1 (`Bucket.Unknowns`)
# --------------------------------------------------------------------------


def good_turing_missing_mass(counts: Mapping[int, int]) -> float:
    """The Good-Turing missing-mass estimate, `n1 / N`
    (`Bucket.Unknowns.missingMass`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6b):
    the share of the address space made of addresses seen exactly once,
    out of every observation pooled into `counts`. `counts` maps a
    hypothesis address to how many times it was observed; `n1` is the
    number of addresses with count `1`, `N` is `sum(counts.values())`. An
    empty `counts` has no missing mass to speak of and reads `0.0`,
    matching the Lean definition's `x / 0 = 0` convention rather than
    raising a division error.
    """
    n = sum(counts.values())
    if n == 0:
        return 0.0
    n1 = sum(1 for c in counts.values() if c == 1)
    return n1 / n


def chao1(counts: Mapping[int, int]) -> float:
    """The Chao1 richness estimate over `counts`, a hypothesis-address to
    observation-count mapping, exactly `Bucket.Unknowns.chao1`: `S_obs +
    f1^2 / (2 f2)` when the doubleton count `f2` is positive, `S_obs + f1
    (f1 - 1) / 2` when `f2 = 0` (`chao1987estimating`,
    `colwell1994estimating`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6b). `S_obs`
    is `len(counts)`, the number of distinct addresses observed at least
    once; `f1` and `f2` are the counts of addresses seen exactly once and
    exactly twice.
    """
    s_obs = len(counts)
    f1 = sum(1 for c in counts.values() if c == 1)
    f2 = sum(1 for c in counts.values() if c == 2)
    if f2 == 0:
        return s_obs + f1 * (f1 - 1) / 2
    return s_obs + (f1 ** 2) / (2 * f2)


def _chao1_variance(s_obs: int, f1: int, f2: int, s_est: float) -> float:
    """The Chao1 sampling variance (`chao1987estimating`, as summarized by
    `colwell1994estimating`), used only to size `coverage_interval`'s
    confidence bounds below. The `f2 = 0` branch is Chao's own correction
    for that case; both branches read `0.0` when `f1 = 0`, since a richness
    estimate with no singletons at all carries no Chao1-specific
    uncertainty of this kind."""
    if f1 == 0:
        return 0.0
    if f2 > 0:
        ratio = f1 / f2
        return f2 * (0.5 * ratio ** 2 + ratio ** 3 + 0.25 * ratio ** 4)
    if s_est <= 0:
        return 0.0
    return f1 * (f1 - 1) / 2.0 + f1 * (2 * f1 - 1) ** 2 / 4.0 - f1 ** 4 / (4.0 * s_est)


def coverage_interval(run_counts: Sequence[Mapping[int, int]]) -> dict:
    """A coverage-share interval across several generation runs
    (`Eq. coverage`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §8): `run_counts`
    gives one address-to-count mapping per run, and the estimate here
    treats each run as one Good-Turing/Chao1 sample, reading "seen `k`
    times" as "present in exactly `k` runs" rather than raw within-run
    frequency, per §6b's own framing ("`f1` is the count of hypotheses seen
    in exactly one run").

    Returns `{"observed", "chao1_estimate", "missing_mass", "coverage_low",
    "coverage_high"}`. `coverage_low`/`coverage_high` come from a 95%
    normal-approximation band on the Chao1 estimate (`_chao1_variance`):
    a wider Chao1 estimate implies a narrower share of it this corpus has
    seen, so the estimate's upper bound feeds `coverage_low` and
    its lower bound, floored at `observed` (`chao1_ge_sObs`'s own
    guarantee, `Bucket.Unknowns`), feeds `coverage_high`.
    """
    presence: dict[int, int] = {}
    total_membership = 0
    for run in run_counts:
        for address in run:
            presence[address] = presence.get(address, 0) + 1
            total_membership += 1

    s_obs = len(presence)
    n1 = sum(1 for c in presence.values() if c == 1)
    f1 = n1
    f2 = sum(1 for c in presence.values() if c == 2)
    missing_mass = (n1 / total_membership) if total_membership > 0 else 0.0
    s_est = float(s_obs + f1 * (f1 - 1) / 2) if f2 == 0 else float(s_obs + (f1 ** 2) / (2 * f2))
    variance = _chao1_variance(s_obs, f1, f2, s_est)
    sd = math.sqrt(max(variance, 0.0))

    est_low = max(s_obs, s_est - 1.96 * sd)
    est_high = s_est + 1.96 * sd
    coverage_low = (s_obs / est_high) if est_high > 0 else 0.0
    coverage_high = min(1.0, s_obs / est_low) if est_low > 0 else 1.0

    return {
        "observed": s_obs,
        "chao1_estimate": s_est,
        "missing_mass": missing_mass,
        "coverage_low": coverage_low,
        "coverage_high": coverage_high,
    }


# --------------------------------------------------------------------------
# Prior profiles (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6d)
# --------------------------------------------------------------------------

# The per-`ConsensusStatus` prior_logit shift each profile applies, keyed
# by profile name then by the concept's own `prior_logit` value `v`. This
# is the shift table the module docstring and `README.md` both promise:
#
# | consensus_status | consensus | skeptic       | fringe   | uniform |
# |-------------------|-----------|---------------|----------|---------|
# | CONSENSUS         | v         | v             | v        | 0.0     |
# | CONTESTED         | v         | min(v, 0.0)   | v + 1.0  | 0.0     |
# | FRINGE            | v         | v - 2.0       | -v + 2.0 | 0.0     |
# | OTHER             | v (= 0.0) | v             | v        | 0.0     |
#
# FRINGE's two non-consensus profiles mirror each other: skeptic(v) = v -
# 2.0, fringe(v) = -skeptic(v) = -v + 2.0, so a fringe actor whose consensus
# prior sits well below zero reads far more negative under skeptic and
# positive under fringe, while a consensus actor's prior never moves
# except flattening to zero under uniform. `OTHER`'s own `prior_logit` is
# always `0.0` by construction (`hte.concepts.other_concept`), so its row
# behaves like CONSENSUS's identically, stated here as its own row only to
# keep the table exhaustive over every `ConsensusStatus`.


def _shift(v: float, status: ConsensusStatus, profile: str) -> float:
    if profile == "uniform":
        return 0.0
    if status in (ConsensusStatus.CONSENSUS, ConsensusStatus.OTHER):
        return v
    if status == ConsensusStatus.CONTESTED:
        return min(v, 0.0) if profile == "skeptic" else v + 1.0 if profile == "fringe" else v
    # ConsensusStatus.FRINGE
    if profile == "skeptic":
        return v - 2.0
    if profile == "fringe":
        return -v + 2.0
    return v


def prior_profiles(vocab: Vocabulary) -> dict[str, Vocabulary]:
    """Four prior profiles over `vocab` (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
    §6d): `"consensus"` (unchanged), `"skeptic"` (flat or negative on every
    contested or fringe concept), `"fringe"` (elevated on the exotic
    actors and mechanisms), and `"uniform"` (`L_prior = 0` everywhere).
    Each returned `Vocabulary` keeps every concept's id, slot, label,
    consensus status, and vocabulary-index position exactly as `vocab`
    has them, only `prior_logit` moves, per the shift table above, so an
    address already encoded against `vocab` decodes identically against
    any profile.
    """
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
    """`h`'s projected probability under every profile in `profiles`
    (`Eq. robustness`): `score_fn(h, evidence, vocab)` is called once per
    profile, reading either a `hte.belief.Opinion` (its `.project()` is
    taken) or a bare probability if `score_fn` already reduces to one.

    Returns `{"projections", "spread", "robustness", "stable"}`, plus
    `{"ranks", "rank_spread"}` when `population` is given: `h`'s rank, most
    probable first, among `population` scored under each profile, and the
    spread of that rank across profiles. `stable` is `True` when `spread`
    (the max-minus-min projected probability across profiles) sits below
    `stable_threshold`, a caller-tunable cutoff since no fixed threshold
    for this reading is stated in the source material.
    """
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


# --------------------------------------------------------------------------
# Surprise tracking (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6c)
# --------------------------------------------------------------------------


def surprise(evidence_items: Sequence[EvidenceItem], hypotheses: Sequence[Hypothesis]) -> list[EvidenceItem]:
    """Every evidence item naming at least one hypothesis address, through
    `supports` or `refutes`, but matching none the generator has
    materialized in `hypotheses` (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6c's
    unknown-unknown event). An item naming no address at all asserts
    nothing about the frontier, so it is not a surprise by this
    definition, only silence."""
    known = {h.address for h in hypotheses}
    out = []
    for item in evidence_items:
        named = set(item.supports) | set(item.refutes)
        if named and named.isdisjoint(known):
            out.append(item)
    return out


# --------------------------------------------------------------------------
# Gap nodes and value of information (`main.tex` §Structural unknowns,
# `def:gap`, `Eq. voi`)
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class GapNode:
    """An unexcavated site, an untranslated text, an undated stratum, or
    an unread archive (`def:gap`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §5):
    a first-class node for something the corpus has not yet looked at.
    `would_move` names the hypothesis addresses reading this gap would
    move; `cost` is left uninterpreted here, a caller-defined unit (hours,
    dollars, retrieval calls) for weighing this gap against others outside
    the five active-retrieval factors `active_priority` folds in."""
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
    """The expected change in projected probability a gap's own resolution
    would bring, weighted by how much uncertainty is left to move.

    `Eq. voi`'s own justification for treating `Delta u_expected` as well
    defined without running the retrieval a gap names is that new evidence
    always adds to `r` or `s` and always shrinks `u` (`Eq. opinion-sum`):
    a hypothesis's own uncertainty mass `u` is therefore this package's
    read of "expected change in projected probability" for that
    hypothesis, since `u` is exactly the room evidence has left to move
    `P(h) = b + a*u`. "Weighted by `u`" then applies that same mass again,
    a discount that reads a hypothesis already mostly resolved, low `u`,
    as having little further room `u` to weight, so this function sums
    `u^2` over every hypothesis address in `gap.would_move` that has both a
    materialized hypothesis in `hypotheses` and a recorded opinion in
    `opinions`; either one missing for a given address contributes
    nothing for it, rather than raising.
    """
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
    """The five-factor active-retrieval priority `Eq. voi` pulls from
    `scientific-discovery` rather than resting on expected uncertainty
    reduction alone: a weighted sum of `uncertainty` (the paper's own
    `Delta u_expected`; a caller commonly passes `value_of_information`'s
    own output for this same gap here), `novelty`, `coverage_gap`,
    `historical_gap`, and
    `disagreement`, each looked up in `weights` by its own parameter name
    with a default weight of `0.0` for a factor `weights` omits. `gap`
    itself is accepted for parity with `Eq. voi`'s own `voi(gap)` notation
    and for a future caller that wants to read one of its fields, `cost`
    included, alongside the five factors; the formula below reads only
    the five explicit arguments, none of `gap`'s own fields, since the
    source material's own five-factor sum names no sixth, cost-based
    term.
    """
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
    """One `GapNode` per evidence item naming no value for at least one of
    its five concept slots (`actor`/`action`/`object`/`place`/`mechanism`),
    ranked by `value_of_information` against `hypotheses`/`opinions` and
    capped at `limit`, highest value first.

    A generalization of `hte.api._rank_gap_nodes` (`hte-serve`'s own
    `/hypothesize` response builder), public here so `hte.runner`'s own
    campaign loop can read a live gap-node queue instead of leaving `hte.
    unknowns.GapNode` built but never called from a campaign
    (`learning/research-os/ENGINE-BRIDGE.md`'s own "GapNode/
    value_of_information are still unwired"). `hte/api.py` keeps its own
    inline reading for now rather than importing this function, since it is
    under active review as this function lands (see that module's own
    `_rank_gap_nodes`); a future pass can fold one into the other once that
    review settles, `scripts/campaign_research_os.py`'s own header comment
    tracks this.

    `kind` is always `"unresolved-slot"`, `id` is `f"gap-{item.id}"`, and
    `would_move` is the sorted union of `item.supports`/`item.refutes`,
    matching `_rank_gap_nodes`'s own reading of this gap kind."""
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
    "prior_profiles",
    "robustness",
    "surprise",
    "GapNode",
    "value_of_information",
    "active_priority",
    "unresolved_slot_gaps",
]
