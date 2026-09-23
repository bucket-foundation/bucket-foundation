from __future__ import annotations

import copy
import dataclasses
import math
import random
from collections import Counter
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence

from . import belief, calibrate
from .belief import Constants
from .concepts import Vocabulary, other_id
from .corpus import Corpus
from .evidence import EvidenceItem
from .generate import PLACEMENT_CONCEPT_SLOTS
from .hypothesis import Hypothesis
from .link import slot_match_score
from .timeline import Resolution

ScoreFn = Callable[[Hypothesis, Sequence[EvidenceItem], Vocabulary], float]

REASONS: tuple[str, ...] = (
    "no_evidence_after_holdout",
    "no_placement_generated",
    "dropped_by_cap",
    "slot_mismatch",
    "interval_mismatch",
)

_REASON_PROSE: dict[str, str] = {
    "no_evidence_after_holdout": "no evidence after holdout",
    "no_placement_generated": "evidence present but no placement generated",
    "dropped_by_cap": "placement generated but dropped by the cap",
    "slot_mismatch": "placement present but slot mismatch",
    "interval_mismatch": "placement present but interval mismatch",
}

def _present_slots(item: EvidenceItem) -> list:
    return [slot for slot in PLACEMENT_CONCEPT_SLOTS if getattr(item, slot.value) is not None]

def _shares_a_slot(target: EvidenceItem, item: EvidenceItem, vocab: Vocabulary, present: Sequence, threshold: float) -> bool:
    return any(
        getattr(item, slot.value) is not None
        and slot_match_score(getattr(target, slot.value), getattr(item, slot.value), vocab, slot) >= threshold
        for slot in present
    )

def _classify_uncovered_event(
    target: EvidenceItem,
    year: int,
    pool: Sequence[EvidenceItem],
    vocab: Vocabulary,
    *,
    span_start: int,
    bin_width: int,
    resolution: Resolution,
    threshold: float,
) -> str:
    present = _present_slots(target)
    if not present:
        return "no_evidence_after_holdout"

    overlapping_items = [item for item in pool if _shares_a_slot(target, item, vocab, present, threshold)]
    if not overlapping_items:
        return "no_evidence_after_holdout"

    candidates: list[Hypothesis] = []
    for item in overlapping_items:
        hyp = calibrate._placement_from_item(item, vocab, span_start=span_start, bin_width=bin_width)
        if hyp is not None:
            candidates.append(hyp)
    if not candidates:
        return "no_placement_generated"

    best_mismatch_count: int | None = None
    best_interval_ok = False
    for hyp in candidates:
        mismatched = [
            slot for slot in present
            if slot_match_score(getattr(target, slot.value), getattr(hyp.content, slot.value), vocab, slot) < threshold
            and getattr(hyp.content, slot.value) != other_id(slot)
        ]
        interval_ok = calibrate._interval_overlaps_year(hyp.content.interval, year, resolution)
        score = (len(mismatched), 0 if interval_ok else 1)
        if best_mismatch_count is None or score < (best_mismatch_count, 0 if best_interval_ok else 1):
            best_mismatch_count, best_interval_ok = len(mismatched), interval_ok

    if best_mismatch_count == 0 and not best_interval_ok:
        return "interval_mismatch"
    return "slot_mismatch"

def _diagnose_kfold(
    corpus: Corpus, *, k: int, seed: int, match_threshold: float,
) -> tuple[Counter, list[dict[str, Any]], int, int]:
    span_start, bin_width, resolution = calibrate._corpus_time_binning(corpus)
    fold_of = calibrate._stratified_folds(corpus.evidence, k=k, seed=seed)
    ev_by_id = {e.id: e for e in corpus.evidence}

    reasons: Counter = Counter()
    uncovered: list[dict[str, Any]] = []
    n_holdout = 0
    n_covered = 0
    for fold in range(k):
        kept_items = [copy.deepcopy(e) for e in corpus.evidence if fold_of.get(e.id) != fold]
        candidates: dict[tuple[int, int, int], Hypothesis] = {}
        for item in kept_items:
            hyp = calibrate._placement_from_item(item, corpus.vocab, span_start=span_start, bin_width=bin_width)
            if hyp is not None:
                candidates.setdefault(calibrate._candidate_key(hyp), hyp)
        candidate_list = list(candidates.values())

        for g in sorted(corpus.ground_truth, key=lambda g: g.id):
            if fold_of.get(g.id) != fold:
                continue
            target = ev_by_id.get(g.id)
            if target is None:
                continue
            n_holdout += 1
            covered = any(
                calibrate._matches_event(target, h.content, corpus.vocab, threshold=match_threshold)
                and calibrate._interval_overlaps_year(h.content.interval, g.year, resolution)
                for h in candidate_list
            )
            if covered:
                n_covered += 1
                continue
            reason = _classify_uncovered_event(
                target, g.year, kept_items, corpus.vocab,
                span_start=span_start, bin_width=bin_width, resolution=resolution, threshold=match_threshold,
            )
            reasons[reason] += 1
            uncovered.append({"event_id": g.id, "event_label": g.label, "event_year": g.year, "fold": fold, "reason": reason})
    return reasons, uncovered, n_holdout, n_covered

