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

import copy
import json
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


def holdout_by_discovery_date(
    items: Sequence[GroundTruthEvent], cutoff: int
) -> tuple[list[GroundTruthEvent], list[GroundTruthEvent]]:
    """`(pre, post)`: every item in `items` with `discovery_year < cutoff`,
    and every item with `discovery_year >= cutoff`, order preserved
    within each half."""
    pre = [i for i in items if i.discovery_year < cutoff]
    post = [i for i in items if i.discovery_year >= cutoff]
    return pre, post


def _corpus_time_binning(corpus: Corpus, resolution: Resolution | None = None) -> tuple[int, int, Resolution]:
    """`(span_start, bin_width, resolution)` for `corpus`'s own span, the
    same corpus-anchored rung `hte.runner.run_campaign`'s `_resolve_time_
    binning` picks for a real campaign (`README.md`'s own "Fixed
    2026-09-10" entry, mirrored here rather than imported: `hte.runner`
    is off limits to edit on this branch and `_resolve_time_binning`
    itself is a `cfg`-shaped function this module has no `cfg` to hand
    it). `_placement_from_item` and `_matches_event` below both take this
    triple, so a candidate this module builds addresses under the same
    axis a campaign over the same corpus would use, instead of `hte.
    address`'s bare 20,000-year/century-bin module defaults, whatever
    the corpus's real span (`bkt-hte-calibration-time-binning`): those
    defaults collapse a corpus no wider than a couple of centuries into
    one or two bins regardless of how many decades or years separate two
    of its own events, confirmed empirically against
    quantum-history (105 ground-truth events across 1900-2026 collapse
    onto exactly 2 default century bins).

    The span is anchored at the union of every ground-truth event's own
    year AND every `corpus.evidence` item's own extracted interval,
    floor-snapped to the chosen resolution's own bucket boundary (`hte.
    timeline.bin_bounds`), matching `_resolve_time_binning`'s identical
    union and snap: ground truth alone undercounts a corpus whose
    evidence references a year outside its own accepted-claims' span (a
    `production` claim's own supporting citation dated a year before any
    claim was itself accepted, confirmed to raise a spurious clamp
    (`hte.timeline.clamp_log`) against every such citation once this
    function anchored on ground truth alone, polluting `hte.runner.
    run_campaign`'s own `MANIFEST.json['clamped_years']`, shared process-
    wide for the whole run, with entries this module's own candidate-
    building caused rather than the run's own generation step). `resolution`,
    when given, pins the rung instead of auto-selecting one (`holdout_
    kfold`'s own caller-facing contract, unchanged);
    `DEFAULT_SPAN_START`/`DEFAULT_BIN_WIDTH` when `corpus` carries neither
    a ground-truth event nor a dated evidence item (nothing to anchor
    on)."""
    intervals = [Interval(start=g.year, end=g.year) for g in corpus.ground_truth]
    intervals += [e.interval for e in corpus.evidence if e.interval is not None]
    if not intervals:
        return DEFAULT_SPAN_START, DEFAULT_BIN_WIDTH, (resolution or Resolution.CENTURY)
    resolved = resolution or auto_resolution(intervals)
    span_start = bin_bounds(min(iv.start for iv in intervals), resolved)[0]
    return span_start, RESOLUTION_WIDTH_YEARS[resolved], resolved


def _interval_overlaps_year(interval: Interval, year: int, resolution: Resolution) -> bool:
    """Whether `interval` (a candidate placement's own, exact, free-text-
    extracted interval) overlaps the resolution-ladder bucket containing
    `year` (`hte.timeline.bin_bounds`, anchored at absolute year 0, the
    same fixed grid `hte.generate._evidence_cluster_hypotheses` buckets
    against): a looser reading of "this candidate covers this event's
    date" than exact point containment, at the corpus's own natural
    resolution: `main.tex` §9's own holdout design tests recall against
    a real corpus's own granularity, an easier bar for a discovery pass
    to clear than transcribing the identical year. `hte.timeline.bin`
    is deliberately not reused here: it buckets an interval by its own
    START alone (its own docstring), which would silently narrow a wide
    candidate interval like `[1980, 1994]` down to just its 1980s bucket;
    this function instead tests the candidate's FULL interval against the
    target year's bucket, so a wide interval keeps every bucket it
    spans."""
    bucket_start, bucket_end = bin_bounds(year, resolution)
    return not (interval.end < bucket_start or interval.start > bucket_end)


