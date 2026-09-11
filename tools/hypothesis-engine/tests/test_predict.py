"""Tests for `hte.predict`: the prediction register and its resolution.

Builds its own tiny run directory by hand (`hte.artifacts`'s own
`MANIFEST.json`/`timeline.json` contract), the same pattern `tests/
test_canon_writeback.py`'s `linking_run` fixture uses, over `hte.corpus.
fixtures`'s seed vocabulary: no LLM call, no network, `HTE_LLM_MODE`
never read.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from hte import predict
from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.corpus import Corpus, fixtures
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import AllenRelation, Interval

TBIN_A = 219
TBIN_B = 220
START_A = DEFAULT_SPAN_START + TBIN_A * DEFAULT_BIN_WIDTH
START_B = DEFAULT_SPAN_START + TBIN_B * DEFAULT_BIN_WIDTH
INTERVAL_A = Interval(start=START_A, end=START_A + DEFAULT_BIN_WIDTH - 1)
INTERVAL_B = Interval(start=START_B, end=START_B + DEFAULT_BIN_WIDTH - 1)

MADE_AT = "2026-01-01T00:00:00+00:00"


def _predict_corpus() -> Corpus:
    """`hte.corpus.fixtures`'s own vocabulary, with one fully-slotted
    evidence item (examines `h_examined` below, keeping its own `u`
    under `floor_u`) and one item naming only `ACTOR` (a real value,
    `alpha-team`, so it links to `h_examined` too rather than sitting
    inert), leaving `ACTION`/`OBJECT`/`PLACE`/`MECHANISM` unresolved for
    `hte.unknowns.unresolved_slot_gaps` to find."""
    base = fixtures.build()
    examined = EvidenceItem(
        id="ev-examined", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l1", quote="alpha team sighted comet q", char_start=0, char_end=10),
        provenance="test-fixture",
        actor="alpha-team", action="sighted", object="comet-q", place="alpha-observatory", mechanism="transit-timing-method",
        interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    gap = EvidenceItem(
        id="ev-gap", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l2", quote="alpha team did something else", char_start=10, char_end=20),
        provenance="test-fixture", actor="alpha-team", interval=INTERVAL_B, stance=Stance.POSITIVE,
    )
    return Corpus(
        sources={"src-1": Source(id="src-1", kind=EvidenceKind.TEXTUAL)},
        evidence=[examined, gap], ground_truth=[], provenance=[], vocab=base.vocab,
    )


def _placement(actor, action, obj, place, mechanism, interval) -> Placement:
    return Placement(actor=actor, action=action, object=obj, place=place, mechanism=mechanism, interval=interval)


def _hyp(placement: Placement, vocab) -> Hypothesis:
    return Hypothesis.from_placement(placement, vocab)


# One (Hypothesis, slots, time_bin_index, bin_label, elo) row per
# survivor `_write_run` persists. `h_unexamined_1`/`h_unexamined_3` both
# carry a real positive prior (high `P`, fully unexamined, `u = 1.0`);
# `test_resolve_scores_attested_low_and_refuted_high_brier` attests one
# and refutes the other, so a confident claim scores low Brier when
# right and high Brier when wrong, rather than both landing low because
# the underlying prior itself was already skeptical.
def _rows(h_examined, h_unexamined_1, h_unexamined_2, h_unexamined_3):
    return [
        (h_examined, {"ACTOR": "alpha-team", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, TBIN_A, 1550.0),
        (h_unexamined_1, {"ACTOR": "beta-team", "ACTION": "extended", "OBJECT": "comet-q", "PLACE": "beta-observatory", "MECHANISM": "photometric-method"}, TBIN_A, 1500.0),
        (h_unexamined_3, {"ACTOR": "beta-team", "ACTION": "extended", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, TBIN_A, 1490.0),
        (h_unexamined_2, {"ACTOR": "unverified-observer", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "photometric-method"}, TBIN_B, 1480.0),
    ]


def _write_run(run_dir: Path, h_examined: Hypothesis, h_unexamined_1: Hypothesis, h_unexamined_2: Hypothesis, h_unexamined_3: Hypothesis, *, timestamp: str = "20260101T000000Z") -> None:
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": "test-predict", "timestamp": timestamp, "corpus": "test-predict-corpus",
        "run_artifact_version": "1.0.0",
        "time_binning": {"span_start": DEFAULT_SPAN_START, "bin_width": DEFAULT_BIN_WIDTH},
        "config": {"link_threshold": 0.6},
        "counts": {"vocab_added": [], "coverage": {"missing_mass": 0.2}},
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    bins: dict[int, list[dict]] = {}
    for h, slots, tbin, elo in _rows(h_examined, h_unexamined_1, h_unexamined_2, h_unexamined_3):
        bins.setdefault(tbin, []).append({"hypothesis_id": h.short_id, "address": h.address, "slots": slots, "posterior": None, "elo": elo})
    timeline = {
        "bins": [{"time_bin": {"index": tbin, "label": f"bin-{tbin}"}, "ranked_hypotheses": rows} for tbin, rows in sorted(bins.items())],
        "event_views": [], "pair_views": [],
    }
    (run_dir / "timeline.json").write_text(json.dumps(timeline))


@pytest.fixture()
def synth_run(tmp_path, monkeypatch):
    corpus = _predict_corpus()
    monkeypatch.setitem(predict._CORPUS_LOADERS, "test-predict-corpus", lambda: _predict_corpus())

    h_examined = _hyp(_placement("alpha-team", "sighted", "comet-q", "alpha-observatory", "transit-timing-method", INTERVAL_A), corpus.vocab)
    h_unexamined_1 = _hyp(_placement("beta-team", "extended", "comet-q", "beta-observatory", "photometric-method", INTERVAL_A), corpus.vocab)
    h_unexamined_2 = _hyp(_placement("unverified-observer", "sighted", "comet-q", "alpha-observatory", "photometric-method", INTERVAL_B), corpus.vocab)
    h_unexamined_3 = _hyp(_placement("beta-team", "extended", "comet-q", "alpha-observatory", "transit-timing-method", INTERVAL_A), corpus.vocab)

    run_dir = tmp_path / "runs" / "test-predict" / "20260101T000000Z"
    _write_run(run_dir, h_examined, h_unexamined_1, h_unexamined_2, h_unexamined_3)
    return {
        "run_dir": run_dir, "out": tmp_path / "predictions", "feed_root": tmp_path / "feed-root",
        "h_examined": h_examined, "h_unexamined_1": h_unexamined_1,
        "h_unexamined_2": h_unexamined_2, "h_unexamined_3": h_unexamined_3,
    }


def _register(ctx, **kw):
    return predict.register(
        ctx["run_dir"], horizon=365, out=ctx["out"], feed_root=ctx["feed_root"], made_at=MADE_AT, **kw,
    )


# --------------------------------------------------------------------------
# register
# --------------------------------------------------------------------------


def test_register_yields_all_three_kinds_with_well_formed_envelopes(synth_run):
    predictions = _register(synth_run)
    kinds = {p.kind for p in predictions}
    assert kinds == {"claim", "discovery", "sequence"}

    for p in predictions:
        assert p.id
        assert p.run_id == "test-predict-20260101T000000Z"
        assert p.made_at == MADE_AT
        assert p.resolves_at == (datetime.fromisoformat(MADE_AT) + timedelta(days=365)).isoformat()
        assert 0.0 <= p.P <= 1.0
        assert 0.0 <= p.u <= 1.0
        assert 0.0 <= p.a <= 1.0
        env = p.envelope
        assert env["version"] == "bucket.foundation/v0.1"
        assert env["citation"]["type"] == "prediction"
        assert env["agent_action_required"] is False
        assert env["payment_required_from_you"] is False
        assert env["cite"]["reader_owes"] == 0
        assert env["receipt"]["price_usd"] == 0
        assert env["receipt"]["status"] == "forecast_registered_not_yet_resolved"


def test_claim_predictions_only_keep_hypotheses_above_the_uncertainty_floor(synth_run):
    predictions = _register(synth_run)
    claims = [p for p in predictions if p.kind == "claim"]
    claim_addresses = {p.meta["address"] for p in claims}
    assert synth_run["h_unexamined_1"].address in claim_addresses
    assert synth_run["h_unexamined_2"].address in claim_addresses
    assert synth_run["h_examined"].address not in claim_addresses
    for p in claims:
        assert p.u >= predict.DEFAULT_FLOOR_U


def test_discovery_prediction_names_the_gaps_own_evidence_item(synth_run):
    predictions = _register(synth_run)
    discoveries = [p for p in predictions if p.kind == "discovery"]
    assert len(discoveries) == 1
    d = discoveries[0]
    assert d.meta["origin_evidence_id"] == "ev-gap"
    assert set(d.meta["unresolved_slots"]) == {"action", "object", "place", "mechanism"}
    assert d.meta["evidence_kind"] == "textual"
    assert d.evidence_ids == ["ev-gap"]


def test_sequence_prediction_names_an_allen_relation_between_two_members(synth_run):
    predictions = _register(synth_run)
    sequences = [p for p in predictions if p.kind == "sequence"]
    assert sequences
    for p in sequences:
        assert p.meta["relation"] in {r.value for r in AllenRelation}
        assert "first" in p.meta and "second" in p.meta


def test_ledger_is_append_only_across_two_register_calls(synth_run):
    first = _register(synth_run)
    ledger_path = synth_run["out"] / "ledger.jsonl"
    lines_after_first = ledger_path.read_text().splitlines()

    # A second run directory (a distinct campaign timestamp) registered
    # into the SAME ledger must never alter the first call's own lines.
    run_dir_2 = synth_run["run_dir"].parent / "20260102T000000Z"
    corpus = _predict_corpus()
    h_examined = _hyp(_placement("alpha-team", "sighted", "comet-q", "alpha-observatory", "transit-timing-method", INTERVAL_A), corpus.vocab)
    h1 = _hyp(_placement("beta-team", "extended", "comet-q", "beta-observatory", "photometric-method", INTERVAL_A), corpus.vocab)
    h2 = _hyp(_placement("unverified-observer", "sighted", "comet-q", "alpha-observatory", "photometric-method", INTERVAL_B), corpus.vocab)
    h3 = _hyp(_placement("beta-team", "extended", "comet-q", "alpha-observatory", "transit-timing-method", INTERVAL_A), corpus.vocab)
    _write_run(run_dir_2, h_examined, h1, h2, h3, timestamp="20260102T000000Z")

    second = predict.register(
        run_dir_2, horizon=365, out=synth_run["out"], feed_root=synth_run["feed_root"], made_at=MADE_AT,
    )
    lines_after_second = ledger_path.read_text().splitlines()

    assert lines_after_second[:len(lines_after_first)] == lines_after_first
    assert len(lines_after_second) > len(lines_after_first)
    assert first and second


def test_register_is_deterministic_under_a_fixed_made_at(synth_run):
    out_a = synth_run["out"]
    out_b = synth_run["feed_root"].parent / "predictions-b"
    preds_a = predict.register(synth_run["run_dir"], horizon=365, out=out_a, feed_root=synth_run["feed_root"], made_at=MADE_AT)
    preds_b = predict.register(synth_run["run_dir"], horizon=365, out=out_b, feed_root=synth_run["feed_root"].parent / "feed-b", made_at=MADE_AT)

    to_dict_sorted = lambda preds: sorted((p.to_dict() for p in preds), key=lambda d: d["id"])
    assert to_dict_sorted(preds_a) == to_dict_sorted(preds_b)


def test_ledger_carries_no_absolute_paths(synth_run):
    _register(synth_run)
    ledger_text = (synth_run["out"] / "ledger.jsonl").read_text()
    assert str(synth_run["run_dir"]) not in ledger_text
    assert str(synth_run["out"]) not in ledger_text
    for line in ledger_text.splitlines():
        blob = json.dumps(json.loads(line))
        assert not blob.startswith('"/') and "/tmp/" not in blob and str(Path.cwd()) not in blob


# --------------------------------------------------------------------------
# resolve
# --------------------------------------------------------------------------


def _resolves_at(predictions, kind, **meta_filters):
    for p in predictions:
        if p.kind != kind:
            continue
        if all(p.meta.get(k) == v for k, v in meta_filters.items()):
            return p
    raise AssertionError(f"no {kind} prediction matching {meta_filters}")


def test_unresolved_stays_unresolved_before_the_resolution_date(synth_run):
    predictions = _register(synth_run)
    corpus = _predict_corpus()
    as_of_early = (datetime.fromisoformat(MADE_AT) + timedelta(days=1)).isoformat()
    report = predict.resolve(predictions, evidence_corpus=corpus, as_of=as_of_early, out=synth_run["out"])
    assert report.n_unresolved == report.n_total
    assert report.n_attested == 0
    assert report.n_refuted == 0
    assert report.brier is None


def test_resolve_scores_attested_low_and_refuted_high_brier(synth_run):
    predictions = _register(synth_run)
    # Both `h_unexamined_1` and `h_unexamined_3` carry a real positive
    # prior (`_rows`'s own comment): a confident claim scores low Brier
    # when the planted future evidence attests it, and high Brier when
    # the SAME kind of confident claim is instead refuted.
    claim = _resolves_at(predictions, "claim", address=synth_run["h_unexamined_1"].address)
    other_claim = _resolves_at(predictions, "claim", address=synth_run["h_unexamined_3"].address)
    assert claim.P > 0.6 and other_claim.P > 0.6

    # The planted "future" world: attesting evidence for `claim` (exact
    # slot-and-date match), refuting evidence for `other_claim` (same
    # slots, a disjoint later date).
    attesting = EvidenceItem(
        id="future-attest", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-2", locator="l1", quote="beta team extended comet q", char_start=0, char_end=5),
        provenance="future", actor="beta-team", action="extended", object="comet-q",
        place="beta-observatory", mechanism="photometric-method", interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    later_start = INTERVAL_B.end + DEFAULT_BIN_WIDTH * 5
    refuting = EvidenceItem(
        id="future-refute", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-2", locator="l2", quote="beta team extended comet q again", char_start=6, char_end=12),
        provenance="future", actor="beta-team", action="extended", object="comet-q",
        place="alpha-observatory", mechanism="transit-timing-method",
        interval=Interval(start=later_start, end=later_start + 1), stance=Stance.POSITIVE,
    )
    future_corpus = Corpus(
        sources={"src-1": Source(id="src-1", kind=EvidenceKind.TEXTUAL)},
        evidence=[attesting, refuting], ground_truth=[], provenance=[], vocab=_predict_corpus().vocab,
    )
    as_of_late = predictions[0].resolves_at
    report = predict.resolve(predictions, evidence_corpus=future_corpus, as_of=as_of_late, out=synth_run["out"])

    by_id = {o.prediction_id: o for o in report.outcomes}
    attested_outcome = by_id[claim.id]
    refuted_outcome = by_id[other_claim.id]
    assert attested_outcome.outcome == "attested"
    assert refuted_outcome.outcome == "refuted"
    assert attested_outcome.brier < 0.5
    assert refuted_outcome.brier > 0.5
    assert (synth_run["out"] / "RESOLUTIONS.md").is_file()
    assert len(report.calibration_curve) == 10


def test_resolve_report_writes_resolutions_markdown(synth_run):
    predictions = _register(synth_run)
    as_of_late = predictions[0].resolves_at
    ledger_path = synth_run["out"] / "ledger.jsonl"
    predict.resolve(ledger_path, evidence_corpus=_predict_corpus(), as_of=as_of_late)
    text = (ledger_path.parent / "RESOLUTIONS.md").read_text()
    assert "# Prediction resolutions" in text
    assert "Reliability curve" in text
    assert "Brier over time" in text
