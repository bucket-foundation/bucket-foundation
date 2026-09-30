from __future__ import annotations

import json
from pathlib import Path

from ..schema import SCHEMA, Series, SeriesError, validate
from .timeparse import year_fraction

PERIODS = {"year": 1.0, "quarter": 0.25, "month": 1 / 12}


def load(
    path: Path, primes: list[str], name: str, slug: str, source: dict, period: str = "year", omega: float | None = None
) -> Series:
    if period not in PERIODS:
        raise SeriesError("E_SCHEMA", "period", f"one of {', '.join(PERIODS)}")
    width = PERIODS[period]
    counts: dict[float, dict[str, float]] = {}
    for n, line in enumerate(Path(path).read_text().splitlines(), start=1):
        if not line.strip():
            continue
        try:
            doc = json.loads(line)
        except json.JSONDecodeError as exc:
            raise SeriesError("E_SCHEMA", f"{path}:{n}", str(exc)) from exc
        t = year_fraction(doc.get("date"), f"{path}:{n}.date")
        bucket = round((t // width) * width, 6)
        for tag in doc.get("tags", []):
            if tag not in primes:
                continue
            counts.setdefault(bucket, dict.fromkeys(primes, 0.0))[tag] += 1.0
    slices = [{"t": t, "weights": counts[t]} for t in sorted(counts)]
    out = {
        "schema": SCHEMA,
        "name": name,
        "slug": slug,
        "kind": "corpus",
        "unit": "document count",
        "time_unit": "year",
        "primes": primes,
        "slices": slices,
        "source": source,
    }
    if omega is not None:
        out["omega"] = omega
    return validate(out)
