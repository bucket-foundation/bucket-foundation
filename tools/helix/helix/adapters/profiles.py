from __future__ import annotations

import json
from pathlib import Path

from ..schema import SCHEMA, Series, SeriesError, validate
from .timeparse import year_fraction


def load(path: Path, name: str, slug: str, source: dict, omega: float | None = None) -> Series:
    snaps = json.loads(Path(path).read_text())
    if not isinstance(snaps, list) or not snaps or "branches" not in snaps[0]:
        raise SeriesError("E_SCHEMA", str(path), "expected a list of {timestamp, branches}")
    primes = list(snaps[0]["branches"])
    slices, dropped = [], []
    for i, s in enumerate(snaps):
        if set(s.get("branches", {})) != set(primes):
            raise SeriesError("E_KEYS", f"{path}[{i}].branches", "branch names differ from the first snapshot")
        if sum(s["branches"].values()) <= 0:
            dropped.append(str(s["timestamp"]))
            continue
        slices.append({"t": year_fraction(s["timestamp"], f"{path}[{i}].timestamp"), "weights": s["branches"]})
    doc = {
        "schema": SCHEMA,
        "name": name,
        "slug": slug,
        "kind": "profile",
        "unit": "branch weight",
        "time_unit": "year",
        "primes": primes,
        "slices": slices,
        "source": source,
        "dropped": dropped,
    }
    if omega is not None:
        doc["omega"] = omega
    return validate(doc)
