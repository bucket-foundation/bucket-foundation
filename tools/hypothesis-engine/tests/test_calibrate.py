import pytest

from hte import calibrate, diagnostics, synth
from hte.belief import Constants
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus, GroundTruthEvent, fixtures, literature, production
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


def test_candidate_key_dedupes_on_exact_interval_not_address_alone():
    """`_candidate_key`'s own root-cause fix (`bkt-hte-generation-
    coverage`): two pre-cutoff items sharing every concept slot, whose
    intervals both START in 1900 (so `Hypothesis.address`, keyed off
    `interval.start`'s own time bin, is identical for both), one narrow
    (`[1900, 1900]`) and one wide (`[1900, 1990]`). Confirms the
    collision precondition directly first (same address, distinct
    `_candidate_key`), the way `_candidate_key`'s own docstring
    describes the bug it closes."""
    vocab = _calib_vocab()
    narrow = EvidenceItem(id="narrow", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-narrow",
                           span=_span("doc-narrow"), provenance="test",
                           interval=Interval(1900, 1900), **_PLANCK_SLOTS)
    wide = EvidenceItem(id="wide", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-wide",
                         span=_span("doc-wide"), provenance="test",
                         interval=Interval(1900, 1990), **_PLANCK_SLOTS)
    hyp_narrow = calibrate._placement_from_item(narrow, vocab)
    hyp_wide = calibrate._placement_from_item(wide, vocab)
    assert hyp_narrow.address == hyp_wide.address, "same concept slots, same interval.start: must collide on address"
    assert calibrate._candidate_key(hyp_narrow) != calibrate._candidate_key(hyp_wide), "different exact intervals: must not collide on the dedup key"


def test_run_holdout_covers_an_event_only_the_wider_of_two_same_address_candidates_reaches():
    """The outcome the `_candidate_key` fix protects, not just the key
    itself: two pre-cutoff items share an address (see the isolated
    test above) but one is narrow (`[1900, 1900]`) and the other wide
    (`[1900, 1990]`). A held-out event dated 1985 sits inside the wide
    interval's own reach and past the narrow interval's own end, so it
    is covered if and only if the wide candidate survived the dedup.
    `dict.setdefault` on address alone (this module's own shape before
    the fix) keeps whichever candidate is built first from `corpus.
    evidence`'s own list order, `narrow` here, and silently drops
    `wide`; with `wide` gone, nothing pre-cutoff reaches 1985 and this
    event reads uncovered. This is `run_holdout`'s own candidate-
    building loop, the identical one `holdout_kfold` runs per fold."""
    vocab = _calib_vocab()
    narrow = EvidenceItem(id="narrow", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-narrow",
                           span=_span("doc-narrow"), provenance="test",
                           interval=Interval(1900, 1900), **_PLANCK_SLOTS)
    wide = EvidenceItem(id="wide", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-wide",
                         span=_span("doc-wide"), provenance="test",
                         interval=Interval(1900, 1990), **_PLANCK_SLOTS)
    target = EvidenceItem(id="target", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-target",
                           span=_span("doc-target"), provenance="test", **_PLANCK_SLOTS)
    ground_truth = [
        GroundTruthEvent(id="narrow", label="narrow-interval source", year=1900, doc_id="doc-narrow", discovery_year=1900),
        GroundTruthEvent(id="wide", label="wide-interval source", year=1900, doc_id="doc-wide", discovery_year=1900),
        GroundTruthEvent(id="target", label="reachable only through the wide interval", year=1985, doc_id="doc-target", discovery_year=1985),
    ]
    corpus = Corpus(sources={}, evidence=[narrow, wide, target], ground_truth=ground_truth, provenance=[], vocab=vocab)

    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1950)
    assert result["n_holdout_events"] == 1
    assert result["n_covered_events"] == 1, "the wide candidate must survive the dedup to cover 1985"
    assert any(p["event_id"] == "target" and p["reading"] == "true" for p in result["predictions"])


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


# --------------------------------------------------------------------------
# corpus_name: the note (and CALIBRATION.md itself) name the corpus at
# hand instead of printing a hardcoded worked example measured against
# one shipped corpus and reused unchanged for every other one
# (bkt-hte-calibration-note regression).
# --------------------------------------------------------------------------

