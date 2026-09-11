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
    """`hte.corpus.fixtures`'s own vocabulary, with:

    - `ev-examined`, one full-slot item examining `h_examined` (its own
      `u` drops to ~0.37, `|P - a|` ~0.18, a confident call with room to
      spare over `_CLAIM_CONFIDENCE_MIN`);
    - `ev-sup2`/`ev-sup3`/`ev-sup4`, three independent full-slot items
      (three different `EvidenceKind`s, so `hte.belief.cross_kind_bonus`
      applies) examining `h_confident`, driving its own `u` to ~0.12 and
      `P` to ~0.98, a second, even more confident call;
    - `ev-gap`, naming only `ACTOR`, leaving `ACTION`/`OBJECT`/`PLACE`/
      `MECHANISM` unresolved for `hte.unknowns.unresolved_slot_gaps` to
      find, and linking (weakly) only to `h_examined`, never to either
      vacuous placement or `h_confident`.

    `h_vacuous_1`/`h_vacuous_2` (built in `synth_run` below) match none
    of these items at all, so they stay at `u = 1.0`, `hte.predict`'s own
    unexamined reading."""
    base = fixtures.build()
    examined = EvidenceItem(
        id="ev-examined", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l1", quote="alpha team sighted comet q", char_start=0, char_end=10),
        provenance="test-fixture",
        actor="alpha-team", action="sighted", object="comet-q", place="alpha-observatory", mechanism="transit-timing-method",
        interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    sup2 = EvidenceItem(
        id="ev-sup2", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l3", quote="beta team extended comet q orbit", char_start=20, char_end=30),
        provenance="test-fixture",
        actor="beta-team", action="extended", object="comet-q", place="beta-observatory", mechanism="photometric-method",
        interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    sup3 = EvidenceItem(
        id="ev-sup3", kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l4", quote="beta team extended comet q orbit again", char_start=30, char_end=45),
        provenance="test-fixture",
        actor="beta-team", action="extended", object="comet-q", place="beta-observatory", mechanism="photometric-method",
        interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    sup4 = EvidenceItem(
        id="ev-sup4", kind=EvidenceKind.ASTRONOMICAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l5", quote="beta team extended comet q orbit once more", char_start=45, char_end=60),
        provenance="test-fixture",
        actor="beta-team", action="extended", object="comet-q", place="beta-observatory", mechanism="photometric-method",
        interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    gap = EvidenceItem(
        id="ev-gap", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l2", quote="alpha team did something else", char_start=10, char_end=20),
        provenance="test-fixture", actor="alpha-team", interval=INTERVAL_B, stance=Stance.POSITIVE,
    )
    return Corpus(
        sources={"src-1": Source(id="src-1", kind=EvidenceKind.TEXTUAL)},
        evidence=[examined, sup2, sup3, sup4, gap], ground_truth=[], provenance=[], vocab=base.vocab,
    )


def _placement(actor, action, obj, place, mechanism, interval) -> Placement:
    return Placement(actor=actor, action=action, object=obj, place=place, mechanism=mechanism, interval=interval)


def _hyp(placement: Placement, vocab) -> Hypothesis:
    return Hypothesis.from_placement(placement, vocab)


# One (Hypothesis, slots, time_bin_index, elo) row per survivor
# `_write_run` persists. `h_examined` and `h_confident` are both
# examined and confident (`_predict_corpus`'s own docstring); `h_vacuous_1`/
# `h_vacuous_2` match no evidence at all and stay at `u = 1.0`.
def _rows(h_examined, h_confident, h_vacuous_1, h_vacuous_2):
    return [
        (h_examined, {"ACTOR": "alpha-team", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, TBIN_A, 1550.0),
        (h_confident, {"ACTOR": "beta-team", "ACTION": "extended", "OBJECT": "comet-q", "PLACE": "beta-observatory", "MECHANISM": "photometric-method"}, TBIN_A, 1500.0),
        (h_vacuous_1, {"ACTOR": "beta-team", "ACTION": "extended", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, TBIN_A, 1490.0),
        (h_vacuous_2, {"ACTOR": "unverified-observer", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "photometric-method"}, TBIN_B, 1480.0),
    ]


def _write_run(run_dir: Path, h_examined: Hypothesis, h_confident: Hypothesis, h_vacuous_1: Hypothesis, h_vacuous_2: Hypothesis, *, timestamp: str = "20260101T000000Z") -> None:
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
    for h, slots, tbin, elo in _rows(h_examined, h_confident, h_vacuous_1, h_vacuous_2):
        bins.setdefault(tbin, []).append({"hypothesis_id": h.short_id, "address": h.address, "slots": slots, "posterior": None, "elo": elo})
    timeline = {
        "bins": [{"time_bin": {"index": tbin, "label": f"bin-{tbin}"}, "ranked_hypotheses": rows} for tbin, rows in sorted(bins.items())],
        "event_views": [], "pair_views": [],
    }
    (run_dir / "timeline.json").write_text(json.dumps(timeline))


def _build_placements(corpus: Corpus) -> dict[str, Hypothesis]:
    return {
        "h_examined": _hyp(_placement("alpha-team", "sighted", "comet-q", "alpha-observatory", "transit-timing-method", INTERVAL_A), corpus.vocab),
        "h_confident": _hyp(_placement("beta-team", "extended", "comet-q", "beta-observatory", "photometric-method", INTERVAL_A), corpus.vocab),
        "h_vacuous_1": _hyp(_placement("beta-team", "extended", "comet-q", "alpha-observatory", "transit-timing-method", INTERVAL_A), corpus.vocab),
        "h_vacuous_2": _hyp(_placement("unverified-observer", "sighted", "comet-q", "alpha-observatory", "photometric-method", INTERVAL_B), corpus.vocab),
    }


@pytest.fixture()
def synth_run(tmp_path, monkeypatch):
    corpus = _predict_corpus()
    monkeypatch.setitem(predict._CORPUS_LOADERS, "test-predict-corpus", lambda: _predict_corpus())

    h = _build_placements(corpus)
    run_dir = tmp_path / "runs" / "test-predict" / "20260101T000000Z"
    _write_run(run_dir, h["h_examined"], h["h_confident"], h["h_vacuous_1"], h["h_vacuous_2"])
    return {
        "run_dir": run_dir, "out": tmp_path / "predictions", "feed_root": tmp_path / "feed-root",
        **h,
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


def test_claim_predictions_keep_only_confident_examined_hypotheses(synth_run):
    """A claim registers when it is examined enough to make a real call
    (`u <= u_max`) and confident enough to be worth one (`|P - a| >=
    0.15`): `h_examined` and `h_confident` both clear that bar, while
    `h_vacuous_1`/`h_vacuous_2` (no linked evidence at all, `u = 1.0`)
    do not, the flip of this task's own first pass, which selected the
    vacuous placements (`u >= floor_u`) and registered none on a real
    run."""
    predictions = _register(synth_run)
    claims = [p for p in predictions if p.kind == "claim"]
    claim_addresses = {p.meta["address"] for p in claims}
    assert synth_run["h_examined"].address in claim_addresses
    assert synth_run["h_confident"].address in claim_addresses
    assert synth_run["h_vacuous_1"].address not in claim_addresses
    assert synth_run["h_vacuous_2"].address not in claim_addresses
    for p in claims:
        assert p.u <= predict.DEFAULT_U_MAX
        assert abs(p.P - p.a) >= 0.15


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
    h = _build_placements(_predict_corpus())
    _write_run(run_dir_2, h["h_examined"], h["h_confident"], h["h_vacuous_1"], h["h_vacuous_2"], timestamp="20260102T000000Z")

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
    # `h_examined` (P ~0.70) and `h_confident` (P ~0.98) are the two
    # claims this fixture registers (`test_claim_predictions_keep_only_
    # confident_examined_hypotheses`): attesting the one confirms a
    # moderate call (low Brier), refuting the other contradicts a
    # near-certain one (high Brier).
    claim = _resolves_at(predictions, "claim", address=synth_run["h_examined"].address)
    other_claim = _resolves_at(predictions, "claim", address=synth_run["h_confident"].address)
    assert claim.P > 0.6 and other_claim.P > 0.6

    # The planted "future" world: attesting evidence for `claim` (exact
    # slot-and-date match to `h_examined`), refuting evidence for
    # `other_claim` (`h_confident`'s own slots, a disjoint later date).
    attesting = EvidenceItem(
        id="future-attest", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-2", locator="l1", quote="alpha team sighted comet q again", char_start=0, char_end=5),
        provenance="future", actor="alpha-team", action="sighted", object="comet-q",
        place="alpha-observatory", mechanism="transit-timing-method", interval=INTERVAL_A, stance=Stance.POSITIVE,
    )
    later_start = INTERVAL_B.end + DEFAULT_BIN_WIDTH * 5
    refuting = EvidenceItem(
        id="future-refute", kind=EvidenceKind.TEXTUAL, tier=Tier.T1, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-2", locator="l2", quote="beta team extended comet q much later", char_start=6, char_end=12),
        provenance="future", actor="beta-team", action="extended", object="comet-q",
        place="beta-observatory", mechanism="photometric-method",
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
