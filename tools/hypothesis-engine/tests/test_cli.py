import json
from pathlib import Path

from hte import cli

FIXTURE_CACHE = str(Path(__file__).parent / "fixtures" / "llm-cache")


def test_campaign_run_replay_only(tmp_path, capsys):
    # These extra flags must match the config `tests/fixtures/llm-cache/` was
    # seeded with (see `tests/test_runner.py`'s `FIXTURE_CONFIG`), since they
    # change prompt text and so the cache key a replay-only run looks up.
    rc = cli.main([
        "campaign", "run",
        "--corpus", "fixtures",
        "--campaign", "fixture-seed",
        "--out", str(tmp_path),
        "--cache-dir", FIXTURE_CACHE,
        "--replay-only",
        "--seeds", "1",
        "--generate-n", "2",
        "--combinatorial-max-items", "5",
        "--max-hypotheses", "8",
        "--tournament-rounds", "1",
        "--resolution", "century",
    ])
    assert rc == 0
    out = capsys.readouterr().out
    assert "run written to" in out
    # `_target_blind.json` (the target-blind check's persisted state, see
    # `hte.runner._target_blind_check`) sits alongside the timestamped run
    # directories under the campaign folder, so filter to directories only.
    run_dirs = [p for p in (tmp_path / "fixture-seed").iterdir() if p.is_dir()]
    assert len(run_dirs) == 1
    assert (run_dirs[0] / "MANIFEST.json").is_file()


def test_calibrate_command_writes_report(tmp_path, capsys):
    rc = cli.main(["calibrate", "--corpus", "fixtures", "--cutoff-years", "1960", "--out", str(tmp_path)])
    assert rc == 0
    out = capsys.readouterr().out
    assert "brier_score=" in out
    assert (tmp_path / "CALIBRATION.md").is_file()
    assert (tmp_path / "calibration.json").is_file()


def test_calibrate_command_fit_grid(tmp_path):
    # `fixtures.build()`'s own evidence carries no extracted slots (see
    # that module's own comment: it is also the frozen seed for `tests/
    # test_runner.py`'s replay-only campaign, deliberately kept slot-
    # less), so `run_holdout`'s new event-matching finds nothing to cover
    # there and every grid point's Brier score reads `None`. `quantum-
    # history` does carry slots (`bkt-hte-evidence-slots`); 1995 is one
    # of its cutoffs with real holdout coverage (confirmed empirically
    # against this corpus's own ingest, no LLM call needed).
    rc = cli.main(["calibrate", "--corpus", "quantum-history", "--cutoff-years", "1995", "--fit", "--out", str(tmp_path)])
    assert rc == 0
    result = json.loads((tmp_path / "calibration.json").read_text())
    assert "fit" in result
    assert result["fit"]["best"] is not None
    assert result["n_covered_events"] > 0


def test_views_command_rewrites_timeline_md(tmp_path):
    views = {"bins": [], "event_views": [], "pair_views": []}
    (tmp_path / "timeline.json").write_text(json.dumps(views))
    rc = cli.main(["views", str(tmp_path)])
    assert rc == 0
    assert (tmp_path / "TIMELINE.md").is_file()


def test_views_command_missing_run_dir_fails(tmp_path, capsys):
    rc = cli.main(["views", str(tmp_path / "nope")])
    assert rc == 1


# --------------------------------------------------------------------------
# --constants (docs/CALIBRATION-FIT-2026-09-10.md, hte.belief.load_constants)
# --------------------------------------------------------------------------


def test_campaign_run_accepts_constants_default(tmp_path, monkeypatch, capsys):
    # `HTE_LLM_MODE=fake` keeps this off the real `claude` subprocess path
    # (see `tests/test_api.py`'s own convention); the CLI has no
    # `--llm-mode` flag, so the env var is the seam.
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path),
        "--seeds", "1", "--generate-n", "2", "--combinatorial-max-items", "5",
        "--max-hypotheses", "8", "--tournament-rounds", "1", "--resolution", "century",
        "--constants", "default",
    ])
    assert rc == 0
    assert "run written to" in capsys.readouterr().out


