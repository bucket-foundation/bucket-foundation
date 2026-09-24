from __future__ import annotations

import hashlib
import io
import zipfile
from pathlib import Path

import pyarrow.parquet as pq
import pytest

from bucket_eval.datasets.common import FLOOR_BYTES, ChecksumError, DiskFloorError
from bucket_eval.evolution import labor, store
from bucket_eval.evolution.store import Source

OCC = "O*NET-SOC Code\tTitle\tDescription\n11-1011.00\tChief Executives\tDetermine \"strategy\" and policy.\n15-1252.00\tSoftware Developers\tBuild software.\n"
TASKS = "O*NET-SOC Code\tTask ID\tTask\tTask Type\n11-1011.00\t8823\tDirect \"budget\" work.\tCore\n15-1252.00\t16363\tWrite code.\tCore\n15-1252.00\t16364\tTest code.\tSupplemental\n"

def onet_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("db/Occupation Data.txt", OCC)
        z.writestr("db/Task Statements.txt", TASKS)
    return buf.getvalue()

def fixture_source(body: bytes, **over) -> Source:
    base = dict(name="onet", revision="fixture", url="https://example.org/db.zip", license_rule="onet-cc-by", file="db.zip", transient=0, sha256=hashlib.sha256(body).hexdigest(), size=len(body))
    base.update(over)
    return Source(**base)

def opener_for(bodies: dict[str, bytes], calls: list[str]):
    def opener(url: str):
        calls.append(url)
        return io.BytesIO(bodies[url])
    return opener

def test_onet_converts_every_row_to_string_parquet_and_pins_the_manifest(tmp_path: Path):
    body = onet_zip()
    src = fixture_source(body)
    calls: list[str] = []
    tables = {"occupations": "db/Occupation Data.txt", "tasks": "db/Task Statements.txt"}
    result = labor.pull_onet(tmp_path / "data", tmp_path / "manifests", opener_for({src.url: body}, calls), source=src, tables=tables, rows={"occupations": 2, "tasks": 3}, need=0)
    assert result.written == {"occupations": True, "tasks": True}
    tasks = pq.read_table(tmp_path / "data" / "onet" / "fixture" / "parquet" / "tasks.parquet")
    assert tasks.column_names == ["O*NET-SOC Code", "Task ID", "Task", "Task Type"]
    assert tasks.column("Task ID").to_pylist() == ["8823", "16363", "16364"]
    assert tasks.column("Task").to_pylist()[0] == 'Direct "budget" work.'
    m = store.load_manifest("onet", tmp_path / "manifests")
    assert m.tables["tasks"].rows == 3 and m.tables["tasks"].path == "onet/fixture/parquet/tasks.parquet"
    assert m.license_rule == "onet-cc-by" and m.sha256 == src.sha256
    again = labor.pull_onet(tmp_path / "data", tmp_path / "manifests", opener_for({src.url: body}, calls), source=src, tables=tables, rows={"occupations": 2, "tasks": 3}, need=0)
    assert again.written == {"occupations": False, "tasks": False}
    assert calls == [src.url]
    assert again.manifest == m

def test_a_count_off_the_plan_fails(tmp_path: Path):
    body = onet_zip()
    src = fixture_source(body)
    with pytest.raises(labor.CountError, match="tasks has 3 rows, expected 4"):
        labor.pull_onet(tmp_path, tmp_path / "m", opener_for({src.url: body}, []), source=src, tables={"tasks": "db/Task Statements.txt"}, rows={"tasks": 4}, need=0)
    assert not (tmp_path / "m" / "onet.json").exists()

def test_a_wrong_checksum_fails_before_conversion(tmp_path: Path):
    body = onet_zip()
    src = fixture_source(body, sha256="0" * 64)
    with pytest.raises(ChecksumError):
        labor.pull_onet(tmp_path, tmp_path / "m", opener_for({src.url: body}, []), source=src, tables={"tasks": "db/Task Statements.txt"}, rows={"tasks": 3}, need=0)
    assert not list(tmp_path.rglob("*.parquet"))

def test_the_pull_refuses_under_the_disk_floor(tmp_path: Path):
    calls: list[str] = []
    with pytest.raises(DiskFloorError):
        labor.pull_onet(tmp_path, tmp_path / "m", opener_for({}, calls), source=fixture_source(b"x"), tables={}, rows={}, need=FLOOR_BYTES * 100)
    assert calls == []

def test_eloundou_keeps_quoted_fields_and_an_unnamed_index_column(tmp_path: Path):
    labels = b'\tO*NET-SOC Code\tTask ID\tTask\tgpt4_exposure\n0\t11-1011.00\t8823.0\t"Direct, plan\tand ""lead"""\tE1\n1\t15-1252.00\t16363.0\tWrite code.\tE0\n'
    scores = b"O*NET-SOC Code,Title,dv_rating_beta\n11-1011.00,\"Chief Executives, Senior\",0.5\n"
    srcs = {
        "task_labels": Source("eloundou", "abc", "https://e/l.tsv", "eloundou-mit", "l.tsv", 0, hashlib.sha256(labels).hexdigest(), len(labels)),
        "occupation_scores": Source("eloundou", "abc", "https://e/o.csv", "eloundou-mit", "o.csv", 0, hashlib.sha256(scores).hexdigest(), len(scores)),
    }
    result = labor.pull_eloundou(tmp_path / "d", tmp_path / "m", opener_for({"https://e/l.tsv": labels, "https://e/o.csv": scores}, []), sources=srcs, rows={"task_labels": 2, "occupation_scores": 1}, need=0)
    t = pq.read_table(tmp_path / "d" / "eloundou" / "abc" / "parquet" / "task_labels.parquet")
    assert t.column_names[0] == "column_0"
    assert t.column("Task").to_pylist()[0] == 'Direct, plan\tand "lead"'
    o = pq.read_table(tmp_path / "d" / "eloundou" / "abc" / "parquet" / "occupation_scores.parquet")
    assert o.column("Title").to_pylist() == ["Chief Executives, Senior"]
    assert result.manifest.license_rule == "eloundou-mit" and set(result.manifest.tables) == {"task_labels", "occupation_scores"}

@pytest.mark.parametrize("name", ["isco08", "hisco"])
def test_gated_sources_load_nothing(name: str):
    with pytest.raises(labor.GatedSourceError, match="loads nothing"):
        labor.pull_gated(name)
    assert name not in labor.PULLS

def test_the_pinned_sources_match_the_plan():
    assert labor.ONET_ROWS["occupations"] == 1_016
    assert labor.ONET_ROWS["technology_skills"] == 32_435
    assert labor.ONET.license_rule == "onet-cc-by" and labor.ONET.revision == "28.2"
    assert all(s.license_rule == "eloundou-mit" and labor.ELOUNDOU_COMMIT in s.url for s in labor.ELOUNDOU.values())

def test_the_tracked_manifests_hold_the_pinned_counts_and_checksums():
    onet = store.load_manifest("onet")
    assert onet is not None and onet.sha256 == labor.ONET.sha256 and onet.revision == "28.2"
    assert {k: t.rows for k, t in onet.tables.items()} == labor.ONET_ROWS
    eloundou = store.load_manifest("eloundou")
    assert eloundou is not None and {k: t.rows for k, t in eloundou.tables.items()} == labor.ELOUNDOU_ROWS
    assert all(len(t.sha256) == 64 for m in (onet, eloundou) for t in m.tables.values())
