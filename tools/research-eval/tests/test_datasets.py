import hashlib
import io
import json
import zipfile

import pyarrow as pa
import pyarrow.fs as pafs
import pyarrow.parquet as pq
import pytest

from bucket_eval.datasets import openalex_slice, science4cast
from bucket_eval.datasets.common import BRONZE, ChecksumError

def tiny_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("SemanticGraph_delta_1_cutoff_0_minedge_1.pkl", b"graph bytes")
    return buf.getvalue()

def test_science4cast_pull_pins_and_refuses_a_mismatch(tmp_path):
    body = tiny_zip()
    md5 = hashlib.md5(body).hexdigest()
    manifest = tmp_path / "manifests" / "science4cast.json"
    doc = science4cast.pull(tmp_path / "bronze", manifest, lambda url: io.BytesIO(body), len(body), md5, min_free=0)
    assert doc["sha256"] == hashlib.sha256(body).hexdigest()
    assert doc["members"][0]["size"] == len(b"graph bytes")
    again = science4cast.pull(tmp_path / "bronze", manifest, lambda url: io.BytesIO(b"never read"), len(body), md5, min_free=0)
    assert again["sha256"] == doc["sha256"]
    with pytest.raises(ChecksumError):
        science4cast.pull(tmp_path / "bronze2", manifest, lambda url: io.BytesIO(body), len(body), "0" * 32, min_free=0)

def works_table(rows):
    topic = pa.struct([("id", pa.string()), ("display_name", pa.string()), ("score", pa.float32()), ("field", pa.struct([("id", pa.string()), ("display_name", pa.string())]))])
    keyword = pa.struct([("id", pa.string()), ("display_name", pa.string()), ("score", pa.float32())])
    primary = pa.struct([("id", pa.string()), ("field", pa.struct([("id", pa.string()), ("display_name", pa.string())]))])
    return pa.table(
        {
            "id": [f"https://openalex.org/W{r[0]}" for r in rows],
            "publication_year": pa.array([r[1] for r in rows], pa.int32()),
            "topics": pa.array([[{"id": f"https://openalex.org/T{t}", "display_name": "t", "score": 1.0, "field": {"id": "https://openalex.org/fields/12", "display_name": "f"}} for t in r[2]] for r in rows], pa.list_(topic)),
            "keywords": pa.array([[{"id": f"https://openalex.org/keywords/{k}", "display_name": k, "score": 0.5} for k in r[3]] for r in rows], pa.list_(keyword)),
            "is_xpac": pa.array([len(r) > 5 and r[5] for r in rows], pa.bool_()),
            "primary_topic": pa.array([{"id": "x", "field": {"id": "https://openalex.org/fields/12", "display_name": "f"}} if r[2] and (len(r) < 5 or r[4]) else None for r in rows], primary),
        }
    )

def test_openalex_pilot_slices_projects_and_resumes(tmp_path):
    root = tmp_path / "s3" / "openalex" / "data" / "parquet"
    files = []
    for part, rows in enumerate([[(1, 2010, [10, 11], ["geography"]), (2, 2024, [10], []), (5, 2012, [13], ["y"], False)], [(3, 2015, [], ["x"]), (4, 2019, [12], ["physics", "optics"])]]):
        path = root / "works" / f"updated_date=2026-01-0{part + 1}" / "part_0000.parquet"
        path.parent.mkdir(parents=True)
        pq.write_table(works_table(rows), path)
        files.append({"url": f"s3://openalex/data/parquet/works/updated_date=2026-01-0{part + 1}/part_0000.parquet", "meta": {"content_length": path.stat().st_size, "record_count": len(rows)}})
    total = sum(f["meta"]["content_length"] for f in files)
    (root / "works" / "manifest.json").write_text(json.dumps({"date": "2026-09-23", "record_count": 5, "content_length": total, "files": files}))
    fs = pafs.LocalFileSystem()
    kwargs = dict(fs=fs, root=str(root), bronze=tmp_path / "bronze", manifest=tmp_path / "openalex.json", stride=1, min_free=0)
    first = openalex_slice.pilot(**kwargs)
    assert (first["files"], first["rows_in"], first["rows_out"]) == (2, 5, 2)
    assert first["projected_full_read_bytes"] == first["bytes_read"]
    parts = sorted((tmp_path / "bronze" / "openalex" / "2026-09-23" / "pilot" / openalex_slice.SLICE_VERSION / "parts").glob("*.parquet"))
    got = pa.concat_tables([pq.read_table(p) for p in parts]).to_pylist()
    assert got == [
        {"work": 1, "year": 2010, "topics": [10, 11], "keywords": ["geography"], "field": 12, "xpac": False},
        {"work": 4, "year": 2019, "topics": [12], "keywords": ["physics", "optics"], "field": 12, "xpac": False},
    ]
    assert (first["distinct_works"], first["projected_rows_out_dedup"]) == (2, 2)
    second = openalex_slice.pilot(**kwargs)
    assert (second["files"], second["skipped"]) == (0, 2)
    pinned = json.loads((tmp_path / "openalex.json").read_text())
    assert pinned["snapshot_date"] == "2026-09-23" and pinned["license"] == "CC0-1.0"

