from __future__ import annotations

import importlib
import sys
from pathlib import Path

from ..paths import REPO

def _bm():
    path = str(REPO / "tools" / "bucketmath")
    if path not in sys.path:
        sys.path.insert(0, path)
    return importlib.import_module("bm")

def lookup(args: dict, out_dir: Path) -> dict:
    bm = _bm()
    rows = bm.lookup(args["q"], bm.load_manifest(), max(1, min(int(args.get("limit", 20)), 50)))
    for r in rows:
        r["cite"] = f"[bm-open:{r['name']}]" if r["status"] == "open" else f"[bm:{r['name']}]"
    return {"ok": True, "query": args["q"], "n_results": len(rows), "results": rows}