def _placement_from_item(
    item: EvidenceItem, vocab: Vocabulary, *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> Hypothesis | None:
    """The placement hypothesis `item` itself implies (`bkt-hte-holdout`):
    its own five extracted concept slots, each unnamed one read as `OTHER`
    (`hte.concepts.other_id`) rather than left missing, since `hte.
    hypothesis.Placement` carries no optional slot of its own, at its own
    extracted interval. `None` when `item` names no interval at all (a
    placement with no date can neither contain nor miss a held-out
    event's own year, so it is not a candidate) or when a named slot
    value resolves to no concept id and no fuzzy-matchable label in
    `vocab` (an extractor's raw, unresolved text this function does not
    itself try to place). `span_start`/`bin_width` (`_corpus_time_
    binning`'s own return, threaded from `run_holdout`/`holdout_kfold`)
    address the built placement under the corpus's own span rather than
    `hte.address`'s bare module defaults; see `_corpus_time_binning`."""
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
    """The dict key `run_holdout`/`holdout_kfold` dedupe a fold's own
    candidate population by: `hyp.address` (its five concept ids plus
    its interval's OWN time-bin index, `bkt-hte-calibration-time-
    binning`'s own corpus-anchored rung) alongside the placement's exact
    `interval.start`/`.end`. Address alone is NOT enough: two evidence
    items sharing every concept slot but naming two different exact
    years close enough to fall in the SAME time bin encode to the
    identical address, and a plain `{address: hypothesis}` dict
    (`dict.setdefault`, this module's own shape before this fix) silently
    keeps whichever one was built first and drops the other's own
    interval entirely, one confirmed, measured cause of quantum-history's
    own low k-fold coverage: a later-dated item's own candidate placement
    was ON FILE but unreachable, clobbered by an earlier item's, at the
    exact same address, whose interval did not reach the held-out
    event's year. Keying on the exact interval too keeps every distinct
    dated claim its own candidate, collapsing only TRUE duplicates
    (identical slots, identical exact interval)."""
    interval = hyp.content.interval
    return (hyp.address, interval.start, interval.end)


def _matches_event(
    target: EvidenceItem, placement: Placement, vocab: Vocabulary, *, threshold: float
) -> bool:
    """Whether `placement` matches every concept slot `target` (the
    held-out event's own evidence item) names anything for, at least one
    of them a real, resolved concept match, and none of them a placement
    slot the candidate's own source item never named at all.

    For each slot `target` names, a placement's `OTHER`-filled value
    (`_placement_from_item`'s own fallback for a slot its source item
    left unspecified, `hte.concepts.other_id`) is read as "this
    candidate's source is silent on this slot," not as an assertion the
    two disagree, and is skipped rather than compared: this module's own
    `_placement_from_item` always fills a missing slot with `OTHER`, so
    a candidate built from a source that only ever names, say, an actor
    would otherwise be scored a MISMATCH against any target that also
    names a place or mechanism, purely because the candidate's source
    stayed silent there, one confirmed, measured cause of quantum-
    history's own low k-fold coverage: a claim bullet naming the same
    actor, action, object, and mechanism as a held-out milestone, silent
    only on place, used to fail the match outright over that one silent
    slot.

    Skipping every `OTHER`-filled slot this way needs its own floor
    against a different failure: a candidate whose EVERY present-in-
    target slot is `OTHER`-filled would otherwise match vacuously (every
    comparison skipped, no comparison ever returns `False`), regardless
    of how unrelated its own real slots are to the target's. At least
    one slot `target` names must therefore compare two real, resolved
    values that agree (`slot_match_score`, `hte.link`'s own per-slot
    fuzzy comparator, shared here rather than reimplemented);
    an event naming no slot at all, or a candidate naming none of the
    slots the event does, matches nothing.
    """
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
) -> dict[str, Any]:
    """The discovery-date holdout (`main.tex` §9) over every ground-truth
    event in `corpus`, at `cutoff_years`: every event's own dated fact is
    the target, not (as before this module's `bkt-hte-holdout` rewrite) a
    source's own pooled subject.

    For each event after the cutoff, `_placement_from_item` builds one
    placement candidate from every PRE-cutoff evidence item (`hte.link`'s
    own per-item slot extraction), addressed under the corpus's own span
    and rung (`_corpus_time_binning`), then keeps whichever candidates
    `_matches_event` says name the same slots as the held-out event's own
    item. Among those, the ones whose own interval overlaps the
    resolution-ladder bucket containing the event's `year`
    (`_interval_overlaps_year`, at the same corpus-anchored rung) are its
    *true* readings; the rest are *wrong-interval* competitors, a
    placement matching the event's slots but naming a different time for
    it.

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

    `corpus_name` is carried straight into the returned `"corpus_name"`
    key and into `_low_coverage_note`'s own prose; it names no default
    corpus of its own (`"this corpus"`, read by a caller that passes
    nothing as "the caller did not say"), so `write_calibration`'s
    output never claims a specific corpus this function was not told
    about.
    """
    pre_events, post_events = holdout_by_discovery_date(corpus.ground_truth, cutoff_years)
    ev_by_id = {e.id: e for e in corpus.evidence}
    pre_evidence = [ev_by_id[g.id] for g in pre_events if g.id in ev_by_id]
    span_start, bin_width, resolution = _corpus_time_binning(corpus)

    candidates: dict[tuple[int, int, int], Hypothesis] = {}
    for item in pre_evidence:
        hyp = _placement_from_item(item, corpus.vocab, span_start=span_start, bin_width=bin_width)
        if hyp is not None:
            candidates.setdefault(_candidate_key(hyp), hyp)
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
        "coverage_of_truth": coverage_of_truth,
        "coverage_note": _low_coverage_note(corpus, n_covered, n_holdout, coverage_of_truth, corpus_name=corpus_name),
        "brier_score": brier,
        "calibration_curve": calibration_curve(predictions, n_bins=n_bins),
        "predictions": predictions,
        "constants": {"W": constants.W, "lam": constants.lam},
    }


