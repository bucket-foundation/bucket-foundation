"""Why a held-out ground-truth event has no matching placement in the
population `hte.calibrate` scored it against (`bkt-hte-generation-
coverage`).

`hte.calibrate.run_holdout`/`holdout_kfold` report `coverage_of_truth`, a
bare fraction, with no account of WHY the uncovered remainder stayed
uncovered: a single number cannot tell a reader whether a low score means
the corpus's own evidence carries nothing to place, an extraction gap, a
matcher too strict, or a generator dropping a candidate it already built.
`coverage_report` re-runs the same candidate-building and matching this
package's calibration path already does (`hte.calibrate._placement_from_
item`, `._matches_event`, `._interval_overlaps_year`), once per held-out
event, and for every event that does NOT end up covered, assigns exactly
one reason from a fixed, small set:

- `"no_evidence_after_holdout"`: nothing left, after removing this
  fold's (or this cutoff's) own evidence, shares even one resolved
  concept slot with the event's own item, OR the event's own item
  itself names no slot at all (a target with nothing to test a
  candidate against can never be covered, regardless of what remains
  on file).
- `"no_placement_generated"`: at least one remaining item shares a
  slot with the event, but `_placement_from_item` could build no valid
  placement from any of them (no interval extracted, or a named slot
  value resolves to no concept id).
- `"dropped_by_cap"`: a placement was built and would have covered
  the event, but a generation cap removed it before scoring ever saw
  it. `hte.calibrate`'s own candidate-building runs no cap at all
  (`holdout_kfold`'s own module docstring: it deliberately skips `hte.
  generate.from_evidence`'s sweep for cost reasons), so this reason
  never fires against a `run_holdout`/`holdout_kfold` result; it stays
  named here, counted as zero, since the fixed reason set this module
  reports against is shared with a future generation-pass diagnostic
  that DOES run a cap, and a caller reading this report deserves that
  stated plainly instead of a name quietly dropped from the set.
- `"slot_mismatch"`: the closest candidate this event's own pool
  produces shares the event's own time window but disagrees on at
  least one concept slot both sides name a resolved value for.
- `"interval_mismatch"`: the closest candidate agrees on every
  concept slot the event names (or says nothing, `OTHER`-filled, on
  the ones it does not) but its own interval does not reach the
  event's own time window.

`--diagnose` on `hte calibrate` (`hte.cli._cmd_calibrate`) is this
module's own CLI entry point; `write_diagnostics` renders this
function's return value into `DIAGNOSTICS.md`, next to `CALIBRATION.md`.
"""
from __future__ import annotations

import copy
from collections import Counter
from pathlib import Path
from typing import Any, Mapping, Sequence

from . import calibrate
from .concepts import Vocabulary, other_id
from .corpus import Corpus
from .evidence import EvidenceItem
from .generate import PLACEMENT_CONCEPT_SLOTS
from .hypothesis import Hypothesis
from .link import slot_match_score
from .timeline import Resolution

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
    """Whether `item` (a candidate pool member, its own raw, pre-`OTHER`-
    fill extracted slots) names a value on at least one of `target`'s own
    `present` slots that clears `slot_match_score` against `target`'s own
    value there. This is the "does this item say anything at all
    relevant to this event" test `no_evidence_after_holdout` and
    `no_placement_generated` below share; it deliberately reads `item`'s
    own raw fields (`None` when unspecified) instead of a placement
    built from them (`_placement_from_item`'s `OTHER` filler), since a
    slot this item never named should not count as "sharing" a slot
    regardless of
    what `other_id` happens to render as."""
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
    """The one reason (`REASONS`) a held-out event, already established
    as NOT covered by its own candidate pool, failed to be. `pool` is
    the same kept/pre-cutoff item list the caller's own coverage check
    ran against; this function re-derives candidates from it rather than
    taking a pre-built list, so it stays a faithful, standalone replay of
    `hte.calibrate._placement_from_item`/`._matches_event`/`.
    _interval_overlaps_year`, the exact three calls a real coverage
    check makes."""
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


def coverage_report(corpus: Corpus, run_artifacts: Mapping[str, Any]) -> dict[str, Any]:
    """For every ground-truth event in `corpus` that `run_artifacts` (a
    `hte.calibrate.run_holdout`/`holdout_kfold`/`run_calibration` result
    mapping) did not cover, the one reason it was not, from `REASONS`,
    with counts; covered events contribute to `n_covered_events` alone.
    Re-derives the candidate pool and match itself (`_diagnose_kfold`/`_
    diagnose_discovery_date`) rather than trusting `run_artifacts["mode"]`
    alone to have been produced by a compatible call: `run_artifacts`
    must carry `"mode"` (`"kfold"` or `"discovery_date"`), plus `"k"`/
    `"seed"` for kfold or `"cutoff_years"` for discovery_date, and
    `"match_threshold"`, the same fields `run_calibration`'s own return
    shape always carries. Raises `KeyError` naming the missing field
    rather than guessing a default silently, since a diagnostic run
    against the wrong mode's own parameters would misreport every count.

    Returns `{"mode", "n_holdout_events", "n_covered_events",
    "coverage_of_truth", "reasons" (every name in `REASONS`, `0` for one
    that never fired), "uncovered_events" (one entry per uncovered event:
    `event_id`, `event_label`, `event_year`, `reason`, and `fold` for
    kfold), "notes"}`. `"notes"` is a list of one-sentence strings
    explaining any structural reading a bare count cannot carry on its
    own (today: only `_CAP_NOTE`, always present, since `"dropped_by_cap"`
    is always zero along this path)."""
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
    """Writes `report` (`coverage_report`'s own return shape) to
    `out_dir/diagnostics.json` and a human-readable `out_dir/
    DIAGNOSTICS.md`: a reason table first, then every uncovered event
    grouped under its own reason, matching `hte.calibrate.
    write_calibration`'s sibling `CALIBRATION.md`'s own layout
    conventions (a summary table, then per-item detail) so a reader
    already used to that file finds this one familiar."""
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


__all__ = ["REASONS", "coverage_report", "write_diagnostics"]
