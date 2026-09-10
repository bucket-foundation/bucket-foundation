import json
from pathlib import Path

import pytest

from hte import llm, runner

FIXTURE_CACHE = str(Path(__file__).parent / "fixtures" / "llm-cache")

# Every field below must match the config used to seed `tests/fixtures/
# llm-cache/`: the cache key is a hash of (model, prompt), and several
# prompts this campaign builds (`generate_n`, `combinatorial_max_items`,
# and the campaign name itself, embedded in the self-report's own prompt)
# change the prompt text, and so the cache key, if changed here without
# re-seeding the cache.
FIXTURE_CONFIG = {
    "campaign": "fixture-seed",
    "corpus": "fixtures",
    "cache_dir": FIXTURE_CACHE,
    "replay_only": True,
    "seeds": 1,
    "generate_n": 2,
    "tournament_rounds": 1,
    "max_hypotheses": 8,
    "combinatorial_max_items": 5,
}


def test_run_campaign_end_to_end_replay_only(tmp_path):
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path)}
    artifacts = runner.run_campaign(cfg)

    assert artifacts.run_dir.is_dir()
    assert (artifacts.run_dir / "MANIFEST.json").is_file()
    assert (artifacts.run_dir / "run.log").is_file()
    assert (artifacts.run_dir / "self-report.json").is_file()
    assert (artifacts.run_dir / "TIMELINE.md").is_file()
    assert (artifacts.run_dir / "timeline.json").is_file()
    assert (artifacts.run_dir / "CALIBRATION.md").is_file()

    assert len(artifacts.hypotheses) > 0
    assert artifacts.opinions
    assert all(0.0 <= op.project() <= 1.0 for op in artifacts.opinions.values())
    assert artifacts.elos
    assert artifacts.self_report["missing_mass_estimate"] is not None
    assert isinstance(artifacts.self_report["target_blind_steady"], bool)

    manifest = json.loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert manifest["campaign"] == "fixture-seed"
    assert manifest["corpus"] == "fixtures"
    assert manifest["cache"]["files"] > 0
    assert manifest["seeds"] == [0]
    assert "git_sha" in manifest

    log_text = (artifacts.run_dir / "run.log").read_text()
    assert "campaign 'fixture-seed' starting" in log_text
    assert "run complete" in log_text


def test_run_campaign_replay_only_raises_on_true_cache_miss(tmp_path):
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path), "cache_dir": str(tmp_path / "empty-cache")}
    with pytest.raises(llm.LLMCacheMissError):
        runner.run_campaign(cfg)


def test_run_campaign_replay_only_makes_no_subprocess_call(tmp_path, monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("replay_only run must never shell out to claude -p")

    monkeypatch.setattr(llm, "subprocess", type("S", (), {"run": staticmethod(explode)}))
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path)}
    runner.run_campaign(cfg)  # would raise via `explode` above on any cache miss


def test_run_campaign_is_deterministic_across_runs(tmp_path):
    cfg1 = {**FIXTURE_CONFIG, "out_dir": str(tmp_path / "run1")}
    cfg2 = {**FIXTURE_CONFIG, "out_dir": str(tmp_path / "run2")}
    a1 = runner.run_campaign(cfg1)
    a2 = runner.run_campaign(cfg2)
    assert {h.address for h in a1.hypotheses} == {h.address for h in a2.hypotheses}
    assert a1.self_report == a2.self_report
    assert a1.coverage == a2.coverage