# The exact example content the earlier `_low_coverage_note` hardcoded,
# regardless of which corpus a caller ran: three named actors and two
# counts measured once against `quantum-history` alone. None of these
# strings should ever appear in a generated note again, no matter which
# corpus produced it.
_HARDCODED_EXAMPLE_STRINGS = ("IBM Quantum", "Feynman and Deutsch", "Peter Shor", "16 cards")


def test_low_coverage_note_names_the_given_corpus():
    corpus = _zero_coverage_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910, corpus_name="my-corpus")
    assert "my-corpus" in result["coverage_note"]


def test_low_coverage_note_defaults_to_a_generic_name_with_no_corpus_name_given():
    corpus = _zero_coverage_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    assert "this corpus" in result["coverage_note"]


def test_low_coverage_note_carries_none_of_the_old_hardcoded_worked_example():
    corpus = _zero_coverage_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910, corpus_name="my-corpus")
    for bad in _HARDCODED_EXAMPLE_STRINGS:
        assert bad not in result["coverage_note"]


def test_low_coverage_note_counts_scale_with_the_corpus_passed_in():
    # A second, differently-shaped zero-coverage corpus (three held-out
    # events instead of one) prints its own counts here, proving the
    # note reads `corpus`/`n_holdout` at call time rather than a number
    # baked in at write time.
    vocab = _calib_vocab()
    evidence = [
        EvidenceItem(id="a", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="doc-a",
                     span=_span("doc-a"), provenance="test", interval=Interval(1900, 1900), **_PLANCK_SLOTS),
    ]
    ground_truth = [
        GroundTruthEvent(id="a", label="a", year=1900, doc_id="doc-a", discovery_year=1900),
        GroundTruthEvent(id="b", label="b", year=1980, doc_id="doc-b", discovery_year=1980),
        GroundTruthEvent(id="c", label="c", year=1981, doc_id="doc-c", discovery_year=1981),
        GroundTruthEvent(id="d", label="d", year=1982, doc_id="doc-d", discovery_year=1982),
    ]
    corpus = Corpus(sources={}, evidence=evidence, ground_truth=ground_truth, provenance=[], vocab=vocab)
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910, corpus_name="wide-corpus")
    assert result["n_holdout_events"] == 3
    assert "0 of 3" in result["coverage_note"]
    assert "wide-corpus" in result["coverage_note"]


def test_write_calibration_always_names_the_corpus_regardless_of_coverage(tmp_path):
    for corpus, cov_dir in ((_zero_coverage_corpus(), "low"), (_calib_corpus(), "high")):
        result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910, corpus_name="named-corpus")
        out = tmp_path / cov_dir
        calibrate.write_calibration(result, out)
        md = (out / "CALIBRATION.md").read_text()
        assert "Corpus: named-corpus" in md


def test_write_calibration_names_a_generic_corpus_when_the_caller_named_none(tmp_path):
    result = calibrate.run_holdout(_zero_coverage_corpus(), Constants(), cutoff_years=1910)
    calibrate.write_calibration(result, tmp_path)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "Corpus: this corpus" in md


def test_write_calibration_with_a_diagnostics_report_appends_the_reason_breakdown(tmp_path):
    corpus = _zero_coverage_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910, corpus_name="diag-corpus")
    result.setdefault("mode", "discovery_date")
    report = diagnostics.coverage_report(corpus, result)
    calibrate.write_calibration(result, tmp_path, diagnostics_report=report)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "--diagnose" in md
    # The corpus's own held-out event ("uncovered") is named with its
    # classified reason (`slot_mismatch`: the closest candidate shares
    # the event's own time window but disagrees on a concept slot).
    assert "uncovered (slot_mismatch)" in md


def test_write_calibration_diagnostics_report_shows_even_with_no_coverage_note(tmp_path):
    # `holdout_kfold` hardcodes `coverage_note` to `None` (it needs no
    # discovery date at all, so `_low_coverage_note`'s own stated cause
    # does not apply); a `diagnostics_report` must still surface under
    # "## Why coverage is low" in that case, since there is still
    # something to report about the uncovered remainder.
    corpus = _zero_coverage_corpus()
    result = calibrate.holdout_kfold(corpus, Constants(), k=2, seed=0, corpus_name="kfold-corpus")
    assert result["coverage_note"] is None
    report = diagnostics.coverage_report(corpus, result)
    calibrate.write_calibration(result, tmp_path, diagnostics_report=report)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "## Why coverage is low" in md
    assert "--diagnose" in md


