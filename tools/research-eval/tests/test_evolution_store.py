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
