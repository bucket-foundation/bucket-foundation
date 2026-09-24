from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[4]
BRONZE = Path(os.environ.get("RESEARCH_EVAL_DATA") or REPO / "_intake" / "research-eval")
MANIFESTS = Path(__file__).resolve().parent / "manifests"
FLOOR_BYTES = 30 * 1024**3
GB = 1024**3

class ChecksumError(RuntimeError):
    pass

def digest(path: Path, algo: str) -> str:
    h = hashlib.new(algo)
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()

class DiskFloorError(RuntimeError):
    pass

def floor_for(transient: int) -> int:
    return FLOOR_BYTES + max(0, transient)

def require_free(path: Path, transient: int = 0, *, need: int | None = None, free: int | None = None) -> None:
    want = floor_for(transient) if need is None else need
    probe = path
    while not probe.exists() and probe != probe.parent:
        probe = probe.parent
    have = shutil.disk_usage(probe).free if free is None else free
    if have < want:
        raise DiskFloorError(f"{path} has {have / GB:.1f} GB free; the job needs {want / GB:.1f} GB, a {FLOOR_BYTES / GB:.0f} GB floor plus {max(0, want - FLOOR_BYTES) / GB:.1f} GB transient")
    path.mkdir(parents=True, exist_ok=True)

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