def test_campaign_run_accepts_constants_fitted(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path),
        "--seeds", "1", "--generate-n", "2", "--combinatorial-max-items", "5",
        "--max-hypotheses", "8", "--tournament-rounds", "1", "--resolution", "century",
        "--constants", "fitted",
    ])
    assert rc == 0
    assert "run written to" in capsys.readouterr().out


def test_campaign_run_rejects_an_unknown_constants_value(capsys):
    try:
        cli.main(["campaign", "run", "--constants", "not-a-real-choice"])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("expected argparse to reject an unknown --constants choice")


def test_campaign_run_omitting_constants_defaults_to_fitted(tmp_path, monkeypatch, capsys):
    # No `--constants` flag at all: `runner.DEFAULT_CONFIG["constants"]`
    # ("fitted") stands, matching `hte campaign run`'s own documented
    # default with no CLI override needed. `HTE_LLM_MODE=fake` keeps this
    # off the real `claude` subprocess path (see `tests/test_api.py`'s
    # own convention).
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    captured: dict = {}
    real_run_campaign = cli.runner.run_campaign

    def spy(config):
        captured["constants"] = config.get("constants")
        return real_run_campaign(config)

    monkeypatch.setattr(cli.runner, "run_campaign", spy)
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path),
        "--seeds", "1", "--generate-n", "2", "--combinatorial-max-items", "5",
        "--max-hypotheses", "8", "--tournament-rounds", "1", "--resolution", "century",
    ])
    assert rc == 0
    assert captured["constants"] is None  # no explicit flag, so cli never sets the key
    # run_campaign's own DEFAULT_CONFIG merge is what resolves the omitted key to "fitted".


# --------------------------------------------------------------------------
# holdout-ledger (bkt-hte-holdout-ledger, PLAN.md section 10)
# --------------------------------------------------------------------------


def test_holdout_ledger_report_on_an_empty_ledger(tmp_path, capsys):
    path = tmp_path / "ledger.jsonl"
    rc = cli.main(["holdout-ledger", "report", "--path", str(path)])
    assert rc == 0
    status = json.loads(capsys.readouterr().out)
    assert status["elo_status"] == "unvalidated_tournament_ranking"
    assert status["n_verified"] == 0
    assert status["hit_rate"] is None


def test_holdout_ledger_verify_then_report_reflects_it(tmp_path, capsys):
    from hte import holdout_ledger

    path = tmp_path / "ledger.jsonl"
    entries = holdout_ledger.build_entries(
        [{"address": 1, "short_id": "h1", "statement": "a claim", "elo": 1500.0}],
        run_id="run-1", corpus="fixtures",
    )
    holdout_ledger.append_entries(entries, path=path)

    rc = cli.main([
        "holdout-ledger", "verify", "run-1:1", "correct",
        "--verified-by", "jane-reviewer", "--path", str(path),
    ])
    assert rc == 0
    verified = json.loads(capsys.readouterr().out)
    assert verified["outcome"] == "correct"
    assert verified["verified_by"] == "jane-reviewer"

    rc = cli.main(["holdout-ledger", "report", "--path", str(path), "--min-verified", "1"])
    assert rc == 0
    status = json.loads(capsys.readouterr().out)
    assert status["elo_status"] == "validated_tournament_ranking"
    assert status["hit_rate"] == 1.0


def test_holdout_ledger_verify_unknown_entry_fails(tmp_path, capsys):
    path = tmp_path / "ledger.jsonl"
    rc = cli.main(["holdout-ledger", "verify", "no-such:1", "correct", "--verified-by", "jane", "--path", str(path)])
    assert rc == 1
    assert "no entry" in capsys.readouterr().err
