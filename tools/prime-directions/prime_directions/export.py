from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .model import PrimeResult
from .render import angles

SCHEMA = "bucket.prime-directions/1"

def to_dict(result: PrimeResult, top_n: int = 20, include_docs: bool = True, precision: int = 3) -> dict:
    ang = angles(result.k)
    out = {
        "schema": SCHEMA,
        "kind": "corpus",
        "corpus": result.corpus,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "shape": {"docs": result.shape[0], "terms": result.shape[1]},
        "density": round(result.density, 6),
        "orthogonality_max_abs_error": result.orthogonality,
        "params": result.params,
        "score_scale": {"kind": "standardized", "mean": 0, "sd": 1},
        "components": [
            {
                "index": k + 1,
                "angle_deg": round(float(np.degrees(ang[k])) % 360, 3),
                "singular_value": round(float(result.singular_values[k]), 4),
                "variance_ratio": round(float(result.variance_ratio[k]), 6),
                "top_terms": [{"term": t, "weight": round(w, 5)} for t, w in result.top_terms(k, top_n)],
                "bottom_terms": [{"term": t, "weight": round(w, 5)} for t, w in result.top_terms(k, top_n, sign=-1)],
            }
            for k in range(result.k)
        ],
    }
    if include_docs:
        rounded = np.round(result.scores, precision)
        out["docs"] = [
            {"id": d, "title": t, "scores": rounded[i].tolist()}
            for i, (d, t) in enumerate(zip(result.doc_ids, result.titles))
        ]
    return out

def write_json(data: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    return path
