import json
from pathlib import Path

import pytest

from hte import bridge_export, canon_writeback
from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.corpus import Corpus, fixtures
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval

TBIN = 219
BIN_START = DEFAULT_SPAN_START + TBIN * DEFAULT_BIN_WIDTH
BIN_INTERVAL = Interval(start=BIN_START, end=BIN_START + DEFAULT_BIN_WIDTH - 1)


def _linking_corpus() -> Corpus:
    """A tiny corpus, over `hte.corpus.fixtures`'s own vocabulary, with
    one evidence item that fully matches the `alpha-team` hypothesis
    below, so `hte.link.link_evidence` links something and `hte.belief.
    score` returns a real, differentiated opinion (unlike
    `fixtures.build()` itself, whose own evidence carries no extracted
    slots, `bkt-hte-evidence-slots` predates this fixture's own module)."""
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


def test_select_above_floor_filters_on_both_p_and_u(linking_run):
    run_dir, h_supported, _ = linking_run
    candidates, _ = canon_writeback.reconstruct_candidates(run_dir)
    loose = canon_writeback.select_above_floor(candidates, floor_P=0.0, floor_u_max=1.0)
    assert len(loose) == 2
    strict = canon_writeback.select_above_floor(candidates, floor_P=0.99, floor_u_max=0.01)
    assert strict == []


def test_render_card_carries_opinion_slots_and_candidate_tier(linking_run):
    run_dir, h_supported, _ = linking_run
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    candidate = next(c for c in candidates if c.hypothesis.address == h_supported.address)
    text = canon_writeback.render_card(candidate, ctx, branch="02-physics")
    assert "**canon_tier:** candidate" in text
    assert "canon_tier:** canon\n" not in text  # never promoted to canon
    assert candidate.short_id in text
    assert "ev-1" in text
    assert "| b | d | u | a | P(h) | Elo |" in text


def test_write_back_dry_run_lists_paths_and_writes_nothing(tmp_path, linking_run):
    run_dir, _, _ = linking_run
    out_root = tmp_path / "canon-out"
    paths = canon_writeback.write_back(run_dir, branch="02-physics", floor_P=0.0, floor_u_max=1.0, out_root=out_root, dry_run=True)
    assert paths
    assert not out_root.exists()


def test_write_back_writes_cards_index_and_envelope(tmp_path, linking_run, monkeypatch):
    run_dir, h_supported, _ = linking_run

    # Isolate the ingestion-index, envelope, and feed side effects to
    # tmp_path so this test never touches the real repo's own CANON-
    # INGESTION-INDEX.md, feed.json, or public/research/hypotheses/.
    # `out_root` sits under the same fake repo root `write_back`'s own
    # `CANON-INGESTION-INDEX.md` addendum computes card paths relative
    # to, matching real usage where `out_root="bucket-canon"` resolves
    # against `REPO_ROOT` too.
    fake_repo_root = tmp_path / "fake-repo"
    fake_repo_root.mkdir()
    out_root = fake_repo_root / "bucket-canon"
    monkeypatch.setattr(canon_writeback, "REPO_ROOT", fake_repo_root)
    monkeypatch.setattr(canon_writeback, "_emit_feed_events", lambda events: 0)

    paths = canon_writeback.write_back(run_dir, branch="02-physics", floor_P=0.0, floor_u_max=1.0, out_root=out_root, dry_run=False)
    for path in paths:
        assert path.is_file(), path

    card_paths = [p for p in paths if p.parent == out_root / "02-physics" / "hypotheses" and p.name != "INDEX.md"]
    assert len(card_paths) == 2
    supported_card = next(p for p in card_paths if p.stem == h_supported.short_id)
    text = supported_card.read_text()
    assert "**canon_tier:** candidate" in text

    index_text = (out_root / "02-physics" / "hypotheses" / "INDEX.md").read_text()
    assert h_supported.short_id in index_text

    ingestion_index = (fake_repo_root / "CANON-INGESTION-INDEX.md").read_text()
    assert "Recent additions" in ingestion_index
    assert "build-history write-back" in ingestion_index

    envelope_path = fake_repo_root / "public" / "research" / "hypotheses" / "test-camp-20260101T000000Z.json"
    envelope = json.loads(envelope_path.read_text())
    assert envelope["agent_action_required"] is False
    assert envelope["payment_required_from_you"] is False
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
        canon_writeback.write_back(run_dir, branch="", dry_run=True)


def test_write_back_never_writes_canon_tier():
    assert canon_writeback.CANON_TIER == "candidate"


def test_bridge_export_marks_accepted_by_the_given_floors(linking_run):
    run_dir, h_supported, h_refuted = linking_run
    items = bridge_export.export_for_bridge(run_dir, floor_P=0.0, floor_u_max=1.0, branch="02-physics")
    assert len(items) == 2
    assert all(item["accepted"] for item in items)
    assert all(item["canonTier"] == "candidate" for item in items)

    items_strict = bridge_export.export_for_bridge(run_dir, floor_P=0.99, floor_u_max=0.01, branch="02-physics")
    assert all(not item["accepted"] for item in items_strict)
    assert all(item["canonTier"] is None for item in items_strict)


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
    # No exception; nothing added under a bogus slot name.
