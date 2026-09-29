from __future__ import annotations

import csv
from pathlib import Path

from ..schema import SCHEMA, Series, SeriesError, validate

MEASURES = {"market_cap": "USD market capitalization", "revenue": "USD revenue"}
SOURCE_URL = "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html"
LICENSE = "Derived shares from Damodaran Online public data, cited; raw data not redistributed"


def load(
    path: Path,
    industries: list[str],
    retrieved: str,
    measure: str = "market_cap",
    slug: str = "damodaran-industries",
    omega: float | None = None,
) -> Series:
    if measure not in MEASURES:
        raise SeriesError("E_SCHEMA", "measure", f"one of {', '.join(MEASURES)}")
    table: dict[int, dict[str, float]] = {}
    with open(path, newline="") as fh:
        reader = csv.DictReader(fh)
        missing = {"year", "industry", measure} - set(reader.fieldnames or ())
        if missing:
            raise SeriesError("E_SCHEMA", str(path), f"missing columns {sorted(missing)}")
        for n, row in enumerate(reader, start=2):
            where = f"{path}:{n}"
            ind = row["industry"].strip()
            if ind not in industries:
                raise SeriesError("E_KEYS", where, f"unknown industry {ind!r}")
            try:
                year, value = int(row["year"]), float(row[measure])
            except ValueError as exc:
                raise SeriesError("E_NONFINITE", where, str(exc)) from exc
            if value < 0:
                raise SeriesError("E_NEG", where, f"negative {measure} for {ind}")
            table.setdefault(year, {})
            table[year][ind] = table[year].get(ind, 0.0) + value
    slices = []
    for year in sorted(table):
        row = {ind: table[year].get(ind, 0.0) for ind in industries}
        total = sum(row.values())
        if total <= 0:
            raise SeriesError("E_ZERO_SUM", f"{path}:year {year}", "no positive values")
        slices.append({"t": year, "weights": {k: v / total for k, v in row.items()}})
    doc = {
        "schema": SCHEMA,
        "name": f"Industry share of {MEASURES[measure].split(' ', 1)[1]}",
        "slug": slug,
        "kind": "markets",
        "unit": f"share of {MEASURES[measure]}",
        "time_unit": "year",
        "primes": list(industries),
        "slices": slices,
        "source": {
            "title": "Aswath Damodaran, Damodaran Online industry datasets",
            "url": SOURCE_URL,
            "retrieved": retrieved,
            "license": LICENSE,
        },
    }
    if omega is not None:
        doc["omega"] = omega
    return validate(doc)
