"""Behavior tests for `hte.cli`'s `purge` and `predict register`/`resolve`/
`report` dispatch functions (`_cmd_purge`, `_cmd_predict_register`,
`_cmd_predict_resolve`, `_cmd_predict_report`), the one uncovered block
`tests/COVERAGE.md` names (83.6%, lines 171-217) once every other module
on its own top-15 list already carries a swarm file. `hte.purge` and
`hte.predict` each have their own full test suite over the real
computation; this file's own job is the CLI wiring alone, isolated by
monkeypatching `purge_mod.purge`/`predict.register`/`predict.resolve` so
no test here runs a real campaign or touches a real `runs/` tree.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from hte import cli


# --------------------------------------------------------------------------
# `_cmd_purge`
# --------------------------------------------------------------------------


def test_purge_command_prints_report_and_returns_zero_when_complete(monkeypatch, tmp_path, capsys):
    report = {"complete": True, "production": "prod-001", "unreadable": [], "redaction_refused": []}
    monkeypatch.setattr(cli.purge_mod, "purge", lambda *a, **k: report)

    rc = cli.main(["purge", "--production", "prod-001", "--runs-root", str(tmp_path)])

    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out == report


def test_purge_command_returns_one_and_prints_warning_when_incomplete(monkeypatch, tmp_path, capsys):
    report = {"complete": False, "warning": "learner text may remain in one run", "unreadable": [{"path": "x", "error": "bad json"}]}
    monkeypatch.setattr(cli.purge_mod, "purge", lambda *a, **k: report)

    rc = cli.main(["purge", "--production", "prod-001", "--runs-root", str(tmp_path)])

    assert rc == 1
    captured = capsys.readouterr()
    assert json.loads(captured.out) == report
    assert "learner text may remain in one run" in captured.err


def test_purge_command_falls_back_to_default_warning_when_incomplete_report_names_none(monkeypatch, tmp_path, capsys):
    report = {"complete": False}
    monkeypatch.setattr(cli.purge_mod, "purge", lambda *a, **k: report)

    rc = cli.main(["purge", "--production", "prod-002", "--runs-root", str(tmp_path)])

    assert rc == 1
    err = capsys.readouterr().err
    assert "purge is incomplete" in err
    assert "unreadable" in err


def test_purge_command_passes_every_cli_flag_through_to_purge(monkeypatch, tmp_path, capsys):
    captured_kwargs = {}

    def fake_purge(production_id, **kwargs):
        captured_kwargs["production_id"] = production_id
        captured_kwargs.update(kwargs)
        return {"complete": True}

    monkeypatch.setattr(cli.purge_mod, "purge", fake_purge)

    rc = cli.main([
        "purge",
        "--production", "prod-003",
        "--learner", "label-only-id",
        "--runs-root", str(tmp_path / "runs"),
        "--cache-dir", str(tmp_path / "cache"),
        "--public-root", str(tmp_path / "public"),
        "--dry-run",
    ])

    assert rc == 0
    assert captured_kwargs["production_id"] == "prod-003"
    assert captured_kwargs["learner_id"] == "label-only-id"
    assert captured_kwargs["runs_root"] == str(tmp_path / "runs")
    assert captured_kwargs["cache_dir"] == str(tmp_path / "cache")
    assert captured_kwargs["public_root"] == str(tmp_path / "public")
    assert captured_kwargs["dry_run"] is True


# --------------------------------------------------------------------------
# `_cmd_predict_register`
# --------------------------------------------------------------------------


def test_predict_register_command_prints_count_and_by_kind_breakdown(monkeypatch, tmp_path, capsys):
    fake_predictions = [
        SimpleNamespace(kind="claim"),
        SimpleNamespace(kind="claim"),
        SimpleNamespace(kind="discovery"),
    ]
    captured = {}

    def fake_register(run_dir, **kwargs):
        captured["run_dir"] = run_dir
        captured.update(kwargs)
        return fake_predictions

    monkeypatch.setattr(cli.predict, "register", fake_register)

    rc = cli.main(["predict", "register", str(tmp_path / "runs/default/2026"), "--out", str(tmp_path / "predictions")])

    assert rc == 0
    out = capsys.readouterr().out
    assert "3 prediction(s) registered" in out
    assert "'claim': 2" in out
    assert "'discovery': 1" in out
    assert str(Path(tmp_path / "predictions") / "ledger.jsonl") in out
    assert captured["run_dir"] == str(tmp_path / "runs/default/2026")


def test_predict_register_command_parses_comma_separated_kinds_and_strips_whitespace(monkeypatch, tmp_path):
    captured = {}
    monkeypatch.setattr(cli.predict, "register", lambda run_dir, **kwargs: captured.update(kwargs) or [])

    rc = cli.main(["predict", "register", str(tmp_path), "--kinds", " claim, discovery ,sequence"])

    assert rc == 0
    assert captured["kinds"] == ("claim", "discovery", "sequence")


def test_predict_register_command_drops_blank_entries_in_kinds(monkeypatch, tmp_path):
    captured = {}
    monkeypatch.setattr(cli.predict, "register", lambda run_dir, **kwargs: captured.update(kwargs) or [])

    rc = cli.main(["predict", "register", str(tmp_path), "--kinds", "claim,,discovery"])

    assert rc == 0
    assert captured["kinds"] == ("claim", "discovery")


def test_predict_register_command_reports_zero_predictions_with_an_empty_by_kind_dict(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(cli.predict, "register", lambda run_dir, **kwargs: [])

    rc = cli.main(["predict", "register", str(tmp_path)])

    assert rc == 0
    out = capsys.readouterr().out
    assert "0 prediction(s) registered" in out
    assert "{}" in out


# --------------------------------------------------------------------------
# `_cmd_predict_resolve` / `_cmd_predict_report`: the manual
# `_CORPUS_LOADERS` guard, unreachable through `main()` itself since
# `--corpus` already carries `choices=sorted(_CORPUS_LOADERS)` (the same
# situation `_cmd_calibrate`'s own direct-call tests document), reached
# here the same way, by calling the function directly with a hand-built
# `Namespace`.
# --------------------------------------------------------------------------


def test_predict_resolve_direct_call_unknown_corpus_returns_two(capsys):
    ns = argparse.Namespace(corpus="not-a-real-corpus", ledger="predictions/ledger.jsonl", as_of="2026-01-01")

    rc = cli._cmd_predict_resolve(ns)

    assert rc == 2
    err = capsys.readouterr().err
    assert "unknown corpus" in err
    assert "not-a-real-corpus" in err


def test_predict_report_direct_call_unknown_corpus_returns_two(capsys):
    ns = argparse.Namespace(corpus="not-a-real-corpus", ledger="predictions/ledger.jsonl", as_of="2026-01-01")

    rc = cli._cmd_predict_report(ns)

    assert rc == 2
    err = capsys.readouterr().err
    assert "unknown corpus" in err


def test_predict_resolve_command_prints_report_without_the_outcomes_field(monkeypatch, tmp_path, capsys):
    fake_corpus = object()
    monkeypatch.setitem(cli._CORPUS_LOADERS, "swarm-fake-corpus", lambda: fake_corpus)
    captured = {}

    def fake_resolve(ledger, *, evidence_corpus, as_of, **kwargs):
        captured["ledger"] = ledger
        captured["evidence_corpus"] = evidence_corpus
        captured["as_of"] = as_of
        return SimpleNamespace(to_dict=lambda: {
            "as_of": as_of, "n_total": 2, "outcomes": [{"prediction_id": "p1"}, {"prediction_id": "p2"}],
        })

    monkeypatch.setattr(cli.predict, "resolve", fake_resolve)
    ledger_path = tmp_path / "ledger.jsonl"

    rc = cli.main([
        "predict", "resolve",
        "--ledger", str(ledger_path),
        "--corpus", "swarm-fake-corpus",
        "--as-of", "2026-06-01",
    ])

    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert "outcomes" not in out
    assert out["n_total"] == 2
    assert captured["evidence_corpus"] is fake_corpus
    assert captured["as_of"] == "2026-06-01"
    assert captured["ledger"] == str(ledger_path)


def test_predict_report_command_prints_the_resolutions_markdown_next_to_the_ledger(monkeypatch, tmp_path, capsys):
    monkeypatch.setitem(cli._CORPUS_LOADERS, "swarm-fake-corpus-2", lambda: object())
    monkeypatch.setattr(cli.predict, "resolve", lambda ledger, **kwargs: None)

    ledger_path = tmp_path / "ledger.jsonl"
    ledger_path.write_text("")
    (tmp_path / "RESOLUTIONS.md").write_text("# Resolutions\n\nbrier: 0.05\n")

    rc = cli.main([
        "predict", "report",
        "--ledger", str(ledger_path),
        "--corpus", "swarm-fake-corpus-2",
        "--as-of", "2026-06-01",
    ])

    assert rc == 0
    out = capsys.readouterr().out
    assert "# Resolutions" in out
    assert "brier: 0.05" in out
