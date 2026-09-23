import json
from pathlib import Path

from hte import cli

def test_campaign_run_writes_a_manifest_in_fake_mode(tmp_path, capsys, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    rc = cli.main([
        "campaign", "run", "--corpus", "production", "--campaign", "fixture-seed", "--out", str(tmp_path),
        "--seeds", "1", "--generate-n", "2", "--combinatorial-max-items", "1", "--max-hypotheses", "20",
        "--tournament-rounds", "1", "--resolution", "century",
    ])
    assert rc == 0
    assert "run written to" in capsys.readouterr().out
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

def test_calibrate_command_with_no_cutoff_uses_auto_picked_mode(tmp_path):
    rc = cli.main(["calibrate", "--corpus", "quantum-history", "--out", str(tmp_path)])
    assert rc == 0
    result = json.loads((tmp_path / "calibration.json").read_text())
    assert result["mode"] == "kfold"

def test_calibrate_command_diagnose_writes_diagnostics_md(tmp_path, capsys):
    rc = cli.main(["calibrate", "--corpus", "quantum-history", "--diagnose", "--out", str(tmp_path)])
    assert rc == 0
    out = capsys.readouterr().out
    assert "diagnostics written to" in out
    assert "reasons for the uncovered remainder" in out
    assert (tmp_path / "DIAGNOSTICS.md").is_file()
    assert (tmp_path / "diagnostics.json").is_file()

def test_calibrate_command_shuffle_writes_link_shuffle_into_diagnostics_json(tmp_path, capsys):
    rc = cli.main(["calibrate", "--corpus", "quantum-history", "--diagnose", "--shuffle", "--out", str(tmp_path)])
    assert rc == 0
    assert "link-shuffle diagnostic written to" in capsys.readouterr().out
    diag = json.loads((tmp_path / "diagnostics.json").read_text())
    assert "reasons" in diag
    shuffle = diag["link_shuffle"]
    assert 0.0 <= shuffle["prior_only_fraction"] <= 1.0
    assert -1.0 <= shuffle["mean_correlation"] <= 1.0

def test_calibrate_command_diagnose_with_explicit_cutoff_uses_discovery_date_mode(tmp_path):
    rc = cli.main([
        "calibrate", "--corpus", "quantum-history", "--cutoff-years", "1995", "--diagnose", "--out", str(tmp_path),
    ])
    assert rc == 0
    diag = json.loads((tmp_path / "diagnostics.json").read_text())
    assert diag["mode"] == "discovery_date"

def test_calibrate_command_fit_grid(tmp_path):
    rc = cli.main(["calibrate", "--corpus", "quantum-history", "--cutoff-years", "1995", "--fit", "--out", str(tmp_path)])
    assert rc == 0
    result = json.loads((tmp_path / "calibration.json").read_text())
    assert "fit" in result
    assert result["fit"]["best"] is not None
    assert result["n_covered_events"] > 0

def _assert_no_artifact_says_generic_corpus(root: Path) -> None:
    for path in root.rglob("*"):
        if path.is_file():
            assert "Corpus: this corpus" not in path.read_text(errors="ignore"), path

def test_calibrate_command_names_the_real_corpus_not_the_generic_placeholder(tmp_path):
    rc = cli.main(["calibrate", "--corpus", "production", "--out", str(tmp_path)])
    assert rc == 0
    assert "Corpus: production" in (tmp_path / "CALIBRATION.md").read_text()
    _assert_no_artifact_says_generic_corpus(tmp_path)

def test_campaign_run_calibration_names_the_real_corpus(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path),
        "--seeds", "1", "--generate-n", "2", "--combinatorial-max-items", "5",
        "--max-hypotheses", "8", "--tournament-rounds", "1", "--resolution", "century",
    ])
    assert rc == 0
    run_dirs = [p for p in (tmp_path / "fixtures").iterdir() if p.is_dir()]
    assert len(run_dirs) == 1
    assert "Corpus: fixtures" in (run_dirs[0] / "CALIBRATION.md").read_text()
    _assert_no_artifact_says_generic_corpus(run_dirs[0])

