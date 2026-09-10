"""Subjective-logic belief: opinions, evidence pooling, and detectability.

Mirrors `Bucket.Belief` (`papers/history-hypothesis-engine/lean/Bucket/Belief.lean`),
`main.tex` §Belief model, and `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2-4: an
opinion `(b, d, u, a)` in place of one sigmoid score, evidence pooled by kind
with diminishing returns and a cross-kind independence bonus, a source stemma
discounting corroboration that copies one archetype, and a detectability
term scaling absence-of-evidence as a likelihood ratio.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from .evidence import EvidenceItem, EvidenceKind, KIND_FAMILY, Source, Tier, TIER_WEIGHT
from .hypothesis import Hypothesis
from .concepts import Vocabulary

DetectabilityTable = Mapping[tuple[str, str], float]

SEED_DETECTABILITY_PATH = Path(__file__).parent / "data" / "detectability-seed.json"


def sigmoid(x: float) -> float:
    """The standard logistic function, `1 / (1 + e^-x)`."""
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


# --------------------------------------------------------------------------
# Constants
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Constants:
    """Every tunable constant this module runs on. `W`, `lam`, and
    `tier_weight` were the corpus's original values (`main.tex`
    §Limitations), kept fixed through the move to the opinion model rather
    than refit to it, until `docs/CALIBRATION-FIT-2026-09-10.md`'s own
    pooled coordinate-descent fit (`hte.calibrate.fit_constants_pooled`,
    `hte.belief.load_constants`) gave this package a real, on-file
    alternative; see that report for whether the fit beat these bare
    defaults on real-corpus Brier. `mu` is the superseded
    contradiction-penalty weight: `Eq. opinion-sum` has no term that reads
    it, since the opinion model absorbs what a separate contradiction
    penalty did; it is carried here only so a caller diffing against the
    corpus's original truth-score formula has it on file, and so a fit over
    "every named constant" (`fit_constants_pooled`'s own scope) has
    somewhere to write a value that never moves this module's own Brier
    score. `alpha` mirrors `hte.concepts.Vocabulary`'s `default_alpha`, the
    Dirichlet-process concentration used when a vocabulary sets no
    explicit per-slot value, kept here too so every uncalibrated constant
    sits in one place; like `mu`, this module reads no value from it, so a
    fitted value is recorded rather than consumed. `theta_prune` is the
    stemma edge-pruning threshold (`def:stemma`). `detectability_floor` is
    a lower bound on the per-`(period, kind)` `delta` `pooled_weight` reads
    out of a detectability table before scaling an absence-of-evidence
    item's weight (`Eq. detectability`): `0.0` (the default) changes
    nothing, since every table value already sits in `[0, 1]`; a positive
    floor keeps an absence finding in a low-detectability
    context (an early period's own textual record, say) from being scaled
    down to near-zero, unlike `detectability`'s own `default=1.0` (the
    HIGH-detectability limit an unlisted `(period, kind)` pair reads at),
    which this floor does not touch at all."""
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
    """The `Constants` a campaign should run on: `Constants()` (the bare,
    uncalibrated defaults) when `source == "default"`; the pooled-fit
    result at `FITTED_CONSTANTS_PATH` (`docs/CALIBRATION-FIT-2026-09-10.md`,
    `hte.calibrate.fit_constants_pooled`) when `source == "fitted"`, this
    function's own default, matching `hte.runner.DEFAULT_CONFIG["constants"]`
    and `hte campaign run`'s own `--constants` flag default.

    Falls back to `Constants()` when `source == "fitted"` but no fitted
    file exists on disk: a package checked out before this file was
    written, or a fit run that concluded the pooled search could not beat
    the bare defaults by the report's own bar and so shipped no override
    file at all (`docs/CALIBRATION-FIT-2026-09-10.md`'s own "if the fit
    cannot beat the defaults... keep the defaults" clause), both read the
    same way: nothing on file to prefer, so the defaults stand.

    Raises `ValueError` for any `source` other than `"default"`/`"fitted"`,
    the same two values `hte campaign run --constants` accepts."""
    if source == "default":
        return Constants()
    if source != "fitted":
        raise ValueError(f"constants source must be 'default' or 'fitted', got {source!r}")
    if not FITTED_CONSTANTS_PATH.is_file():
        return Constants()
    return Constants.from_dict(json.loads(FITTED_CONSTANTS_PATH.read_text()))


# --------------------------------------------------------------------------
# Opinion
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Opinion:
    """A subjective-logic opinion (`def:opinion`, `Bucket.Belief.Opinion`):
    belief, disbelief, uncertainty mass, and base rate."""
    b: float
    d: float
    u: float
    a: float

    def project(self) -> float:
        """`P(h) = b(h) + a(h) * u(h)` (`Eq. projection`,
        `Bucket.Belief.project`)."""
        return self.b + self.a * self.u

    @classmethod
    def from_evidence(cls, r: float, s: float, W: float, a: float) -> "Opinion":
        """`Eq. opinion-sum` / `Bucket.Belief.fromEvidence`: the fused
        opinion from pooled supporting weight `r`, pooled refuting weight
        `s`, total-ignorance weight `W`, and base rate `a`. At `r = s = 0`
        this gives `u = 1` and `P(h) = a` exactly
        (`u_eq_one_of_no_evidence`): a hypothesis nobody has examined reads
        at its prior, with a stated uncertainty mass of 1, rather than at an
        unmarked point estimate indistinguishable from a refuted one."""
        if r < 0 or s < 0:
            raise ValueError("evidence weights r and s must be >= 0")
        if W <= 0:
            raise ValueError("total-ignorance weight W must be > 0")
        denom = r + s + W
        return cls(b=r / denom, d=s / denom, u=W / denom, a=a)

    def to_dict(self) -> dict:
        return {"b": self.b, "d": self.d, "u": self.u, "a": self.a}

    @classmethod
    def from_dict(cls, d: dict) -> "Opinion":
        return cls(b=d["b"], d=d["d"], u=d["u"], a=d["a"])


def fuse(o1: Opinion, o2: Opinion) -> Opinion:
    """Jøsang's cumulative fusion of two independent opinions sharing one
    base rate (`Bucket.Belief.fuse`, Jøsang, *Subjective Logic*, the
    cumulative-fusion operator's own dogmatic-opinion case). The
    denominator `u1 + u2 - u1*u2` vanishes only when both opinions are
    fully dogmatic (`u1 = u2 = 0`), and that case splits in two: two
    dogmatic opinions that AGREE (same `b`, same `d`) fuse to that shared
    verdict unchanged, since there is nothing left to reconcile; two
    dogmatic opinions that DISAGREE have no fused answer of their own
    under cumulative fusion (Jøsang's own formalism leaves this
    undefined), so that case alone falls back to the neutral vacuous
    opinion (`u := 1`) rather than dividing by zero
    (FINDING-2026-09-10-003, `tests/swarm/FINDINGS-2026-09-10.md`).
    """
    if o1.u == 0.0 and o2.u == 0.0:
        if o1.b == o2.b and o1.d == o2.d:
            return Opinion(b=o1.b, d=o1.d, u=0.0, a=(o1.a + o2.a) / 2)
        return Opinion(b=0.0, d=0.0, u=1.0, a=o1.a)
    denom = o1.u + o2.u - o1.u * o2.u
    b = (o1.b * o2.u + o2.b * o1.u) / denom
    d = (o1.d * o2.u + o2.d * o1.u) / denom
    u = (o1.u * o2.u) / denom
    # The combined base rate's own denominator, `a_denom = u1 + u2 -
    # 2*u1*u2`, is checked against a relative epsilon rather than exact
    # zero: when u1 sits a handful of floating-point ULPs below 1.0 (a
    # realistic shape once pooled evidence weight dwarfs W) and u2 == 1.0
    # (the vacuous opinion), a_denom lands a few ULPs above zero instead
    # of exactly zero, so the exact-equality guard used to let the
    # division run anyway and catastrophically amplify that rounding
    # error (FINDING-2026-09-10-004). Past the epsilon window, the
    # fallback is the mean base rate weighted by each opinion's own
    # confidence `1 - u` (an opinion at u == 1 carries no information
    # about its own base rate and is weighted out entirely), rather than
    # a plain unweighted average; when both weights are zero too (both
    # opinions fully vacuous, `u1 = u2 = 1`, the one case this epsilon
    # window still reaches exactly), that reduces to the plain average.
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


# --------------------------------------------------------------------------
# Diminishing returns and cross-kind bonus
# --------------------------------------------------------------------------


def D(n: float, lam: float = 0.5) -> float:
    """`D(n) = 1 + lam * ln(1 + n)` (`Eq. diminishing`), the diminishing-
    returns discount on `n` corroborating clusters. Every call site in the
    paper passes the effective count `n_eff` (`effective_count` below) here
    in place of the raw cluster count."""
    if n < 0:
        raise ValueError("n must be >= 0")
    return 1.0 + lam * math.log1p(n)


def cross_kind_bonus(kinds: Iterable[EvidenceKind]) -> float:
    """`X(K) = 1 + 0.3 * sum_pairs kind_distance(pair)` (`Eq. cross-kind`),
    over the distinct evidence kinds `K` carrying real weight on one side.
    `kind_distance` is 1 for a pair drawn from two different families
    (`EvidenceFamily`), 0 for a pair from the same family."""
    distinct = sorted(set(kinds), key=lambda k: k.value)
    total = 0.0
    for i in range(len(distinct)):
        for j in range(i + 1, len(distinct)):
            if KIND_FAMILY[distinct[i]] != KIND_FAMILY[distinct[j]]:
                total += 1.0
    return 1.0 + 0.3 * total


# --------------------------------------------------------------------------
# Stemma effective count
# --------------------------------------------------------------------------


def effective_count(
    sources: Sequence[Source],
    edge_weights: Mapping[tuple[str, str], float] | None = None,
    theta_prune: float = 0.6,
) -> int:
    """`n_eff`, the effective count of a cluster's sources (`def:stemma`):
    the number of connected components of the stemma graph after removing
    every `copies_from`/`shares_archetype_with` edge below `theta_prune`
    (default 0.6). `sources` gives the cluster's `Source` nodes; each
    source's own `stemma_parents` is its outgoing edge set. `edge_weights`
    gives the copy-confidence weight for a `(child_id, parent_id)` pair; a
    pair missing from it defaults to weight 1.0 (an unweighted stemma edge
    reads as full confidence, so it is never pruned by default). A source
    naming a parent outside `sources` has no edge to union against, since
    the parent is not part of this cluster.
    """
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

    return len({find(i) for i in ids})


# --------------------------------------------------------------------------
# Detectability
# --------------------------------------------------------------------------


def load_detectability_table(path: str | Path | None = None) -> DetectabilityTable:
    """The per-period, per-kind detectability table (`def:detect`), flattened
    to a `(period, kind_value) -> delta` mapping. Defaults to the shipped
    `hte/data/detectability-seed.json` placeholder, illustrative only
    (`fig:detectability`, `main.tex` §Limitations)."""
    p = Path(path) if path else SEED_DETECTABILITY_PATH
    raw = json.loads(p.read_text())
    flat: dict[tuple[str, str], float] = {}
    for period, kinds in raw.get("table", {}).items():
        for kind, delta in kinds.items():
            flat[(period, kind)] = float(delta)
    return flat


def detectability(table: DetectabilityTable, period: str, kind: EvidenceKind, default: float = 1.0) -> float:
    """`delta(period, medium, region)` (`def:detect`), read from `table`.
    An unlisted `(period, kind)` pair defaults to 1.0, the high-
    detectability limit at which absence evidence recovers the flat-tier
    treatment `Eq. detectability` describes: an unmodeled context reads as
    offering no discount, so an absence finding outside the table's current
    coverage keeps its full weight instead of being zeroed out by default."""
    return table.get((period, kind.value), default)


def detectability_scale(e_raw_absence: float, delta: float) -> float:
    """`e_absence = delta * e_raw_absence` (`Eq. detectability`, `main.tex`
    §Belief model: "e_absence = delta(period, medium, region) *
    e_raw-absence"): absence of evidence read as a likelihood ratio,
    scaled by detectability in place of a flat tier. As `delta -> 0` the
    ratio itself goes to 0, not 1: the absence item's weight vanishes, so
    it stops contributing to either side of the pooled weight rather than
    turning neutral. As `delta -> 1` it recovers the flat-tier treatment
    as its high-detectability limit, `e_absence == e_raw_absence`.

    (FINDING-2026-09-10-002, `tests/swarm/FINDINGS-2026-09-10.md`: an
    earlier revision of this docstring claimed the `delta -> 0` limit was
    1, contradicting this same formula; the formula is what `main.tex`'s
    own `eq:detectability` states, so the docstring was the one fixed.)
    """
    return delta * e_raw_absence


# --------------------------------------------------------------------------
# Evidence weight and pooling
# --------------------------------------------------------------------------


def edge_strength(item: EvidenceItem) -> float:
    """The per-item edge strength `e_i` (`Eq. cluster-weight`). An explicit
    `"blended_a"` view, if present, wins outright: this is the corpus's
    original formula (`e_i_blended_A`), and a caller that already computed
    it should not pay to recompute it. Absent that, a `"cosine"`/`"fuzzy"`/
    `"motif"` triple blends under the same formula,
    `min(0.99, 0.40*cos + 0.25*fuz + 0.10*motif)`. With no similarity views
    on file at all, `e_i` falls back to 1.0: the tier weight alone sets
    `s_i`, the bead's tier-only fallback."""
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
    """`s_i = k(tier_i) * e_i` (`Eq. cluster-weight`). When `item.is_absence`
    and both `detect_table` and `period` are given, `e_i` is scaled by
    detectability first (`detectability_scale`); otherwise absence is read
    at the flat-tier, high-detectability default."""
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
    """The signed per-item weight toward one hypothesis: `+s_i` if `item`
    supports that address, `-s_i` if it refutes it, `0.0` if it names
    neither. An item naming the same address in both `supports` and
    `refutes` is a malformed input the paper does not anticipate; this
    resolves it in one fixed, documented direction, `supports` winning,
    which keeps the malformed item visible in a caller's downstream totals
    instead of dropping it silently."""
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
) -> tuple[float, float]:
    """The pooled supporting and refuting weights `S_+`, `S_-` for one
    hypothesis (`main.tex` §Belief model's `S_+`/`S_-` definition): group
    `items` by kind, discount each kind's summed weight by `D` on its
    effective count, sum across kinds, then apply the cross-kind
    independence bonus once over the kinds carrying real weight on that
    side. `sources`, keyed by `source_id`, lets each kind's effective count
    fall back from a raw item count to the stemma's connected-component
    count (`effective_count`); with no `sources` given, `n_eff` is just the
    number of items in that kind.

    `constants.detectability_floor` (`Constants`'s own docstring) is
    applied once here, to every entry `detect_table` carries, before
    either the sign pass below or `side()`'s own magnitude sum reads it:
    a single floored table view for the whole call, rather than two
    separately-floored reads that could in principle drift apart.
    """
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
            s_sum = sum(cluster_weight(i, floored_table, period) for i in kind_items)
            total += D(n_eff, constants.lam) * s_sum
        return cross_kind_bonus(groups.keys()) * total

    return side(by_kind_support), side(by_kind_refute)


# --------------------------------------------------------------------------
# score()
# --------------------------------------------------------------------------


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
) -> Opinion:
    """`Eq. opinion-sum`: the fused opinion for `hypothesis`, from the
    evidence in `evidence` that names its address and the prior logit
    summed over its own concept slots (`Hypothesis.prior_logit`). `table`
    is the detectability table (`load_detectability_table`) absence items
    are scaled by; passing `None` reads every absence item at the flat-tier
    default.
    """
    r, s = pooled_weight(
        evidence, hypothesis.address,
        sources=sources, stemma_edge_weights=stemma_edge_weights,
        detect_table=table, period=period, constants=constants,
    )
    a = sigmoid(hypothesis.prior_logit(vocab))
    return Opinion.from_evidence(r, s, constants.W, a)
