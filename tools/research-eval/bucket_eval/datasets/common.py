from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[4]
BRONZE = Path(os.environ.get("BUCKET_EVAL_BRONZE", REPO / "_intake" / "research-eval"))
MANIFESTS = Path(__file__).resolve().parent / "manifests"
MIN_FREE_BYTES = 60 * 1024**3

class ChecksumError(RuntimeError):
    pass

def digest(path: Path, algo: str) -> str:
    h = hashlib.new(algo)
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()

def require_free(path: Path, need: int = MIN_FREE_BYTES) -> None:
    path.mkdir(parents=True, exist_ok=True)
    free = shutil.disk_usage(path).free
    if free < need:
        raise RuntimeError(f"{path} has {free / 1024**3:.1f} GB free; the pull needs {need / 1024**3:.0f} GB")

def read_manifest(path: Path) -> dict[str, Any] | None:
    return json.loads(path.read_text()) if path.exists() else None

def write_manifest(path: Path, doc: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")

def pin(path: Path, doc: dict[str, Any], fields: tuple[str, ...]) -> None:
    held = read_manifest(path)
    if held is not None:
        changed = [k for k in fields if k in held and held[k] != doc.get(k)]
        if changed:
            raise ChecksumError(f"{path.name}: {', '.join(changed)} disagree with the pinned manifest")
    write_manifest(path, doc)
