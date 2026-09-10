from hte import calibrate
from hte.belief import Constants
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus, GroundTruthEvent, fixtures
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Tier
from hte.timeline import Interval


def test_holdout_by_discovery_date_splits_correctly():
    corpus = fixtures.build()
    pre, post = calibrate.holdout_by_discovery_date(corpus.ground_truth, 1960)
    assert all(g.discovery_year < 1960 for g in pre)
    assert all(g.discovery_year >= 1960 for g in post)
    assert len(pre) + len(post) == len(corpus.ground_truth)


def test_calibration_curve_bins_predictions():
    predictions = [{"predicted": 0.05, "observed": 0.0}, {"predicted": 0.95, "observed": 1.0}]
    curve = calibrate.calibration_curve(predictions, n_bins=10)
    assert len(curve) == 10
    assert curve[0]["count"] == 1
    assert curve[-1]["count"] == 1
    assert curve[5]["count"] == 0
    assert curve[5]["mean_predicted"] is None


def test_brier_score_matches_hand_computation():
    score = calibrate.brier_score([0.8, 0.2], [1.0, 0.0])
    assert abs(score - ((0.8 - 1.0) ** 2 + (0.2 - 0.0) ** 2) / 2) < 1e-12


def test_brier_score_empty_is_none():
    assert calibrate.brier_score([], []) is None


# --------------------------------------------------------------------------
# run_holdout: the event-targeted rewrite (bkt-hte-holdout)
#
# A purpose-built corpus, not `hte.corpus.fixtures`, since it needs slot-carrying
# evidence items `fixtures.build()` does not give its own (that corpus is
# also the frozen seed for `tests/test_runner.py`'s replay-only campaign,
# so its evidence is deliberately left slot-less; see that module's own
# comment). Three post-cutoff events exercise the three outcomes
# `run_holdout` distinguishes:
#
# - "confirm" (1918): the "planck" pre-cutoff placement's own wide interval
#   [1895, 1925] contains it -- a *true*, covered reading -- while the
#   "disputed" pre-cutoff placement's interval [1928, 1935] does not -- a
#   *wrong-interval* competitor for the same event.
# - "disputed-date" (1930): the readings invert -- "disputed"'s interval
#   contains it, "planck"'s does not.
# - "uncovered" (1980): names a wholly different actor no pre-cutoff item
#   ever names, so no candidate matches it at all.
# --------------------------------------------------------------------------


