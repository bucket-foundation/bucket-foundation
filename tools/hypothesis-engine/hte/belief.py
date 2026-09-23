from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Sequence

from .evidence import EvidenceItem, EvidenceKind, Source, Tier, TIER_WEIGHT
from .hypothesis import Hypothesis
from .concepts import Vocabulary

DetectabilityTable = Mapping[tuple[str, str], float]

SEED_DETECTABILITY_PATH = Path(__file__).parent / "data" / "detectability-seed.json"

def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)

@dataclass(frozen=True)
class Constants:
    W: float = 2.0
    lam: float = 0.5
    mu: float = 0.5
    alpha: float = 1.0
    theta_prune: float = 0.6
    tier_weight: dict[Tier, float] = field(default_factory=lambda: dict(TIER_WEIGHT))
    detectability_floor: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "W": self.W, "lam": self.lam, "mu": self.mu, "alpha": self.alpha,
            "theta_prune": self.theta_prune,
            "tier_weight": {t.value: w for t, w in self.tier_weight.items()},
            "detectability_floor": self.detectability_floor,
        }

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "Constants":
        default = cls()
        tier_weight = (
            {Tier(k): float(v) for k, v in d["tier_weight"].items()}
            if "tier_weight" in d else dict(default.tier_weight)
        )
        return cls(
            W=float(d.get("W", default.W)), lam=float(d.get("lam", default.lam)),
            mu=float(d.get("mu", default.mu)), alpha=float(d.get("alpha", default.alpha)),
            theta_prune=float(d.get("theta_prune", default.theta_prune)),
            tier_weight=tier_weight,
            detectability_floor=float(d.get("detectability_floor", default.detectability_floor)),
        )

FITTED_CONSTANTS_PATH = Path(__file__).parent / "data" / "constants-fitted.json"

def load_constants(source: str = "fitted") -> Constants:
    if source == "default":
        return Constants()
    if source != "fitted":
        raise ValueError(f"constants source must be 'default' or 'fitted', got {source!r}")
    if not FITTED_CONSTANTS_PATH.is_file():
        return Constants()
    return Constants.from_dict(json.loads(FITTED_CONSTANTS_PATH.read_text()))