# --------------------------------------------------------------------------
# Regression: a low-coverage note (and CALIBRATION.md as a whole) must
# never leak `quantum-history`'s own facts into another corpus's own run
# (the reported defect, found while building the Younger Dryas corpus).
# Fixtures, production, and literature are the three corpora `hte.cli`
# registers that need no network and no live LLM call to load.
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "corpus_name, corpus",
    [
        ("fixtures", fixtures.build()),
        ("production", production.load()),
        ("literature", literature.load_default()),
    ],
)
def test_calibration_md_names_its_own_corpus_and_never_mentions_quantum(corpus_name, corpus, tmp_path):
    result = calibrate.run_calibration(corpus, Constants(), corpus_name=corpus_name)
    calibrate.write_calibration(result, tmp_path / corpus_name)
    md = (tmp_path / corpus_name / "CALIBRATION.md").read_text()
    assert f"Corpus: {corpus_name}" in md
    assert "quantum" not in md.lower()


# --------------------------------------------------------------------------
# holdout_kfold / choose_holdout_mode / run_calibration
# (`bkt-hte-calibration-redesign`)
#
# `_calib_corpus()` (above) sets `discovery_year == year` for every one of
# its 5 events, the same structural shape quantum-history, education-atlas,
# `hte.corpus.fixtures`, and every `hte.synth` world share, so it doubles
# as the k-fold fixture here: `choose_holdout_mode` must read it as
# "kfold", the same read `run_calibration`/`fit_constants` fall back to
# when no `cutoff_years` is given.
# --------------------------------------------------------------------------


def _lagged_corpus() -> Corpus:
    """A corpus with a real discovery lag on at least one event, the
    shape `hte.corpus.production` ships: `choose_holdout_mode` must read
    this one as `"discovery_date"`."""
    corpus = _calib_corpus()
    lagged = corpus.ground_truth[0]
    corpus.ground_truth[0] = GroundTruthEvent(
        id=lagged.id, label=lagged.label, year=lagged.year, doc_id=lagged.doc_id,
        discovery_year=lagged.year + 20,
    )
    return corpus


def test_choose_holdout_mode_is_kfold_when_every_event_has_no_discovery_lag():
    mode, reason = calibrate.choose_holdout_mode(_calib_corpus())
    assert mode == "kfold"
    assert "discovery_year == year" in reason


def test_choose_holdout_mode_is_discovery_date_when_an_event_is_lagged():
    mode, reason = calibrate.choose_holdout_mode(_lagged_corpus())
    assert mode == "discovery_date"
    assert "discovery lag" in reason


def test_choose_holdout_mode_is_kfold_with_no_ground_truth_at_all():
    vocab = _calib_vocab()
    corpus = Corpus(sources={}, evidence=[], ground_truth=[], provenance=[], vocab=vocab)
    mode, reason = calibrate.choose_holdout_mode(corpus)
    assert mode == "kfold"
    assert "no ground-truth events" in reason


def test_holdout_kfold_targets_every_event_across_folds_exactly_once():
    # 5 evidence items, k=5: stratified round-robin (one kind) deals
    # exactly one item per fold, so every ground-truth event is the
    # held-out target of exactly one fold.
    corpus = _calib_corpus()
    result = calibrate.holdout_kfold(corpus, Constants(), k=5, seed=0)
    assert sum(f["n_holdout_events"] for f in result["folds"]) == len(corpus.ground_truth)
    assert result["n_holdout_events"] == len(corpus.ground_truth)


def test_holdout_kfold_shape_matches_run_holdout_for_write_calibration():
    corpus = _calib_corpus()
    result = calibrate.holdout_kfold(corpus, Constants(), k=5, seed=0)
    for key in ("cutoff_years", "n_holdout_events", "n_covered_events", "coverage_of_truth",
                "coverage_note", "brier_score", "calibration_curve", "predictions", "constants"):
        assert key in result
    assert result["cutoff_years"] is None
    assert result["mode"] == "kfold"
    assert len(result["folds"]) == 5


def test_holdout_kfold_is_deterministic_for_a_fixed_seed():
    corpus = _calib_corpus()
    a = calibrate.holdout_kfold(corpus, Constants(), k=5, seed=3)
    b = calibrate.holdout_kfold(corpus, Constants(), k=5, seed=3)
    assert a["coverage_of_truth"] == b["coverage_of_truth"]
    assert a["predictions"] == b["predictions"]


