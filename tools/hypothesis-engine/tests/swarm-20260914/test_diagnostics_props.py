"""Property swarm for `hte.diagnostics.coverage_report`.

`diagnostics.py` is one of the five `hte/*.py` modules tick 18's own
`LOOP-LOG.md` entry named as still carrying no swarm/property file at all
after `tournament.py` got one (`artifacts.py`, `calibrate.py`,
`casp_cadence.py`, `fusion_stress.py` are the other four); at 351 lines
it is the smallest of the five. `tests/test_diagnostics.py` already pins
one fixed example per `REASONS` value with a hand-built corpus; this
file generates randomized corpora instead, to check the structural
invariants `coverage_report`'s own docstring states (the reason counts
reconcile with the holdout/covered totals, every fixed reason name is
always present, `coverage_of_truth` matches its own stated formula) over
a wider input space than any one hand-built example can cover.

The last test below takes `tmp_path_factory` ahead of its `@given`
keyword argument in the signature (`tests/swarm3/test_roles_props.py`'s
own precedent): a function-scoped `tmp_path` is not reset between
examples `@given` generates, so `tmp_path_factory.mktemp(...)` per
example is the pattern this package already uses instead.
"""
from __future__ import annotations

import json

from hypothesis import given, settings, strategies as st

from hte import calibrate, diagnostics
from hte.belief import Constants
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus, GroundTruthEvent
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.timeline import Interval

ACTORS = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi"]
ACTIONS = ["acted", "reacted", "waited"]


def _vocab() -> Vocabulary:
    vocab = Vocabulary()
    for slot, ids in ((Slot.ACTOR, ACTORS), (Slot.ACTION, ACTIONS)):
        for cid in ids:
            vocab.add(Concept(cid, slot, cid.capitalize(), 0.0, ConsensusStatus.CONSENSUS))
    for slot in (Slot.OBJECT, Slot.PLACE, Slot.MECHANISM):
        vocab.add(Concept(f"{slot.value}-x", slot, f"{slot.value.capitalize()} X", 0.0, ConsensusStatus.CONSENSUS))
    return vocab


def _span(doc_id: str) -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="l", quote="q", char_start=0, char_end=1)


def _item(item_id: str, *, interval: Interval | None, actor: str | None, action: str | None) -> EvidenceItem:
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id=item_id,
        span=_span(item_id), provenance="test", interval=interval, actor=actor, action=action,
    )


@st.composite
def _corpora(draw):
    """A corpus of 2-8 events, each with an item that may or may not
    carry an interval, an actor drawn from a small shared vocabulary
    (so some pairs share a slot and some don't), and an optional action
    (so some sharing pairs still disagree on a second slot). One item
    per ground-truth event, `discovery_year == year` throughout so
    `choose_holdout_mode` always reads k-fold, matching every real
    corpus this package ships (`README.md`'s own "Holdout mode picked"
    table)."""
    n = draw(st.integers(min_value=2, max_value=8))
    evidence = []
    ground_truth = []
    for i in range(n):
        actor = draw(st.sampled_from(ACTORS))
        action = draw(st.one_of(st.none(), st.sampled_from(ACTIONS)))
        year = draw(st.integers(min_value=1990, max_value=2020))
        interval = Interval(year, year) if draw(st.booleans()) else None
        item_id = f"item-{i}"
        evidence.append(_item(item_id, interval=interval, actor=actor, action=action))
        ground_truth.append(
            GroundTruthEvent(id=item_id, label=item_id, year=year, doc_id=item_id, discovery_year=year)
        )
    return Corpus(sources={}, evidence=evidence, ground_truth=ground_truth, provenance=[], vocab=_vocab())


def _report_for(corpus: Corpus) -> dict:
    result = calibrate.run_calibration(corpus, Constants(), k=len(corpus.evidence), seed=0)
    return diagnostics.coverage_report(corpus, result)


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_reasons_sum_plus_covered_equals_holdout(corpus):
    report = _report_for(corpus)
    assert sum(report["reasons"].values()) + report["n_covered_events"] == report["n_holdout_events"]


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_reasons_keys_are_exactly_the_fixed_set(corpus):
    report = _report_for(corpus)
    assert set(report["reasons"]) == set(diagnostics.REASONS)


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_coverage_of_truth_matches_its_own_stated_formula(corpus):
    report = _report_for(corpus)
    if report["n_holdout_events"] == 0:
        assert report["coverage_of_truth"] is None
    else:
        assert report["coverage_of_truth"] == report["n_covered_events"] / report["n_holdout_events"]


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_dropped_by_cap_is_always_zero_along_the_calibrate_path(corpus):
    """`hte.calibrate`'s own candidate-building applies no generation
    cap (`_CAP_NOTE`'s own documented reading); every corpus this
    strategy can draw should reach that same zero, not just the one
    hand-built example `tests/test_diagnostics.py` already fixes."""
    report = _report_for(corpus)
    assert report["reasons"]["dropped_by_cap"] == 0


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_every_uncovered_event_names_a_reason_from_the_fixed_set(corpus):
    report = _report_for(corpus)
    for entry in report["uncovered_events"]:
        assert entry["reason"] in diagnostics.REASONS


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_uncovered_events_length_matches_the_reasons_total(corpus):
    report = _report_for(corpus)
    assert len(report["uncovered_events"]) == sum(report["reasons"].values())


@given(_corpora())
@settings(deadline=None, max_examples=40)
def test_uncovered_event_ids_are_a_subset_of_ground_truth_ids(corpus):
    report = _report_for(corpus)
    gt_ids = {g.id for g in corpus.ground_truth}
    for entry in report["uncovered_events"]:
        assert entry["event_id"] in gt_ids


@given(corpus=_corpora())
@settings(deadline=None, max_examples=40)
def test_write_diagnostics_json_round_trips_the_report(tmp_path_factory, corpus):
    report = _report_for(corpus)
    out_dir = tmp_path_factory.mktemp("diagnostics")
    diagnostics.write_diagnostics(report, out_dir)
    on_disk = json.loads((out_dir / "diagnostics.json").read_text())
    assert on_disk == report
    md = (out_dir / "DIAGNOSTICS.md").read_text()
    assert report["mode"] in md
    assert "# Coverage diagnostics" in md