_LOW_COVERAGE_THRESHOLD = 0.5


def _low_coverage_note(
    corpus: Corpus,
    n_covered: int,
    n_holdout: int,
    coverage_of_truth: float | None,
    *,
    corpus_name: str = "this corpus",
) -> str | None:
    """A one-paragraph explanation for a low or zero `coverage_of_truth`,
    written into `CALIBRATION.md` rather than left for a reader to guess
    at why (`bkt-hte-holdout`'s own transparency requirement: a number
    this surprising needs a stated cause). `None` when coverage clears
    `_LOW_COVERAGE_THRESHOLD`, since nothing needs explaining at that
    point.

    Every fact this note states is read off `corpus` and `corpus_name`
    at call time: the held-out and covered counts, the count of
    `corpus.ground_truth` events with no discovery lag against the
    corpus's own total, and the count of distinct actor values
    `corpus.evidence` carries. An earlier version
    of this function instead wrote a worked example (event and card
    counts, three named actors) measured once against one shipped
    corpus, and printed that same example into every OTHER corpus's own
    `CALIBRATION.md` unchanged, since nothing here read from `corpus` at
    all. `write_calibration`'s own `diagnostics_report` parameter is
    where a `--diagnose` run's own reason breakdown gets appended
    alongside this note, kept as a separate helper
    (`_diagnostics_reason_prose`) rather than folded into this function,
    since diagnostics is optional and this note must stand on its own
    without it.

    The stated cause is structural. `main.tex` §9's holdout design
    assumes a discovery date can lag an event's own date, so pre-cutoff
    evidence about an event that *happened* early but was only
    *discovered* late can already cover a held-out event dated after it.
    A ground-truth event with `discovery_year == year` instead collapses
    discovery and occurrence to the same instant, so no pre-cutoff
    candidate built from it can ever reach a later, post-cutoff event's
    own year on a discovery lag alone; coverage then needs some OTHER
    pre-cutoff item that already names the held-out event's own actor,
    action, object, place, and mechanism, at an interval reaching its
    own date, independent of how many hypotheses generation produces
    (`run_holdout`'s own candidates come straight off `corpus.evidence`,
    not off `hte.generate`'s population).
    """
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
    """One paragraph rendering `hte.diagnostics.coverage_report`'s own
    per-reason counts and per-event classification into prose
    `write_calibration` can append next to `_low_coverage_note`'s own
    note, generic over whatever names `report["reasons"]` carries
    rather than this module knowing that set's own members: `hte.
    diagnostics` owns `REASONS`, and `hte.diagnostics` itself imports
    `from . import calibrate`, so an import the other way here would be
    a cycle. `None` when `report` is `None` or carries neither a
    nonzero reason count nor an uncovered event to list."""
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


