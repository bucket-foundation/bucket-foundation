import json
import shutil
import uuid
from pathlib import Path

import pytest

from hte import pipeline

REAL_RUN_DIR = Path(__file__).parent.parent / "runs" / "quantum-history-real" / "20260910T001819Z"
SCRATCH_ROOT = Path(__file__).parent.parent / "runs"

requires_real_run = pytest.mark.skipif(
    not (REAL_RUN_DIR / "MANIFEST.json").is_file(),
    reason="tools/hypothesis-engine/runs/quantum-history-real/20260910T001819Z is not present in this checkout",
)


def test_from_run_skips_choose_period_and_run_campaign(tmp_path, monkeypatch):
    run_dir = tmp_path / "an-existing-run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "c", "counts": {}}))

    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda run_dir, paper_dir, **k: {"dry_run": True})

    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
    })

    assert summary["outcome"] == "ok"
    assert summary["stages"]["choose_period"]["ran"] is False
    assert summary["stages"]["run_campaign"]["ran"] is False
    assert summary["stages"]["emit_paper"]["ran"] is True
    assert summary["stages"]["emit_paper"]["ok"] is True
    assert summary["stages"]["referee"]["ok"] is True
    assert summary["stages"]["publish"]["ok"] is True
    assert summary["run_dir"] == str(run_dir)

    pipeline_json = json.loads((Path(tmp_path / "pipeline-out") / "PIPELINE.json").read_text())
    assert pipeline_json["outcome"] == "ok"


def test_missing_manifest_in_from_run_skips_downstream_stages(tmp_path):
    run_dir = tmp_path / "empty-run"
    run_dir.mkdir()  # no MANIFEST.json

    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
    })

    # tests/swarm/FINDINGS-2026-09-10.md, FINDING-2026-09-10-005b: a
    # from_run naming a directory with no MANIFEST.json is a real
    # failure now, surfaced as such - emit_paper fails outright and
    # referee/publish cascade-skip off that failure.
    assert summary["outcome"] == "error"
    for name in ("emit_paper", "referee", "publish"):
        assert summary["stages"][name]["ran"] is False
    assert summary["stages"]["emit_paper"]["ok"] is False
    assert summary["paper_dir"] is None


def test_emit_paper_failure_skips_referee_and_publish(tmp_path, monkeypatch):
    run_dir = tmp_path / "an-existing-run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "c", "counts": {}}))

    def boom(run_dir, out_dir):
        raise RuntimeError("emit_paper exploded")

    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", boom)
    referee_calls = []
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda *a, **k: referee_calls.append(1))

    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
    })

    assert summary["outcome"] == "failed"
    assert summary["stages"]["emit_paper"]["ok"] is False
    assert "emit_paper exploded" in summary["stages"]["emit_paper"]["error"]
    assert summary["stages"]["referee"]["ran"] is False
    assert not referee_calls  # referee.referee was never called


def test_emit_paper_failure_still_runs_writeback_but_skips_referee_and_publish(tmp_path, monkeypatch):
    """`bkt-hte-writeback-review` (PR #36's own review): `writeback`
    reads only `run_dir`, real regardless of whether `emit_paper` itself
    succeeded, so an `emit_paper` failure must not cascade to it the way
    it does to `referee`/`publish` (both of which need the paper
    `emit_paper` writes)."""
    run_dir = tmp_path / "an-existing-run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "c", "counts": {}}))

    def boom(run_dir, out_dir):
        raise RuntimeError("emit_paper exploded")

    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", boom)
    referee_calls: list[int] = []
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda *a, **k: referee_calls.append(1))
    publish_calls: list[int] = []
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda *a, **k: publish_calls.append(1))
    writeback_calls: list[int] = []

    def fake_write_back(*a, **k):
        writeback_calls.append(1)
        return ["bucket-canon/07-mind/hypotheses/x.md"]

    import hte.canon_writeback as canon_writeback_mod
    monkeypatch.setattr(canon_writeback_mod, "write_back", fake_write_back)

    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
        "writeback": True, "writeback_branch": "07-mind", "writeback_signoff": "test-reviewer",
    })

    assert summary["outcome"] == "failed"
    assert summary["stages"]["emit_paper"]["ok"] is False
    assert summary["stages"]["emit_paper"]["outcome"] == "failed"

    assert summary["stages"]["referee"]["ran"] is False
    assert summary["stages"]["referee"]["outcome"] == "skipped"
    assert not referee_calls

    assert summary["stages"]["publish"]["ran"] is False
    assert summary["stages"]["publish"]["outcome"] == "skipped"
    assert not publish_calls

    assert summary["stages"]["writeback"]["ran"] is True
    assert summary["stages"]["writeback"]["ok"] is True
    assert summary["stages"]["writeback"]["outcome"] == "ok"
    assert writeback_calls == [1]


