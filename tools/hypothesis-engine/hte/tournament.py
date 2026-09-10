"""Ranking tournament: Elo seeded from the projected posterior, Swiss-style
pairwise debate rounds, and the critic pass.

Mirrors `main.tex` §Engine loop's ranking-tournament and critic paragraphs.
Neither has a Lean counterpart: `Bucket.*` stops at the opinion and its
projection (`README.md`'s own design note, "the generator/tournament layer
owns `L(h)` and `Theta_temporal`"), so this module is this package's own,
built against that interface rather than against a proof.
"""
from __future__ import annotations

import math
import random
from typing import Callable, Mapping, Sequence

from .belief import Opinion
from .hypothesis import Hypothesis

Judge = Callable[[Hypothesis, Hypothesis, dict], float]
Critic = Callable[[Hypothesis, dict], dict]
# One round's whole batch of `(a, b, context)` triples in, `P(a beats b)`
# per triple out, same order: `docs/THROUGHPUT.md`'s own wiring recipe for
# `run`'s judge calls (`hte.batching.batch_judge`, or any callable of the
# same shape).
BatchJudge = Callable[[Sequence[tuple[Hypothesis, Hypothesis, dict]]], Sequence[float]]

# Elo's own logistic base and scale, and the seeding scale `Eq. rank`
# gives the projected posterior: `Elo0 = 1500 + 400 * logit(P(h))`.
_ELO_BASE = 1500.0
_ELO_SCALE = 400.0
_ELO_DIVISOR = 400.0

# `_logit`'s own clamp band. An earlier draft clamped only at the literal
# probability boundary (`eps = 1e-9`, guarding against `logit(0)`/`logit(1)`
# raising or returning infinity), which left every ordinary survivor's
# seed unclamped: a hypothesis the tournament kept for its own high
# disbelief (`main.tex`'s own worked examples reach `d >= 0.9`, `P` in
# the low hundredths) seeded a large *negative* Elo, confirmed on a
# live quantum-history run (`P = 0.0220` seeded
# `Elo0 = -18.2`, unreadable as a rating and, worse, indistinguishable in
# sign from a data error). Widening the clamp to `0.03` instead of `1e-9`
# keeps the seed's own worst case positive: at `P = eps`,
# `logit(eps) = ln(eps/(1-eps)) ~= -3.48`, so `Elo0 = 1500 + 400*(-3.48)
# ~= 110`; at `P = 1 - eps`, `Elo0 ~= 2890`. Every `P` inside `(eps, 1-eps)`
# (ordinary belief, `0.03` to `0.97`) still seeds the exact unclamped
# `1500 + 400*logit(P)` value; only the two tails, `P` closer to total
# disbelief or total belief than that, get pulled in to the guaranteed-
# positive floor or ceiling.
_LOGIT_EPS = 0.03


def _logit(p: float) -> float:
    """`ln(p / (1 - p))`, clamped to `[_LOGIT_EPS, 1 - _LOGIT_EPS]` first:
    a projected posterior at or past that band seeds the floor or
    ceiling Elo the module docstring above works out, instead of an
    unbounded (and, at the low end, negative) rating."""
    p = min(max(p, _LOGIT_EPS), 1.0 - _LOGIT_EPS)
    return math.log(p / (1.0 - p))


def _seed_elo(hypotheses: Sequence[Hypothesis], opinions: Mapping[int, Opinion]) -> dict[int, float]:
    """`Elo0 = 1500 + 400 logit(P(h))` (`main.tex` §Engine loop). A
    hypothesis with no recorded opinion seeds at `P = 0.5`, `Elo0 = 1500`,
    the same reading `hte.belief.Opinion.from_evidence` gives a hypothesis
    at total ignorance."""
    elo: dict[int, float] = {}
    for h in hypotheses:
        opinion = opinions.get(h.address)
        p = opinion.project() if opinion is not None else 0.5
        elo[h.address] = _ELO_BASE + _ELO_SCALE * _logit(p)
    return elo