def test_holdout_kfold_does_not_mutate_the_corpus_evidence_links():
    # `link_evidence` runs against deep copies per fold; the caller's own
    # `corpus.evidence` must come back with `supports`/`refutes` exactly
    # as it went in.
    corpus = _calib_corpus()
    before = [(e.id, list(e.supports), list(e.refutes)) for e in corpus.evidence]
    calibrate.holdout_kfold(corpus, Constants(), k=5, seed=0)
    after = [(e.id, list(e.supports), list(e.refutes)) for e in corpus.evidence]
    assert before == after


def test_run_calibration_picks_kfold_and_sets_mode_fields():
    corpus = _calib_corpus()
    result = calibrate.run_calibration(corpus, Constants(), k=5, seed=0)
    assert result["mode"] == "kfold"
    assert result["mode_reason"]
    assert result["brier_score"] is not None


def test_run_calibration_picks_discovery_date_and_honors_an_explicit_cutoff():
    corpus = _lagged_corpus()
    result = calibrate.run_calibration(corpus, Constants(), cutoff_years=1910)
    assert result["mode"] == "discovery_date"
    assert result["cutoff_years"] == 1910


def test_fit_constants_without_cutoff_years_uses_the_auto_picked_mode():
    corpus = _calib_corpus()
    fit = calibrate.fit_constants(corpus, {"W": [1.0, 2.0]})
    assert fit["best"] is not None
    assert len(fit["results"]) == 2


def test_write_calibration_reports_mode_and_reason(tmp_path):
    corpus = _calib_corpus()
    result = calibrate.run_calibration(corpus, Constants(), k=5, seed=0)
    calibrate.write_calibration(result, tmp_path)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "Mode: kfold" in md
    assert "Reason:" in md
    assert "## Per-fold" in md


def test_write_calibration_omits_mode_line_for_a_bare_run_holdout_result(tmp_path):
    corpus = _calib_corpus()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1910)
    calibrate.write_calibration(result, tmp_path)
    md = (tmp_path / "CALIBRATION.md").read_text()
    assert "Mode:" not in md
    assert "## Per-fold" not in md


# --------------------------------------------------------------------------
# k-fold coverage on `hte.synth` worlds with known planted truth
# --------------------------------------------------------------------------


def test_holdout_kfold_coverage_on_synthetic_worlds_is_at_least_0_8():
    """`bkt-hte-calibration-redesign`'s own validation bar: mean
    `coverage_of_truth` across a batch of `hte.synth` small worlds
    (planted truth, `hte.synth.make_small_world`) must clear `0.8`. No
    LLM call is needed, `holdout_kfold` runs only `hte.generate.
    from_evidence`/`hte.link.link_evidence`/`hte.belief.score`."""
    coverages = []
    for seed in range(10):
        world = synth.make_small_world(seed)
        result = calibrate.holdout_kfold(world.corpus, Constants(), k=5, seed=seed)
        assert result["coverage_of_truth"] is not None
        coverages.append(result["coverage_of_truth"])
    mean_coverage = sum(coverages) / len(coverages)
    assert mean_coverage >= 0.8, f"mean k-fold coverage_of_truth {mean_coverage} over seeds 0-9 fell below 0.8: {coverages}"


# --------------------------------------------------------------------------
# pooled coordinate-descent fit (docs/CALIBRATION-FIT-2026-09-10.md)
# --------------------------------------------------------------------------


def _pooled_corpora():
    """A cheap stand-in for `build_pooled_fit_corpora`'s own real-corpus
    pool: three `hte.synth` small worlds plus `_calib_corpus()`, small
    enough to run several `fit_constants_pooled` sweeps in well under a
    second, unlike a real `hte.corpus.education_atlas.load()` pull (see
    `build_pooled_fit_corpora`'s own docstring for why that corpus is
    itself pre-subsampled for exactly this reason)."""
    corpora = {f"synth-{s}": synth.make_small_world(s).corpus for s in range(3)}
    corpora["hand-built"] = _calib_corpus()
    return corpora


def test_evaluate_pooled_reports_one_row_per_corpus():
    corpora = _pooled_corpora()
    result = calibrate.evaluate_pooled(corpora, calibrate._default_fit_vector())
    assert {row["name"] for row in result["per_corpus"]} == set(corpora)
    assert result["mean_brier"] is not None
    assert result["penalty"] == 0.0  # no coverage_targets passed