# --------------------------------------------------------------------------
# k-fold evidence holdout (`bkt-hte-calibration-redesign`)
# --------------------------------------------------------------------------
#
# `holdout_by_discovery_date` is structurally empty on quantum-history,
# education-atlas, `hte.corpus.fixtures`, and every `hte.synth` world:
# `discovery_year == year` for every ground-truth event those corpora ship
# (`README.md`'s own documented simplification), so every event lands on
# one side of any cutoff and `run_holdout` scores nothing
# (`runs/quantum-history/20260910T035243Z/CALIBRATION.md`'s own "coverage
# of truth: 0.0" against 105 of 105 events). `holdout_kfold` needs no
# discovery date at all: it hides `1/k` of a corpus's own EVIDENCE items
# directly, stratified by `EvidenceKind`, rebuilds ONE placement candidate
# per KEPT item straight off that item's own claimed slots
# (`_placement_from_item`, the same O(1)-per-item reading `run_holdout`
# already uses) and its own evidence links (`hte.link.link_evidence`) from
# what remains, and asks, for every ground-truth event whose own evidence
# item fell into that fold's held-out slice, whether the rebuilt
# population still carries a placement matching the event's own slots and
# what projected probability it gets. `hte.corpus.production` DOES carry a
# real discovery lag (its own `GroundTruthEvent.discovery_year` is a
# claim's review-acceptance date, distinct from the claim's own subject
# date), so `choose_holdout_mode` keeps discovery-date holdout there
# instead.


