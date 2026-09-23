from __future__ import annotations

import json
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from hte import cli_pipeline, pipeline

def test_campaign_flag_reaches_run_pipeline_config_through_main(monkeypatch):
    seen = {}

    def fake_run_pipeline(config):
        seen["config"] = config
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": "ok",
            "stages": {"emit_paper": {"ran": True, "ok": True}},
            "run_dir": None, "paper_dir": None,
        }

    monkeypatch.setattr(pipeline, "run_pipeline", fake_run_pipeline)
    rc = cli_pipeline.main(["run", "--campaign", "my-swarm-camp"])
    assert rc == 0
    assert seen["config"]["campaign"] == "my-swarm-camp"

@pytest.mark.parametrize("flag", ["--campaign", "--from-run"])
def test_empty_string_campaign_or_from_run_is_dropped_from_config(monkeypatch, flag):
    seen = {}

    def fake_run_pipeline(config):
        seen["config"] = config
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": "ok",
            "stages": {}, "run_dir": None, "paper_dir": None,
        }

    monkeypatch.setattr(pipeline, "run_pipeline", fake_run_pipeline)
    key = flag.lstrip("-").replace("-", "_")
    rc = cli_pipeline.main(["run", flag, ""])
    assert rc == 0
    assert key not in seen["config"]

_STAGE_DICTS = st.dictionaries(
    keys=st.sampled_from(["choose_period", "run_campaign", "emit_paper", "referee", "publish"]),
    values=st.tuples(st.booleans(), st.booleans()).map(lambda t: {"ran": t[0], "ok": t[1]}),
    min_size=0, max_size=5,
)

@given(stages=_STAGE_DICTS, outcome=st.sampled_from(["ok", "failed", "error"]))
@settings(max_examples=40, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_stage_status_lines_match_ran_ok_for_every_combination(capsys, stages, outcome):
    def fake_run_pipeline(config):
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": outcome,
            "stages": stages, "run_dir": None, "paper_dir": None,
        }

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(pipeline, "run_pipeline", fake_run_pipeline)
        rc = cli_pipeline.main(["run"])
    out = capsys.readouterr().out

    assert rc == (0 if outcome == "ok" else 1)
    for name, stage in stages.items():
        expected = "skipped" if not stage["ran"] else ("ok" if stage["ok"] else "FAILED")
        assert f"  {name}: {expected}" in out

@given(outcome=st.text(min_size=1, max_size=20).filter(lambda s: s != "ok"))
@settings(max_examples=25)
def test_any_non_ok_outcome_string_returns_exit_code_one(outcome):
    def fake_run_pipeline(config):
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": outcome,
            "stages": {}, "run_dir": None, "paper_dir": None,
        }

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(pipeline, "run_pipeline", fake_run_pipeline)
        rc = cli_pipeline.main(["run"])
    assert rc == 1

def test_trailing_json_dump_excludes_stages_and_stringifies_non_native_values(monkeypatch, capsys):
    class Sentinel:
        def __str__(self) -> str:
            return "sentinel-value"

    def fake_run_pipeline(config):
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": "ok",
            "stages": {"emit_paper": {"ran": True, "ok": True}},
            "run_dir": None, "paper_dir": None, "odd_field": Sentinel(),
        }

    monkeypatch.setattr(pipeline, "run_pipeline", fake_run_pipeline)
    cli_pipeline.main(["run"])
    out = capsys.readouterr().out

    json_start = out.index("{")
    dumped = json.loads(out[json_start:])
    assert "stages" not in dumped
    assert dumped["odd_field"] == "sentinel-value"
    assert dumped["outcome"] == "ok"

def test_unregistered_corpus_name_fails_the_run_campaign_stage_not_the_cli(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    rc = cli_pipeline.main([
        "run", "--corpus", "not-a-real-corpus-or-period", "--out", str(tmp_path), "--seeds", "1",
    ])
    assert rc == 1
    out = capsys.readouterr().out
    assert "outcome: failed" in out
    assert "run_campaign: FAILED" in out

    pipeline_dirs = list((tmp_path / "_pipeline").iterdir())
    assert len(pipeline_dirs) == 1
    campaign_stage = json.loads((pipeline_dirs[0] / "run_campaign" / "STAGE.json").read_text())
    assert campaign_stage["ok"] is False
    assert "not-a-real-corpus-or-period" in campaign_stage["error"]

def test_main_guard_raises_systemexit_with_the_subcommands_own_return_code(monkeypatch, tmp_path):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    monkeypatch.setattr(sys, "argv", [
        "hte-pipeline", "run", "--corpus", "not-a-real-corpus-or-period", "--out", str(tmp_path), "--seeds", "1",
    ])
    with pytest.raises(SystemExit) as exc_info:
        runpy.run_module("hte.cli_pipeline", run_name="__main__")
    assert exc_info.value.code == 1