@dataclass(frozen=True)
class Opinion:
    b: float
    d: float
    u: float
    a: float

    def project(self) -> float:
        return self.b + self.a * self.u

    def lift(self) -> float:
        return self.b - self.d

    def tipping_prior(self, floor: float) -> float | None:
        if self.u <= 0:
            return None
        a_tip = (floor - self.b) / self.u
        if a_tip < 0.0 or a_tip > 1.0:
            return None
        return a_tip

    def scored(self) -> bool:
        return self.u < 1.0

    @classmethod
    def from_evidence(cls, r: float, s: float, W: float, a: float) -> "Opinion":
        if r < 0 or s < 0:
            raise ValueError("evidence weights r and s must be >= 0")
        if W <= 0:
            raise ValueError("total-ignorance weight W must be > 0")
        denom = r + s + W
        return cls(b=r / denom, d=s / denom, u=W / denom, a=a)

    def to_dict(self) -> dict:
        return {
            "b": self.b, "d": self.d, "u": self.u, "a": self.a, "scored": self.scored(),
            "lift": self.lift(), "tipping_prior_0_6": self.tipping_prior(0.6),
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Opinion":
        return cls(b=d["b"], d=d["d"], u=d["u"], a=d["a"])

def opinion_clears_floor(opinion: "Opinion", *, floor_P: float, floor_u_max: float, lift_floor: float) -> bool:
    return opinion.project() >= floor_P and opinion.u <= floor_u_max and opinion.lift() >= lift_floor

def fuse(o1: Opinion, o2: Opinion) -> Opinion:
    if o1.u == 0.0 and o2.u == 0.0:
        if o1.b == o2.b and o1.d == o2.d:
            return Opinion(b=o1.b, d=o1.d, u=0.0, a=(o1.a + o2.a) / 2)
        return Opinion(b=0.0, d=0.0, u=1.0, a=o1.a)
    denom = o1.u + o2.u - o1.u * o2.u
    b = (o1.b * o2.u + o2.b * o1.u) / denom
    d = (o1.d * o2.u + o2.d * o1.u) / denom
    u = (o1.u * o2.u) / denom
    a_denom = o1.u + o2.u - 2 * o1.u * o2.u
    if abs(a_denom) < 1e-9:
        weight1 = 1.0 - o1.u
        weight2 = 1.0 - o2.u
        total_weight = weight1 + weight2
        if total_weight > 0:
            a = (weight1 * o1.a + weight2 * o2.a) / total_weight
        else:
            a = (o1.a + o2.a) / 2
    else:
        a = (o1.a * o2.u + o2.a * o1.u - (o1.a + o2.a) * o1.u * o2.u) / a_denom
    return Opinion(b=b, d=d, u=u, a=a)

def D(n: float, lam: float = 0.5) -> float:
    if n < 0:
        raise ValueError("n must be >= 0")
    return 1.0 + lam * math.log1p(n)

DISCRIMINATION_LR: dict[str, float] = {"strong": 10.0, "moderate": 3.0, "weak": 1.5, "none": 1.0}

def discrimination(lr: float | None) -> float:
    if lr is None:
        return 1.0
    return max(0.0, 1.0 - 1.0 / max(lr, 1.0))

def effective_count(
    sources: Sequence[Source],
    edge_weights: Mapping[tuple[str, str], float] | None = None,
    theta_prune: float = 0.6,
) -> int:
    ids = [s.id for s in sources]
    id_set = set(ids)
    parent = {i: i for i in ids}

    def find(x: str) -> str:
        while parent[x] != x:
            x = parent[x]
        return x

    def union(x: str, y: str) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    weights = edge_weights or {}
    for s in sources:
        for p in s.stemma_parents:
            if p not in id_set:
                continue
            w = weights.get((s.id, p), 1.0)
            if w >= theta_prune:
                union(s.id, p)

    first_by_key: dict[tuple[str, str], str] = {}
    for s in sources:
        keys = [("author", a.strip().lower()) for a in s.authors if a.strip()]
        keys += [("lab", s.lab.strip().lower())] if s.lab and s.lab.strip() else []
        keys += [("method", s.method.strip().lower())] if s.method and s.method.strip() else []
        for key in keys:
            other = first_by_key.setdefault(key, s.id)
            if other != s.id:
                union(s.id, other)

    return len({find(i) for i in ids})

def load_detectability_table(path: str | Path | None = None) -> DetectabilityTable:
    p = Path(path) if path else SEED_DETECTABILITY_PATH
    raw = json.loads(p.read_text())
    flat: dict[tuple[str, str], float] = {}
    for period, kinds in raw.get("table", {}).items():
        for kind, delta in kinds.items():
            flat[(period, kind)] = float(delta)
    return flat

def detectability(table: DetectabilityTable, period: str, kind: EvidenceKind, default: float = 1.0) -> float:
    return table.get((period, kind.value), default)

def detectability_scale(e_raw_absence: float, delta: float) -> float:
    return delta * e_raw_absence

def edge_strength(item: EvidenceItem) -> float:
    if "blended_a" in item.views:
        return min(0.99, item.views["blended_a"])
    cos = item.views.get("cosine")
    fuz = item.views.get("fuzzy")
    motif = item.views.get("motif")
    if cos is not None and fuz is not None and motif is not None:
        return min(0.99, 0.40 * cos + 0.25 * fuz + 0.10 * motif)
    return 1.0

def cluster_weight(
    item: EvidenceItem,
    detect_table: DetectabilityTable | None = None,
    period: str | None = None,
) -> float:
    e = edge_strength(item)
    if item.is_absence:
        delta = detectability(detect_table, period, item.kind) if detect_table is not None and period is not None else 1.0
        e = detectability_scale(e, delta)
    return TIER_WEIGHT[item.tier] * e

def weight(
    item: EvidenceItem,
    hypothesis_address: int,
    detect_table: DetectabilityTable | None = None,
    period: str | None = None,
) -> float:
    s = cluster_weight(item, detect_table, period)
    if hypothesis_address in item.supports:
        return s
    if hypothesis_address in item.refutes:
        return -s
    return 0.0

def pooled_weight(
    items: Sequence[EvidenceItem],
    hypothesis_address: int,
    *,
    sources: Mapping[str, Source] | None = None,
    stemma_edge_weights: Mapping[tuple[str, str], float] | None = None,
    detect_table: DetectabilityTable | None = None,
    period: str | None = None,
    constants: Constants = Constants(),
    likelihood_ratios: Mapping[str, float] | None = None,
) -> tuple[float, float]:
    floored_table: DetectabilityTable | None = (
        {k: max(constants.detectability_floor, v) for k, v in detect_table.items()}
        if detect_table is not None else None
    )
    by_kind_support: dict[EvidenceKind, list[EvidenceItem]] = {}
    by_kind_refute: dict[EvidenceKind, list[EvidenceItem]] = {}
    for item in items:
        w = weight(item, hypothesis_address, floored_table, period)
        if w > 0:
            by_kind_support.setdefault(item.kind, []).append(item)
        elif w < 0:
            by_kind_refute.setdefault(item.kind, []).append(item)

    def side(groups: dict[EvidenceKind, list[EvidenceItem]]) -> float:
        if not groups:
            return 0.0
        total = 0.0
        for kind, kind_items in groups.items():
            if sources is not None:
                kind_sources = [sources[i.source_id] for i in kind_items if i.source_id in sources]
                n_eff = effective_count(kind_sources, stemma_edge_weights, constants.theta_prune) if kind_sources else len(kind_items)
            else:
                n_eff = len(kind_items)
            s_sum = sum(
                cluster_weight(i, floored_table, period) * discrimination((likelihood_ratios or {}).get(i.id))
                for i in kind_items
            )
            total += D(n_eff, constants.lam) * s_sum
        return total

    return side(by_kind_support), side(by_kind_refute)

def score(
    hypothesis: Hypothesis,
    evidence: Sequence[EvidenceItem],
    vocab: Vocabulary,
    table: DetectabilityTable | None = None,
    *,
    sources: Mapping[str, Source] | None = None,
    stemma_edge_weights: Mapping[tuple[str, str], float] | None = None,
    period: str | None = None,
    constants: Constants = Constants(),
    likelihood_ratios: Mapping[str, float] | None = None,
) -> Opinion:
    r, s = pooled_weight(
        evidence, hypothesis.address,
        sources=sources, stemma_edge_weights=stemma_edge_weights,
        detect_table=table, period=period, constants=constants, likelihood_ratios=likelihood_ratios,
    )
    a = sigmoid(hypothesis.prior_logit(vocab))
    return Opinion.from_evidence(r, s, constants.W, a)