def _stratified_folds(items: Sequence[EvidenceItem], *, k: int, seed: int) -> dict[str, int]:
    """`{item.id: fold_index}` for every item in `items`, `fold_index` in
    `[0, k)`: items are grouped by `EvidenceKind` first, each group's own
    order shuffled by a `seed`-derived RNG, then dealt round-robin across
    `k` folds, so every fold's own held-out slice carries a proportional
    mix of every kind on file rather than one kind concentrating into one
    fold by chance."""
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
    """The k-fold evidence holdout (module-docstring section above): hide
    `1/k` of `corpus.evidence` at a time, stratified by kind
    (`_stratified_folds`), rebuild ONE placement candidate directly from
    each KEPT item's own claimed slots (`_placement_from_item`, `hte.
    calibrate`'s own O(1)-per-item reading, the same one `run_holdout`
    already builds its pre-cutoff candidates from), link that candidate
    population against the kept evidence (`hte.link.link_evidence`), and
    for every ground-truth event whose own evidence item fell into THIS
    fold's held-out slice, ask whether the rebuilt population still
    carries a placement matching the event's own slots (`_matches_event`)
    and what projected probability (`hte.belief.score`) it gets from the
    kept evidence alone.

    This deliberately does NOT run `hte.generate.from_evidence`'s full
    four-generator sweep (evidence-cluster, claim-gap, contradiction,
    cross-period-analogy): claim-gap alone costs one address build per
    concept-bearing slot's ENTIRE vocabulary, per item, the same cost
    that makes a real campaign's own generation pass expensive enough to
    need `bkt-hte-throughput`'s parallel/batched LLM wiring in the first
    place, and buys k-fold's own coverage question nothing a real corpus
    doesn't already answer more directly: coverage here comes from
    ANOTHER kept item sharing the held-out event's own exact slots
    (`hte.synth`'s own corroborating evidence, or a real corpus's
    recurring actor/action/object/place/mechanism combination), which
    `_placement_from_item` reads off that other item directly, no vocab
    sweep needed. `holdout_kfold` was first drafted against `from_evidence`
    (`bkt-hte-calibration-redesign`'s own first pass); confirmed
    empirically (`tests/campaigns/test_random_campaigns.py` alone rising
    past 90s from a suite-wide baseline of 86s) that the sweep's own cost,
    paid `k` times per campaign's own calibration step, was the dominant
    new cost `bkt-hte-throughput`'s wiring was supposed to be cutting, not
    adding; switched to this cheaper reading the same day, no coverage
    loss measured against `hte.synth` worlds (`tests/test_calibrate.py`'s
    own `test_holdout_kfold_coverage_on_synthetic_worlds_is_at_least_0_8`).

    Every fold works on its own deep copy of the corpus's evidence items:
    `hte.link.link_evidence` mutates `supports`/`refutes` in place, and a
    fold must never carry over another fold's own linkage (or a caller's
    own prior `hte.runner.run_campaign` pass over the same `EvidenceItem`
    objects, since `Corpus.evidence` is one shared list a full campaign
    may have already linked before calibration runs).

    Returns the same flat top-level shape `run_holdout` does
    (`cutoff_years` reads `None`, since this mode uses no cutoff at all),
    so `write_calibration` renders either mode's result with no branch of
    its own, plus `"folds"` (one entry per fold, the same shape nested)
    and `"aggregate"` (the three pooled numbers again, for a caller that
    wants them without re-deriving from `"folds"`). `"mode"` reads
    `"kfold"` here directly; `run_calibration` is where a caller gets
    that name alongside its own reason for having picked it. `"coverage_
    note"` reads `None` unconditionally in this mode: `_low_coverage_
    note`'s own stated cause (a discovery-date holdout design meeting a
    corpus with no discovery lag) does not apply to a k-fold run, which
    hides evidence directly and needs no discovery date at all; a
    k-fold-shaped explanation of low coverage belongs to `hte.
    diagnostics.coverage_report` instead. `corpus_name` threads into
    `"corpus_name"` the same way `run_holdout` threads it,
    for `write_calibration` to print regardless of which mode a caller
    ran.
    """
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
                continue  # this event's own evidence was not hidden in this fold
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
        "coverage_note": None,
        "brier_score": aggregate["brier_score"],
        "calibration_curve": aggregate["calibration_curve"],
        "predictions": pooled_predictions,
        "constants": {"W": constants.W, "lam": constants.lam},
        "folds": fold_results,
        "aggregate": aggregate,
    }


