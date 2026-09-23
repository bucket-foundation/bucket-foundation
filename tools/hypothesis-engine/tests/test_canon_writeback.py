import dataclasses
import json
from pathlib import Path

import pytest

from hte import api, bridge_export, canon_writeback
from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.belief import Opinion
from hte.corpus import Corpus, fixtures
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.novelty import NoveltyResult
from hte.timeline import Interval

TBIN = 219
BIN_START = DEFAULT_SPAN_START + TBIN * DEFAULT_BIN_WIDTH
BIN_INTERVAL = Interval(start=BIN_START, end=BIN_START + DEFAULT_BIN_WIDTH - 1)

def _linking_corpus() -> Corpus:
    base = fixtures.build()
    item = EvidenceItem(
        id="ev-1", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l1", quote="the alpha team sighted comet Q", char_start=0, char_end=10),
        provenance="test-fixture",
        actor="alpha-team", action="sighted", object="comet-q", place="alpha-observatory", mechanism="transit-timing-method",
        interval=BIN_INTERVAL, stance=Stance.POSITIVE,
    )
    counter = EvidenceItem(
        id="ev-2", kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src-1",
        span=EvidenceSpan(doc_id="doc-1", locator="l2", quote="a later review disputed the beta reading", char_start=10, char_end=20),
        provenance="test-fixture",
        actor="beta-team", action="extended", object="comet-q", place="beta-observatory", mechanism="photometric-method",
        interval=BIN_INTERVAL, stance=Stance.NEGATIVE,
    )
    return Corpus(
        sources={"src-1": Source(id="src-1", kind=EvidenceKind.TEXTUAL)},
        evidence=[item, counter], ground_truth=[], provenance=[], vocab=base.vocab,
    )

def _hypothesis(actor, action, obj, place, mechanism, vocab) -> Hypothesis:
    placement = Placement(actor=actor, action=action, object=obj, place=place, mechanism=mechanism, interval=BIN_INTERVAL)
    return Hypothesis.from_placement(placement, vocab)

@pytest.fixture()
def linking_run(tmp_path, monkeypatch):
    from hte import runner as runner_mod

    corpus = _linking_corpus()
    monkeypatch.setitem(runner_mod._CORPUS_LOADERS, "test-linking-corpus", lambda: _linking_corpus())

    h_supported = _hypothesis("alpha-team", "sighted", "comet-q", "alpha-observatory", "transit-timing-method", corpus.vocab)
    h_refuted = _hypothesis("beta-team", "extended", "comet-q", "beta-observatory", "photometric-method", corpus.vocab)

    run_dir = tmp_path / "runs" / "test-camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": "test-camp", "timestamp": "20260101T000000Z", "corpus": "test-linking-corpus",
        "run_artifact_version": "1.0.0",
        "models": {"roles": {"generator": "sonnet"}},
        "config": {"link_threshold": 0.6},
        "counts": {"vocab_added": []},
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    timeline = {
        "bins": [{"time_bin": {"index": TBIN, "label": f"{BIN_START}s"}, "ranked_hypotheses": [
            {"hypothesis_id": h_supported.short_id, "address": h_supported.address, "slots": {"ACTOR": "alpha-team", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, "posterior": None, "elo": 1550.0},
            {"hypothesis_id": h_refuted.short_id, "address": h_refuted.address, "slots": {"ACTOR": "beta-team", "ACTION": "extended", "OBJECT": "comet-q", "PLACE": "beta-observatory", "MECHANISM": "photometric-method"}, "posterior": None, "elo": 1400.0},
        ]}],
        "event_views": [], "pair_views": [],
    }
    (run_dir / "timeline.json").write_text(json.dumps(timeline))
    return run_dir, h_supported, h_refuted

def test_reconstruct_candidates_rebuilds_real_opinions(linking_run):
    run_dir, h_supported, h_refuted = linking_run
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    assert len(candidates) == 2
    assert ctx.run_id == "test-camp-20260101T000000Z"

    by_address = {c.hypothesis.address: c for c in candidates}
    supported = by_address[h_supported.address]
    refuted = by_address[h_refuted.address]

    assert supported.opinion.b > 0.0
    assert supported.opinion.u < 1.0
    assert any(item.id == "ev-1" for item in supported.supports)

    assert refuted.opinion.d > 0.0
    assert any(item.id == "ev-2" for item in refuted.refutes)

@pytest.fixture()
def run_with_a_hidden_survivor(tmp_path, monkeypatch):
    from hte import runner as runner_mod

    corpus = _linking_corpus()
    monkeypatch.setitem(runner_mod._CORPUS_LOADERS, "test-linking-corpus", lambda: _linking_corpus())

    h_supported = _hypothesis("alpha-team", "sighted", "comet-q", "alpha-observatory", "transit-timing-method", corpus.vocab)
    h_hidden = _hypothesis("unverified-observer", "sighted", "comet-q", "beta-observatory", "photometric-method", corpus.vocab)

    run_dir = tmp_path / "runs" / "test-camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": "test-camp", "timestamp": "20260101T000000Z", "corpus": "test-linking-corpus",
        "run_artifact_version": "1.0.0",
        "models": {"roles": {"generator": "sonnet"}},
        "config": {"link_threshold": 0.6},
        "counts": {"vocab_added": [], "n_survivors": 2},
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    timeline = {
        "bins": [{"time_bin": {"index": TBIN, "label": f"{BIN_START}s"}, "ranked_hypotheses": [
            {"hypothesis_id": h_supported.short_id, "address": h_supported.address, "slots": {"ACTOR": "alpha-team", "ACTION": "sighted", "OBJECT": "comet-q", "PLACE": "alpha-observatory", "MECHANISM": "transit-timing-method"}, "posterior": None, "elo": 1550.0},
        ]}],
        "event_views": [
            {"event": {"object": "comet-q", "place": "alpha-observatory"}, "competing_placements": [h_supported.short_id]},
            {"event": {"object": "comet-q", "place": "beta-observatory"}, "competing_placements": [h_hidden.short_id]},
        ],
        "pair_views": [],
    }
    (run_dir / "timeline.json").write_text(json.dumps(timeline))
    return run_dir, h_supported, h_hidden

def test_reconstruct_candidates_tracks_a_survivor_outside_every_bin_view(run_with_a_hidden_survivor):
    run_dir, h_supported, h_hidden = run_with_a_hidden_survivor
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)

    assert len(candidates) == 1
    assert candidates[0].hypothesis.address == h_supported.address

    assert ctx.unrecoverable_survivor_ids == (h_hidden.short_id,)
    assert len(candidates) + len(ctx.unrecoverable_survivor_ids) == 2

    selected = canon_writeback.select_above_floor(candidates, floor_P=0.0, floor_u_max=1.0, fdr_q=1.0)
    assert len(selected) == 1
    assert h_hidden.short_id not in {c.short_id for c in selected}