def _diagnose_discovery_date(
    corpus: Corpus, *, cutoff_years: int, match_threshold: float,
) -> tuple[Counter, list[dict[str, Any]], int, int]:
    span_start, bin_width, resolution = calibrate._corpus_time_binning(corpus)
    pre_events, post_events = calibrate.holdout_by_discovery_date(corpus.ground_truth, cutoff_years)
    ev_by_id = {e.id: e for e in corpus.evidence}
    pre_evidence = [ev_by_id[g.id] for g in pre_events if g.id in ev_by_id]

    candidates: dict[tuple[int, int, int], Hypothesis] = {}
    for item in pre_evidence:
        hyp = calibrate._placement_from_item(item, corpus.vocab, span_start=span_start, bin_width=bin_width)
        if hyp is not None:
            candidates.setdefault(calibrate._candidate_key(hyp), hyp)
    candidate_list = list(candidates.values())

    reasons: Counter = Counter()
    uncovered: list[dict[str, Any]] = []
    n_covered = 0
    for g in sorted(post_events, key=lambda g: (g.discovery_year, g.id)):
        target = ev_by_id.get(g.id)
        if target is None:
            continue
        covered = any(
            calibrate._matches_event(target, h.content, corpus.vocab, threshold=match_threshold)
            and calibrate._interval_overlaps_year(h.content.interval, g.year, resolution)
            for h in candidate_list
        )
        if covered:
            n_covered += 1
            continue
        reason = _classify_uncovered_event(
            target, g.year, pre_evidence, corpus.vocab,
            span_start=span_start, bin_width=bin_width, resolution=resolution, threshold=match_threshold,
        )
        reasons[reason] += 1
        uncovered.append({"event_id": g.id, "event_label": g.label, "event_year": g.year, "reason": reason})
    return reasons, uncovered, len(post_events), n_covered

_CAP_NOTE = (
    "\"dropped_by_cap\" reads zero here by construction: hte.calibrate's own "
    "candidate-building (_placement_from_item, one candidate per kept evidence "
    "item) applies no max_hypotheses cap and never calls hte.generate at all "
    "(holdout_kfold's own module docstring states this cost tradeoff "
    "explicitly). A generation-pass diagnostic over hte.runner.run_campaign's "
    "own hypothesis population, where the cap does apply, is a distinct "
    "check this function does not perform; see docs/COVERAGE-2026-09-10.md."
)

def _spearman(a: Sequence[float], b: Sequence[float]) -> float:
    def ranks(values: Sequence[float]) -> list[float]:
        order = sorted(range(len(values)), key=lambda i: values[i])
        out = [0.0] * len(values)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                out[order[k]] = avg
            i = j + 1
        return out

    if len(a) < 2:
        return 1.0
    ra, rb = ranks(a), ranks(b)
    mean_a, mean_b = sum(ra) / len(ra), sum(rb) / len(rb)
    cov = sum((x - mean_a) * (y - mean_b) for x, y in zip(ra, rb))
    var_a = sum((x - mean_a) ** 2 for x in ra)
    var_b = sum((y - mean_b) ** 2 for y in rb)
    return cov / math.sqrt(var_a * var_b) if var_a and var_b else 1.0

def _permute_links(evidence: Sequence[EvidenceItem], rng: random.Random) -> list[EvidenceItem]:
    supports = [addr for item in evidence for addr in item.supports]
    refutes = [addr for item in evidence for addr in item.refutes]
    rng.shuffle(supports)
    rng.shuffle(refutes)
    out, si, ri = [], 0, 0
    for item in evidence:
        n_s, n_r = len(item.supports), len(item.refutes)
        out.append(dataclasses.replace(item, supports=supports[si:si + n_s], refutes=refutes[ri:ri + n_r]))
        si, ri = si + n_s, ri + n_r
    return out

def link_shuffle_test(
    hypotheses: Sequence[Hypothesis], evidence: Sequence[EvidenceItem], vocab: Vocabulary,
    score_fn: ScoreFn, seed: int, *, n_permutations: int = 20,
) -> dict[str, Any]:
    addresses = [h.address for h in hypotheses]
    real = {a: score_fn(h, evidence, vocab) for a, h in zip(addresses, hypotheses)}
    real_values = [real[a] for a in addresses]

    rng = random.Random(seed)
    correlations, unchanged_fractions = [], []
    for _ in range(n_permutations):
        permuted_evidence = _permute_links(evidence, rng)
        permuted = {a: score_fn(h, permuted_evidence, vocab) for a, h in zip(addresses, hypotheses)}
        correlations.append(_spearman(real_values, [permuted[a] for a in addresses]))
        unchanged = sum(1 for a in addresses if math.isclose(real[a], permuted[a], abs_tol=1e-12))
        unchanged_fractions.append(unchanged / len(addresses) if addresses else 1.0)

    return {
        "n_permutations": n_permutations,
        "n_hypotheses": len(addresses),
        "correlations": correlations,
        "mean_correlation": sum(correlations) / len(correlations) if correlations else 1.0,
        "prior_only_fraction": sum(unchanged_fractions) / len(unchanged_fractions) if unchanged_fractions else 1.0,
    }