def choose_holdout_mode(corpus: Corpus) -> tuple[str, str]:
    """`("discovery_date", reason)` when at least one ground-truth event's
    `discovery_year` differs from its own `year` (a real discovery lag
    `main.tex` §9's holdout design is built to test); `("kfold", reason)`
    otherwise, `discovery_year == year` for every event making
    `holdout_by_discovery_date`'s own split empty on one side no matter
    the cutoff chosen. `reason` is one sentence, meant to be read
    straight into `CALIBRATION.md` (`run_calibration`, `write_calibration`)."""
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
) -> dict[str, Any]:
    """`choose_holdout_mode(corpus)`, then the matching holdout
    (`run_holdout` for `"discovery_date"`, `holdout_kfold` for
    `"kfold"`), with `result["mode"]`/`result["mode_reason"]` set from
    that choice, for `write_calibration` to report. `cutoff_years` left
    `None` (the default) falls back to the corpus's own median discovery
    year when discovery-date mode is chosen (`hte.runner.
    run_campaign`'s own prior default, `_default_cutoff`); an explicit
    `cutoff_years` still pins the cutoff when that mode is the one
    chosen, and is unused when k-fold is chosen instead, since
    k-fold reads no date at all. `hte.runner.run_campaign` is this
    function's own caller; a caller wanting one mode unconditionally
    calls `run_holdout` or `holdout_kfold` directly instead. `corpus_name`
    passes straight through to whichever one is picked.
    """
    mode, reason = choose_holdout_mode(corpus)
    if mode == "discovery_date":
        cutoff = cutoff_years if cutoff_years is not None else _default_discovery_cutoff(corpus)
        result = run_holdout(
            corpus, constants, cutoff_years=cutoff, match_threshold=match_threshold,
            n_bins=n_bins, corpus_name=corpus_name,
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
    """Grid search over `grid["W"]`, `grid["lam"]`, and an optional
    `grid["tier_scale"]` (a single global multiplier on every tier weight,
    standing in for `TIMELINE-AND-COMBINATORICS-SPEC.md`'s six-value
    `tier_weight` table so the grid stays a tractable product rather than
    a six-dimensional sweep), minimizing the chosen holdout's own Brier
    score. `mu` is not part of the grid; see the module docstring.

    An explicit `cutoff_years` pins discovery-date holdout at that cutoff
    for every grid point, `run_holdout`'s own contract, unchanged.
    `cutoff_years` left `None` (the default) instead uses `run_calibration`'s
    own auto-picked mode (`choose_holdout_mode`) for every grid point,
    `k`/`seed` passed through when that mode is k-fold: this is the
    "`fit_constants` must use the chosen mode" half of
    `bkt-hte-calibration-redesign`, a caller wanting the old
    discovery-date-only behavior unconditionally still gets it by passing
    `cutoff_years` explicitly.

    Returns `{"best", "results"}`, `results` sorted best-first, `best`
    `None` when the grid or the holdout itself produced no score to
    compare (an empty grid, or a corpus with no covered event under the
    chosen mode).
    """
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


# --------------------------------------------------------------------------
# pooled coordinate-descent fit (`docs/CALIBRATION-FIT-2026-09-10.md`)
# --------------------------------------------------------------------------
#
# `fit_constants`'s own grid search (above) fits `W`/`lam`/`tier_scale`
# against ONE corpus's own holdout. Real-corpus k-fold Brier runs 0.36 to
# 0.42 while a synthetic `hte.synth` world's own runs near 0.008
# (`docs/CALIBRATION-FIT-2026-09-10.md`'s own before-table): the constants
# this package ships were tuned to synth alone, never checked against a
# real corpus's own holdout at all. `fit_constants_pooled` is the wider
# fit that check calls for: every named constant (`W`, `lam`, `mu`,
# `alpha`, a single global `tier_scale` standing in for the six-value
# `tier_weight` table, `fit_constants`'s own documented simplification
# reused here rather than a six-dimensional sweep, and `hte.belief.
# Constants.detectability_floor`) fit jointly against a POOLED objective:
# the mean k-fold Brier score across every corpus a caller hands it, with
# a penalty when a named subset (synth worlds, by convention) reads a
# `coverage_of_truth` below its own target. `mu` and `alpha` are included
# in the search per this fit's own stated scope even though neither
# affects `hte.belief.score`'s own output (`Constants`'s own docstring):
# their own fitted value is recorded, never observed to move the loss.


_FIT_PARAM_NAMES: tuple[str, ...] = ("W", "lam", "mu", "alpha", "tier_scale", "detectability_floor")

_FIT_PARAM_BOUNDS: dict[str, tuple[float, float]] = {
    "W": (0.5, 8.0), "lam": (0.05, 2.0), "mu": (0.0, 2.0), "alpha": (0.1, 5.0),
    "tier_scale": (0.25, 3.0), "detectability_floor": (0.0, 0.6),
}

# Additive step offsets tried around the running-best value for each
# parameter, per coordinate-descent sweep (`_coordinate_descent`).
# `detectability_floor` starts at `0.0` (`Constants`'s own default), where
# a MULTIPLICATIVE step could never move it at all; every parameter here
# uses the same additive convention for that reason, rather than mixing
# additive and multiplicative steps across the six.
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
    """One point in the pooled search space, scored: `hte.calibrate.
    run_calibration` (its own auto-picked discovery-date/k-fold mode,
    `choose_holdout_mode`) over every corpus in `corpora`, at the
    `Constants` `vector` builds (`_vector_to_constants`).

    `loss = mean_brier + penalty`: `mean_brier` is the plain mean of
    every corpus's own `brier_score` that is not `None` (a corpus with no
    covered event contributes nothing to the mean rather than a
    fabricated zero); `penalty` sums, over every `(name, target)` pair in
    `coverage_targets`, `coverage_penalty_weight * max(0, target -
    coverage_of_truth)` when that corpus's own `coverage_of_truth` is
    known and below `target` (missing coverage, or a corpus `coverage_
    targets` does not name, contributes nothing). A caller wanting the
    penalty enforced only on synth worlds (`docs/CALIBRATION-FIT-2026-09-
    10.md`'s own "a penalty on synth coverage dropping below 0.9") passes
    `coverage_targets` naming only those.
    """
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
    """Coordinate descent over `_FIT_PARAM_NAMES` against `evaluate_
    pooled`'s own loss, starting from `Constants()`'s own values
    (`_default_fit_vector`) unless `start` overrides them. One sweep
    (`passes=1`, the default) tries every `_FIT_PARAM_STEPS` offset for
    each parameter in `_FIT_PARAM_NAMES` order, keeping whichever step
    (if any) lowers the running-best loss before moving to the next
    parameter; a second or later pass repeats the same sweep from
    wherever the previous one left off, and the search stops early,
    before `passes` is reached, the first time a whole sweep finds no
    improving step at all.

    Returns `{"best", "history", "passes_run"}`: `best` is `evaluate_
    pooled`'s own result dict at the winning vector; `history` is every
    evaluated point, baseline first, in evaluation order (an audit trail;
    reproducing `best` needs only its own `vector`); `passes_run` is how
    many full sweeps ran, `<= passes`.
    """
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
    """`(corpora, coverage_targets)` for `fit_constants_pooled`'s own
    pooled objective: one `hte.synth.make_small_world(seed).corpus` per
    `synth_seeds` entry (key `f"synth-{seed}"`), plus `quantum-history`,
    `production` (`status_min="draft"`, so a draft-only campaign still
    contributes evidence to fit against), `education-atlas`, and
    `literature` (`hte.corpus.literature.DEFAULT_FIXTURES_DIR`, the local
    6-card fixture set, never a live GitHub fetch). `coverage_targets`
    names `DEFAULT_MIN_SYNTH_COVERAGE` for every synth entry only, per
    `docs/CALIBRATION-FIT-2026-09-10.md`'s own "a penalty on synth
    coverage" scope; none of the four real corpora carries one.

    `education_atlas_countries`/`education_atlas_years` restrict `hte.
    corpus.education_atlas.load`'s own sample to a fixed 8-country,
    full-span-year subset rather than all 25 sample countries: `hte.link.
    link_evidence`'s own per-fold cost (`hte.calibrate.holdout_kfold`'s
    own module-docstring section) scales with candidate population size,
    and the full 25-country sample's own ~4,700 evidence items measured
    well past two minutes for one `run_calibration` call alone, a cost
    this fit pays dozens of times per coordinate-descent sweep. The
    8-country subset (~1,500 evidence items, chosen for income- and
    region-spread rather than at random: two high-income Western
    economies, two East/South Asian economies, one Latin American, two
    Sub-Saharan African, one Nordic) measured close to 20 seconds a call,
    the one real-corpus term in the pooled objective's own dominant cost
    but tractable across a bounded coordinate-descent budget.

    This function is a thin, lazy-import orchestration layer over `hte.
    synth` and every `hte.corpus.*` loader (imported inside this function
    body, never at this module's own top level: `hte.synth` itself
    imports FROM `hte.calibrate`, `calibration_curve`, so a top-level
    `from . import synth` here would be a real import cycle); `hte.
    calibrate`'s own lower-level `fit_constants_pooled`/`evaluate_pooled`
    take a plain `Mapping[str, Corpus]` and know nothing about where any
    of them came from.
    """
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
    """Writes `result` (`run_holdout`'s or `holdout_kfold`'s own return
    shape, either optionally carrying a `"fit"` key with `fit_constants`'s
    own output) to `out_dir/calibration.json` and a human-readable
    `out_dir/CALIBRATION.md`. `CALIBRATION.md` always names the corpus it
    ran against (`result["corpus_name"]`, `"this corpus"` when a caller
    passed none), independent of coverage or mode, so a reader comparing
    two runs' own `CALIBRATION.md` files can never confuse which corpus
    either one is about. When `result["coverage_note"]` is set
    (`_low_coverage_note`, low or zero `coverage_of_truth`),
    `CALIBRATION.md` carries it under its own "Why coverage is low"
    heading rather than reporting the bare number with no explanation.
    When `result["mode"]` is set (`run_calibration`'s own addition over
    either bare holdout function), `CALIBRATION.md` opens with the chosen
    mode and `result["mode_reason"]`; when `result["folds"]` is also set
    (`holdout_kfold`'s own per-fold detail), each fold's own coverage and
    Brier score get their own table row. Both are additive: a plain
    `run_holdout`/`holdout_kfold` result with neither key renders exactly
    as before.

    `diagnostics_report`, when given (`hte.diagnostics.coverage_report`'s
    own return shape, this module's own caller passing it only after a
    `--diagnose` run against the same `result`), adds its own per-reason
    counts and per-event classification under the same "Why coverage is
    low" heading, alongside (not instead of) `_low_coverage_note`'s own
    structural explanation; the heading appears whenever either one has
    something to say, so a `--diagnose` run against an otherwise-covered
    corpus still reports what it found even with no low-coverage note of
    its own.
    """
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
        f"(coverage of truth: {result.get('coverage_of_truth')})",
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
        lines += ["", "## Per-fold", "", "| Fold | Held out | Covered | Coverage of truth | Brier score |", "|---|---|---|---|---|"]
        for f in folds:
            lines.append(
                f"| {f['fold']} | {f['n_holdout_events']} | {f['n_covered_events']} | "
                f"{f['coverage_of_truth']} | {f['brier_score']} |"
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
    "run_calibration", "fit_constants", "write_calibration",
    "brier_score", "calibration_curve", "DEFAULT_MATCH_THRESHOLD", "DEFAULT_KFOLD_K",
    "evaluate_pooled", "fit_constants_pooled", "build_pooled_fit_corpora",
    "DEFAULT_MIN_SYNTH_COVERAGE", "DEFAULT_COVERAGE_PENALTY_WEIGHT",
]
