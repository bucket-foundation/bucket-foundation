from __future__ import annotations

import argparse
import dataclasses
import json
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest

from hte import cli, llm
from hte.corpus import fixtures
from hte.timeline import Interval, Resolution, auto_resolution

_REGISTERED_CORPORA = ("quantum-history", "education-atlas", "production", "fixtures")

def test_cmd_calibrate_direct_call_unknown_corpus_returns_two(tmp_path, capsys):
    ns = argparse.Namespace(corpus="not-a-real-corpus", cutoff_years=None, fit=False, out=str(tmp_path))
    rc = cli._cmd_calibrate(ns)
    assert rc == 2
    err = capsys.readouterr().err
    assert "unknown corpus" in err
    assert "not-a-real-corpus" in err

def test_calibrate_command_with_no_ground_truth_events_returns_one(monkeypatch, tmp_path, capsys):
    empty_gt_corpus = dataclasses.replace(fixtures.build(), ground_truth=[])
    monkeypatch.setitem(cli._CORPUS_LOADERS, "swarm3-empty-ground-truth", lambda: empty_gt_corpus)

    rc = cli.main(["calibrate", "--corpus", "swarm3-empty-ground-truth", "--out", str(tmp_path)])
    assert rc == 1
    err = capsys.readouterr().err
    assert "no ground-truth events" in err

def test_main_guard_raises_systemexit_with_the_subcommands_own_return_code(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "argv", ["hte", "views", str(tmp_path / "missing")])
    with pytest.raises(SystemExit) as exc_info:
        runpy.run_module("hte.cli", run_name="__main__")
    assert exc_info.value.code == 1

@pytest.mark.parametrize("corpus_name", _REGISTERED_CORPORA)
def test_campaign_run_accepts_every_registered_corpus_name(corpus_name):
    args = cli.build_parser().parse_args(["campaign", "run", "--corpus", corpus_name])
    assert args.corpus == corpus_name

def test_campaign_run_rejects_an_unregistered_corpus_name_with_exit_two(capsys):
    with pytest.raises(SystemExit) as exc_info:
        cli.main(["campaign", "run", "--corpus", "not-a-real-corpus"])
    assert exc_info.value.code == 2
    err = capsys.readouterr().err
    assert "invalid choice" in err or "usage" in err.lower()

def test_campaign_run_out_honored_and_default_campaign_name_is_the_corpus_name(tmp_path):
    rc = cli.main(["campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path), "--seeds", "1"])
    assert rc == 0
    run_dirs = [p for p in (tmp_path / "fixtures").iterdir() if p.is_dir()]
    assert len(run_dirs) == 1
    manifest = json.loads((run_dirs[0] / "MANIFEST.json").read_text())
    assert manifest["campaign"] == "fixtures"

def test_campaign_run_campaign_flag_overrides_the_default_name(tmp_path):
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--campaign", "swarm3-camp",
        "--out", str(tmp_path), "--seeds", "1",
    ])
    assert rc == 0
    assert (tmp_path / "swarm3-camp").is_dir()
    assert not (tmp_path / "fixtures").exists()

def test_campaign_run_replay_only_in_fake_mode_succeeds_and_never_touches_cache_dir(tmp_path):
    cache_dir = tmp_path / "never-created"
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path / "out"),
        "--cache-dir", str(cache_dir), "--replay-only", "--seeds", "1",
    ])
    assert rc == 0
    assert not cache_dir.exists()

def test_campaign_run_replay_only_without_fake_mode_raises_only_llm_cache_miss_error(monkeypatch, tmp_path):
    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    empty_cache = tmp_path / "empty-cache"
    with pytest.raises(llm.LLMCacheMissError):
        cli.main([
            "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path / "out"),
            "--cache-dir", str(empty_cache), "--replay-only", "--seeds", "1",
        ])