def test_write_back_over_a_run_with_a_hidden_survivor_still_writes_the_reconstructable_card(tmp_path, run_with_a_hidden_survivor, monkeypatch):
    run_dir, h_supported, h_hidden = run_with_a_hidden_survivor
    fake_repo_root = tmp_path / "fake-repo"
    fake_repo_root.mkdir()
    out_root = fake_repo_root / "bucket-canon"
    monkeypatch.setattr(canon_writeback, "REPO_ROOT", fake_repo_root)
    monkeypatch.setattr(canon_writeback, "_emit_feed_events", lambda events: 0)
    monkeypatch.setenv("HTE_LLM_MODE", "fake")

    paths = canon_writeback.write_back(
        run_dir, branch="07-mind", signoff="jane-reviewer", floor_P=0.0, floor_u_max=1.0,
        fdr_q=1.0, out_root=out_root, dry_run=False, ledger_path=tmp_path / "ledger.jsonl",
    )
    card_paths = [p for p in paths if p.parent == out_root / "07-mind" / "hypotheses" and p.name != "INDEX.md"]
    assert len(card_paths) == 1
    assert card_paths[0].stem == h_supported.short_id

def test_select_above_floor_filters_on_both_p_and_u(linking_run):
    run_dir, h_supported, _ = linking_run
    candidates, _ = canon_writeback.reconstruct_candidates(run_dir)
    loose = canon_writeback.select_above_floor(candidates, floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0, fdr_q=1.0)
    assert len(loose) == 2
    strict = canon_writeback.select_above_floor(candidates, floor_P=0.99, floor_u_max=0.01, lift_floor=-1.0, fdr_q=1.0)
    assert strict == []