def run(
    hypotheses: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
    judge: Judge,
    *,
    rounds: int = 3,
    k: float = 32.0,
    seed: int = 0,
    context: dict | None = None,
    judge_batch: BatchJudge | None = None,
) -> dict[int, float]:
    """Elo seeded from the projected posterior, then updated over `rounds`
    Swiss-style pairwise debate rounds (`main.tex` §Engine loop): each
    round, hypotheses pair by nearest current rating, `judge(a, b,
    context)` returns the probability `a` beats `b`, and both ratings move
    by the standard Elo update with that probability read directly as the
    match's own score, rather than rounding it to a discrete win or loss.
    An odd hypothesis out in a round sits out that round unchanged, a bye.

    Pairing ties on rating are broken by a `seed`-derived, address-keyed
    random draw computed once up front, so the same `seed` over the same
    `hypotheses` always produces the same sequence of pairings, and a
    different `seed` only ever changes how ties are broken, never the
    ratings' math.

    `judge_batch` (default `None`, the single-call fallback: every pair
    goes through `judge` one at a time, exactly as before) is an optional
    `docs/THROUGHPUT.md`-shaped hook: when given, each round's WHOLE list
    of paired `(a, b, context)` triples goes through one `judge_batch`
    call instead of `len(order) // 2` separate `judge` calls, `hte.
    batching.batch_judge` (or any callable of the same shape) wired in by
    a caller (`hte.runner.run_campaign`) that wants the round's pairs
    scored in parallel or batched into fewer `claude -p` calls. `judge`
    itself is still required even when `judge_batch` is given: a bye
    round (an odd hypothesis out) and any caller inspecting `judge`'s own
    signature both still see a plain per-pair callable, and `judge_batch`
    validating internally (`hte.batching.batch_judge`'s own per-id
    fallback) may itself call `judge`-shaped single calls for whichever
    pairs it could not batch.

    This function runs one full tournament from a fixed `opinions`
    snapshot. `main.tex`'s own "every fixed number of rounds, `Eq.
    opinion-sum` recomputes exactly and Elo reseeds from it" is a call
    this function does not make on its own, since recomputing an opinion
    needs evidence and a vocabulary this module has no dependency on; a
    caller wanting that reseed re-scores `hypotheses` and calls `run`
    again with the refreshed `opinions`.
    """
    elo = _seed_elo(hypotheses, opinions)
    ctx = context or {}
    by_address = {h.address: h for h in hypotheses}
    rng = random.Random(seed)
    tiebreak = {addr: rng.random() for addr in sorted(by_address)}

    for _ in range(rounds):
        order = sorted(by_address, key=lambda addr: (-elo[addr], tiebreak[addr]))
        pairs = [(order[pos], order[pos + 1]) for pos in range(0, len(order) - 1, 2)]
        if not pairs:
            continue

        if judge_batch is not None:
            scores = list(judge_batch([(by_address[a], by_address[b], ctx) for a, b in pairs]))
        else:
            scores = [judge(by_address[a], by_address[b], ctx) for a, b in pairs]

        for (addr_a, addr_b), score_a in zip(pairs, scores):
            elo_a, elo_b = elo[addr_a], elo[addr_b]
            expected_a = 1.0 / (1.0 + 10.0 ** ((elo_b - elo_a) / _ELO_DIVISOR))
            delta = k * (score_a - expected_a)
            elo[addr_a] = elo_a + delta
            elo[addr_b] = elo_b - delta

    return elo


def critic_filter(hypotheses: Sequence[Hypothesis], critic: Critic) -> list[tuple[Hypothesis, dict]]:
    """A rule-and-model pass over `hypotheses` (`main.tex` §Engine loop's
    critic paragraph): `critic(h, h.to_dict())` runs once per hypothesis,
    a plain-dict view of `h` alongside the object itself so a rule-based
    or model-backed critic can pattern-match on fields without the
    dataclass API. A report with a truthy `"reject"` key drops that
    hypothesis from the returned list; every surviving hypothesis is
    paired with its own report, an audit trail for why it stayed, the way
    the preservation critic's detectability rationale
    (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7) explains an absence before a
    falsity does.
    """
    survivors: list[tuple[Hypothesis, dict]] = []
    for h in hypotheses:
        report = critic(h, h.to_dict())
        if report.get("reject", False):
            continue
        survivors.append((h, report))
    return survivors


__all__ = ["Judge", "Critic", "BatchJudge", "run", "critic_filter"]