def test_campaign_run_resolution_pin_overrides_auto_resolution(tmp_path):
    corpus = fixtures.build()
    intervals = [Interval(start=g.year, end=g.year) for g in corpus.ground_truth]
    auto = auto_resolution(intervals)
    pinned = Resolution.DECADE if auto != Resolution.DECADE else Resolution.MILLENNIUM
    assert pinned != auto, "test setup: the pinned rung must differ from this corpus's own auto-selected one"

    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path),
        "--seeds", "1", "--resolution", pinned.value,
    ])
    assert rc == 0
    run_dir = next(p for p in (tmp_path / "fixtures").iterdir() if p.is_dir())
    manifest = json.loads((run_dir / "MANIFEST.json").read_text())
    assert manifest["time_binning"]["resolution"] == pinned.value

def test_views_command_rewrites_timeline_from_a_fresh_fake_run(tmp_path, capsys):
    rc = cli.main(["campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path), "--seeds", "1"])
    assert rc == 0
    run_dir = next(p for p in (tmp_path / "fixtures").iterdir() if p.is_dir())
    capsys.readouterr()

    rc2 = cli.main(["views", str(run_dir)])
    assert rc2 == 0
    out = capsys.readouterr().out
    assert (run_dir / "TIMELINE.md").is_file()
    assert (run_dir / "TIMELINE.md").read_text() in out

def test_purge_command_with_no_matching_runs_reports_complete(tmp_path, capsys):
    rc = cli.main([
        "purge", "--production", "no-such-production-id", "--runs-root", str(tmp_path / "runs"),
        "--cache-dir", str(tmp_path / "cache"), "--public-root", str(tmp_path / "public"), "--dry-run",
    ])
    assert rc == 0
    report = json.loads(capsys.readouterr().out)
    assert report["complete"] is True
    assert report["unreadable"] == []
    assert report["redaction_refused"] == []

def test_predict_register_command_with_empty_kinds_registers_nothing(tmp_path, capsys):
    rc = cli.main(["campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path), "--seeds", "1"])
    assert rc == 0
    run_dir = next(p for p in (tmp_path / "fixtures").iterdir() if p.is_dir())
    capsys.readouterr()

    out_dir = tmp_path / "predictions"
    rc2 = cli.main(["predict", "register", str(run_dir), "--kinds", "", "--out", str(out_dir)])
    assert rc2 == 0
    out = capsys.readouterr().out
    assert "0 prediction(s) registered" in out
    assert not (out_dir / "ledger.jsonl").is_file()

def test_predict_resolve_command_with_an_absent_ledger_writes_an_empty_report(tmp_path, capsys):
    ledger_path = tmp_path / "predictions" / "ledger.jsonl"
    rc = cli.main([
        "predict", "resolve", "--ledger", str(ledger_path), "--corpus", "fixtures",
        "--as-of", "2026-01-01T00:00:00+00:00",
    ])
    assert rc == 0
    report = json.loads(capsys.readouterr().out)
    assert "outcomes" not in report
    assert (ledger_path.parent / "RESOLUTIONS.md").is_file()

def test_predict_report_command_with_an_absent_ledger_prints_resolutions_md(tmp_path, capsys):
    ledger_path = tmp_path / "predictions" / "ledger.jsonl"
    rc = cli.main([
        "predict", "report", "--ledger", str(ledger_path), "--corpus", "fixtures",
        "--as-of", "2026-01-01T00:00:00+00:00",
    ])
    assert rc == 0
    out = capsys.readouterr().out
    assert (ledger_path.parent / "RESOLUTIONS.md").read_text() in out

def test_cmd_predict_resolve_direct_call_unknown_corpus_returns_two(tmp_path, capsys):
    ns = argparse.Namespace(ledger=str(tmp_path / "ledger.jsonl"), corpus="not-a-real-corpus", as_of="2026-01-01T00:00:00+00:00")
    rc = cli._cmd_predict_resolve(ns)
    assert rc == 2
    err = capsys.readouterr().err
    assert "unknown corpus" in err and "not-a-real-corpus" in err

def test_cmd_predict_report_direct_call_unknown_corpus_returns_two(tmp_path, capsys):
    ns = argparse.Namespace(ledger=str(tmp_path / "ledger.jsonl"), corpus="not-a-real-corpus", as_of="2026-01-01T00:00:00+00:00")
    rc = cli._cmd_predict_report(ns)
    assert rc == 2
    err = capsys.readouterr().err
    assert "unknown corpus" in err and "not-a-real-corpus" in err
