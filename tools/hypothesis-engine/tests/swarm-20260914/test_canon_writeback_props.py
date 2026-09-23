import json

import pytest

from hte import canon_writeback
from tests.test_canon_writeback import BIN_START, TBIN, linking_run  # noqa: F401

def test_corpus_loader_raises_on_an_unregistered_corpus_name():
    with pytest.raises(ValueError, match="unknown corpus"):
        canon_writeback._corpus_loader("not-a-real-corpus-name")

def test_reconstruct_candidates_raises_when_the_manifest_names_no_corpus(tmp_path):
    run_dir = tmp_path / "runs" / "test-camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest = {
        "campaign": "test-camp", "timestamp": "20260101T000000Z",
        "run_artifact_version": "1.0.0", "models": {"roles": {}},
        "config": {}, "counts": {"vocab_added": []},
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest))
    (run_dir / "timeline.json").write_text(json.dumps({"bins": [], "event_views": [], "pair_views": []}))

    with pytest.raises(ValueError, match="names no corpus"):
        canon_writeback.reconstruct_candidates(run_dir)

def test_reconstruct_candidates_skips_an_entry_with_no_persisted_address(tmp_path, linking_run, monkeypatch):  # noqa: F811
    run_dir, h_supported, h_refuted = linking_run
    timeline = json.loads((run_dir / "timeline.json").read_text())
    entries = timeline["bins"][0]["ranked_hypotheses"]
    assert entries[1]["hypothesis_id"] == h_refuted.short_id
    entries[1]["address"] = None
    (run_dir / "timeline.json").write_text(json.dumps(timeline))

    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)

    assert {c.short_id for c in candidates} == {h_supported.short_id}
    assert h_refuted.short_id in ctx.unrecoverable_survivor_ids

def test_reconstruct_candidates_keeps_the_reconstruction_on_an_address_mismatch(tmp_path, linking_run, caplog):  # noqa: F811
    run_dir, h_supported, h_refuted = linking_run
    timeline = json.loads((run_dir / "timeline.json").read_text())
    entries = timeline["bins"][0]["ranked_hypotheses"]
    assert entries[0]["hypothesis_id"] == h_supported.short_id
    real_address = entries[0]["address"]
    entries[0]["address"] = real_address + 999999
    (run_dir / "timeline.json").write_text(json.dumps(timeline))

    with caplog.at_level("WARNING", logger="hte.canon_writeback"):
        candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)

    assert h_supported.short_id in {c.short_id for c in candidates}
    assert any("does not match the persisted address" in r.message for r in caplog.records)
    assert h_supported.short_id not in ctx.unrecoverable_survivor_ids

def test_label_of_returns_unset_marker_for_a_none_concept_id(linking_run):  # noqa: F811
    run_dir, h_supported, _ = linking_run
    _, ctx = canon_writeback.reconstruct_candidates(run_dir)
    assert canon_writeback._label_of(ctx.corpus, "ACTOR", None) == "(unset)"

def test_current_commit_sha_falls_back_to_uncommitted_when_git_fails(monkeypatch):
    import subprocess

    def _raise(*args, **kwargs):
        raise FileNotFoundError("git not found")

    monkeypatch.setattr(subprocess, "run", _raise)
    assert canon_writeback._current_commit_sha() == "uncommitted"

def test_render_index_defaults_elo_label_from_the_real_holdout_ledger():
    rendered = canon_writeback.render_index([], branch="02-physics")
    assert "02-physics hypothesis cards" in rendered
    assert canon_writeback.holdout_ledger.ranking_status().label in rendered

def test_write_back_resolves_a_relative_out_root_against_repo_root(linking_run):  # noqa: F811
    run_dir, h_supported, h_refuted = linking_run
    relative_marker = "canon-out-swarm-relative-probe"
    paths = canon_writeback.write_back(
        run_dir, branch="02-physics", signoff="jane-reviewer",
        floor_P=0.0, floor_u_max=1.0, lift_floor=-1.0, fdr_q=1.0, out_root=relative_marker, dry_run=True,
    )
    expected_prefix = canon_writeback.REPO_ROOT / relative_marker
    assert not expected_prefix.exists()

    assert len(paths) == 5
    for p in paths[:3]:
        assert str(p).startswith(str(expected_prefix)), p
    assert paths[3] == canon_writeback.REPO_ROOT / "CANON-INGESTION-INDEX.md"
