import json

from hte import cli_pipeline, pipeline


def test_build_parser_run_defaults():
    parser = cli_pipeline.build_parser()
    args = parser.parse_args(["run"])
    assert args.corpus == "quantum-history"
    assert args.campaign is None
    assert args.out == "runs"
    assert args.dry_run is False
    assert args.replay_only is False
    assert args.from_run is None


def test_build_parser_run_every_flag():
    parser = cli_pipeline.build_parser()
    args = parser.parse_args([
        "run", "--corpus", "fixtures", "--campaign", "my-camp", "--out", "somewhere",
        "--budget", "3.5", "--seeds", "2", "--dry-run", "--replay-only", "--from-run", "runs/x/y",
    ])
    assert args.corpus == "fixtures"
    assert args.campaign == "my-camp"
    assert args.out == "somewhere"
    assert args.budget == 3.5
    assert args.seeds == 2
    assert args.dry_run is True
    assert args.replay_only is True
    assert args.from_run == "runs/x/y"


def test_cmd_run_builds_config_and_reports_success(monkeypatch, capsys):
    seen = {}

    def fake_run_pipeline(config):
        seen["config"] = config
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": "ok",
            "stages": {
                "choose_period": {"ran": False, "ok": True},
                "run_campaign": {"ran": False, "ok": True},
                "emit_paper": {"ran": True, "ok": True},
                "referee": {"ran": True, "ok": True},
                "publish": {"ran": True, "ok": True},
            },
            "run_dir": "runs/x/y", "paper_dir": "runs/_pipeline/ts/paper",
        }

    monkeypatch.setattr(pipeline, "run_pipeline", fake_run_pipeline)

    rc = cli_pipeline.main(["run", "--corpus", "quantum-history", "--dry-run", "--from-run", "runs/x/y"])
    assert rc == 0
    assert seen["config"]["corpus"] == "quantum-history"
    assert seen["config"]["dry_run"] is True
    assert seen["config"]["from_run"] == "runs/x/y"
    assert "campaign" not in seen["config"]  # --campaign not given

    out = capsys.readouterr().out
    assert "outcome: ok" in out
    assert "emit_paper: ok" in out


def test_cmd_run_reports_failure_exit_code(monkeypatch, capsys):
    def fake_run_pipeline(config):
        return {
            "pipeline_dir": "runs/_pipeline/ts", "outcome": "failed",
            "stages": {"emit_paper": {"ran": True, "ok": False}},
            "run_dir": None, "paper_dir": None,
        }

    monkeypatch.setattr(pipeline, "run_pipeline", fake_run_pipeline)
    rc = cli_pipeline.main(["run"])
    assert rc == 1
    assert "outcome: failed" in capsys.readouterr().out
