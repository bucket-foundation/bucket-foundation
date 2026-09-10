"""Discovery-date holdout, Brier scoring, and constant recalibration.

Mirrors `main.tex` §9 (Calibration and pilot design), `bkt-hte-holdout`:
split each source's ground-truth events at a cutoff on discovery date,
recompute the opinion from pre-cutoff evidence only, then check whether
the post-cutoff evidence's own outcome matches what the pre-cutoff
opinion implied. `bkt-hte-holdout`'s own disposition is PULL, adding
`scientific-discovery`'s frozen-work, sampling-strata, failures-before-
repair campaign discipline to the period holdout test; this module builds
the discovery-date half of that pair (`hte.runner.run_campaign` is where
a frozen campaign id, sampling strata, and a run log wrap this module's
own functions, per that discipline).

`main.tex` §9 assumes a prior generation pass has already linked evidence
to hypothesis addresses; this pass has not run one before calibration, so
this module works one level down, at the pre-cutoff pooled-evidence
opinion for a source's own subject rather than at a specific hypothesis
address. `hte.corpus.quantum_history` and `hte.corpus.fixtures` both give
every `GroundTruthEvent` the same id as the `EvidenceItem` it was read
from, so `run_holdout` can pair them directly: this module's own decision
where `main.tex` leaves room, stated here rather than left silent.

The constants this module recalibrates are `W` and `lam`
(`Eq. opinion-sum`, `Eq. diminishing`) plus an optional global tier-weight
scale. `mu`, the corpus's superseded contradiction-penalty weight, is
deliberately excluded from `fit_constants`'s grid: `main.tex` §9 states
outright that `mu` "takes no recalibration pass of its own," since
`Eq. opinion-sum` folds contradiction into the opinion model directly.
"""
from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Any, Mapping, Sequence

from . import belief
from .belief import Constants
from .corpus import Corpus, GroundTruthEvent
from .evidence import EvidenceItem, Tier


def holdout_by_discovery_date(
    items: Sequence[GroundTruthEvent], cutoff: int
) -> tuple[list[GroundTruthEvent], list[GroundTruthEvent]]:
    """`(pre, post)`: every item in `items` with `discovery_year < cutoff`,
    and every item with `discovery_year >= cutoff`, order preserved
    within each half."""
    pre = [i for i in items if i.discovery_year < cutoff]
    post = [i for i in items if i.discovery_year >= cutoff]
    return pre, post


def _source_splits(
    corpus: Corpus, cutoff_years: int
) -> dict[str, tuple[list[EvidenceItem], list[EvidenceItem]]]:
    """Every source with at least one ground-truth event on each side of
    `cutoff_years`, paired with its own pre- and post-cutoff evidence
    items (matched to their ground-truth event by shared id). A source
    with every event on one side of the cutoff is not split-worthy and is
    left out, matching `main.tex` §9's own "every hypothesis with holdout
    evidence" framing: nothing to hold out, nothing to score."""
    by_source: dict[str, list[GroundTruthEvent]] = defaultdict(list)
    for g in corpus.ground_truth:
        by_source[g.doc_id].append(g)

    ev_by_id = {e.id: e for e in corpus.evidence}
    splits: dict[str, tuple[list[EvidenceItem], list[EvidenceItem]]] = {}
    for doc_id, events in by_source.items():
        pre_events, post_events = holdout_by_discovery_date(events, cutoff_years)
        if not pre_events or not post_events:
            continue
        pre_items = [ev_by_id[g.id] for g in pre_events if g.id in ev_by_id]
        post_items = [ev_by_id[g.id] for g in post_events if g.id in ev_by_id]
        if not pre_items or not post_items:
            continue
        splits[doc_id] = (pre_items, post_items)
    return splits


