from __future__ import annotations

import hashlib
import io
from pathlib import Path

import pytest

from bucket_eval.datasets import openalex_slice, science4cast
from bucket_eval.datasets.common import FLOOR_BYTES, GB, ChecksumError, DiskFloorError, floor_for, require_free
from bucket_eval.evolution import store
from bucket_eval.evolution.store import Manifest, Source, Table

BODY = b"a\tb\n1\t2\n"
SHA = hashlib.sha256(BODY).hexdigest()

def source(**over) -> Source:
    base = dict(name="fixture", revision="r1", url="https://example.org/f.tsv", license_rule="onet-cc-by", file="f.tsv", transient=1 * GB, sha256=SHA, size=len(BODY))
    base.update(over)
    return Source(**base)

def test_the_floor_is_thirty_gb_plus_the_declared_transient():
    assert FLOOR_BYTES == 30 * GB
    assert floor_for(openalex_slice.TRANSIENT_BYTES) == 47 * GB
    assert floor_for(science4cast.TRANSIENT_BYTES) == 33 * GB
    assert floor_for(-5) == FLOOR_BYTES

def test_require_free_refuses_below_the_floor_and_creates_nothing(tmp_path: Path):
    target = tmp_path / "deep" / "dir"
    with pytest.raises(DiskFloorError, match="30 GB floor plus 2.0 GB transient"):
        require_free(target, 2 * GB, free=32 * GB - 1)
    assert not target.exists()
    require_free(target, 2 * GB, free=32 * GB)
    assert target.is_dir()

def test_fetch_refuses_before_opening_the_url_when_the_disk_is_short(tmp_path: Path):
    opened: list[str] = []
    def opener(url: str):
        opened.append(url)
        return io.BytesIO(BODY)
    with pytest.raises(DiskFloorError):
        store.fetch(source(), tmp_path, opener, free=FLOOR_BYTES)
    assert opened == []
    assert not any(tmp_path.rglob("*.part"))

def test_fetch_streams_checks_and_skips_a_second_download(tmp_path: Path):
    calls: list[str] = []
    def opener(url: str):
        calls.append(url)
        return io.BytesIO(BODY)
    path, sha, size = store.fetch(source(), tmp_path, opener, need=0)
    assert path.read_bytes() == BODY and sha == SHA and size == len(BODY)
    store.fetch(source(), tmp_path, opener, need=0)
    assert calls == ["https://example.org/f.tsv"]
    with pytest.raises(ChecksumError):
        store.fetch(source(revision="r2", sha256="0" * 64), tmp_path, opener, need=0)

def test_a_manifest_round_trips_and_its_pins_hold(tmp_path: Path):
    m = Manifest(
        source="fixture", revision="r1", license_rule="onet-cc-by", url="https://example.org/f.tsv", sha256=SHA, bytes=len(BODY), fetched="2026-09-24",
        tables={"tasks": Table(rows=2, path="fixture/r1/tasks.parquet", sha256="b" * 64), "occupations": Table(rows=1, path="fixture/r1/occupations.parquet", sha256="a" * 64)},
    )
    path = store.save_manifest(m, tmp_path)
    assert path == tmp_path / "fixture.json"
    back = store.load_manifest("fixture", tmp_path)
    assert back == m
    assert list(back.to_doc()["tables"]) == ["occupations", "tasks"]
    store.save_manifest(Manifest(**{**m.__dict__, "fetched": "2026-09-25"}), tmp_path)
    with pytest.raises(ChecksumError, match="sha256"):
        store.save_manifest(Manifest(**{**m.__dict__, "sha256": "c" * 64}), tmp_path)
    assert store.load_manifest("absent", tmp_path) is None
    with pytest.raises(ValueError, match="tables"):
        Manifest.from_doc({k: v for k, v in m.to_doc().items() if k != "tables"})

def test_the_store_defaults_under_intake_evolution():
    assert store.EVOLUTION_DATA.parts[-2:] == ("_intake", "evolution") or "EVOLUTION_DATA" in __import__("os").environ

def _hold(root: str, seconds: float, log: str, name: str) -> None:
    import time as t
    from bucket_eval.datasets.common import disk_job as job
    with job(Path(root), poll=0.02):
        with open(log, "a") as f:
            f.write(f"{name} start {t.monotonic()}\n")
        t.sleep(seconds)
        with open(log, "a") as f:
            f.write(f"{name} end {t.monotonic()}\n")

def test_two_concurrent_disk_jobs_run_one_after_the_other(tmp_path: Path):
    import multiprocessing as mp
    log = tmp_path / "log.txt"
    ctx = mp.get_context("spawn")
    procs = [ctx.Process(target=_hold, args=(str(tmp_path / "data"), 0.4, str(log), n)) for n in ("a", "b")]
    for p in procs:
        p.start()
    for p in procs:
        p.join(30)
        assert p.exitcode == 0
    events = [line.split() for line in log.read_text().splitlines()]
    assert [e[1] for e in events] == ["start", "end", "start", "end"]
    assert events[0][0] == events[1][0] and events[2][0] == events[3][0]
    assert float(events[2][2]) >= float(events[1][2])

def test_a_waiter_gives_up_naming_the_holder(tmp_path: Path):
    import multiprocessing as mp
    import time as t
    from bucket_eval.datasets.common import DiskBusyError, disk_job
    ctx = mp.get_context("spawn")
    holder = ctx.Process(target=_hold, args=(str(tmp_path), 1.5, str(tmp_path / "log"), "h"))
    holder.start()
    try:
        deadline = t.monotonic() + 10
        while not (tmp_path / "log").exists() and t.monotonic() < deadline:
            t.sleep(0.02)
        with pytest.raises(DiskBusyError, match=f"pid {holder.pid}"):
            with disk_job(tmp_path, wait=0.2, poll=0.05):
                pass
    finally:
        holder.join(30)

def test_a_stale_lock_from_a_dead_pid_is_taken_over(tmp_path: Path):
    import subprocess
    import sys
    from bucket_eval.datasets.common import LOCK_NAME, disk_job
    dead = subprocess.run([sys.executable, "-c", "import os; print(os.getpid())"], capture_output=True, text=True).stdout.strip()
    (tmp_path / LOCK_NAME).write_text(f"{dead}\n")
    with disk_job(tmp_path, wait=0.2, poll=0.05) as lock:
        assert lock.read_text().strip() == str(__import__("os").getpid())
    assert (tmp_path / LOCK_NAME).read_text() == ""

def test_the_lock_is_reentrant_and_released_on_error(tmp_path: Path):
    from bucket_eval.datasets.common import disk_job
    with pytest.raises(RuntimeError, match="boom"):
        with disk_job(tmp_path):
            with disk_job(tmp_path, wait=0):
                raise RuntimeError("boom")
    with disk_job(tmp_path, wait=0):
        pass
