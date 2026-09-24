from __future__ import annotations

import datetime
import json
import subprocess
import urllib.parse
from pathlib import Path

import pytest

from bucket_eval.datasets import common
from bucket_eval.evolution import live

REPO = Path(__file__).resolve().parents[3]
NOW = datetime.datetime(2026, 9, 24, 4, 17, tzinfo=datetime.timezone.utc)

def binding(**kw: str) -> dict:
    return {k: {"type": "literal", "value": v} for k, v in kw.items()}

def sparql(rows: list[dict]) -> bytes:
    return json.dumps({"results": {"bindings": rows}}).encode()

E = "http://www.wikidata.org/entity/"

class Fixture:
    def __init__(self) -> None:
        self.calls: list[str] = []
        self.python_releases = [{"name": "3.13", "releaseDate": "2024-10-07", "isEol": False}, {"name": "3.12", "releaseDate": "2023-10-02"}]

    def __call__(self, url: str, data: bytes | None = None) -> bytes:
        self.calls.append(url)
        if url.endswith("/products"):
            return json.dumps({"result": [
                {"name": "python", "category": "lang"},
                {"name": "debian", "category": "os"},
                {"name": "django", "category": "framework"},
            ]}).encode()
        if url.endswith("/products/python"):
            return json.dumps({"result": {"name": "python", "label": "Python", "links": {"html": "x"}, "releases": self.python_releases}}).encode()
        if url.endswith("/products/debian"):
            return json.dumps({"result": {"name": "debian", "releases": [{"name": "12", "releaseDate": "2023-06-10", "codename": "Bookworm"}]}}).encode()
        if url == live.QLEVER:
            q = urllib.parse.parse_qs(data.decode())["query"][0]
            if "rdfs:label" in q:
                return sparql([binding(item=E + "Q28865", **{"class": "language"}, label="Python"), binding(item=E + "Q131669", **{"class": "os"}, label="Debian")])
            if "P571" in q:
                return sparql([binding(item=E + "Q28865", time="+1991-02-20T00:00:00Z", precision="11"), binding(item=E + "Q131669", time="+1993-01-01T00:00:00Z", precision="9")])
            if "P348" in q:
                return sparql([binding(item=E + "Q28865", version="3.12.0", time="+2023-10-02T00:00:00Z", precision="11")])
            return sparql([binding(item=E + "Q28865", prop="influenced_by", target=E + "Q187560")])
        raise AssertionError(url)

class Importer:
    def __init__(self, code: int = 0) -> None:
        self.calls: list[list[str]] = []
        self.code = code

    def __call__(self, cmd, cwd, env, capture_output, text):
        assert env["EVOLUTION_BATCH_PROMOTION"] == "off"
        self.calls.append(cmd)
        return subprocess.CompletedProcess(cmd, self.code, "", "importer boom" if self.code else "")

@pytest.fixture
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    (r / live.IMPORTER).parent.mkdir(parents=True)
    (r / live.IMPORTER).write_text("")
    return r

def files_under(root: Path) -> list[str]:
    return sorted(str(p.relative_to(root)) for p in root.rglob("*") if p.is_file() and p.name != common.LOCK_NAME)

def test_a_dry_run_fetches_and_writes_nothing(tmp_path: Path, repo: Path):
    data = tmp_path / "data"
    importer = Importer()
    report = live.run(data, repo, Fixture(), lambda: NOW, dry_run=True, runner=importer, need=0)
    assert report.due == ["endoflife", "wikidata"]
    assert report.feeds["endoflife"]["files"] == 2 and len(report.feeds["endoflife"]["changed"]) == 2
    assert report.feeds["wikidata"]["changed"][0]["path"] == "_intake/evolution/wikidata/software/software.jsonl"
    assert importer.calls == []
    assert not data.exists() or files_under(data) == []

def test_a_first_run_stages_and_imports_and_a_second_writes_nothing(tmp_path: Path, repo: Path):
    data = tmp_path / "data"
    fx, importer = Fixture(), Importer()
    first = live.run(data, repo, fx, lambda: NOW, runner=importer, need=0)
    assert len(first.changed) == 3
    assert importer.calls[0][-3:] == first.changed
    assert first.imported == {"status": "ok", "files": 3}
    python = json.loads((data / "endoflife/products/python.json").read_text())
    assert python == {"result": {"name": "python", "releases": [{"name": "3.13", "releaseDate": "2024-10-07"}, {"name": "3.12", "releaseDate": "2023-10-02"}]}}
    rows = [json.loads(line) for line in (data / "wikidata/software/software.jsonl").read_text().splitlines()]
    assert rows[0] == {"id": "Q28865", "label": "Python", "class": "language", "inception": "1991-02-20", "versions": [{"v": "3.12.0", "date": "2023-10-02"}], "influenced_by": ["Q187560"]}
    assert rows[1] == {"id": "Q131669", "label": "Debian", "class": "os", "inception": "1993"}
    before = {p: (data / p).read_bytes() for p in files_under(data)}
    calls = len(fx.calls)

    later = NOW + datetime.timedelta(hours=1)
    second = live.run(data, repo, fx, lambda: later, runner=importer, need=0)
    assert second.due == [] and second.manifest is None
    assert len(fx.calls) == calls and len(importer.calls) == 1
    assert {p: (data / p).read_bytes() for p in files_under(data)} == before

    forced = live.run(data, repo, fx, lambda: later, force=True, runner=importer, need=0)
    assert forced.changed == [] and forced.imported == {"status": "nothing"}
    assert len(importer.calls) == 1
    assert {p: (data / p).read_bytes() for p in files_under(data) if not p.startswith("live/")} == {p: b for p, b in before.items() if not p.startswith("live/")}

