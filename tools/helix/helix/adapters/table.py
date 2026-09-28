from __future__ import annotations

import json
from pathlib import Path

from ..schema import SCHEMA, Series, SeriesError, validate

def load(path: Path) -> Series:
    doc = json.loads(Path(path).read_text())
    rows = doc.pop("rows", None)
    if not isinstance(rows, list):
        raise SeriesError("E_SCHEMA", "$.rows", "expected a list of {t, prime, value}")
    table: dict[float, dict[str, float]] = {}
    for i, r in enumerate(rows):
        if not isinstance(r, dict) or not {"t", "prime", "value"} <= set(r):
            raise SeriesError("E_SCHEMA", f"$.rows[{i}]", "needs t, prime, value")
        table.setdefault(r["t"], {})[r["prime"]] = r["value"]
    doc.setdefault("schema", SCHEMA)
    doc["slices"] = [{"t": t, "weights": table[t]} for t in sorted(table)]
    return validate(doc)