def test_select_above_floor_evidence_gate_excludes_the_prior(linking_run):
    run_dir, _, _ = linking_run
    candidates, _ = canon_writeback.reconstruct_candidates(run_dir)
    base = candidates[0]
    high_prior = dataclasses.replace(base, opinion=Opinion(b=0.502, d=0.0, u=0.498, a=0.882))
    low_prior = dataclasses.replace(base, opinion=Opinion(b=0.502, d=0.0, u=0.498, a=0.121))

    both_pass = canon_writeback.select_above_floor(
        [high_prior, low_prior], floor_P=0.0, floor_u_max=1.0, lift_floor=0.25, fdr_q=1.0,
    )
    assert len(both_pass) == 2

    both_fail = canon_writeback.select_above_floor(
        [high_prior, low_prior], floor_P=0.0, floor_u_max=1.0, lift_floor=0.6, fdr_q=1.0,
    )
    assert both_fail == []

def _candidate_with_lift(base: "canon_writeback.Candidate", lift: float) -> "canon_writeback.Candidate":
    b = max(0.0, lift)
    d = max(0.0, -lift)
    return dataclasses.replace(base, opinion=Opinion(b=b, d=d, u=1.0 - b - d, a=0.5))

def test_benjamini_hochberg_keeps_a_uniform_high_lift_set_and_rejects_a_uniform_low_lift_set(linking_run):
    run_dir, _, _ = linking_run
    candidates, _ = canon_writeback.reconstruct_candidates(run_dir)
    base = candidates[0]

    high_lift = [_candidate_with_lift(base, 0.9) for _ in range(5)]
    kept_high = canon_writeback.select_above_floor(
        high_lift, floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0, fdr_q=0.10,
    )
    assert len(kept_high) == 5

    low_lift = [_candidate_with_lift(base, 0.05) for _ in range(5)]
    kept_low = canon_writeback.select_above_floor(
        low_lift, floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0, fdr_q=0.10,
    )
    assert kept_low == []

def test_fdr_summary_threshold_matches_a_hand_computation_on_five_candidates(linking_run):
    run_dir, _, _ = linking_run
    candidates, _ = canon_writeback.reconstruct_candidates(run_dir)
    base = candidates[0]
    five = [_candidate_with_lift(base, lift) for lift in (0.99, 0.98, 0.97, 0.5, 0.1)]

    summary = canon_writeback.fdr_summary(five, fdr_q=0.10)
    assert summary.threshold == pytest.approx(0.03)
    assert summary.n_tested == 5
    assert summary.n_kept == 3
    assert summary.n_rejected == 2

def test_accept_verdict_and_opinion_shape_agree_across_select_bridge_and_serve(linking_run, monkeypatch):
    run_dir, _, _ = linking_run
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    base = candidates[0]
    high_prior = dataclasses.replace(base, opinion=Opinion(b=0.502, d=0.0, u=0.498, a=0.882))
    low_prior = dataclasses.replace(base, opinion=Opinion(b=0.502, d=0.0, u=0.498, a=0.121))
    monkeypatch.setattr(canon_writeback, "reconstruct_candidates", lambda rd: ([high_prior, low_prior], ctx))

    selected = canon_writeback.select_above_floor(
        [high_prior, low_prior], floor_P=0.0, floor_u_max=1.0, lift_floor=0.25, fdr_q=1.0,
    )
    assert len(selected) == 2

    items = bridge_export.export_for_bridge(run_dir, floor_P=0.0, floor_u_max=1.0, lift_floor=0.25, branch="x")
    assert all(item["accepted"] for item in items)

    served = api._enrich_entry(
        {"hypothesis_id": high_prior.short_id, "address": high_prior.hypothesis.address, "slots": {}, "elo": None},
        ctx.corpus.vocab, {high_prior.hypothesis.address: high_prior.opinion}, {}, {},
    )
    expected = {**high_prior.opinion.to_dict(), "P": high_prior.posterior}
    bridge_item = next(i for i in items if i["hypothesisId"] == high_prior.short_id)
    assert bridge_item["opinion"] == served["opinion"] == expected

def _fixture_novelty() -> NoveltyResult:
    return NoveltyResult(score=1.0, closest_path=None, closest_similarity=0.0, closest_bucket=None, n_compared=0)

def test_render_card_carries_opinion_slots_and_candidate_tier(linking_run):
    run_dir, h_supported, _ = linking_run
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    candidate = next(c for c in candidates if c.hypothesis.address == h_supported.address)
    text = canon_writeback.render_card(
        candidate, ctx, branch="02-physics", signoff="jane-reviewer",
        understanding="A plain-language test explanation of this claim.",
        novelty=_fixture_novelty(),
    )
    assert "**canon_tier:** candidate" in text
    assert "canon_tier:** canon\n" not in text
    assert candidate.short_id in text
    assert "ev-1" in text
    assert "| b | d | u | a | P(h) | Elo |" in text
    assert "A plain-language test explanation of this claim." in text
    assert "model-written" in text.lower() or "Model-written" in text
    assert "Novelty score:" in text
    assert "Stage: ideation" in text