def _predicted_probability(pre_items: Sequence[EvidenceItem], constants: Constants) -> float:
    """The pre-cutoff opinion's projected probability for a source's own
    subject, pooling `pre_items` as unconditional support (this module's
    own simplification, see the module docstring): grouped by kind,
    discounted by `D(n, constants.lam)` within each kind, then the
    cross-kind independence bonus applied once, exactly `hte.belief`'s
    own pooling arithmetic with every item read as supporting and no
    refuting side. The base rate is left uninformative (`a = 0.5`): this
    module scores a source's own subject directly, with no slotted
    `Hypothesis` and no `prior_logit` of its own to read a base rate from.
    """
    by_kind: dict[Any, list[EvidenceItem]] = defaultdict(list)
    for item in pre_items:
        by_kind[item.kind].append(item)
    total = 0.0
    for kind, items in by_kind.items():
        s_sum = sum(belief.cluster_weight(it) for it in items)
        total += belief.D(len(items), constants.lam) * s_sum
    r = belief.cross_kind_bonus(by_kind.keys()) * total
    opinion = belief.Opinion.from_evidence(r, 0.0, constants.W, a=0.5)
    return opinion.project()


def _observed_outcome(post_items: Sequence[EvidenceItem]) -> float:
    """`1.0` if every post-cutoff item continues to corroborate the
    source's subject, `0.0` if any of them is marked `is_absence=True`
    (this corpus's stand-in for a post-cutoff downgrade or non-
    replication, since neither corpus links post-cutoff evidence to a
    scored hypothesis's `refutes` list directly)."""
    return 0.0 if any(item.is_absence for item in post_items) else 1.0


def brier_score(predictions: Sequence[float], outcomes: Sequence[float]) -> float | None:
    """The mean squared error between each predicted probability and its
    binary outcome (`main.tex` §9's own "Brier score across every
    hypothesis with holdout evidence"). `None` when there is nothing to
    score, rather than a division by zero."""
    if not predictions:
        return None
    if len(predictions) != len(outcomes):
        raise ValueError("predictions and outcomes must be the same length")
    return sum((p - y) ** 2 for p, y in zip(predictions, outcomes)) / len(predictions)


def calibration_curve(
    predictions: Sequence[Mapping[str, float]], *, n_bins: int = 10
) -> list[dict[str, Any]]:
    """A `n_bins`-bin reliability curve over `predictions` (each a
    `{"predicted": p, "observed": y}` mapping, `run_holdout`'s own
    per-source entries): for each equal-width bin over `[0, 1]`, the mean
    predicted probability and the mean observed outcome among the
    predictions landing there. An empty bin reports `count=0` and `None`
    means rather than being dropped, so a caller plotting this curve sees
    every bin's absence stated explicitly instead of a silently shorter
    list.
    """
    bins: list[list[Mapping[str, float]]] = [[] for _ in range(n_bins)]
    for p in predictions:
        idx = min(n_bins - 1, max(0, int(p["predicted"] * n_bins)))
        bins[idx].append(p)
    curve = []
    for i, bucket in enumerate(bins):
        lo, hi = i / n_bins, (i + 1) / n_bins
        if not bucket:
            curve.append({"bin_low": lo, "bin_high": hi, "count": 0, "mean_predicted": None, "mean_observed": None})
            continue
        curve.append({
            "bin_low": lo, "bin_high": hi, "count": len(bucket),
            "mean_predicted": sum(p["predicted"] for p in bucket) / len(bucket),
            "mean_observed": sum(p["observed"] for p in bucket) / len(bucket),
        })
    return curve


def run_holdout(corpus: Corpus, constants: Constants, *, cutoff_years: int, n_bins: int = 10) -> dict[str, Any]:
    """The discovery-date holdout (`main.tex` §9) over every split-worthy
    source in `corpus` at `cutoff_years`: a Brier score and a `n_bins`-bin
    calibration curve across every source's pre-cutoff-predicted,
    post-cutoff-observed pair."""
    splits = _source_splits(corpus, cutoff_years)
    predictions = []
    for doc_id, (pre_items, post_items) in sorted(splits.items()):
        predicted = _predicted_probability(pre_items, constants)
        observed = _observed_outcome(post_items)
        predictions.append({
            "doc_id": doc_id, "predicted": predicted, "observed": observed,
            "n_pre": len(pre_items), "n_post": len(post_items),
        })
    brier = brier_score([p["predicted"] for p in predictions], [p["observed"] for p in predictions])
    return {
        "cutoff_years": cutoff_years,
        "n_sources": len(predictions),
        "brier_score": brier,
        "calibration_curve": calibration_curve(predictions, n_bins=n_bins),
        "predictions": predictions,
        "constants": {"W": constants.W, "lam": constants.lam},
    }