def test_writeback_failure_never_skips_publish(tmp_path, monkeypatch):
    """The other half of the same cascade rule: `publish` needs only
    `emit_paper`'s own paper, never `writeback`'s own outcome, so a
    failed `writeback` (here, a missing `writeback_branch`) never skips
    `publish`. `PIPELINE.json["outcome"]` still reads `"failed"`
    overall, since `writeback` itself did not come back `ok`."""
    run_dir = tmp_path / "an-existing-run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "c", "counts": {}}))

    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    publish_calls: list[int] = []
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda *a, **k: (publish_calls.append(1), {"dry_run": True})[1])

    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
        "writeback": True, "writeback_branch": None,  # missing -> writeback fails its own precondition
    })

    assert summary["stages"]["writeback"]["ran"] is False
    assert summary["stages"]["writeback"]["ok"] is False
    assert summary["stages"]["writeback"]["outcome"] == "failed"

    assert summary["stages"]["publish"]["ran"] is True
    assert summary["stages"]["publish"]["ok"] is True
    assert publish_calls == [1]

    # The overall pipeline still reads "failed": writeback was a required
    # stage (writeback=True) that did not come back ok, even though the
    # stage it never gates (publish) succeeded on its own.
    assert summary["outcome"] == "failed"


def test_writeback_requires_signoff_even_with_a_branch(tmp_path, monkeypatch):
    """PLAN.md section 10 and GOVERNANCE.md: a named human sign-off is
    required before any write into bucket-canon/, so `writeback_branch`
    alone is not enough. A missing `writeback_signoff` fails the stage
    with its own documented reason, distinct from the missing-branch
    failure above, and never reaches `hte.canon_writeback.write_back` at
    all (no card, no file, no partial write)."""
    run_dir = tmp_path / "an-existing-run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "c", "counts": {}}))

    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda run_dir, paper_dir, **k: {"dry_run": True})
    write_back_calls: list[int] = []
    import hte.canon_writeback as canon_writeback_mod
    monkeypatch.setattr(canon_writeback_mod, "write_back", lambda *a, **k: write_back_calls.append(1))

    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
        "writeback": True, "writeback_branch": "07-mind", "writeback_signoff": None,
    })

    assert summary["stages"]["writeback"]["ran"] is False
    assert summary["stages"]["writeback"]["ok"] is False
    assert summary["stages"]["writeback"]["outcome"] == "failed"
    assert "writeback_signoff" in summary["stages"]["writeback"]["error"]
    assert not write_back_calls  # write_back itself was never reached

    assert summary["outcome"] == "failed"


def test_writeback_not_requested_is_a_skip_not_a_failure(tmp_path, monkeypatch):
    """The default `writeback=False` path stays a deliberate,
    non-failing skip (`STAGE.json["outcome"] == "skipped"`), distinct
    from `writeback=True` with a missing branch (`"failed"`, the
    previous test)."""
    run_dir = tmp_path / "an-existing-run"
    run_dir.mkdir()
    (run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": "c", "counts": {}}))

    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda run_dir, paper_dir, **k: {"dry_run": True})

    pipeline_out = tmp_path / "pipeline-out"
    summary = pipeline.run_pipeline({
        "from_run": str(run_dir), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(pipeline_out),
    })

    assert summary["outcome"] == "ok"
    assert summary["stages"]["writeback"]["outcome"] == "skipped"
    written_stage = json.loads((pipeline_out / "writeback" / "STAGE.json").read_text())
    assert written_stage["outcome"] == "skipped"
    assert "not requested" in written_stage["output"]["skipped"]