def test_write_back_dry_run_lists_paths_and_writes_nothing(tmp_path, linking_run):
    run_dir, _, _ = linking_run
    out_root = tmp_path / "canon-out"
    paths = canon_writeback.write_back(run_dir, branch="02-physics", signoff="jane-reviewer", floor_P=0.0, floor_u_max=1.0, out_root=out_root, dry_run=True)
    assert paths
    assert not out_root.exists()

def test_write_back_writes_cards_index_and_envelope(tmp_path, linking_run, monkeypatch):
    run_dir, h_supported, _ = linking_run

    fake_repo_root = tmp_path / "fake-repo"
    fake_repo_root.mkdir()
    out_root = fake_repo_root / "bucket-canon"
    monkeypatch.setattr(canon_writeback, "REPO_ROOT", fake_repo_root)
    monkeypatch.setattr(canon_writeback, "_emit_feed_events", lambda events: 0)
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    ledger_path = tmp_path / "ledger.jsonl"

    paths = canon_writeback.write_back(
        run_dir, branch="02-physics", signoff="jane-reviewer", floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0,
        fdr_q=1.0, out_root=out_root, dry_run=False, ledger_path=ledger_path,
    )
    for path in paths:
        assert path.is_file(), path

    card_paths = [p for p in paths if p.parent == out_root / "02-physics" / "hypotheses" and p.name != "INDEX.md"]
    assert len(card_paths) == 2
    supported_card = next(p for p in card_paths if p.stem == h_supported.short_id)
    text = supported_card.read_text()
    assert "**canon_tier:** candidate" in text
    assert "**Signed off by:** jane-reviewer" in text
    assert "fake stand-in explanation" in text
    assert "Novelty score:" in text

    index_text = (out_root / "02-physics" / "hypotheses" / "INDEX.md").read_text()
    assert h_supported.short_id in index_text
    assert "Lift-rank cutoff off (q=1.00)" in index_text
    assert "all 2 candidate(s) pass this gate" in index_text

    ingestion_index = (fake_repo_root / "CANON-INGESTION-INDEX.md").read_text()
    assert "Recent additions" in ingestion_index
    assert "Build-history write-back" in ingestion_index

    envelope_path = next(p for p in paths if p.parent == fake_repo_root / "public" / "research" / "hypotheses")
    envelope = json.loads(envelope_path.read_text())
    item = envelope["hypotheses"][0]
    assert "understanding" in item["data"]
    assert item["data"]["understanding"]["generated_by"] == "model"
    assert item["data"]["novelty"] is not None
    assert item["data"]["novelty"]["stage"] == "ideation"
    assert item["data"]["elo_status"] == "unvalidated_tournament_ranking"

    ledger_entries = ledger_path.read_text().strip().splitlines()
    assert len(ledger_entries) == 2

    envelope_path = fake_repo_root / "public" / "research" / "hypotheses" / "test-camp-20260101T000000Z.json"
    envelope = json.loads(envelope_path.read_text())
    assert envelope["agent_action_required"] is False
    assert envelope["payment_required_from_you"] is False
    assert envelope["signed_off_by"] == "jane-reviewer"
    assert len(envelope["hypotheses"]) == 2
    for item in envelope["hypotheses"]:
        assert item["canon_tier"] == "candidate"
        assert item["cite"]["reader_owes"] == 0

    bridge_path = envelope_path.with_name(envelope_path.stem + ".bridge.json")
    assert bridge_path.is_file()
    bridge_items = json.loads(bridge_path.read_text())
    assert len(bridge_items) == 2
    for item in bridge_items:
        for key in ("engine", "runId", "campaign", "hypothesisId", "branch", "title", "slots", "evidenceRefs", "accepted"):
            assert key in item

def test_write_back_requires_branch(linking_run):
    run_dir, _, _ = linking_run
    with pytest.raises(ValueError):
        canon_writeback.write_back(run_dir, branch="", signoff="jane-reviewer", dry_run=True)

def test_write_back_requires_signoff(tmp_path, linking_run):
    run_dir, _, _ = linking_run
    out_root = tmp_path / "canon-out"
    with pytest.raises(ValueError, match="signoff"):
        canon_writeback.write_back(run_dir, branch="02-physics", signoff=None, out_root=out_root, dry_run=True)
    with pytest.raises(ValueError, match="signoff"):
        canon_writeback.write_back(run_dir, branch="02-physics", signoff="   ", out_root=out_root, dry_run=False)
    assert not out_root.exists()

