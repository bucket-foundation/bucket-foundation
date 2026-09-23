from __future__ import annotations

import io
import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.fs as pafs
import pyarrow.parquet as pq

from .common import BRONZE, MANIFESTS, digest, pin, require_free

BUCKET_ROOT = "openalex/data/parquet"
LICENSE = "CC0-1.0"
MAX_YEAR = 2023
SLICE_VERSION = "v2-primary-topic"
COLUMNS = ["id", "publication_year", "topics.list.element.id", "keywords.list.element.id", "primary_topic.field.id"]
READ_LIMIT = 150 * 1024**3
OUTPUT_LIMIT = 15 * 1024**3
MANIFEST = MANIFESTS / "openalex.json"
SCHEMA = pa.schema(
    [
        ("work", pa.int64()),
        ("year", pa.int16()),
        ("topics", pa.list_(pa.int32())),
        ("keywords", pa.list_(pa.string())),
        ("field", pa.int16()),
    ]
)

def s3() -> pafs.FileSystem:
    return pafs.S3FileSystem(anonymous=True, region="us-east-1")

class CountingReader(io.RawIOBase):
    def __init__(self, inner: Any) -> None:
        self.inner = inner
        self.bytes_read = 0

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return True

    def seek(self, offset: int, whence: int = 0) -> int:
        return self.inner.seek(offset, whence)

    def tell(self) -> int:
        return self.inner.tell()

    def read(self, n: int | None = -1) -> bytes:
        data = self.inner.read() if n is None or n < 0 else self.inner.read(n)
        self.bytes_read += len(data)
        return data

    def readinto(self, buffer: Any) -> int:
        data = self.read(len(buffer))
        buffer[: len(data)] = data
        return len(data)

@dataclass(frozen=True)
class Snapshot:
    date: str
    record_count: int
    content_length: int
    files: list[dict[str, Any]]
    manifest_path: Path
    manifest_sha256: str

def fetch_manifest(fs: pafs.FileSystem, root: str, bronze: Path) -> Snapshot:
    with fs.open_input_stream(f"{root}/works/manifest.json") as f:
        raw = f.read()
    doc = json.loads(raw)
    target = bronze / "openalex" / doc["date"] / "works-manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    return Snapshot(doc["date"], int(doc["record_count"]), int(doc["content_length"]), doc["files"], target, digest(target, "sha256"))

def _path(url: str, root: str) -> str:
    rel = url.split("/data/parquet/", 1)[1]
    return f"{root}/{rel}"

def _tail_int(col: pa.ChunkedArray | pa.Array, prefix: str, kind: pa.DataType) -> pa.Array:
    return pc.cast(pc.replace_substring_regex(col, pattern=f"^.*{prefix}", replacement=""), kind)

def _ids(lists: pa.ChunkedArray, prefix: str, kind: pa.DataType | None) -> pa.ListArray:
    combined = lists.combine_chunks()
    offsets = pc.subtract(combined.offsets, combined.offsets[0])
    ids = pc.struct_field(combined.flatten(), [0])
    values = pc.replace_substring_regex(ids, pattern=f"^.*{prefix}", replacement="")
    return pa.ListArray.from_arrays(offsets, pc.cast(values, kind) if kind is not None else values)

def transform(table: pa.Table) -> pa.Table:
    field_id = pc.struct_field(pc.struct_field(table["primary_topic"], [0]), [0])
    table = table.filter(pc.and_(pc.less_equal(table["publication_year"], MAX_YEAR), pc.is_valid(field_id)))
    if table.num_rows == 0:
        return SCHEMA.empty_table()
    field = pc.struct_field(pc.struct_field(table["primary_topic"], [0]), [0])
    out = pa.table(
        {
            "work": _tail_int(table["id"], "/W", pa.int64()),
            "year": pc.cast(table["publication_year"], pa.int16()),
            "topics": _ids(table["topics"], "/T", pa.int32()),
            "keywords": _ids(table["keywords"], "/keywords/", None),
            "field": _tail_int(field, "/fields/", pa.int16()),
        },
        schema=SCHEMA,
    )
    return out.filter(pc.greater(pc.list_value_length(out["topics"]), 0))