def test_pinned_corpus_runs_choose_period_when_not_from_run(tmp_path, monkeypatch):
    """`quantum-history` names a real `hte.periods` candidate, so a fresh
    (non-`from_run`) pipeline call ranks it against the other candidates
    instead of skipping straight to `run_campaign`."""
    monkeypatch.setattr(
        "hte.runner.run_campaign",
        lambda cfg: (_ for _ in ()).throw(RuntimeError("run_campaign should not run in this test")),
    )
    import hte.runner as runner_mod
    called = {}

    class FakeArtifacts:
        run_dir = tmp_path / "runs" / "quantum-history" / "ts"
        manifest = {"counts": {}}

    def fake_run_campaign(cfg):
        called["cfg"] = cfg
        FakeArtifacts.run_dir.mkdir(parents=True, exist_ok=True)
        (FakeArtifacts.run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": cfg["campaign"], "counts": {}}))
        return FakeArtifacts()

    monkeypatch.setattr(runner_mod, "run_campaign", fake_run_campaign)
    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda run_dir, paper_dir, **k: {"dry_run": True})

    summary = pipeline.run_pipeline({
        "corpus": "quantum-history", "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"), "budget": 5.0,
    })

    assert summary["stages"]["choose_period"]["ran"] is True
    assert summary["stages"]["choose_period"]["output"]["chosen"] is not None
    assert summary["stages"]["run_campaign"]["ran"] is True
    assert called["cfg"]["corpus"] == "quantum-history"
    assert summary["outcome"] == "ok"


def test_unranked_corpus_skips_choose_period_but_still_runs_campaign(tmp_path, monkeypatch):
    import hte.runner as runner_mod

    class FakeArtifacts:
        run_dir = tmp_path / "runs" / "fixtures" / "ts"
        manifest = {"counts": {}}

    def fake_run_campaign(cfg):
        FakeArtifacts.run_dir.mkdir(parents=True, exist_ok=True)
        (FakeArtifacts.run_dir / "MANIFEST.json").write_text(json.dumps({"campaign": cfg["campaign"], "counts": {}}))
        return FakeArtifacts()

    monkeypatch.setattr(runner_mod, "run_campaign", fake_run_campaign)
    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda run_dir, paper_dir, **k: {"dry_run": True})

    summary = pipeline.run_pipeline({
        "corpus": "fixtures", "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
    })

    assert summary["stages"]["choose_period"]["ran"] is False
    assert summary["stages"]["run_campaign"]["ran"] is True
    assert summary["outcome"] == "ok"


@requires_real_run
def test_run_pipeline_end_to_end_from_a_real_run_dry_run():
    dest = SCRATCH_ROOT / f"_test-pipeline-{uuid.uuid4().hex[:8]}"
    try:
        summary = pipeline.run_pipeline({
            "corpus": "quantum-history",
            "out_dir": str(REAL_RUN_DIR.parent.parent),
            "pipeline_out_dir": str(dest),
            "from_run": str(REAL_RUN_DIR),
            "dry_run": True,
        })
        assert summary["outcome"] == "ok"
        assert summary["stages"]["referee"]["output"]["latex_clean"] is True
        assert summary["stages"]["referee"]["output"]["voice_clean"] is True
        assert summary["stages"]["publish"]["output"]["dry_run"] is True
        assert summary["stages"]["publish"]["output"]["commit_sha"] is None
        assert (dest / "paper" / "main.pdf").is_file()
    finally:
        shutil.rmtree(dest, ignore_errors=True)


# --------------------------------------------------------------------------
# `bkt-hte-writeback-review` (PR #36's own review, Medium finding): the
# `writeback` stage itself, over a real (fake-mode, `hte-synth`-shaped)
# campaign run rather than a hand-built manifest, so `hte.canon_writeback.
# write_back`'s own corpus re-ingest has a real corpus loader to resolve.
# `emit_paper`/`referee`/`publish` stay monkeypatched, same as every
# other test in this file: this section's own job is the `writeback`
# stage alone, exercised end to end already by `tests/
# test_canon_writeback.py`'s own `write_back` tests.
# --------------------------------------------------------------------------


