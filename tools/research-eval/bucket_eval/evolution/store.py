from __future__ import annotations

import datetime
import hashlib
import os
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, BinaryIO, Callable

from ..datasets.common import REPO, ChecksumError, digest, read_manifest, require_free, write_manifest

EVOLUTION_DATA = Path(os.environ.get("EVOLUTION_DATA") or REPO / "_intake" / "evolution")
MANIFESTS = Path(__file__).resolve().parent / "manifests"
MANIFEST_FIELDS = ("source", "revision", "license_rule", "url", "sha256", "bytes", "fetched", "tables")
PINNED = ("source", "revision", "license_rule", "url", "sha256", "bytes")

Opener = Callable[[str], BinaryIO]

def open_url(url: str) -> BinaryIO:
    req = urllib.request.Request(url, headers={"User-Agent": "bucket-foundation-evolution/1"})
    return urllib.request.urlopen(req, timeout=120)

@dataclass(frozen=True)
class Source:
    name: str
    revision: str
    url: str
    license_rule: str
    file: str
    transient: int
    sha256: str | None = None
    size: int | None = None

@dataclass
class Table:
    rows: int
    path: str
    sha256: str

@dataclass
class Manifest:
    source: str
    revision: str
    license_rule: str
    url: str
    sha256: str
    bytes: int
    fetched: str
    tables: dict[str, Table] = field(default_factory=dict)

    def to_doc(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "revision": self.revision,
            "license_rule": self.license_rule,
            "url": self.url,
            "sha256": self.sha256,
            "bytes": self.bytes,
            "fetched": self.fetched,
            "tables": {k: {"rows": t.rows, "path": t.path, "sha256": t.sha256} for k, t in sorted(self.tables.items())},
        }

    @classmethod
    def from_doc(cls, doc: dict[str, Any]) -> Manifest:
        missing = [k for k in MANIFEST_FIELDS if k not in doc]
        if missing:
            raise ValueError(f"manifest lacks {', '.join(missing)}")
        tables = {k: Table(rows=int(v["rows"]), path=str(v["path"]), sha256=str(v["sha256"])) for k, v in doc["tables"].items()}
        return cls(
            source=doc["source"],
            revision=doc["revision"],
            license_rule=doc["license_rule"],
            url=doc["url"],
            sha256=doc["sha256"],
            bytes=int(doc["bytes"]),
            fetched=doc["fetched"],
            tables=tables,
        )

def manifest_path(source: str, manifests: Path = MANIFESTS) -> Path:
    return manifests / f"{source}.json"

def load_manifest(source: str, manifests: Path = MANIFESTS) -> Manifest | None:
    doc = read_manifest(manifest_path(source, manifests))
    return Manifest.from_doc(doc) if doc is not None else None

def save_manifest(m: Manifest, manifests: Path = MANIFESTS) -> Path:
    path = manifest_path(m.source, manifests)
    held = read_manifest(path)
    if held is not None:
        changed = [k for k in PINNED if held.get(k) != getattr(m, k)]
        if changed:
            raise ChecksumError(f"{path.name}: {', '.join(changed)} disagree with the pinned manifest; bump the revision to change them")
    write_manifest(path, m.to_doc())
    return path

def source_dir(src: Source, data: Path = EVOLUTION_DATA) -> Path:
    return data / src.name / src.revision

def relative(path: Path, data: Path = EVOLUTION_DATA) -> str:
    try:
        return str(path.relative_to(data))
    except ValueError:
        return path.name

def fetch(src: Source, data: Path = EVOLUTION_DATA, opener: Opener = open_url, *, need: int | None = None, free: int | None = None) -> tuple[Path, str, int]:
    target_dir = source_dir(src, data) / "bronze"
    target = target_dir / src.file
    if not (target.exists() and (src.size is None or target.stat().st_size == src.size)):
        require_free(target_dir, src.transient, need=need, free=free)
        partial = target.with_name(target.name + ".part")
        h = hashlib.sha256()
        with opener(src.url) as body, partial.open("wb") as out:
            for block in iter(lambda: body.read(1 << 20), b""):
                h.update(block)
                out.write(block)
        partial.rename(target)
    sha = digest(target, "sha256")
    size = target.stat().st_size
    if src.sha256 is not None and sha != src.sha256:
        raise ChecksumError(f"{src.name} {src.revision}: sha256 {sha}, expected {src.sha256}")
    if src.size is not None and size != src.size:
        raise ChecksumError(f"{src.name} {src.revision}: {size} bytes, expected {src.size}")
    return target, sha, size

def today() -> str:
    return datetime.date.today().isoformat()