def slice_files(fs: pafs.FileSystem, root: str, files: list[dict[str, Any]], out_dir: Path) -> dict[str, int]:
    parts = out_dir / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    done_file = out_dir / "done.txt"
    done = set(done_file.read_text().split()) if done_file.exists() else set()
    totals = {"files": 0, "skipped": 0, "bytes_listed": 0, "bytes_read": 0, "bytes_written": 0, "rows_in": 0, "rows_out": 0}
    for entry in files:
        url = entry["url"]
        totals["bytes_listed"] += int(entry["meta"]["content_length"])
        if url in done:
            totals["skipped"] += 1
            continue
        path = _path(url, root)
        info = fs.get_file_info(path)
        if info.size != int(entry["meta"]["content_length"]):
            raise RuntimeError(f"{url}: {info.size} bytes, the manifest lists {entry['meta']['content_length']}")
        reader = CountingReader(fs.open_input_file(path))
        table = pq.ParquetFile(reader, pre_buffer=False).read(columns=COLUMNS)
        sliced = transform(table)
        name = path.split("/works/", 1)[1].replace("/", "__")
        target = parts / name
        pq.write_table(sliced, target, compression="zstd")
        totals["files"] += 1
        totals["bytes_read"] += reader.bytes_read
        totals["bytes_written"] += target.stat().st_size
        totals["rows_in"] += table.num_rows
        totals["rows_out"] += sliced.num_rows
        with done_file.open("a") as f:
            f.write(url + "\n")
    return totals

def pilot(fs: pafs.FileSystem | None = None, root: str = BUCKET_ROOT, bronze: Path = BRONZE, manifest: Path = MANIFEST, stride: int = 100, min_free: int | None = None) -> dict[str, Any]:
    fs = fs or s3()
    snap = fetch_manifest(fs, root, bronze)
    out_dir = bronze / "openalex" / snap.date / "pilot" / SLICE_VERSION
    if min_free is None:
        require_free(out_dir)
    else:
        require_free(out_dir, min_free)
    chosen = snap.files[::stride]
    started = time.monotonic()
    totals = slice_files(fs, root, chosen, out_dir)
    listed = max(totals["bytes_listed"], 1)
    projected_read = totals["bytes_read"] * snap.content_length / listed
    projected_out = totals["bytes_written"] * snap.content_length / listed
    pin(
        manifest,
        {
            "dataset": "openalex-works",
            "source": "s3://openalex/data/parquet/works/",
            "license": LICENSE,
            "snapshot_date": snap.date,
            "manifest_sha256": snap.manifest_sha256,
            "record_count": snap.record_count,
            "content_length": snap.content_length,
            "files": len(snap.files),
            "columns": COLUMNS,
            "max_year": MAX_YEAR,
            "slice_version": SLICE_VERSION,
            "rows_kept": "publication_year <= max_year, a primary topic with a field, and at least one topic",
        },
        ("snapshot_date", "manifest_sha256", "record_count", "content_length"),
    )
    return {
        "snapshot_date": snap.date,
        "manifest_sha256": snap.manifest_sha256,
        "slice_version": SLICE_VERSION,
        "stride": stride,
        "files_sampled": len(chosen),
        "files_total": len(snap.files),
        **totals,
        "seconds": round(time.monotonic() - started, 1),
        "projected_full_read_bytes": int(projected_read),
        "projected_full_output_bytes": int(projected_out),
        "projected_rows_out": int(totals["rows_out"] * snap.content_length / listed),
        "read_limit_bytes": READ_LIMIT,
        "output_limit_bytes": OUTPUT_LIMIT,
        "within_limits": projected_read <= READ_LIMIT and projected_out <= OUTPUT_LIMIT,
    }
