from __future__ import annotations

import math
import random
from typing import Callable, Mapping, Sequence

from .belief import Opinion
from .hypothesis import Hypothesis

Judge = Callable[[Hypothesis, Hypothesis, dict], float]
Critic = Callable[[Hypothesis, dict], dict]
BatchJudge = Callable[[Sequence[tuple[Hypothesis, Hypothesis, dict]]], Sequence[float]]

_ELO_BASE = 1500.0
_ELO_SCALE = 400.0
_ELO_DIVISOR = 400.0

_LOGIT_EPS = 0.03

def _logit(p: float) -> float:
    p = min(max(p, _LOGIT_EPS), 1.0 - _LOGIT_EPS)
    return math.log(p / (1.0 - p))

def _seed_elo(hypotheses: Sequence[Hypothesis], opinions: Mapping[int, Opinion]) -> dict[int, float]:
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

        judge_side = [rng.random() < 0.5 for _ in pairs]
        judge_pairs = [(b, a) if swapped else (a, b) for (a, b), swapped in zip(pairs, judge_side)]

        if judge_batch is not None:
            raw_scores = list(judge_batch([(by_address[x], by_address[y], ctx) for x, y in judge_pairs]))
        else:
            raw_scores = [judge(by_address[x], by_address[y], ctx) for x, y in judge_pairs]
        scores = [1.0 - s if swapped else s for s, swapped in zip(raw_scores, judge_side)]

        for (addr_a, addr_b), score_a in zip(pairs, scores):
            elo_a, elo_b = elo[addr_a], elo[addr_b]
            expected_a = 1.0 / (1.0 + 10.0 ** ((elo_b - elo_a) / _ELO_DIVISOR))
            delta = k * (score_a - expected_a)
            elo[addr_a] = elo_a + delta
            elo[addr_b] = elo_b - delta

    return elo

def critic_filter(hypotheses: Sequence[Hypothesis], critic: Critic) -> list[tuple[Hypothesis, dict]]:
    survivors: list[tuple[Hypothesis, dict]] = []
    for h in hypotheses:
        report = critic(h, h.to_dict())
        if report.get("reject", False):
            continue
        survivors.append((h, report))
    return survivors

__all__ = ["Judge", "Critic", "BatchJudge", "run", "critic_filter"]
