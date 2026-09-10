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