def test_openalex_refuses_a_file_whose_size_disagrees(tmp_path):
    root = tmp_path / "s3" / "openalex" / "data" / "parquet"
    path = root / "works" / "updated_date=2026-01-01" / "part_0000.parquet"
    path.parent.mkdir(parents=True)
    pq.write_table(works_table([(1, 2010, [10], [])]), path)
    files = [{"url": "s3://openalex/data/parquet/works/updated_date=2026-01-01/part_0000.parquet", "meta": {"content_length": 1, "record_count": 1}}]
    (root / "works" / "manifest.json").write_text(json.dumps({"date": "2026-09-23", "record_count": 1, "content_length": 1, "files": files}))
    with pytest.raises(RuntimeError, match="manifest lists"):
        openalex_slice.pilot(fs=pafs.LocalFileSystem(), root=str(root), bronze=tmp_path / "bronze", manifest=tmp_path / "m.json", stride=1, min_free=0)

def test_pinned_science4cast_bronze_matches_its_manifest():
    target = BRONZE / "science4cast" / science4cast.PUBLISHED / science4cast.FILE
    if not target.exists():
        pytest.skip(f"no Science4Cast bronze at {BRONZE}; set RESEARCH_EVAL_DATA")
    got = science4cast.verify()
    assert (got["size"], got["md5"]) == (science4cast.SIZE, science4cast.MD5)
    assert got["members"] > 0

def write_snapshot(root, partitions):
    files = []
    for date, rows in partitions:
        path = root / "works" / f"updated_date={date}" / "part_0000.parquet"
        path.parent.mkdir(parents=True)
        pq.write_table(works_table(rows), path)
        files.append({"url": f"s3://openalex/data/parquet/works/updated_date={date}/part_0000.parquet", "meta": {"content_length": path.stat().st_size, "record_count": len(rows)}})
    doc = {"date": "2026-09-23", "record_count": sum(len(r) for _, r in partitions), "content_length": sum(f["meta"]["content_length"] for f in files), "files": files}
    (root / "works" / "manifest.json").write_text(json.dumps(doc))

def test_a_work_in_two_partitions_keeps_its_latest_row(tmp_path):
    root = tmp_path / "s3" / "openalex" / "data" / "parquet"
    write_snapshot(root, [
        ("2025-01-01", [(7, 2010, [10], ["old"]), (8, 2011, [11], ["a"])]),
        ("2026-03-01", [(7, 2010, [10, 12], ["new"]), (9, 2012, [13], ["b"], True, True)]),
    ])
    result = openalex_slice.pilot(fs=pafs.LocalFileSystem(), root=str(root), bronze=tmp_path / "bronze", manifest=tmp_path / "m.json", stride=1, min_free=0)
    assert (result["rows_out"], result["distinct_works"], result["distinct_works_non_xpac"]) == (4, 3, 2)
    dedup = tmp_path / "bronze" / "openalex" / "2026-09-23" / "pilot" / openalex_slice.SLICE_VERSION / "dedup"
    rows = pa.concat_tables([pq.read_table(p) for p in sorted(dedup.glob("*.parquet"))]).to_pylist()
    by_work = {r["work"]: r for r in rows}
    assert sorted(by_work) == [7, 8, 9]
    assert by_work[7]["keywords"] == ["new"] and by_work[7]["topics"] == [10, 12]

def test_full_slice_is_gated_on_the_pilot_projection(tmp_path):
    ref = openalex_slice.API_REFERENCE["count"]
    near = {"projected_rows_out_non_xpac_dedup": int(ref * 1.10)}
    far = {"projected_rows_out_non_xpac_dedup": int(ref * 1.26)}
    assert openalex_slice.gate(near, None)["passed"]
    with pytest.raises(openalex_slice.GateError):
        openalex_slice.gate(far, None)
    with pytest.raises(openalex_slice.GateError):
        openalex_slice.gate(far, "   ")
    verdict = openalex_slice.gate(far, "xpac works counted by design")
    assert verdict["override_reason"] == "xpac works counted by design" and not verdict["passed"]
    missing = tmp_path / "no-pilot.json"
    with pytest.raises(openalex_slice.GateError, match="run the pilot first"):
        openalex_slice.full_slice(pilot_result=missing)
    stale = tmp_path / "stale.json"
    stale.write_text(json.dumps({"slice_version": "v1", "within_limits": True}))
    with pytest.raises(openalex_slice.GateError, match="rerun the pilot"):
        openalex_slice.full_slice(pilot_result=stale)