def _calib_vocab() -> Vocabulary:
    vocab = Vocabulary()
    vocab.add(Concept("planck", Slot.ACTOR, "Max Planck", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("einstein", Slot.ACTOR, "Albert Einstein", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("proposed", Slot.ACTION, "Proposed", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("quantum-theory", Slot.OBJECT, "Quantum theory", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("relativity", Slot.OBJECT, "Relativity", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("berlin", Slot.PLACE, "Berlin", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("zurich", Slot.PLACE, "Zurich", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("quantization", Slot.MECHANISM, "Energy quantization", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("relativity-mech", Slot.MECHANISM, "Spacetime geometry", 0.5, ConsensusStatus.CONSENSUS))
    return vocab


def _span(doc_id: str) -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="l", quote="q", char_start=0, char_end=1)


_PLANCK_SLOTS = dict(actor="planck", action="proposed", object="quantum-theory", place="berlin", mechanism="quantization")


def _calib_corpus(cutoff: int = 1910) -> Corpus:
    vocab = _calib_vocab()
    evidence = [
        EvidenceItem(id="planck-early", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="doc-1",
                     span=_span("doc-1"), provenance="test",
                     interval=Interval(1895, 1925), **_PLANCK_SLOTS),
        EvidenceItem(id="disputed-early", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="doc-2",
                     span=_span("doc-2"), provenance="test",
                     interval=Interval(1928, 1935), **_PLANCK_SLOTS),
        EvidenceItem(id="confirm", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-3",
                     span=_span("doc-3"), provenance="test", **_PLANCK_SLOTS),
        EvidenceItem(id="disputed-date", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-4",
                     span=_span("doc-4"), provenance="test", **_PLANCK_SLOTS),
        EvidenceItem(id="uncovered", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-5",
                     span=_span("doc-5"), provenance="test",
                     actor="einstein", action="proposed", object="relativity", place="zurich",
                     mechanism="relativity-mech"),
    ]
    ground_truth = [
        GroundTruthEvent(id="planck-early", label="Planck's own account", year=1900, doc_id="doc-1", discovery_year=1900),
        GroundTruthEvent(id="disputed-early", label="A disputed alternate dating", year=1905, doc_id="doc-2", discovery_year=1905),
        GroundTruthEvent(id="confirm", label="Later confirmation, Planck's own dating wins", year=1918, doc_id="doc-3", discovery_year=1918),
        GroundTruthEvent(id="disputed-date", label="Later confirmation, disputed dating wins", year=1930, doc_id="doc-4", discovery_year=1930),
        GroundTruthEvent(id="uncovered", label="An unrelated later event", year=1980, doc_id="doc-5", discovery_year=1980),
    ]
    return Corpus(sources={}, evidence=evidence, ground_truth=ground_truth, provenance=[], vocab=vocab)


def test_run_holdout_reports_holdout_count_and_coverage_of_truth():
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert result["n_holdout_events"] == 3  # confirm, disputed-date, uncovered
    assert result["n_covered_events"] == 2  # confirm and disputed-date both find a true reading
    assert result["coverage_of_truth"] == 2 / 3


def test_run_holdout_scores_the_true_reading_against_one():
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    true_preds = {p["event_id"]: p for p in result["predictions"] if p["reading"] == "true"}
    assert set(true_preds) == {"confirm", "disputed-date"}
    for p in true_preds.values():
        assert p["observed"] == 1.0
        assert 0.0 <= p["predicted"] <= 1.0


def test_run_holdout_scores_the_wrong_interval_competitor_against_zero():
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    wrong_preds = {p["event_id"]: p for p in result["predictions"] if p["reading"] == "wrong-interval"}
    assert set(wrong_preds) == {"confirm", "disputed-date"}
    for p in wrong_preds.values():
        assert p["observed"] == 0.0


def test_run_holdout_uncovered_event_contributes_no_prediction():
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert all(p["event_id"] != "uncovered" for p in result["predictions"])


def test_run_holdout_brier_score_is_well_formed():
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert result["brier_score"] is not None
    assert 0.0 <= result["brier_score"] <= 1.0
    assert len(result["predictions"]) == 4  # true + wrong-interval for each of 2 covered events


def test_run_holdout_partial_target_slots_match_on_present_slots_only():
    # A held-out event naming only its actor should still match a
    # pre-cutoff candidate that agrees on the actor alone.
    corpus = _calib_corpus()
    corpus.ground_truth.append(GroundTruthEvent(id="partial", label="loosely specified", year=1918, doc_id="doc-6", discovery_year=1918))
    corpus.evidence.append(EvidenceItem(
        id="partial", kind=EvidenceKind.TEXTUAL, tier=Tier.T4, source_id="doc-6",
        span=_span("doc-6"), provenance="test", actor="planck",
    ))
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert any(p["event_id"] == "partial" and p["reading"] == "true" for p in result["predictions"])


def test_run_holdout_no_ground_truth_events_at_all_is_well_formed():
    vocab = _calib_vocab()
    corpus = Corpus(sources={}, evidence=[], ground_truth=[], provenance=[], vocab=vocab)
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert result["n_holdout_events"] == 0
    assert result["n_covered_events"] == 0
    assert result["coverage_of_truth"] is None
    assert result["brier_score"] is None


def test_fit_constants_returns_best_and_all_results():
    corpus = _calib_corpus()
    grid = {"W": [1.0, 2.0, 4.0], "lam": [0.25, 0.5]}
    fit = calibrate.fit_constants(corpus, grid, cutoff_years=1910)
    assert fit["best"] is not None
    assert len(fit["results"]) == 3 * 2 * 1  # W x lam x default tier_scale
    assert fit["results"][0]["brier_score"] <= fit["results"][-1]["brier_score"]


def test_fit_constants_excludes_mu_from_grid():
    corpus = _calib_corpus()
    fit = calibrate.fit_constants(corpus, {"W": [2.0]}, cutoff_years=1910)
    assert "mu" not in fit["best"]


def test_write_calibration_produces_files(tmp_path):
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    calibrate.write_calibration(result, tmp_path)
    assert (tmp_path / "calibration.json").is_file()
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "Brier score" in md
    assert "Held-out events" in md
    assert "confirm" in md


# --------------------------------------------------------------------------
# coverage_note: a stated explanation when coverage_of_truth is low
# --------------------------------------------------------------------------


def _zero_coverage_corpus() -> Corpus:
    """A corpus with exactly one held-out event, dated well after cutoff,
    naming an actor no pre-cutoff evidence ever names: `coverage_of_truth`
    comes out `0.0`, the same structural shape (`discovery_year == year`
    for every event, no actor recurrence across the cutoff) the shipped
    quantum-history corpus has at scale."""
    vocab = _calib_vocab()
    evidence = [
        EvidenceItem(id="planck-early", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="doc-1",
                     span=_span("doc-1"), provenance="test",
                     interval=Interval(1895, 1905), **_PLANCK_SLOTS),
        EvidenceItem(id="uncovered", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-5",
                     span=_span("doc-5"), provenance="test",
                     actor="einstein", action="proposed", object="relativity", place="zurich",
                     mechanism="relativity-mech"),
    ]
    ground_truth = [
        GroundTruthEvent(id="planck-early", label="Planck's own account", year=1900, doc_id="doc-1", discovery_year=1900),
        GroundTruthEvent(id="uncovered", label="An unrelated later event", year=1980, doc_id="doc-5", discovery_year=1980),
    ]
    return Corpus(sources={}, evidence=evidence, ground_truth=ground_truth, provenance=[], vocab=vocab)


def test_low_coverage_note_present_and_explains_discovery_year():
    corpus = _zero_coverage_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert result["coverage_of_truth"] == 0.0
    assert result["coverage_note"] is not None
    assert "discovery_year" in result["coverage_note"]


def test_high_coverage_has_no_note():
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert result["coverage_of_truth"] >= 0.5
    assert result["coverage_note"] is None


def test_write_calibration_includes_why_coverage_is_low_when_present(tmp_path):
    corpus = _zero_coverage_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    calibrate.write_calibration(result, tmp_path)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "## Why coverage is low" in md


def test_write_calibration_omits_the_heading_when_coverage_is_high(tmp_path):
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    calibrate.write_calibration(result, tmp_path)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "## Why coverage is low" not in md
