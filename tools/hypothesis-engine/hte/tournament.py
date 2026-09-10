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

# Elo's own logistic base and scale, and the seeding scale `Eq. rank`
# gives the projected posterior: `Elo0 = 1500 + 400 * logit(P(h))`.
_ELO_BASE = 1500.0
_ELO_SCALE = 400.0
_ELO_DIVISOR = 400.0
_LOGIT_EPS = 1e-9


def _logit(p: float) -> float:
    """`ln(p / (1 - p))`, clamped to `[eps, 1 - eps]` first so a
    projected posterior of exactly `0.0` or `1.0` seeds a large, finite
    Elo rating instead of raising or returning an infinity."""
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
        for pos in range(0, len(order) - 1, 2):
            addr_a, addr_b = order[pos], order[pos + 1]
            h_a, h_b = by_address[addr_a], by_address[addr_b]
            elo_a, elo_b = elo[addr_a], elo[addr_b]
            expected_a = 1.0 / (1.0 + 10.0 ** ((elo_b - elo_a) / _ELO_DIVISOR))
            score_a = judge(h_a, h_b, ctx)
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


__all__ = ["Judge", "Critic", "run", "critic_filter"]
