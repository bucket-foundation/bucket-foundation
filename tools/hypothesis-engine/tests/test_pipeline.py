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

    assert summary["outcome"] == "ok"  # every stage reports ok=True, just not run
    for name in ("emit_paper", "referee", "publish"):
        assert summary["stages"][name]["ran"] is False
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
