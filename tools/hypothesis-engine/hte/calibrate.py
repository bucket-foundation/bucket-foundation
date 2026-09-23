from __future__ import annotations

import copy
import json
import math
import random
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
from .link import link_evidence, slot_match_score
from .concepts import Vocabulary, other_id
from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from .timeline import Interval, RESOLUTION_WIDTH_YEARS, Resolution, auto_resolution, bin_bounds

DEFAULT_MATCH_THRESHOLD = 0.6
DEFAULT_KFOLD_K = 5

def wilson_interval(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (0.0, 0.0)
    phat = k / n
    denom = 1 + z * z / n
    center = phat + z * z / (2 * n)
    margin = z * math.sqrt(phat * (1 - phat) / n + z * z / (4 * n * n))
    return max(0.0, (center - margin) / denom), min(1.0, (center + margin) / denom)

def holdout_by_discovery_date(
    items: Sequence[GroundTruthEvent], cutoff: int
) -> tuple[list[GroundTruthEvent], list[GroundTruthEvent]]:
    pre = [i for i in items if i.discovery_year < cutoff]
    post = [i for i in items if i.discovery_year >= cutoff]
    return pre, post

def _corpus_time_binning(corpus: Corpus, resolution: Resolution | None = None) -> tuple[int, int, Resolution]:
    intervals = [Interval(start=g.year, end=g.year) for g in corpus.ground_truth]
    intervals += [e.interval for e in corpus.evidence if e.interval is not None]
    if not intervals:
        return DEFAULT_SPAN_START, DEFAULT_BIN_WIDTH, (resolution or Resolution.CENTURY)
    resolved = resolution or auto_resolution(intervals)
    span_start = bin_bounds(min(iv.start for iv in intervals), resolved)[0]
    return span_start, RESOLUTION_WIDTH_YEARS[resolved], resolved

def _interval_overlaps_year(interval: Interval, year: int, resolution: Resolution) -> bool:
    bucket_start, bucket_end = bin_bounds(year, resolution)
    return not (interval.end < bucket_start or interval.start > bucket_end)

def _placement_from_item(
    item: EvidenceItem, vocab: Vocabulary, *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> Hypothesis | None:
    if item.interval is None:
        return None
    values: dict[str, str] = {}
    for slot in PLACEMENT_CONCEPT_SLOTS:
        value = getattr(item, slot.value)
        values[slot.value] = value if value is not None else other_id(slot)
    placement = Placement(interval=item.interval, **values)
    try:
        return Hypothesis.from_placement(placement, vocab, span_start=span_start, bin_width=bin_width)
    except KeyError:
        return None

def _candidate_key(hyp: Hypothesis) -> tuple[int, int, int]:
    interval = hyp.content.interval
    return (hyp.address, interval.start, interval.end)

def _matches_event(
    target: EvidenceItem, placement: Placement, vocab: Vocabulary, *, threshold: float
) -> bool:
    present = [slot for slot in PLACEMENT_CONCEPT_SLOTS if getattr(target, slot.value) is not None]
    if not present:
        return False
    any_real_match = False
    for slot in present:
        candidate_value = getattr(placement, slot.value)
        if candidate_value == other_id(slot):
            continue
        if slot_match_score(getattr(target, slot.value), candidate_value, vocab, slot) < threshold:
            return False
        any_real_match = True
    return any_real_match

def run_holdout(
    corpus: Corpus,
    constants: Constants,
    *,
    cutoff_years: int,
    n_bins: int = 10,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
    corpus_name: str = "this corpus",
    freeze_vocab: bool = False,
) -> dict[str, Any]:
    pre_events, post_events = holdout_by_discovery_date(corpus.ground_truth, cutoff_years)
    ev_by_id = {e.id: e for e in corpus.evidence}
    pre_evidence = [copy.deepcopy(ev_by_id[g.id]) for g in pre_events if g.id in ev_by_id]
    vocab = corpus.vocab.frozen_at(cutoff_years) if freeze_vocab else corpus.vocab
    n_frozen = sum(len(v) for v in corpus.vocab.by_slot.values()) - sum(len(v) for v in vocab.by_slot.values())
    span_start, bin_width, resolution = _corpus_time_binning(corpus)

    candidates: dict[tuple[int, int, int], Hypothesis] = {}
    for item in pre_evidence:
        hyp = _placement_from_item(item, vocab, span_start=span_start, bin_width=bin_width)
        if hyp is not None:
            candidates.setdefault(_candidate_key(hyp), hyp)
    candidate_list = list(candidates.values())
    link_evidence(pre_evidence, candidate_list, vocab, threshold=match_threshold)
    n_linked = sum(1 for e in pre_evidence if e.supports or e.refutes)

    def projected(h: Hypothesis) -> float:
        return belief.score(h, pre_evidence, vocab, constants=constants).project()

    n_covered = 0
    predictions: list[dict[str, Any]] = []
    for g in sorted(post_events, key=lambda g: (g.discovery_year, g.id)):
        target = ev_by_id.get(g.id)
        if target is None:
            continue
        matches = [h for h in candidate_list if _matches_event(target, h.content, vocab, threshold=match_threshold)]
        true_matches = [h for h in matches if _interval_overlaps_year(h.content.interval, g.year, resolution)]
        if not true_matches:
            continue
        wrong_matches = [h for h in matches if not _interval_overlaps_year(h.content.interval, g.year, resolution)]
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
    coverage_of_truth = (n_covered / n_holdout) if n_holdout else None
    return {
        "corpus_name": corpus_name,
        "cutoff_years": cutoff_years,
        "match_threshold": match_threshold,
        "n_holdout_events": n_holdout,
        "n_covered_events": n_covered,
        "freeze_vocab": freeze_vocab,
        "n_frozen_concepts": n_frozen,
        "n_linked_pre_cutoff_items": n_linked,
        "coverage_of_truth": coverage_of_truth,
        "coverage_of_truth_ci": wilson_interval(n_covered, n_holdout),
        "coverage_note": _low_coverage_note(corpus, n_covered, n_holdout, coverage_of_truth, corpus_name=corpus_name),
        "brier_score": brier,
        "calibration_curve": calibration_curve(predictions, n_bins=n_bins),
        "predictions": predictions,
        "constants": {"W": constants.W, "lam": constants.lam},
    }

_LOW_COVERAGE_THRESHOLD = 0.5

def run_vindication(
    corpus: Corpus,
    constants: Constants,
    *,
    lift_floor: float = 0.25,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
) -> dict[str, Any]:
    ev_by_id = {e.id: e for e in corpus.evidence}
    span_start, bin_width, resolution = _corpus_time_binning(corpus)
    rows: list[dict[str, Any]] = []

    def lift_of(h: Hypothesis, evidence: list[EvidenceItem]) -> float:
        return belief.score(h, evidence, corpus.vocab, constants=constants).lift()

    for g in sorted(corpus.ground_truth, key=lambda g: (g.discovery_year, g.id)):
        if g.acceptance_year is None and not g.control:
            continue
        target = ev_by_id.get(g.id)
        if target is None:
            continue
        cutoff = g.acceptance_year if not g.control else None
        evidence = [
            copy.deepcopy(ev_by_id[e.id]) for e in corpus.ground_truth
            if e.id in ev_by_id and (cutoff is None or e.discovery_year < cutoff)
        ]
        candidates: dict[tuple[int, int, int], Hypothesis] = {}
        for item in evidence:
            hyp = _placement_from_item(item, corpus.vocab, span_start=span_start, bin_width=bin_width)
            if hyp is not None:
                candidates.setdefault(_candidate_key(hyp), hyp)
        candidate_list = list(candidates.values())
        link_evidence(evidence, candidate_list, corpus.vocab, threshold=match_threshold)
        matches = [h for h in candidate_list if _matches_event(target, h.content, corpus.vocab, threshold=match_threshold)]
        true_matches = [h for h in matches if _interval_overlaps_year(h.content.interval, g.year, resolution)]
        wrong_matches = [h for h in matches if not _interval_overlaps_year(h.content.interval, g.year, resolution)]
        row: dict[str, Any] = {
            "event_id": g.id, "event_label": g.label, "kind": "control" if g.control else "vindicated",
            "cutoff": cutoff, "covered": bool(true_matches), "lift_true": None, "lift_wrong": None, "lifted": None,
        }
        if true_matches:
            row["lift_true"] = max(lift_of(h, evidence) for h in true_matches)
            row["lift_wrong"] = max((lift_of(h, evidence) for h in wrong_matches), default=None)
            row["lifted"] = row["lift_true"] >= lift_floor and (row["lift_wrong"] is None or row["lift_true"] > row["lift_wrong"])
        rows.append(row)

    def rate(kind: str) -> tuple[int, int, float | None, tuple[float, float]]:
        covered = [r for r in rows if r["kind"] == kind and r["covered"]]
        k = sum(1 for r in covered if r["lifted"])
        n = len(covered)
        return k, n, (k / n if n else None), wilson_interval(k, n)

    k_v, n_v, rate_v, ci_v = rate("vindicated")
    k_c, n_c, rate_c, ci_c = rate("control")
    return {
        "lift_floor": lift_floor,
        "n_vindicated": n_v, "n_lifted": k_v, "vindication_rate": rate_v, "vindication_rate_ci": ci_v,
        "n_controls": n_c, "n_false_alarms": k_c, "false_alarm_rate": rate_c, "false_alarm_rate_ci": ci_c,
        "rows": rows,
    }

def _low_coverage_note(
    corpus: Corpus,
    n_covered: int,
    n_holdout: int,
    coverage_of_truth: float | None,
    *,
    corpus_name: str = "this corpus",
) -> str | None:
    if n_holdout == 0 or coverage_of_truth is None or coverage_of_truth >= _LOW_COVERAGE_THRESHOLD:
        return None
    total_events = len(corpus.ground_truth)
    same_year = sum(1 for g in corpus.ground_truth if g.discovery_year == g.year)
    distinct_actors = len({e.actor for e in corpus.evidence if e.actor is not None})
    plural = "s" if distinct_actors != 1 else ""
    return (
        f"{n_covered} of {n_holdout} held-out events in {corpus_name} matched a pre-cutoff "
        f"placement (coverage of truth {coverage_of_truth:.3f}). This is a structural property "
        "of the corpus at hand: main.tex's own holdout design assumes a discovery date can lag "
        "an event's own date, so pre-cutoff evidence about an early-occurring, late-discovered "
        f"event can already cover a later-dated held-out event. {same_year} of {corpus_name}'s "
        f"{total_events} ground-truth events carry discovery_year == year, collapsing discovery "
        "and occurrence to the same instant, so a pre-cutoff candidate built from one of them "
        "can never reach a post-cutoff event's own year on a discovery lag alone; coverage then "
        "needs another pre-cutoff item that already names the held-out event's own actor, "
        f"action, object, place, and mechanism, at an interval reaching its own date. {corpus_name}'s "
        f"own evidence names {distinct_actors} distinct actor value{plural} across "
        f"{len(corpus.evidence)} evidence items, so how often that exact five-slot match recurs "
        "is a property of this corpus's own actor reuse: run_holdout and holdout_kfold build "
        "their own candidates directly from corpus.evidence, independent of hte.generate's own "
        "population, so raising generation coverage cannot move this number."
    )

def _diagnostics_reason_prose(report: Mapping[str, Any] | None) -> str | None:
    if report is None:
        return None
    reasons = {name: count for name, count in (report.get("reasons") or {}).items() if count}
    uncovered = report.get("uncovered_events") or []
    if not reasons and not uncovered:
        return None
    bits = []
    if reasons:
        counts = ", ".join(f"{name} ({count})" for name, count in reasons.items())
        bits.append(f"`--diagnose` classifies the uncovered remainder as: {counts}.")
    if uncovered:
        events = "; ".join(f"{e['event_id']} ({e['reason']})" for e in uncovered)
        bits.append(f"Uncovered events and their reason: {events}.")
    return " ".join(bits)

def brier_score(predictions: Sequence[float], outcomes: Sequence[float]) -> float | None:
    if not predictions:
        return None
    if len(predictions) != len(outcomes):
        raise ValueError("predictions and outcomes must be the same length")
    return sum((p - y) ** 2 for p, y in zip(predictions, outcomes)) / len(predictions)

def calibration_curve(
    predictions: Sequence[Mapping[str, float]], *, n_bins: int = 10
) -> list[dict[str, Any]]:
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

def _stratified_folds(items: Sequence[EvidenceItem], *, k: int, seed: int) -> dict[str, int]:
    rng = random.Random(seed)
    by_kind: dict[Any, list[EvidenceItem]] = {}
    for item in items:
        by_kind.setdefault(item.kind, []).append(item)
    fold_of: dict[str, int] = {}
    for kind in sorted(by_kind, key=lambda k: k.value):
        order = sorted(by_kind[kind], key=lambda it: it.id)
        rng.shuffle(order)
        for i, item in enumerate(order):
            fold_of[item.id] = i % k
    return fold_of

def holdout_kfold(
    corpus: Corpus,
    constants: Constants,
    *,
    k: int = DEFAULT_KFOLD_K,
    seed: int = 0,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
    n_bins: int = 10,
    resolution: Resolution | None = None,
    corpus_name: str = "this corpus",
) -> dict[str, Any]:
    span_start, bin_width, resolved_resolution = _corpus_time_binning(corpus, resolution)
    ev_by_id = {e.id: e for e in corpus.evidence}
    fold_of = _stratified_folds(corpus.evidence, k=k, seed=seed)

    fold_results: list[dict[str, Any]] = []
    pooled_predictions: list[dict[str, Any]] = []
    for fold in range(k):
        kept_items = [copy.deepcopy(e) for e in corpus.evidence if fold_of.get(e.id) != fold]

        candidates: dict[tuple[int, int, int], Hypothesis] = {}
        for item in kept_items:
            hyp = _placement_from_item(item, corpus.vocab, span_start=span_start, bin_width=bin_width)
            if hyp is not None:
                candidates.setdefault(_candidate_key(hyp), hyp)
        candidate_list = list(candidates.values())
        link_evidence(kept_items, candidate_list, corpus.vocab, threshold=match_threshold)

        def projected(h: Hypothesis, _kept=kept_items) -> float:
            return belief.score(h, _kept, corpus.vocab, constants=constants).project()

        fold_predictions: list[dict[str, Any]] = []
        n_targets = 0
        n_covered = 0
        for g in sorted(corpus.ground_truth, key=lambda g: g.id):
            if fold_of.get(g.id) != fold:
                continue
            target = ev_by_id.get(g.id)
            if target is None:
                continue
            n_targets += 1
            matches = [h for h in candidate_list if _matches_event(target, h.content, corpus.vocab, threshold=match_threshold)]
            true_matches = [h for h in matches if _interval_overlaps_year(h.content.interval, g.year, resolved_resolution)]
            if not true_matches:
                continue
            n_covered += 1
            wrong_matches = [h for h in matches if not _interval_overlaps_year(h.content.interval, g.year, resolved_resolution)]

            true_hyp = max(true_matches, key=projected)
            fold_predictions.append({
                "event_id": g.id, "event_label": g.label, "event_year": g.year, "reading": "true",
                "hypothesis": true_hyp.short_id, "predicted": projected(true_hyp), "observed": 1.0,
            })
            if wrong_matches:
                wrong_hyp = max(wrong_matches, key=projected)
                fold_predictions.append({
                    "event_id": g.id, "event_label": g.label, "event_year": g.year, "reading": "wrong-interval",
                    "hypothesis": wrong_hyp.short_id, "predicted": projected(wrong_hyp), "observed": 0.0,
                })

        coverage = (n_covered / n_targets) if n_targets else None
        fold_results.append({
            "fold": fold,
            "n_holdout_events": n_targets,
            "n_covered_events": n_covered,
            "coverage_of_truth": coverage,
            "coverage_of_truth_ci": wilson_interval(n_covered, n_targets),
            "brier_score": brier_score([p["predicted"] for p in fold_predictions], [p["observed"] for p in fold_predictions]),
            "calibration_curve": calibration_curve(fold_predictions, n_bins=n_bins),
            "predictions": fold_predictions,
        })
        pooled_predictions.extend(fold_predictions)

    n_targets_total = sum(f["n_holdout_events"] for f in fold_results)
    n_covered_total = sum(f["n_covered_events"] for f in fold_results)
    aggregate = {
        "n_holdout_events": n_targets_total,
        "n_covered_events": n_covered_total,
        "coverage_of_truth": (n_covered_total / n_targets_total) if n_targets_total else None,
        "coverage_of_truth_ci": wilson_interval(n_covered_total, n_targets_total),
        "brier_score": brier_score([p["predicted"] for p in pooled_predictions], [p["observed"] for p in pooled_predictions]),
        "calibration_curve": calibration_curve(pooled_predictions, n_bins=n_bins),
    }
    return {
        "mode": "kfold",
        "corpus_name": corpus_name,
        "k": k,
        "seed": seed,
        "cutoff_years": None,
        "match_threshold": match_threshold,
        "resolution": resolved_resolution.value,
        "n_holdout_events": n_targets_total,
        "n_covered_events": n_covered_total,
        "coverage_of_truth": aggregate["coverage_of_truth"],
        "coverage_of_truth_ci": aggregate["coverage_of_truth_ci"],
        "coverage_note": None,
        "brier_score": aggregate["brier_score"],
        "calibration_curve": aggregate["calibration_curve"],
        "predictions": pooled_predictions,
        "constants": {"W": constants.W, "lam": constants.lam},
        "folds": fold_results,
        "aggregate": aggregate,
    }

def choose_holdout_mode(corpus: Corpus) -> tuple[str, str]:
    events = corpus.ground_truth
    if not events:
        return "kfold", "this corpus has no ground-truth events to check a discovery lag against; k-fold needs no discovery date at all."
    lagged = [g for g in events if g.discovery_year != g.year]
    if lagged:
        return (
            "discovery_date",
            f"{len(lagged)} of {len(events)} ground-truth events carry a discovery_year "
            "distinct from their own year, a real discovery lag main.tex §9's holdout "
            "design is built to test; discovery-date holdout stays informative here.",
        )
    return (
        "kfold",
        f"all {len(events)} ground-truth events carry discovery_year == year (this "
        "corpus's own documented simplification), so holdout_by_discovery_date splits "
        "every one of them onto one side of any cutoff and run_holdout scores nothing; "
        "k-fold hides evidence directly instead, needing no discovery date at all.",
    )

def run_calibration(
    corpus: Corpus,
    constants: Constants,
    *,
    cutoff_years: int | None = None,
    k: int = DEFAULT_KFOLD_K,
    seed: int = 0,
    match_threshold: float = DEFAULT_MATCH_THRESHOLD,
    n_bins: int = 10,
    resolution: Resolution | None = None,
    corpus_name: str = "this corpus",
    freeze_vocab: bool = False,
) -> dict[str, Any]:
    mode, reason = choose_holdout_mode(corpus)
    if mode == "discovery_date":
        cutoff = cutoff_years if cutoff_years is not None else _default_discovery_cutoff(corpus)
        result = run_holdout(
            corpus, constants, cutoff_years=cutoff, match_threshold=match_threshold,
            n_bins=n_bins, corpus_name=corpus_name,
            freeze_vocab=freeze_vocab,
        )
    else:
        result = holdout_kfold(
            corpus, constants, k=k, seed=seed, match_threshold=match_threshold,
            n_bins=n_bins, resolution=resolution, corpus_name=corpus_name,
        )
    result["mode"] = mode
    result["mode_reason"] = reason
    return result

def _default_discovery_cutoff(corpus: Corpus) -> int:
    years = sorted(g.discovery_year for g in corpus.ground_truth)
    return years[len(years) // 2] if years else 2000

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
    cutoff_years: int | None = None,
    k: int = DEFAULT_KFOLD_K,
    seed: int = 0,
) -> dict[str, Any]:
    w_values = list(grid.get("W", [Constants().W]))
    lam_values = list(grid.get("lam", [Constants().lam]))
    scale_values = list(grid.get("tier_scale", [1.0]))

    results: list[GridResult] = []
    for w, lam, scale in product(w_values, lam_values, scale_values):
        tier_weight = {t: belief.TIER_WEIGHT[t] * scale for t in Tier}
        constants = Constants(W=w, lam=lam, tier_weight=tier_weight)
        if cutoff_years is not None:
            score = run_holdout(corpus, constants, cutoff_years=cutoff_years)["brier_score"]
        else:
            score = run_calibration(corpus, constants, k=k, seed=seed)["brier_score"]
        results.append(GridResult(W=w, lam=lam, tier_scale=scale, brier_score=score))

    scored = [r for r in results if r.brier_score is not None]
    scored.sort(key=lambda r: r.brier_score)
    best = scored[0] if scored else None
    return {
        "best": best.to_dict() if best else None,
        "results": [r.to_dict() for r in sorted(results, key=lambda r: (r.brier_score is None, r.brier_score))],
    }

_FIT_PARAM_NAMES: tuple[str, ...] = ("W", "lam", "mu", "alpha", "tier_scale", "detectability_floor")

_FIT_PARAM_BOUNDS: dict[str, tuple[float, float]] = {
    "W": (0.5, 8.0), "lam": (0.05, 2.0), "mu": (0.0, 2.0), "alpha": (0.1, 5.0),
    "tier_scale": (0.25, 3.0), "detectability_floor": (0.0, 0.6),
}

_FIT_PARAM_STEPS: dict[str, tuple[float, ...]] = {
    "W": (-1.0, -0.5, 0.5, 1.0, 2.0),
    "lam": (-0.3, -0.15, 0.15, 0.3),
    "mu": (-0.3, 0.3),
    "alpha": (-0.5, 0.5, 1.0),
    "tier_scale": (-0.5, -0.25, 0.25, 0.5),
    "detectability_floor": (0.1, 0.2, 0.3),
}

DEFAULT_MIN_SYNTH_COVERAGE = 0.9
DEFAULT_COVERAGE_PENALTY_WEIGHT = 2.0

def _vector_to_constants(vector: Mapping[str, float]) -> Constants:
    tier_weight = {t: belief.TIER_WEIGHT[t] * vector["tier_scale"] for t in Tier}
    return Constants(
        W=vector["W"], lam=vector["lam"], mu=vector["mu"], alpha=vector["alpha"],
        tier_weight=tier_weight, detectability_floor=vector["detectability_floor"],
    )

def _default_fit_vector() -> dict[str, float]:
    d = Constants()
    return {"W": d.W, "lam": d.lam, "mu": d.mu, "alpha": d.alpha, "tier_scale": 1.0, "detectability_floor": d.detectability_floor}

def evaluate_pooled(
    corpora: Mapping[str, Corpus],
    vector: Mapping[str, float],
    *,
    coverage_targets: Mapping[str, float] | None = None,
    coverage_penalty_weight: float = DEFAULT_COVERAGE_PENALTY_WEIGHT,
    k: int = DEFAULT_KFOLD_K,
    seed: int = 0,
) -> dict[str, Any]:
    constants = _vector_to_constants(vector)
    per_corpus: list[dict[str, Any]] = []
    briers: list[float] = []
    penalty = 0.0
    for name, corpus in corpora.items():
        result = run_calibration(corpus, constants, k=k, seed=seed)
        coverage = result["coverage_of_truth"]
        per_corpus.append({
            "name": name, "mode": result["mode"], "brier_score": result["brier_score"],
            "coverage_of_truth": coverage, "n_holdout_events": result["n_holdout_events"],
        })
        if result["brier_score"] is not None:
            briers.append(result["brier_score"])
        target = (coverage_targets or {}).get(name)
        if target is not None and coverage is not None and coverage < target:
            penalty += coverage_penalty_weight * (target - coverage)
    mean_brier = (sum(briers) / len(briers)) if briers else None
    loss = (mean_brier if mean_brier is not None else 1.0) + penalty
    return {
        "vector": dict(vector), "loss": loss, "mean_brier": mean_brier,
        "penalty": penalty, "per_corpus": per_corpus,
    }

def fit_constants_pooled(
    corpora: Mapping[str, Corpus],
    *,
    coverage_targets: Mapping[str, float] | None = None,
    coverage_penalty_weight: float = DEFAULT_COVERAGE_PENALTY_WEIGHT,
    k: int = DEFAULT_KFOLD_K,
    seed: int = 0,
    passes: int = 1,
    start: Mapping[str, float] | None = None,
) -> dict[str, Any]:
    vector = dict(start) if start is not None else _default_fit_vector()
    best = evaluate_pooled(corpora, vector, coverage_targets=coverage_targets, coverage_penalty_weight=coverage_penalty_weight, k=k, seed=seed)
    history = [best]
    passes_run = 0
    for _pass in range(passes):
        passes_run += 1
        improved_this_pass = False
        for name in _FIT_PARAM_NAMES:
            lo, hi = _FIT_PARAM_BOUNDS[name]
            for step in _FIT_PARAM_STEPS[name]:
                candidate = dict(best["vector"])
                candidate[name] = min(hi, max(lo, candidate[name] + step))
                if candidate[name] == best["vector"][name]:
                    continue
                result = evaluate_pooled(corpora, candidate, coverage_targets=coverage_targets, coverage_penalty_weight=coverage_penalty_weight, k=k, seed=seed)
                history.append(result)
                if result["loss"] < best["loss"]:
                    best = result
                    improved_this_pass = True
        if not improved_this_pass:
            break
    return {"best": best, "history": history, "passes_run": passes_run}

def build_pooled_fit_corpora(
    synth_seeds: Sequence[int] = tuple(range(10)),
    *,
    education_atlas_countries: Sequence[str] = ("USA", "GBR", "KEN", "BRA", "IND", "NGA", "FIN", "JPN"),
    education_atlas_years: tuple[int, int] = (2010, 2024),
) -> tuple[dict[str, Corpus], dict[str, float]]:
    from . import synth as synth_module
    from .corpus import education_atlas, literature, production, quantum_history

    corpora: dict[str, Corpus] = {}
    coverage_targets: dict[str, float] = {}
    for s in synth_seeds:
        name = f"synth-{s}"
        corpora[name] = synth_module.make_small_world(s).corpus
        coverage_targets[name] = DEFAULT_MIN_SYNTH_COVERAGE
    corpora["quantum-history"] = quantum_history.ingest()
    corpora["production"] = production.load(status_min="draft")
    corpora["education-atlas"] = education_atlas.load(countries=education_atlas_countries, years=education_atlas_years)
    corpora["literature"] = literature.load(cards_dir=literature.DEFAULT_FIXTURES_DIR)
    return corpora, coverage_targets

def write_calibration(
    result: Mapping[str, Any],
    out_dir: str | Path,
    *,
    diagnostics_report: Mapping[str, Any] | None = None,
) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "calibration.json").write_text(json.dumps(result, indent=2))

    lines = ["# Calibration", "", f"Corpus: {result.get('corpus_name', 'this corpus')}", ""]
    mode = result.get("mode")
    if mode:
        lines.append(f"Mode: {mode}")
        reason = result.get("mode_reason")
        if reason:
            lines.append(f"Reason: {reason}")
        lines.append("")
    lines += [
        f"Cutoff year: {result.get('cutoff_years')}",
        f"Held-out events: {result.get('n_holdout_events')}",
        f"Covered by a matching pre-cutoff placement: {result.get('n_covered_events')} "
        f"(coverage of truth: {result.get('coverage_of_truth')}, 95% Wilson interval "
        f"{result.get('coverage_of_truth_ci')})",
        f"Brier score: {result.get('brier_score')}",
        "",
    ]
    note = result.get("coverage_note")
    diagnostics_note = _diagnostics_reason_prose(diagnostics_report)
    if note or diagnostics_note:
        lines += ["## Why coverage is low", ""]
        if note:
            lines += [note, ""]
        if diagnostics_note:
            lines += [diagnostics_note, ""]
    lines += [
        "## Calibration curve",
        "",
        "| Bin | Count | Mean predicted | Mean observed |",
        "|---|---|---|---|",
    ]
    for b in result.get("calibration_curve", []):
        lines.append(f"| [{b['bin_low']:.1f}, {b['bin_high']:.1f}) | {b['count']} | {b['mean_predicted']} | {b['mean_observed']} |")

    folds = result.get("folds")
    if folds:
        lines += ["", "## Per-fold", "", "| Fold | Held out | Covered | Coverage of truth | 95% Wilson CI | Brier score |", "|---|---|---|---|---|---|"]
        for f in folds:
            lines.append(
                f"| {f['fold']} | {f['n_holdout_events']} | {f['n_covered_events']} | "
                f"{f['coverage_of_truth']} | {f.get('coverage_of_truth_ci')} | {f['brier_score']} |"
            )

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
    "holdout_by_discovery_date", "run_holdout", "holdout_kfold", "choose_holdout_mode",
    "run_calibration", "fit_constants", "write_calibration", "wilson_interval",
    "brier_score", "calibration_curve", "DEFAULT_MATCH_THRESHOLD", "DEFAULT_KFOLD_K",
    "evaluate_pooled", "fit_constants_pooled", "build_pooled_fit_corpora",
    "DEFAULT_MIN_SYNTH_COVERAGE", "DEFAULT_COVERAGE_PENALTY_WEIGHT",
]
