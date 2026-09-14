"""Round three of the property swarm (`bkt-hte-test-swarm`), `hte/cli.py`
(90.1% covered per `tests/COVERAGE.md`, uncovered lines 62-63, 66-67,
143). Every test here runs in fake mode by default
(`tests/swarm3/conftest.py`'s own autouse `fake_llm_mode` fixture,
`HTE_LLM_MODE=fake`) and never spawns a subprocess (that same file's
autouse `no_real_subprocess` fixture); the one test exercising the real,
non-fake `replay_only` path opts back out of fake mode explicitly and
still never reaches `subprocess.run`, since an empty cache with
`replay_only=True` raises before `hte.llm._invoke_cli` is ever called.
Nothing here writes outside `tmp_path`.
"""
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


# ---------------------------------------------------------------------------
# `_cmd_calibrate`'s two dead-through-argparse branches (lines 62-63,
# 66-67): `choices=sorted(_CORPUS_LOADERS)` on `--corpus` already rejects
# an unregistered name before `_cmd_calibrate` is ever reached through the
# CLI, so its own manual `if args.corpus not in _CORPUS_LOADERS` guard is
# only reachable by calling the function directly with a hand-built
# `Namespace` (a defensive check for a future caller of `_cmd_calibrate`
# that is not `main()`, or a `_CORPUS_LOADERS` mutated after `build_parser`
# ran). The "no ground truth" branch, in contrast, IS reachable through
# `main()` for a real corpus with an empty `ground_truth` list, exercised
# below through a monkeypatched extra `_CORPUS_LOADERS` entry.
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# The `if __name__ == "__main__":` guard (line 143): executed in-process
# via `runpy.run_module`, no subprocess, against a cheap `views` call
# against a missing run directory so this stays fast.
# ---------------------------------------------------------------------------


def test_main_guard_raises_systemexit_with_the_subcommands_own_return_code(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "argv", ["hte", "views", str(tmp_path / "missing")])
    with pytest.raises(SystemExit) as exc_info:
        runpy.run_module("hte.cli", run_name="__main__")
    assert exc_info.value.code == 1


# ---------------------------------------------------------------------------
# campaign run: --corpus choices, --out honored, default campaign name,
# --replay-only under both fake and real (empty-cache) modes,
# --resolution overriding auto-selection.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("corpus_name", _REGISTERED_CORPORA)
def test_campaign_run_accepts_every_registered_corpus_name(corpus_name):
    """Argparse-level acceptance only (`build_parser().parse_args`, no
    `_cmd_campaign_run` execution): `quantum-history`/`education-atlas`/
    `production` are real, full-size corpora whose own end-to-end
    campaigns are seconds-to-minutes even in fake mode (measured
    empirically), so this checks the CLI surface these four names share
    without paying for three heavy campaigns; `fixtures` (the fourth,
    small) gets a real end-to-end run in the tests below."""
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
    """`hte.llm.complete`'s own fake-mode branch returns before
    `cache_dir`/`replay_only` are ever read (its own docstring: "accepted
    but unused in this mode"), so `--replay-only` against a `--cache-dir`
    that is never created succeeds rather than raising
    `LLMCacheMissError`, and that directory stays absent throughout."""
    cache_dir = tmp_path / "never-created"
    rc = cli.main([
        "campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path / "out"),
        "--cache-dir", str(cache_dir), "--replay-only", "--seeds", "1",
    ])
    assert rc == 0
    assert not cache_dir.exists()


def test_campaign_run_replay_only_without_fake_mode_raises_only_llm_cache_miss_error(monkeypatch, tmp_path):
    """The real, non-fake `replay_only` path: an empty cache directory
    means the first role call raises `LLMCacheMissError` before
    `hte.llm._invoke_cli` (and so `subprocess.run`, guarded separately by
    this package's own autouse `no_real_subprocess` fixture) is ever
    reached, exactly the one exception type this configuration should
    ever surface."""
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
    """`views` round-tripped against a real `timeline.json` a fake-mode
    `campaign run` produced, rather than the hand-built empty-bins
    `{"bins": [], "event_views": [], "pair_views": []}` `tests/test_cli.
    py::test_views_command_rewrites_timeline_md` already covers."""
    rc = cli.main(["campaign", "run", "--corpus", "fixtures", "--out", str(tmp_path), "--seeds", "1"])
    assert rc == 0
    run_dir = next(p for p in (tmp_path / "fixtures").iterdir() if p.is_dir())
    capsys.readouterr()

    rc2 = cli.main(["views", str(run_dir)])
    assert rc2 == 0
    out = capsys.readouterr().out
    assert (run_dir / "TIMELINE.md").is_file()
    assert (run_dir / "TIMELINE.md").read_text() in out


# ---------------------------------------------------------------------------
# `purge`, `predict register`/`resolve`/`report`: no dedicated test anywhere
# in this package before this pass (`tests/COVERAGE.md`'s own least-covered
# file, once `hte/referee.py`'s stale 63.4% figure is set aside: its real
# gap is these four handlers, entirely unexercised). `predict register`
# always passes `feed_root=None` through from the CLI (no `--feed-root`
# flag exists), so a real end-to-end call would write to this
# repository's own `tools/feed/` ledger; `_emit_feed_event`'s own early
# `if not predictions: return 0` makes `--kinds ""` (an empty kinds tuple,
# guaranteed zero predictions regardless of the run) the one CLI-level
# invocation safe to make without touching that shared file.
# ---------------------------------------------------------------------------


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


# `--corpus`'s own `choices=sorted(_CORPUS_LOADERS)` already rejects an
# unregistered name before either handler is reached through `main()`,
# the same dead-through-argparse situation `test_cmd_calibrate_direct_
# call_unknown_corpus_returns_two` documents above; only a direct call
# with a hand-built `Namespace` reaches the manual guard.


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
