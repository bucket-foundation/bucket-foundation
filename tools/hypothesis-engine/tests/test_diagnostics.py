"""`hte.diagnostics.coverage_report`: a per-reason breakdown of every
ground-truth event `hte.calibrate` did not cover (`bkt-hte-generation-
coverage`).

One hand-built corpus, `_reasons_corpus`, carries exactly one event per
reason `REASONS` names (`no_evidence_after_holdout` twice, once for a
target naming no slot at all and once for a target naming a slot no
other item shares) plus one covered event for contrast, `k` set
to the corpus's own evidence count so `hte.calibrate._stratified_folds`
deals every item its own unique fold: whichever fold holds out a given
event's own item, every OTHER item (its companion included) stays kept,
with no need to know or control the stratification RNG's own shuffle
order.
"""
from __future__ import annotations

import json

from hte import diagnostics
from hte.belief import Constants
from hte import calibrate
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus, GroundTruthEvent
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.timeline import Interval


def _vocab() -> Vocabulary:
    vocab = Vocabulary()
    for slot, ids in (
        (Slot.ACTOR, ["alice", "bob", "carol", "dave", "erin", "frank"]),
        (Slot.ACTION, ["acted", "reacted"]),
    ):
        for cid in ids:
            vocab.add(Concept(cid, slot, cid.capitalize(), 0.0, ConsensusStatus.CONSENSUS))
    for slot in (Slot.OBJECT, Slot.PLACE, Slot.MECHANISM):
        vocab.add(Concept(f"{slot.value}-x", slot, f"{slot.value.capitalize()} X", 0.0, ConsensusStatus.CONSENSUS))
    return vocab


def _span(doc_id: str) -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="l", quote="q", char_start=0, char_end=1)


def _item(item_id: str, *, interval: Interval | None, **slots) -> EvidenceItem:
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id=item_id,
        span=_span(item_id), provenance="test", interval=interval, **slots,
    )


def _reasons_corpus() -> Corpus:
    evidence = [
        # no_evidence_after_holdout: target names no slot at all.
        _item("zero-slots", interval=Interval(2000, 2000)),
        # no_evidence_after_holdout: target names a slot (alice) no other
        # item in the corpus ever shares.
        _item("lonely", interval=Interval(2001, 2001), actor="alice"),
        # no_placement_generated: a companion shares the target's own
        # actor (bob) but carries no interval, so no valid placement can
        # be built from it; no other item names bob at all.
        _item("no-interval-target", interval=Interval(2002, 2002), actor="bob"),
        _item("no-interval-companion", interval=None, actor="bob"),
        # slot_mismatch: a companion shares the target's own actor
        # (carol) and interval but disagrees on action.
        _item("mismatch-target", interval=Interval(2003, 2003), actor="carol", action="acted"),
        _item("mismatch-companion", interval=Interval(2003, 2003), actor="carol", action="reacted"),
        # interval_mismatch: a companion shares the target's own actor
        # (dave) and disagrees on nothing else, but its own interval sits
        # decades away.
        _item("interval-target", interval=Interval(2004, 2004), actor="dave"),
        _item("interval-companion", interval=Interval(1980, 1980), actor="dave"),
        # covered: a companion shares the target's own actor (erin) and
        # interval outright.
        _item("covered-target", interval=Interval(2005, 2005), actor="erin"),
        _item("covered-companion", interval=Interval(2005, 2005), actor="erin"),
    ]
    ground_truth = [
        GroundTruthEvent(id="zero-slots", label="zero slots", year=2000, doc_id="zero-slots", discovery_year=2000),
        GroundTruthEvent(id="lonely", label="lonely", year=2001, doc_id="lonely", discovery_year=2001),
        GroundTruthEvent(id="no-interval-target", label="no interval", year=2002, doc_id="no-interval-target", discovery_year=2002),
        GroundTruthEvent(id="mismatch-target", label="mismatch", year=2003, doc_id="mismatch-target", discovery_year=2003),
        GroundTruthEvent(id="interval-target", label="interval mismatch", year=2004, doc_id="interval-target", discovery_year=2004),
        GroundTruthEvent(id="covered-target", label="covered", year=2005, doc_id="covered-target", discovery_year=2005),
    ]
    return Corpus(sources={}, evidence=evidence, ground_truth=ground_truth, provenance=[], vocab=_vocab())


