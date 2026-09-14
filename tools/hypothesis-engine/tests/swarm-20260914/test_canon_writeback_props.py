"""Property/behavior coverage for `hte/canon_writeback.py`'s own
uncovered branches (`tests/COVERAGE.md`'s next-least-covered file with
no swarm file of its own as of this tick): the two `_corpus_loader`/
`reconstruct_candidates` raise paths, the tbin-or-address-missing skip
inside `reconstruct_candidates`'s own per-entry loop, its address-
mismatch warning-and-keep branch, `_label_of`'s unset-concept case,
`_current_commit_sha`'s subprocess-failure fallback, `render_index`'s
default `elo_label` lookup, and `write_back`'s relative-`out_root`
resolution against `REPO_ROOT`.

Reuses `tests/test_canon_writeback.py`'s own `linking_run` fixture and
helpers, the same convention `tests/swarm-20260911/test_bridge_export_
props.py` already follows for this module.
"""
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
    """A `bins[].ranked_hypotheses` entry whose own `address` field is
    `None` (a malformed or partially-written `timeline.json`) cannot be
    rebuilt into a `Hypothesis`; the loop's own `tbin is None or entry.
    get("address") is None` guard skips it and records it on
    `RunContext.unrecoverable_survivor_ids` rather than crashing on a
    `None` address downstream."""
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
    """A persisted `address` that disagrees with the address this
    module's own reconstruction computes from the entry's slots logs a
    warning (`hte.canon_writeback: reconstructed address ... does not
    match the persisted address ...`) but still keeps and scores the
    reconstructed hypothesis, rather than raising or silently
    substituting the stale persisted value."""
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
    # The mismatch is logged, not treated as unrecoverable: the entry still
    # carried a real (if stale) address and time bin, so it is reconstructed.
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
    # No `elo_label=` passed: exercises the `if elo_label is None:` branch,
    # which reads the real committed ledger via `holdout_ledger.
    # ranking_status()` rather than a caller-supplied string.
    rendered = canon_writeback.render_index([], branch="02-physics")
    assert "02-physics hypothesis cards" in rendered
    assert canon_writeback.holdout_ledger.ranking_status().label in rendered


def test_write_back_resolves_a_relative_out_root_against_repo_root(linking_run):  # noqa: F811
    """`write_back`'s own `out_root_path.is_absolute()` guard resolves a
    relative `out_root` against `REPO_ROOT` rather than the process's
    current working directory; only the card paths and the branch index
    live under it (the ingestion-index file and the envelope are always
    `REPO_ROOT`-anchored regardless of `out_root`)."""
    run_dir, h_supported, h_refuted = linking_run
    relative_marker = "canon-out-swarm-relative-probe"
    paths = canon_writeback.write_back(
        run_dir, branch="02-physics", signoff="jane-reviewer",
        floor_P=0.0, floor_u_max=1.0, out_root=relative_marker, dry_run=True,
    )
    expected_prefix = canon_writeback.REPO_ROOT / relative_marker
    assert not expected_prefix.exists()  # dry_run: never actually created

    # 2 candidates clear the floor here, so `written` is [card, card,
    # index_path, ingestion_index_path, envelope_path]; only the first
    # 3 entries live under the relative `out_root`.
    assert len(paths) == 5
    for p in paths[:3]:
        assert str(p).startswith(str(expected_prefix)), p
    assert paths[3] == canon_writeback.REPO_ROOT / "CANON-INGESTION-INDEX.md"