def test_evaluate_pooled_penalizes_coverage_below_target():
    corpora = _pooled_corpora()
    vector = calibrate._default_fit_vector()
    no_targets = calibrate.evaluate_pooled(corpora, vector)
    # an unreachable target (1.1, above any possible coverage_of_truth)
    # on every corpus guarantees the penalty fires for every one of them.
    targets = {name: 1.1 for name in corpora}
    with_targets = calibrate.evaluate_pooled(corpora, vector, coverage_targets=targets)
    assert with_targets["penalty"] > no_targets["penalty"]
    assert with_targets["loss"] > no_targets["loss"]
    assert with_targets["mean_brier"] == no_targets["mean_brier"]  # penalty adds on top, leaving mean_brier untouched


def test_evaluate_pooled_zero_penalty_when_targets_already_met():
    corpora = _pooled_corpora()
    vector = calibrate._default_fit_vector()
    targets = {name: 0.0 for name in corpora}  # trivially met by any coverage >= 0
    result = calibrate.evaluate_pooled(corpora, vector, coverage_targets=targets)
    assert result["penalty"] == 0.0


def test_fit_constants_pooled_never_returns_a_worse_loss_than_the_baseline():
    corpora = _pooled_corpora()
    result = calibrate.fit_constants_pooled(corpora, passes=1)
    baseline = result["history"][0]
    assert baseline["vector"] == calibrate._default_fit_vector()
    assert result["best"]["loss"] <= baseline["loss"]


def test_fit_constants_pooled_history_includes_the_baseline_first():
    corpora = _pooled_corpora()
    result = calibrate.fit_constants_pooled(corpora, passes=1)
    assert result["history"][0]["vector"] == calibrate._default_fit_vector()


def test_fit_constants_pooled_stops_early_with_no_improving_step():
    # A corpus set with no evidence at all: `evaluate_pooled`'s own
    # `mean_brier` is always `None` (no fold ever covers anything), so
    # `loss` reads the same `1.0` fallback for every candidate vector and
    # no step ever improves on the baseline; the search should stop after
    # its first pass rather than a caller having to notice `history`'s own
    # length stopped growing.
    empty_corpus = Corpus(sources={}, evidence=[], ground_truth=[], provenance=[], vocab=_calib_vocab())
    result = calibrate.fit_constants_pooled({"empty": empty_corpus}, passes=5)
    assert result["passes_run"] == 1
    assert result["best"]["vector"] == calibrate._default_fit_vector()


def test_fit_constants_pooled_respects_a_custom_start_vector():
    corpora = _pooled_corpora()
    start = {"W": 5.0, "lam": 1.0, "mu": 0.5, "alpha": 1.0, "tier_scale": 1.0, "detectability_floor": 0.0}
    result = calibrate.fit_constants_pooled(corpora, passes=1, start=start)
    assert result["history"][0]["vector"] == start


def test_fit_constants_pooled_respects_parameter_bounds():
    corpora = _pooled_corpora()
    result = calibrate.fit_constants_pooled(corpora, passes=2)
    for row in result["history"]:
        for name, value in row["vector"].items():
            lo, hi = calibrate._FIT_PARAM_BOUNDS[name]
            assert lo <= value <= hi


def test_vector_to_constants_scales_every_tier_weight_by_tier_scale():
    from hte.belief import TIER_WEIGHT
    from hte.evidence import Tier

    vector = calibrate._default_fit_vector()
    vector["tier_scale"] = 2.0
    constants = calibrate._vector_to_constants(vector)
    for tier in Tier:
        assert constants.tier_weight[tier] == pytest.approx(TIER_WEIGHT[tier] * 2.0)


def test_build_pooled_fit_corpora_returns_synth_and_four_real_corpora():
    corpora, coverage_targets = calibrate.build_pooled_fit_corpora(synth_seeds=range(2))
    assert set(corpora) == {"synth-0", "synth-1", "quantum-history", "production", "education-atlas", "literature"}
    assert set(coverage_targets) == {"synth-0", "synth-1"}
    assert all(v == calibrate.DEFAULT_MIN_SYNTH_COVERAGE for v in coverage_targets.values())
    for corpus in corpora.values():
        assert corpus.evidence  # every one of the six carries evidence to fit against
