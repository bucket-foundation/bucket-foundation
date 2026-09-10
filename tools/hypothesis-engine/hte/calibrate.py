"""Discovery-date holdout, Brier scoring, and constant recalibration.

Mirrors `main.tex` §9 (Calibration and pilot design), `bkt-hte-holdout`:
split every ground-truth event at a cutoff on discovery date, and for
each event after the cutoff, ask whether the engine, seeing only
pre-cutoff evidence, would already have proposed a placement hypothesis
naming that event's own slots at an interval containing its own date.

`main.tex` §9 assumes a prior generation pass has already linked evidence
to hypothesis addresses; `hte.link.link_evidence` is that pass, and this
module reads the same per-item extracted slots
(`hte.evidence.EvidenceItem.actor`/.../`interval`) it reads, rather than
running a full `hte.runner.run_campaign` generation-and-critique pass
just to calibrate: `run_holdout` builds one placement hypothesis
directly from each pre-cutoff item's own claimed slots (`hte.concepts.
other_id` fills any slot the item names nothing for), which is cheap
enough to run with no LLM call and no network access, matching this
module's own no-cache, no-`claude`-CLI contract (`tests/test_calibrate.
py` needs neither).

`bkt-hte-holdout`'s own disposition is PULL, adding `scientific-
discovery`'s frozen-work, sampling-strata, failures-before-repair
campaign discipline to the period holdout test; this module builds the
discovery-date half of that pair (`hte.runner.run_campaign` is where a
frozen campaign id, sampling strata, and a run log wrap this module's
own functions, per that discipline).

The constants this module recalibrates are `W` and `lam`
(`Eq. opinion-sum`, `Eq. diminishing`) plus an optional global tier-weight
scale. `mu`, the corpus's superseded contradiction-penalty weight, is
deliberately excluded from `fit_constants`'s grid: `main.tex` §9 states
outright that `mu` "takes no recalibration pass of its own," since
`Eq. opinion-sum` folds contradiction into the opinion model directly.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Any, Mapping, Sequence

from . import belief
from .belief import Constants
from .corpus import Corpus, GroundTruthEvent
from .evidence import EvidenceItem, Tier
from .generate import PLACEMENT_CONCEPT_SLOTS
from .hypothesis import Hypothesis, Placement
from .link import slot_match_score
from .concepts import Vocabulary, other_id

DEFAULT_MATCH_THRESHOLD = 0.6


def holdout_by_discovery_date(
    items: Sequence[GroundTruthEvent], cutoff: int
) -> tuple[list[GroundTruthEvent], list[GroundTruthEvent]]:
    """`(pre, post)`: every item in `items` with `discovery_year < cutoff`,
    and every item with `discovery_year >= cutoff`, order preserved
    within each half."""
    pre = [i for i in items if i.discovery_year < cutoff]
    post = [i for i in items if i.discovery_year >= cutoff]
    return pre, post


def _placement_from_item(item: EvidenceItem, vocab: Vocabulary) -> Hypothesis | None:
    """The placement hypothesis `item` itself implies (`bkt-hte-holdout`):
    its own five extracted concept slots, each unnamed one read as `OTHER`
    (`hte.concepts.other_id`) rather than left missing, since `hte.
    hypothesis.Placement` carries no optional slot of its own, at its own
    extracted interval. `None` when `item` names no interval at all (a
    placement with no date can neither contain nor miss a held-out
    event's own year, so it is not a candidate) or when a named slot
    value resolves to no concept id and no fuzzy-matchable label in
    `vocab` (an extractor's raw, unresolved text this function does not
    itself try to place)."""
    if item.interval is None:
        return None
    values: dict[str, str] = {}
    for slot in PLACEMENT_CONCEPT_SLOTS:
        value = getattr(item, slot.value)
        values[slot.value] = value if value is not None else other_id(slot)
    placement = Placement(interval=item.interval, **values)
    try:
        return Hypothesis.from_placement(placement, vocab)
    except KeyError:
        return None


def _matches_event(
    target: EvidenceItem, placement: Placement, vocab: Vocabulary, *, threshold: float
) -> bool:
    """Whether `placement` matches every concept slot `target` (the
    held-out event's own evidence item) names anything for
    (`slot_match_score`, `hte.link`'s own per-slot fuzzy comparator,
    shared here rather than reimplemented). An event naming no slot at
    all matches nothing: there is nothing on file to test a placement
    against."""
    present = [slot for slot in PLACEMENT_CONCEPT_SLOTS if getattr(target, slot.value) is not None]
    if not present:
        return False
    return all(
        slot_match_score(getattr(target, slot.value), getattr(placement, slot.value), vocab, slot) >= threshold
        for slot in present
    )


def run_holdout(
    corpus: Corpus,
    constants: Constants,
    *,
    cutoff_years: int,
    n_bins: int = 10,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
) -> dict[str, Any]:
    """The discovery-date holdout (`main.tex` §9) over every ground-truth
    event in `corpus`, at `cutoff_years`: every event's own dated fact is
    the target, not (as before this module's `bkt-hte-holdout` rewrite) a
    source's own pooled subject.

    For each event after the cutoff, `_placement_from_item` builds one
    placement candidate from every PRE-cutoff evidence item (`hte.link`'s
    own per-item slot extraction), then keeps whichever candidates
    `_matches_event` says name the same slots as the held-out event's own
    item. Among those, the ones whose own interval contains the event's
    `year` are its *true* readings; the rest are *wrong-interval*
    competitors, a placement matching the event's slots but naming a
    different time for it.

    An event with no matching candidate at all contributes to
    `n_holdout_events` (the denominator) but not to `n_covered_events`
    (the numerator) or to any scored pair: `coverage_of_truth` is exactly
    this fraction, read as "how much of the ground truth this run's own
    pre-cutoff evidence could even place at all," independent of whether
    the placement it found was well or badly calibrated. An event with at
    least one true reading is *covered*: the best-projected true
    candidate is scored against `1.0`, and, when at least one wrong-
    interval competitor also exists, the best-projected one of those is
    scored against `0.0` too, both pairs feeding the same Brier score and
    calibration curve.
    """
    pre_events, post_events = holdout_by_discovery_date(corpus.ground_truth, cutoff_years)
    ev_by_id = {e.id: e for e in corpus.evidence}
    pre_evidence = [ev_by_id[g.id] for g in pre_events if g.id in ev_by_id]

    candidates: dict[int, Hypothesis] = {}
    for item in pre_evidence:
        hyp = _placement_from_item(item, corpus.vocab)
        if hyp is not None:
            candidates.setdefault(hyp.address, hyp)
    candidate_list = list(candidates.values())

    def projected(h: Hypothesis) -> float:
        return belief.score(h, pre_evidence, corpus.vocab, constants=constants).project()

    n_covered = 0
    predictions: list[dict[str, Any]] = []
    for g in sorted(post_events, key=lambda g: (g.discovery_year, g.id)):
        target = ev_by_id.get(g.id)
        if target is None:
            continue
        matches = [h for h in candidate_list if _matches_event(target, h.content, corpus.vocab, threshold=match_threshold)]
        true_matches = [h for h in matches if h.content.interval.start <= g.year <= h.content.interval.end]
        if not true_matches:
            continue
        wrong_matches = [h for h in matches if not (h.content.interval.start <= g.year <= h.content.interval.end)]
        n_covered += 1

        true_hyp = max(true_matches, key=projected)
        predictions.append({
            "event_id": g.id, "event_label": g.label, "event_year": g.year, "reading": "true",
            "hypothesis": true_hyp.short_id, "predicted": projected(true_hyp), "observed": 1.0,
        })
        if wrong_matches:
            wrong_hyp = max(wrong_matches, key=projected)
            predictions.append({
                "event_id": g.id, "event_label": g.label, "event_year": g.year, "reading": "wrong-interval",
                "hypothesis": wrong_hyp.short_id, "predicted": projected(wrong_hyp), "observed": 0.0,
            })

    brier = brier_score([p["predicted"] for p in predictions], [p["observed"] for p in predictions])
    n_holdout = len(post_events)
    return {
        "cutoff_years": cutoff_years,
        "match_threshold": match_threshold,
        "n_holdout_events": n_holdout,
        "n_covered_events": n_covered,
        "coverage_of_truth": (n_covered / n_holdout) if n_holdout else None,
        "brier_score": brier,
        "calibration_curve": calibration_curve(predictions, n_bins=n_bins),
        "predictions": predictions,
        "constants": {"W": constants.W, "lam": constants.lam},
    }


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
    per-event entries): for each equal-width bin over `[0, 1]`, the mean
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
    compare (an empty grid, or a corpus with no covered event at
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
        f"Held-out events: {result.get('n_holdout_events')}",
        f"Covered by a matching pre-cutoff placement: {result.get('n_covered_events')} "
        f"(coverage of truth: {result.get('coverage_of_truth')})",
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

    lines += ["", "## Per-event predictions", "", "| Event | Year | Reading | Hypothesis | Predicted | Observed |", "|---|---|---|---|---|---|"]
    for p in result.get("predictions", []):
        lines.append(
            f"| {p['event_id']} | {p['event_year']} | {p['reading']} | {p['hypothesis']} | "
            f"{p['predicted']:.3f} | {p['observed']} |"
        )

    (out / "CALIBRATION.md").write_text("\n".join(lines) + "\n")


__all__ = [
    "holdout_by_discovery_date", "run_holdout", "fit_constants", "write_calibration",
    "brier_score", "calibration_curve", "DEFAULT_MATCH_THRESHOLD",
]