@pytest.fixture(scope="module")
def synth_run_dir_for_writeback(tmp_path_factory):
    """One real, small campaign run directory, `hte.cli_synth.
    run_one_seed`'s own recipe (`tests/test_artifacts.py`'s own
    `fresh_synth_run`) minus its own `finally: _CORPUS_LOADERS.pop(...)`:
    `hte.canon_writeback.write_back` re-resolves `run_dir`'s own corpus
    by name AFTER the campaign completes, so the loader this fixture
    registers must outlive `run_campaign`'s own call, not just it."""
    from hte import cli_synth
    from hte import runner as runner_mod
    from hte import synth as synth_mod

    world = synth_mod.make_world(0, **synth_mod.SMALL_WORLD_KWARGS)
    corpus_name = f"synthetic-writeback-0-{id(world)}"
    runner_mod._CORPUS_LOADERS[corpus_name] = lambda w=world: w.corpus
    out_dir = tmp_path_factory.mktemp("pipeline-writeback-synth")
    try:
        with cli_synth._fake_llm_mode():
            artifacts = runner_mod.run_campaign(cli_synth._campaign_config(0, corpus_name, out_dir))
        yield Path(artifacts.run_dir)
    finally:
        runner_mod._CORPUS_LOADERS.pop(corpus_name, None)


def _mock_paper_referee_publish(monkeypatch) -> None:
    monkeypatch.setattr(pipeline.paper_mod, "emit_paper", lambda run_dir, out_dir: {"paper_dir": str(out_dir)})
    monkeypatch.setattr(pipeline.referee_mod, "referee", lambda paper_dir, **k: {"latex_clean": True, "voice_clean": True, "findings": []})
    monkeypatch.setattr(pipeline.publish_mod, "publish", lambda run_dir, paper_dir, **k: {"dry_run": True})


def test_writeback_stage_dry_run_writes_nothing(tmp_path, monkeypatch, synth_run_dir_for_writeback):
    _mock_paper_referee_publish(monkeypatch)
    out_root = tmp_path / "canon-out"

    summary = pipeline.run_pipeline({
        "from_run": str(synth_run_dir_for_writeback), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
        "writeback": True, "writeback_branch": "07-mind", "writeback_signoff": "test-reviewer",
        "writeback_floor_P": 0.0, "writeback_floor_u_max": 1.0,
        "writeback_out_root": str(out_root), "dry_run": True, "skip_publish": True,
    })

    assert summary["stages"]["writeback"]["ok"] is True
    assert summary["stages"]["writeback"]["output"]  # the paths write_back WOULD write
    assert not out_root.exists()


def test_writeback_stage_writes_cards_under_out_root_and_bridge_export_lands_next_to_envelope(tmp_path, monkeypatch, synth_run_dir_for_writeback):
    from hte import canon_writeback

    _mock_paper_referee_publish(monkeypatch)
    monkeypatch.setattr(canon_writeback, "_emit_feed_events", lambda events: 0)
    fake_repo_root = tmp_path / "fake-repo"
    fake_repo_root.mkdir()
    monkeypatch.setattr(canon_writeback, "REPO_ROOT", fake_repo_root)
    out_root = fake_repo_root / "bucket-canon"

    summary = pipeline.run_pipeline({
        "from_run": str(synth_run_dir_for_writeback), "out_dir": str(tmp_path / "runs"),
        "pipeline_out_dir": str(tmp_path / "pipeline-out"),
        "writeback": True, "writeback_branch": "07-mind", "writeback_signoff": "test-reviewer",
        "writeback_floor_P": 0.0, "writeback_floor_u_max": 1.0,
        "writeback_out_root": str(out_root), "dry_run": False, "skip_publish": True,
    })

    assert summary["stages"]["writeback"]["ok"] is True
    written = [Path(p) for p in summary["stages"]["writeback"]["output"]]
    assert written
    for path in written:
        assert path.is_file(), path

    card_paths = [p for p in written if p.parent == out_root / "07-mind" / "hypotheses" and p.name != "INDEX.md"]
    assert card_paths  # at least one survivor cleared the floor=0.0/u_max=1.0 selection

    # `write_back`'s own return order (its docstring): cards, then the
    # branch index, then the ingestion-index file, then the envelope --
    # the last path written is always the envelope.
    envelope_path = written[-1]
    assert envelope_path.parent == fake_repo_root / "public" / "research" / "hypotheses"
    bridge_path = envelope_path.with_name(envelope_path.stem + ".bridge.json")
    assert bridge_path.is_file()

    assert summary["stages"]["publish"]["ran"] is False  # skip_publish=True
