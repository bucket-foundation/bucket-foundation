from __future__ import annotations

import json
import subprocess

from helix import __main__ as cli
from helix import runs
from helix.schema import load

from .conftest import FIXTURES


class Rclone:
    def __init__(self, codes):
        self.codes = list(codes)
        self.calls = []

    def __call__(self, cmd, **kw):
        self.calls.append(cmd)
        code = self.codes.pop(0)
        return subprocess.CompletedProcess(cmd, code, "", "" if code == 0 else "quota exceeded")


def _run(tmp_path, codes, **kw):
    fake, sleeps = Rclone(codes), []
    run_dir, code = runs.run(
        load(FIXTURES / "series.json"),
        tmp_path,
        do_mirror=True,
        stamp="20260101T000000Z",
        samples=21,
        runner=fake,
        sleep=sleeps.append,
        **kw,
    )
    return run_dir, code, fake, sleeps, json.loads((run_dir / "manifest.json").read_text())


def test_mirror_ok(tmp_path):
    _, code, fake, sleeps, m = _run(tmp_path, [0])
    assert code == 0
    assert m["mirror"]["status"] == "ok" and m["mirror"]["attempts"] == 1
    assert fake.calls[0][:2] == ["rclone", "copy"]
    assert fake.calls[0][3] == f"{runs.GDRIVE_ROOT}/fixture-topics/20260101T000000Z/"
    assert sleeps == []


def test_mirror_retry_then_ok(tmp_path):
    _, code, _, sleeps, m = _run(tmp_path, [1, 0])
    assert code == 0
    assert m["mirror"]["attempts"] == 2
    assert sleeps == [5]


def test_mirror_failure_exit_code(tmp_path, capsys):
    run_dir, code, _, sleeps, m = _run(tmp_path, [1, 1, 1])
    assert code == runs.EXIT_MIRROR == 3
    assert m["mirror"] == {"status": "failed", "path": m["mirror"]["path"], "attempts": 3, "error": "quota exceeded"}
    assert sleeps == [5, 20]
    assert "quota exceeded" in capsys.readouterr().err
    assert (run_dir / "chart.svg").exists()


def test_raw_mirror_failure_fails_run(tmp_path):
    raw = tmp_path / "raw"
    raw.mkdir()
    _, code, _, _, m = _run(tmp_path / "out", [0, 1, 1, 1], raw=raw)
    assert code == 3
    assert m["mirror"]["raw"]["status"] == "failed"


def test_cli_propagates_mirror_exit(tmp_path, monkeypatch):
    monkeypatch.setattr(runs.subprocess, "run", Rclone([1, 1, 1]))
    monkeypatch.setattr(runs.time, "sleep", lambda s: None)
    monkeypatch.setattr(runs, "git_sha", lambda repo: "test")
    code = cli.main(["run", str(FIXTURES / "series.json"), "--out", str(tmp_path), "--mirror"])
    assert code == 3


def test_cli_invalid_input_exit(tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{}")
    assert cli.main(["run", str(bad), "--out", str(tmp_path)]) == 2


def test_small_run_skips_mirror(tmp_path):
    run_dir, code = runs.run(load(FIXTURES / "series.json"), tmp_path, stamp="20260101T000000Z", samples=21)
    m = json.loads((run_dir / "manifest.json").read_text())
    assert code == 0 and m["mirror"]["status"] == "skipped"
    assert (tmp_path / "fixture-topics-latest").resolve() == run_dir.resolve()
