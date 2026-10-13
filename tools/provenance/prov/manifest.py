from __future__ import annotations

import datetime as dt
import hashlib
import json
from pathlib import Path

AUTHORS = {"founder", "ai", "founder+ai", "source"}
VISIBILITY = {"public", "private"}
V1_AUTHOR = {
    "founder-verbatim+ai": ("founder+ai", "public"),
    "mixed": ("founder+ai", "public"),
    "ai-draft": ("ai", "public"),
    "ai-output-private": ("ai", "private"),
    "source-data": ("source", "public"),
}
FIELDS = ["author", "bytes", "created", "path", "sealed_sha256", "sha256", "v", "visibility"]


class ManifestError(ValueError):
    pass


def read_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def canonical(row: dict) -> bytes:
    return json.dumps(row, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def validate(row: dict) -> dict:
    if sorted(row) != FIELDS:
        raise ManifestError(f"fields {sorted(row)} differ from {FIELDS}")
    if row["v"] != 2:
        raise ManifestError("v must be 2")
    if row["author"] not in AUTHORS:
        raise ManifestError(f"author {row['author']!r}")
    if row["visibility"] not in VISIBILITY:
        raise ManifestError(f"visibility {row['visibility']!r}")
    if len(row["sha256"]) != 64:
        raise ManifestError("sha256 must be 64 hex")
    if row["path"].startswith("/home/"):
        raise ManifestError("path must be ~-relative or repo-relative")
    if row["visibility"] == "public" and row["sealed_sha256"] is not None:
        raise ManifestError("public rows carry no sealed hash")
    return row


def migrate_row(v1: dict, created: str | None = None) -> dict:
    if "v" in v1:
        raise ManifestError("row is already v2")
    if v1["author"] not in V1_AUTHOR:
        raise ManifestError(f"unknown v1 author {v1['author']!r}")
    author, visibility = V1_AUTHOR[v1["author"]]
    row = {
        "v": 2,
        "path": v1["path"],
        "sha256": v1["sha256"],
        "bytes": v1["bytes"],
        "author": author,
        "visibility": visibility,
        "sealed_sha256": None,
        "created": created,
    }
    return validate(row)


def display_path(p: Path) -> str:
    home = Path.home()
    p = p.expanduser().resolve()
    return "~/" + str(p.relative_to(home)) if p.is_relative_to(home) else str(p)


def file_row(p: Path, author: str, visibility: str) -> dict:
    p = p.expanduser()
    data = p.read_bytes()
    created = dt.datetime.fromtimestamp(p.stat().st_mtime, dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    row = {
        "v": 2,
        "path": display_path(p),
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
        "author": author,
        "visibility": visibility,
        "sealed_sha256": None,
        "created": created,
    }
    return validate(row)


def write_rows(path: Path, rows: list[dict]) -> None:
    path.write_bytes(b"".join(canonical(validate(r)) + b"\n" for r in rows))