@dataclass(frozen=True)
class GridResult:
    W: float
    lam: float
    tier_scale: float
    brier_score: float | None

    def to_dict(self) -> dict[str, Any]:
        return {"W": self.W, "lam": self.lam, "tier_scale": self.tier_scale, "brier_score": self.brier_score}


def fit_constants(
    corpus: Corpus,
    grid: Mapping[str, Sequence[float]],
    *,
    cutoff_years: int,
) -> dict[str, Any]:
    """Grid search over `grid["W"]`, `grid["lam"]`, and an optional
    `grid["tier_scale"]` (a single global multiplier on every tier weight,
    standing in for `TIMELINE-AND-COMBINATORICS-SPEC.md`'s six-value
    `tier_weight` table so the grid stays a tractable product rather than
    a six-dimensional sweep), minimizing `run_holdout`'s Brier score at
    `cutoff_years`. `mu` is not part of the grid; see the module docstring.
    Returns `{"best", "results"}`, `results` sorted best-first, `best`
    `None` when the grid or the holdout itself produced no score to
    compare (an empty grid, or a corpus with no split-worthy source at
    `cutoff_years`).
    """
    w_values = list(grid.get("W", [Constants().W]))
    lam_values = list(grid.get("lam", [Constants().lam]))
    scale_values = list(grid.get("tier_scale", [1.0]))

    results: list[GridResult] = []
    for w, lam, scale in product(w_values, lam_values, scale_values):
        tier_weight = {t: belief.TIER_WEIGHT[t] * scale for t in Tier}
        constants = Constants(W=w, lam=lam, tier_weight=tier_weight)
        score = run_holdout(corpus, constants, cutoff_years=cutoff_years)["brier_score"]
        results.append(GridResult(W=w, lam=lam, tier_scale=scale, brier_score=score))

    scored = [r for r in results if r.brier_score is not None]
    scored.sort(key=lambda r: r.brier_score)
    best = scored[0] if scored else None
    return {
        "best": best.to_dict() if best else None,
        "results": [r.to_dict() for r in sorted(results, key=lambda r: (r.brier_score is None, r.brier_score))],
    }


def write_calibration(result: Mapping[str, Any], out_dir: str | Path) -> None:
    """Writes `result` (`run_holdout`'s own return shape, optionally with
    a `"fit"` key holding `fit_constants`'s own output) to
    `out_dir/calibration.json` and a human-readable `out_dir/
    CALIBRATION.md`."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "calibration.json").write_text(json.dumps(result, indent=2))

    lines = [
        "# Calibration",
        "",
        f"Cutoff year: {result.get('cutoff_years')}",
        f"Split-worthy sources: {result.get('n_sources')}",
        f"Brier score: {result.get('brier_score')}",
        "",
        "## Calibration curve",
        "",
        "| Bin | Count | Mean predicted | Mean observed |",
        "|---|---|---|---|",
    ]
    for b in result.get("calibration_curve", []):
        lines.append(f"| [{b['bin_low']:.1f}, {b['bin_high']:.1f}) | {b['count']} | {b['mean_predicted']} | {b['mean_observed']} |")

    fit = result.get("fit")
    if fit:
        lines += ["", "## Constant recalibration", "", f"Best: {fit.get('best')}", ""]

    lines += ["", "## Per-source predictions", "", "| Source | Predicted | Observed | Pre items | Post items |", "|---|---|---|---|---|"]
    for p in result.get("predictions", []):
        lines.append(f"| {p['doc_id']} | {p['predicted']:.3f} | {p['observed']} | {p['n_pre']} | {p['n_post']} |")

    (out / "CALIBRATION.md").write_text("\n".join(lines) + "\n")


__all__ = [
    "holdout_by_discovery_date", "run_holdout", "fit_constants", "write_calibration",
    "brier_score", "calibration_curve",
]