def test_cadence_is_daily_for_endoflife_and_weekly_for_wikidata(tmp_path: Path, repo: Path):
    data = tmp_path / "data"
    fx = Fixture()
    live.run(data, repo, fx, lambda: NOW, runner=Importer(), need=0)
    assert live.due_feeds(data, NOW + datetime.timedelta(days=1)) == ["endoflife"]
    assert live.due_feeds(data, NOW + datetime.timedelta(days=7)) == ["endoflife", "wikidata"]
    fx.python_releases.insert(0, {"name": "3.14", "releaseDate": "2025-10-07"})
    nxt = live.run(data, repo, fx, lambda: NOW + datetime.timedelta(days=1), runner=Importer(), need=0)
    assert nxt.changed == ["_intake/evolution/endoflife/products/python.json"]

def test_a_failed_import_is_recorded_and_retried_on_the_next_run(tmp_path: Path, repo: Path):
    data = tmp_path / "data"
    with pytest.raises(RuntimeError, match="importer exited 1"):
        live.run(data, repo, Fixture(), lambda: NOW, runner=Importer(code=1), need=0)
    runs = sorted(live.runs_dir(data).glob("*.json"))
    assert json.loads(runs[0].read_text())["imported"]["status"] == "failed"
    retry = Importer()
    report = live.run(data, repo, Fixture(), lambda: NOW + datetime.timedelta(days=1), runner=retry, need=0)
    assert report.changed == []
    assert sorted(retry.calls[0][-3:]) == sorted(["_intake/evolution/endoflife/products/debian.json", "_intake/evolution/endoflife/products/python.json", "_intake/evolution/wikidata/software/software.jsonl"])

def test_without_the_importer_entry_files_stay_staged(tmp_path: Path):
    data = tmp_path / "data"
    report = live.run(data, tmp_path / "bare-repo", Fixture(), lambda: NOW, need=0)
    assert report.imported["status"] == "skipped"
    assert live.pending_imports(data) and len(live.pending_imports(data)) == 3

def test_the_run_holds_the_disk_lock_and_respects_the_floor(tmp_path: Path, repo: Path, monkeypatch: pytest.MonkeyPatch):
    data = tmp_path / "data"
    seen: list[bool] = []
    real = live.stage
    def spy(d, files, dry_run):
        if not dry_run:
            seen.append((data / common.LOCK_NAME).resolve() in common._held)
        return real(d, files, dry_run)
    monkeypatch.setattr(live, "stage", spy)
    live.run(data, repo, Fixture(), lambda: NOW, runner=Importer(), need=0)
    assert seen == [True, True]
    with pytest.raises(common.DiskFloorError):
        live.run(tmp_path / "other", repo, Fixture(), lambda: NOW, runner=Importer(), need=common.FLOOR_BYTES * 1000)

def test_network_failures_retry_then_raise_and_write_nothing(tmp_path: Path, repo: Path):
    pauses: list[float] = []
    def down(url: str, data: bytes | None = None) -> bytes:
        raise OSError("unreachable")
    with pytest.raises(OSError):
        live.with_retries(down, "https://x", pause=pauses.append)
    assert pauses == [30.0, 60.0]

def test_main_logs_one_line_and_exits_non_zero_on_failure(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]):
    def boom(**kwargs):
        raise OSError("qlever unreachable")
    monkeypatch.setattr(live, "run", boom)
    assert live.main(["--dry-run"]) == 1
    err = capsys.readouterr().err.strip().splitlines()
    assert err == ["evolution-live: failed: OSError: qlever unreachable"]

def test_edtf_follows_wikidata_precision():
    assert live.edtf("+1991-02-20T00:00:00Z", 11) == "1991-02-20"
    assert live.edtf("+1991-02-00T00:00:00Z", 10) == "1991-02"
    assert live.edtf("+1991-00-00T00:00:00Z", 9) == "1991"
    assert live.edtf("+1900-00-00T00:00:00Z", 8) is None
    assert live.edtf("-0500-00-00T00:00:00Z", 9) is None

def test_the_units_never_enable_themselves():
    install = (REPO / "scripts/systemd/install-evolution-live.sh").read_text()
    assert "enable --now" not in "\n".join(l for l in install.splitlines() if not l.startswith("echo"))
    service = (REPO / "scripts/systemd/evolution-live.service").read_text()
    assert "Restart=on-failure" in service and "StartLimitBurst=4" in service and "[Install]" not in service
    assert "%h/agfarms/bucket-foundation/scripts/evolution-live-runner.sh" in service
    ops = (REPO / "docs/internal/OPERATIONS.md").read_text()
    assert "systemctl --user disable --now evolution-live.timer" in ops and "systemctl --user stop evolution-live.timer" in ops