def shuffle_report(corpus: Corpus, constants: Constants, *, seed: int = 0, n_permutations: int = 20) -> dict[str, Any]:
    span_start, bin_width, _resolution = calibrate._corpus_time_binning(corpus)
    candidates: dict[tuple[int, int, int], Hypothesis] = {}
    for item in corpus.evidence:
        hyp = calibrate._placement_from_item(item, corpus.vocab, span_start=span_start, bin_width=bin_width)
        if hyp is not None:
            candidates.setdefault(calibrate._candidate_key(hyp), hyp)

    def score_fn(h: Hypothesis, ev: Sequence[EvidenceItem], vocab: Vocabulary) -> float:
        return belief.score(h, ev, vocab, constants=constants).project()

    return link_shuffle_test(list(candidates.values()), corpus.evidence, corpus.vocab, score_fn, seed, n_permutations=n_permutations)

def coverage_report(corpus: Corpus, run_artifacts: Mapping[str, Any]) -> dict[str, Any]:
    mode = run_artifacts["mode"]
    match_threshold = run_artifacts.get("match_threshold", calibrate.DEFAULT_MATCH_THRESHOLD)
    if mode == "kfold":
        k = run_artifacts.get("k", calibrate.DEFAULT_KFOLD_K)
        seed = run_artifacts.get("seed", 0)
        reasons, uncovered, n_holdout, n_covered = _diagnose_kfold(corpus, k=k, seed=seed, match_threshold=match_threshold)
    elif mode == "discovery_date":
        cutoff_years = run_artifacts["cutoff_years"]
        reasons, uncovered, n_holdout, n_covered = _diagnose_discovery_date(
            corpus, cutoff_years=cutoff_years, match_threshold=match_threshold,
        )
    else:
        raise ValueError(f"coverage_report: unknown mode {mode!r}, expected 'kfold' or 'discovery_date'")

    return {
        "mode": mode,
        "n_holdout_events": n_holdout,
        "n_covered_events": n_covered,
        "coverage_of_truth": (n_covered / n_holdout) if n_holdout else None,
        "reasons": {name: reasons.get(name, 0) for name in REASONS},
        "uncovered_events": uncovered,
        "notes": [_CAP_NOTE],
    }

def write_diagnostics(report: Mapping[str, Any], out_dir: str | Path) -> None:
    import json

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "diagnostics.json").write_text(json.dumps(report, indent=2))

    lines = ["# Coverage diagnostics", ""]
    lines.append(f"Mode: {report['mode']}")
    lines.append(
        f"Held-out events: {report['n_holdout_events']}; covered: {report['n_covered_events']} "
        f"(coverage of truth: {report['coverage_of_truth']})"
    )
    lines += ["", "## Reasons for the uncovered remainder", "", "| Reason | Count |", "|---|---|"]
    for name in REASONS:
        lines.append(f"| {_REASON_PROSE[name]} | {report['reasons'].get(name, 0)} |")

    notes = report.get("notes") or []
    if notes:
        lines += ["", "## Notes", ""]
        for note in notes:
            lines.append(f"- {note}")

    lines += ["", "## Uncovered events by reason", ""]
    by_reason: dict[str, list[dict[str, Any]]] = {name: [] for name in REASONS}
    for entry in report.get("uncovered_events", []):
        by_reason.setdefault(entry["reason"], []).append(entry)
    for name in REASONS:
        entries = by_reason.get(name, [])
        if not entries:
            continue
        lines.append(f"### {_REASON_PROSE[name]} ({len(entries)})")
        lines.append("")
        lines.append("| Event | Year | Fold |" if any("fold" in e for e in entries) else "| Event | Year |")
        lines.append("|---|---|---|" if any("fold" in e for e in entries) else "|---|---|")
        for entry in entries:
            if "fold" in entry:
                lines.append(f"| {entry['event_id']} | {entry['event_year']} | {entry['fold']} |")
            else:
                lines.append(f"| {entry['event_id']} | {entry['event_year']} |")
        lines.append("")

    (out / "DIAGNOSTICS.md").write_text("\n".join(lines) + "\n")

__all__ = ["REASONS", "coverage_report", "write_diagnostics", "link_shuffle_test", "shuffle_report"]