def test_write_back_refuses_without_signoff_or_understanding(tmp_path, linking_run, monkeypatch):
    run_dir, _, _ = linking_run
    out_root = tmp_path / "canon-out"

    calls = {"understanding": 0}
    real_understanding = canon_writeback.roles.understanding

    def counting_understanding(*args, **kwargs):
        calls["understanding"] += 1
        return real_understanding(*args, **kwargs)

    monkeypatch.setattr(canon_writeback.roles, "understanding", counting_understanding)

    with pytest.raises(ValueError, match="signoff"):
        canon_writeback.write_back(run_dir, branch="02-physics", signoff="   ", out_root=out_root, dry_run=False)
    assert calls["understanding"] == 0
    assert not out_root.exists()

    monkeypatch.setattr(canon_writeback.roles, "understanding", lambda *a, **k: {"explanation": "   "})
    with pytest.raises(ValueError, match="understanding"):
        canon_writeback.write_back(
            run_dir, branch="02-physics", signoff="jane-reviewer", floor_P=0.0, floor_u_max=1.0,
            fdr_q=1.0, out_root=out_root, dry_run=False, ledger_path=tmp_path / "ledger.jsonl",
        )
    assert not out_root.exists()

def test_write_back_never_writes_canon_tier():
    assert canon_writeback.CANON_TIER == "candidate"

def test_bridge_export_accepted_is_select_above_floor_membership_under_the_cutoff(linking_run, monkeypatch):
    run_dir, _, _ = linking_run
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    base = candidates[0]
    lifts = [0.999, 0.6, 0.3, 0.1, 0.0]
    cands = [dataclasses.replace(base, opinion=Opinion(b=lift, d=0.0, u=1.0 - lift, a=0.5)) for lift in lifts]
    monkeypatch.setattr(canon_writeback, "reconstruct_candidates", lambda rd: (cands, ctx))
    kept = {id(c) for c in canon_writeback.select_above_floor(cands, floor_P=0.0, floor_u_max=1.0, lift_floor=0.25, fdr_q=0.10)}
    items = bridge_export.export_for_bridge(run_dir, floor_P=0.0, floor_u_max=1.0, lift_floor=0.25, fdr_q=0.10, branch="x")
    assert [item["accepted"] for item in items] == [id(c) in kept for c in cands]
    assert any(items[i]["accepted"] for i in range(len(items))) and not items[-1]["accepted"]

def test_bridge_export_marks_accepted_by_the_given_floors(linking_run):
    run_dir, _, _ = linking_run
    items = bridge_export.export_for_bridge(run_dir, floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0, branch="02-physics")
    assert len(items) == 2
    assert all(item["accepted"] for item in items)
    assert all(item["canon_tier"] == "candidate" for item in items)
    assert all(item["origin"] == "engine" for item in items)

    items_strict = bridge_export.export_for_bridge(run_dir, floor_P=0.99, floor_u_max=0.01, branch="02-physics")
    assert all(not item["accepted"] for item in items_strict)
    assert all(item["canon_tier"] == "candidate" for item in items_strict)

def test_bridge_export_carries_full_opinion_and_never_tier_assigned(linking_run):
    run_dir, h_supported, _ = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    by_id = {item["hypothesisId"]: item for item in items}
    supported = by_id[h_supported.short_id]

    assert supported["tierAssigned"] is None
    assert supported["source_tier"] in {"T1", "T2", "T3", "T4", "T5", "T6"}

    opinion = supported["opinion"]
    for key in ("b", "d", "u", "a", "P"):
        assert key in opinion
    assert opinion["P"] == supported["posterior"]
    assert 0.0 <= opinion["u"] <= 1.0

def test_bridge_export_slots_are_id_and_label_objects(linking_run):
    run_dir, h_supported, _ = linking_run
    items = bridge_export.export_for_bridge(run_dir, branch="02-physics")
    by_id = {item["hypothesisId"]: item for item in items}
    slots = by_id[h_supported.short_id]["slots"]
    assert slots["ACTOR"]["id"] == "alpha-team"
    assert isinstance(slots["ACTOR"]["label"], str)

