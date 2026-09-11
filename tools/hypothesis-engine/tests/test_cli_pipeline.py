import pytest

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
    assert args.writeback is False
    assert args.branch is None
    assert args.signoff is None
    assert args.writeback_floor_p == 0.6
    assert args.writeback_floor_u_max == 0.5
    assert args.skip_publish is False


def test_build_parser_run_every_flag():
    parser = cli_pipeline.build_parser()
    args = parser.parse_args([
        "run", "--corpus", "fixtures", "--campaign", "my-camp", "--out", "somewhere",
        "--budget", "3.5", "--seeds", "2", "--dry-run", "--replay-only", "--from-run", "runs/x/y",
        "--writeback", "--branch", "07-mind", "--signoff", "jane-reviewer",
        "--writeback-floor-p", "0.7", "--writeback-floor-u-max", "0.4",
        "--skip-publish",
    ])
    assert args.corpus == "fixtures"
    assert args.campaign == "my-camp"
    assert args.out == "somewhere"
    assert args.budget == 3.5
    assert args.seeds == 2
    assert args.dry_run is True
    assert args.replay_only is True
    assert args.from_run == "runs/x/y"
    assert args.writeback is True
    assert args.branch == "07-mind"
    assert args.signoff == "jane-reviewer"
    assert args.writeback_floor_p == 0.7
    assert args.writeback_floor_u_max == 0.4
    assert args.skip_publish is True


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


def test_cmd_run_builds_config_with_writeback_flags(monkeypatch, capsys):
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
                "writeback": {"ran": True, "ok": True},
                "publish": {"ran": False, "ok": True},
            },
            "run_dir": "runs/x/y", "paper_dir": "runs/_pipeline/ts/paper",
        }

    monkeypatch.setattr(pipeline, "run_pipeline", fake_run_pipeline)

    rc = cli_pipeline.main([
        "run", "--from-run", "runs/x/y", "--writeback", "--branch", "07-mind", "--signoff", "jane-reviewer",
        "--writeback-floor-p", "0.7", "--writeback-floor-u-max", "0.4", "--skip-publish",
    ])
    assert rc == 0
    cfg = seen["config"]
    assert cfg["writeback"] is True
    assert cfg["writeback_branch"] == "07-mind"
    assert cfg["writeback_signoff"] == "jane-reviewer"
    assert cfg["writeback_floor_P"] == 0.7
    assert cfg["writeback_floor_u_max"] == 0.4
    assert cfg["skip_publish"] is True

    out = capsys.readouterr().out
    assert "writeback: ok" in out


def test_cmd_run_requires_branch_with_writeback(capsys):
    """`bkt-hte-writeback-review` (PR #36's own review): `--writeback`
    with no `--branch` must fail loudly at the CLI, before `run_pipeline`
    ever starts, rather than reaching a real `publish` over a writeback
    that never had a branch to write to."""
    with pytest.raises(SystemExit) as exc_info:
        cli_pipeline.main(["run", "--writeback"])
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert "usage" in err.lower()
    assert "--branch" in err


def test_cmd_run_requires_signoff_with_writeback(capsys):
    """The same loud, immediate usage error as the missing-branch check,
    alongside it rather than instead of it: a named human approver is
    required before any write into bucket-canon/ (PLAN.md section 10,
    GOVERNANCE.md). `--branch` alone is not enough."""
    with pytest.raises(SystemExit) as exc_info:
        cli_pipeline.main(["run", "--writeback", "--branch", "07-mind"])
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert "usage" in err.lower()
    assert "--signoff" in err


def test_cmd_run_allows_writeback_with_branch_and_signoff_given(monkeypatch):
    """The same checks do not fire when both `--branch` and `--signoff`
    are given alongside `--writeback`: they fire only on the missing
    combinations above."""
    monkeypatch.setattr(pipeline, "run_pipeline", lambda config: {
        "pipeline_dir": "runs/_pipeline/ts", "outcome": "ok",
        "stages": {"writeback": {"ran": True, "ok": True}},
        "run_dir": None, "paper_dir": None,
    })
    rc = cli_pipeline.main(["run", "--writeback", "--branch", "07-mind", "--signoff", "jane-reviewer"])
    assert rc == 0


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