def _run_calibration(corpus: Corpus):
    return calibrate.run_calibration(corpus, Constants(), k=len(corpus.evidence), seed=0)


def test_coverage_report_requires_a_mode_field():
    corpus = _reasons_corpus()
    try:
        diagnostics.coverage_report(corpus, {})
    except KeyError:
        pass
    else:
        raise AssertionError("coverage_report should raise KeyError with no 'mode' in run_artifacts")


def test_coverage_report_rejects_an_unknown_mode():
    corpus = _reasons_corpus()
    try:
        diagnostics.coverage_report(corpus, {"mode": "not-a-real-mode"})
    except ValueError as exc:
        assert "not-a-real-mode" in str(exc)
    else:
        raise AssertionError("coverage_report should raise ValueError on an unrecognized mode")


def test_coverage_report_reasons_sum_to_the_uncovered_count():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert sum(report["reasons"].values()) == report["n_holdout_events"] - report["n_covered_events"]
    assert report["coverage_of_truth"] == report["n_covered_events"] / report["n_holdout_events"]


def test_coverage_report_every_fixed_reason_is_present_even_at_zero():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert set(report["reasons"]) == set(diagnostics.REASONS)


def _reason_for(report, event_id: str) -> str | None:
    for entry in report["uncovered_events"]:
        if entry["event_id"] == event_id:
            return entry["reason"]
    return None


def test_target_naming_no_slot_reads_no_evidence_after_holdout():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert _reason_for(report, "zero-slots") == "no_evidence_after_holdout"


def test_target_with_no_sharing_evidence_reads_no_evidence_after_holdout():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert _reason_for(report, "lonely") == "no_evidence_after_holdout"


def test_a_shared_slot_with_no_interval_reads_no_placement_generated():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert _reason_for(report, "no-interval-target") == "no_placement_generated"


def test_a_disagreeing_real_slot_reads_slot_mismatch():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert _reason_for(report, "mismatch-target") == "slot_mismatch"


def test_a_distant_date_reads_interval_mismatch():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert _reason_for(report, "interval-target") == "interval_mismatch"


def test_a_matching_companion_covers_its_target():
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert _reason_for(report, "covered-target") is None
    assert report["n_covered_events"] >= 1


def test_dropped_by_cap_is_always_zero_along_this_path():
    """`hte.calibrate`'s own candidate-building applies no cap at all
    (`_diagnose_kfold`/`_diagnose_discovery_date`'s shared docstring
    note); this reason existing in `REASONS` at all, and reading zero
    here, is the plain, stated report `bkt-hte-generation-coverage`
    asks for when a hypothesis the task brief names does not apply."""
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    assert report["reasons"]["dropped_by_cap"] == 0
    assert report["notes"]


def test_coverage_report_works_against_discovery_date_mode():
    corpus = _reasons_corpus()
    # Force a real discovery lag so `choose_holdout_mode` picks
    # discovery_date instead of kfold.
    lagged = list(corpus.ground_truth)
    lagged[0] = GroundTruthEvent(
        id=lagged[0].id, label=lagged[0].label, year=lagged[0].year,
        doc_id=lagged[0].doc_id, discovery_year=lagged[0].year + 50,
    )
    corpus.ground_truth[:] = lagged
    result = calibrate.run_calibration(corpus, Constants())
    assert result["mode"] == "discovery_date"
    report = diagnostics.coverage_report(corpus, result)
    assert report["mode"] == "discovery_date"
    assert sum(report["reasons"].values()) == report["n_holdout_events"] - report["n_covered_events"]


def test_write_diagnostics_produces_files(tmp_path):
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    diagnostics.write_diagnostics(report, tmp_path)
    assert (tmp_path / "diagnostics.json").is_file()
    md = (tmp_path / "DIAGNOSTICS.md").read_text()
    assert "# Coverage diagnostics" in md
    assert "no evidence after holdout" in md
    assert json.loads((tmp_path / "diagnostics.json").read_text())["mode"] == "kfold"


def test_write_diagnostics_lists_uncovered_events_under_their_own_reason(tmp_path):
    corpus = _reasons_corpus()
    result = _run_calibration(corpus)
    report = diagnostics.coverage_report(corpus, result)
    diagnostics.write_diagnostics(report, tmp_path)
    md = (tmp_path / "DIAGNOSTICS.md").read_text()
    assert "mismatch-target" in md
    assert "interval-target" in md