def test_replay_vocab_growth_adds_missing_concept():
    from hte.concepts import Slot, Vocabulary
    vocab = Vocabulary()
    canon_writeback._replay_vocab_growth(vocab, [{"slot": "actor", "id": "uu-new-thing", "label": "A new thing"}])
    assert vocab.get(Slot.ACTOR, "uu-new-thing") is not None

def test_replay_vocab_growth_skips_unknown_slot(caplog):
    from hte.concepts import Vocabulary
    vocab = Vocabulary()
    canon_writeback._replay_vocab_growth(vocab, [{"slot": "not-a-real-slot", "id": "x", "label": "X"}])

def _pr22_findable(card_path: Path, branch: str) -> bool:
    if branch != "02-physics":
        return False
    concept_dir = card_path.parent
    return (concept_dir / "primary-papers.yaml").is_file()

def test_write_back_cards_are_invisible_to_the_pr22_canon_importer(tmp_path, linking_run, monkeypatch):
    run_dir, _, _ = linking_run
    fake_repo_root = tmp_path / "fake-repo"
    fake_repo_root.mkdir()
    out_root = fake_repo_root / "bucket-canon"
    monkeypatch.setattr(canon_writeback, "REPO_ROOT", fake_repo_root)
    monkeypatch.setattr(canon_writeback, "_emit_feed_events", lambda events: 0)
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    ledger_path = tmp_path / "ledger.jsonl"

    for branch in ("07-mind", "02-physics"):
        paths = canon_writeback.write_back(
            run_dir, branch=branch, signoff="jane-reviewer", floor_P=0.0, floor_u_max=1.0,
            fdr_q=1.0, out_root=out_root, dry_run=False, ledger_path=ledger_path,
        )
        card_paths = [p for p in paths if p.parent.name == "hypotheses" and p.suffix == ".md" and p.name != "INDEX.md"]
        assert card_paths
        for card_path in card_paths:
            assert not _pr22_findable(card_path, branch)
            assert "**canon_tier:** candidate" in card_path.read_text()

def test_write_back_marks_a_cascaded_candidate_contested(tmp_path, linking_run, monkeypatch):
    from hte import propagate

    run_dir, h_supported, h_refuted = linking_run

    fake_repo_root = tmp_path / "fake-repo"
    fake_repo_root.mkdir()
    out_root = fake_repo_root / "bucket-canon"
    monkeypatch.setattr(canon_writeback, "REPO_ROOT", fake_repo_root)
    captured_events = []
    monkeypatch.setattr(canon_writeback, "_emit_feed_events", lambda events: captured_events.extend(events) or len(events))
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    ledger_path = tmp_path / "ledger.jsonl"

    cascade_entry = propagate.CascadeEntry(
        address=h_supported.address, short_id=h_supported.short_id,
        old_p=0.9, new_p=0.55, hops=1, routed_share=1.0,
    )
    cascade_report = propagate.CascadeReport(
        roots=(h_refuted.address,), threshold=0.05, entries=(cascade_entry,),
    )

    paths = canon_writeback.write_back(
        run_dir, branch="02-physics", signoff="jane-reviewer", floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0,
        fdr_q=1.0, out_root=out_root, dry_run=False, ledger_path=ledger_path, cascade_report=cascade_report,
    )

    card_paths = [p for p in paths if p.parent == out_root / "02-physics" / "hypotheses" and p.name != "INDEX.md"]
    supported_card = next(p for p in card_paths if p.stem == h_supported.short_id)
    refuted_card = next(p for p in card_paths if p.stem != h_supported.short_id)

    supported_text = supported_card.read_text()
    assert "**canon_tier:** contested" in supported_text
    assert "Retraction cascade" in supported_text
    assert "0.900" in supported_text and "0.550" in supported_text

    refuted_text = refuted_card.read_text()
    assert "**canon_tier:** candidate" in refuted_text
    assert "Retraction cascade" not in refuted_text

    envelope_path = next(p for p in paths if p.suffix == ".json")
    envelope = json.loads(envelope_path.read_text())
    contested_item = next(
        item for item in envelope["hypotheses"]
        if item["card_path"] == str(supported_card.relative_to(fake_repo_root))
    )
    assert contested_item["canon_tier"] == "contested"
    assert contested_item["data"]["cascade"] == cascade_entry.to_dict()

    retract_events = [e for e in captured_events if e["type"] == "retract"]
    assert len(retract_events) == 1
    assert retract_events[0]["path"] == str(supported_card.relative_to(fake_repo_root))
    add_canon_events = [e for e in captured_events if e["type"] == "add_canon_entry"]
    assert len(add_canon_events) == 3