def test_campaign_results_writes_per_actor_and_top_with_no_absolute_paths(tmp_path, monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")
    rc = cli.main([
        "campaign", "run", "--corpus", "production", "--out", str(tmp_path),
        "--seeds", "1", "--generate-n", "1", "--combinatorial-max-items", "1",
        "--max-hypotheses", "5", "--tournament-rounds", "1",
    ])
    assert rc == 0
    run_dirs = [p for p in (tmp_path / "production").iterdir() if p.is_dir()]
    assert len(run_dirs) == 1
    run_dir = run_dirs[0]

    out_path = tmp_path / "results.json"
    rc = cli.main(["campaign", "results", str(run_dir), "--out", str(out_path)])
    assert rc == 0
    assert out_path.is_file()

    result = json.loads(out_path.read_text())
    assert result["run_id"] == run_dir.name
    assert result["campaign"] == "production"
    assert result["corpus"] == "production"
    assert isinstance(result["counts"], dict)
    assert result["source_run"]["run_id"] == run_dir.name

    assert isinstance(result["per_actor"], dict)
    assert result["per_actor"]
    for row in result["per_actor"].values():
        assert set(row) >= {"max_P", "min_u", "max_lift", "best_elo", "n_survivors", "profile_projections"}
        assert set(row["profile_projections"]) == {"consensus", "skeptic", "fringe", "uniform"}

    assert 0 < len(result["top"]) <= 10
    for entry in result["top"]:
        assert set(entry) >= {"hypothesis_id", "address", "opinion", "elo", "max_lift", "robustness"}
    rank_keys = [(-e["max_lift"], -e["elo"]) for e in result["top"]]
    assert rank_keys == sorted(rank_keys)

    assert result["self_report"]

    raw_text = out_path.read_text()
    assert str(tmp_path) not in raw_text, "campaign results must carry no absolute path"

def test_campaign_results_over_a_run_with_no_calibration_still_writes(tmp_path):
    run_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "MANIFEST.json").write_text(json.dumps({
        "campaign": "camp", "corpus": "fixtures", "git_sha": "abc1234",
        "counts": {"n_survivors": 1},
    }))
    (run_dir / "survivors.json").write_text(json.dumps({
        "artifact_version": "1.0.0", "campaign": "camp", "corpus": "fixtures",
        "survivors": [{
            "hypothesis_id": "h1", "address": 1,
            "slots": {"ACTOR": "actor-0"},
            "opinion": {"b": 0.5, "d": 0.1, "u": 0.4, "a": 0.3, "P": 0.62},
            "elo": 1550.0,
            "preservation": {"could_have_survived": True},
            "robustness": {"projections": {"consensus": 0.6, "skeptic": 0.5, "fringe": 0.55, "uniform": 0.4}, "stable": True},
        }],
    }))

    out_path = tmp_path / "results.json"
    rc = cli.main(["campaign", "results", str(run_dir), "--out", str(out_path)])
    assert rc == 0
    result = json.loads(out_path.read_text())
    assert result["calibration"] is None
    assert result["self_report"] == {}
    assert result["per_actor"]["actor-0"]["n_survivors"] == 1
    assert result["per_actor"]["actor-0"]["n_unscored"] in (0, 1)
    assert result["per_actor"]["actor-0"]["best_elo"] == 1550.0
    assert result["top"][0]["hypothesis_id"] == "h1"
    assert str(tmp_path) not in out_path.read_text()

def test_views_command_rewrites_timeline_md(tmp_path):
    views = {"bins": [], "event_views": [], "pair_views": []}
    (tmp_path / "timeline.json").write_text(json.dumps(views))
    rc = cli.main(["views", str(tmp_path)])
    assert rc == 0
    assert (tmp_path / "TIMELINE.md").is_file()

def test_views_command_missing_run_dir_fails(tmp_path, capsys):
    rc = cli.main(["views", str(tmp_path / "nope")])
    assert rc == 1

def test_campaign_run_accepts_constants_default(tmp_path, monkeypatch, capsys):
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
    assert captured["constants"] is None

def test_holdout_ledger_report_on_an_empty_ledger(tmp_path, capsys):
    path = tmp_path / "ledger.jsonl"
    rc = cli.main(["holdout-ledger", "report", "--path", str(path)])
    assert rc == 0
    status = json.loads(capsys.readouterr().out)
    assert status["elo_status"] == "unvalidated_tournament_ranking"
    assert status["n_verified"] == 0
    assert status["hit_rate"] is None
    assert status["murphy"]["n_verified"] == 0
    assert status["murphy"]["brier"] is None

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
    assert status["murphy"]["n_verified"] == 1
    assert status["murphy"]["brier"] == 0.0
    assert status["murphy"]["resolution"] == 0.0

def test_holdout_ledger_verify_unknown_entry_fails(tmp_path, capsys):
    path = tmp_path / "ledger.jsonl"
    rc = cli.main(["holdout-ledger", "verify", "no-such:1", "correct", "--verified-by", "jane", "--path", str(path)])
    assert rc == 1
    assert "no entry" in capsys.readouterr().err
