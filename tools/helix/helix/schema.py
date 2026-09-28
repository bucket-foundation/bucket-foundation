from __future__ import annotations

import csv
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SCHEMA = "helix.series/v1"
KINDS = ("profile", "work", "longtermism", "topics", "markets", "corpus")
TIME_UNITS = ("year", "month", "day", "unix")
SLUG = re.compile(r"^[a-z0-9-]{1,64}$")
SOURCE_KEYS = ("title", "url", "retrieved", "license")
MIN_PRIMES = 2
MAX_PRIMES = 64

class SeriesError(ValueError):
    def __init__(self, code: str, path: str, message: str):
        super().__init__(f"{code} at {path}: {message}")
        self.code = code
        self.path = path

@dataclass(frozen=True)
class Series:
    name: str
    slug: str
    kind: str
    unit: str
    time_unit: str
    primes: tuple[str, ...]
    t: np.ndarray
    raw: np.ndarray
    source: dict
    omega: float | None = None
    dropped: tuple = field(default_factory=tuple)

    @property
    def shares(self) -> np.ndarray:
        return self.raw / self.raw.sum(axis=1, keepdims=True)

    @property
    def K(self) -> int:
        return len(self.primes)

    def omega_or_default(self) -> float:
        if self.omega is not None:
            return self.omega
        span = float(self.t[-1] - self.t[0])
        return 1.0 / span if span > 0 else 0.0

def _finite(x, path: str) -> float:
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x):
        raise SeriesError("E_NONFINITE", path, f"expected a finite number, got {x!r}")
    return float(x)

def validate(doc: dict) -> Series:
    if not isinstance(doc, dict) or doc.get("schema") != SCHEMA:
        raise SeriesError("E_SCHEMA", "$.schema", f"expected {SCHEMA}")
    for key in ("name", "slug", "unit"):
        if not isinstance(doc.get(key), str) or not doc[key]:
            raise SeriesError("E_SCHEMA", f"$.{key}", "required string")
    if not SLUG.match(doc["slug"]):
        raise SeriesError("E_SCHEMA", "$.slug", "must match ^[a-z0-9-]{1,64}$")
    if doc.get("kind") not in KINDS:
        raise SeriesError("E_KIND", "$.kind", f"one of {', '.join(KINDS)}")
    if doc.get("time_unit") not in TIME_UNITS:
        raise SeriesError("E_SCHEMA", "$.time_unit", f"one of {', '.join(TIME_UNITS)}")
    omega = doc.get("omega")
    if omega is not None:
        omega = _finite(omega, "$.omega")
    primes = doc.get("primes")
    if (
        not isinstance(primes, list)
        or not all(isinstance(p, str) and p for p in primes)
        or not MIN_PRIMES <= len(primes) <= MAX_PRIMES
        or len(set(primes)) != len(primes)
    ):
        raise SeriesError("E_PRIMES", "$.primes", f"{MIN_PRIMES} to {MAX_PRIMES} unique names")
    source = doc.get("source")
    if not isinstance(source, dict) or not all(isinstance(source.get(k), str) and source[k] for k in SOURCE_KEYS):
        raise SeriesError("E_SOURCE", "$.source", f"requires {', '.join(SOURCE_KEYS)}")
    slices = doc.get("slices")
    if not isinstance(slices, list) or len(slices) < 2:
        raise SeriesError("E_SCHEMA", "$.slices", "at least 2 slices")
    ts, rows = [], []
    for i, sl in enumerate(slices):
        base = f"$.slices[{i}]"
        if not isinstance(sl, dict):
            raise SeriesError("E_SCHEMA", base, "slice must be an object")
        t = _finite(sl.get("t"), f"{base}.t")
        if ts and t <= ts[-1]:
            raise SeriesError("E_ORDER", f"{base}.t", "t must strictly increase")
        w = sl.get("weights")
        if not isinstance(w, dict) or set(w) != set(primes):
            raise SeriesError("E_KEYS", f"{base}.weights", "keys must equal primes")
        row = []
        for p in primes:
            v = _finite(w[p], f"{base}.weights.{p}")
            if v < 0:
                raise SeriesError("E_NEG", f"{base}.weights.{p}", "weights must be nonnegative")
            row.append(v)
        if sum(row) <= 0:
            raise SeriesError("E_ZERO_SUM", f"{base}.weights", "weights must sum above 0")
        ts.append(t)
        rows.append(row)
    return Series(
        name=doc["name"],
        slug=doc["slug"],
        kind=doc["kind"],
        unit=doc["unit"],
        time_unit=doc["time_unit"],
        primes=tuple(primes),
        t=np.array(ts, dtype=float),
        raw=np.array(rows, dtype=float),
        source=dict(source),
        omega=omega,
        dropped=tuple(doc.get("dropped", ())),
    )

def to_doc(s: Series) -> dict:
    doc = {
        "schema": SCHEMA,
        "name": s.name,
        "slug": s.slug,
        "kind": s.kind,
        "unit": s.unit,
        "time_unit": s.time_unit,
        "primes": list(s.primes),
        "slices": [
            {"t": float(t), "weights": {p: float(v) for p, v in zip(s.primes, row)}} for t, row in zip(s.t, s.raw)
        ],
        "source": dict(s.source),
    }
    if s.omega is not None:
        doc["omega"] = s.omega
    if s.dropped:
        doc["dropped"] = list(s.dropped)
    return doc

def load_csv(path: Path, meta: dict) -> Series:
    table: dict[float, dict[str, float]] = {}
    with open(path, newline="") as fh:
        reader = csv.DictReader(fh)
        missing = {"t", "prime", "value"} - set(reader.fieldnames or ())
        if missing:
            raise SeriesError("E_SCHEMA", str(path), f"missing columns {sorted(missing)}")
        for n, row in enumerate(reader, start=2):
            try:
                t, v = float(row["t"]), float(row["value"])
            except ValueError as exc:
                raise SeriesError("E_NONFINITE", f"{path}:{n}", str(exc)) from exc
            table.setdefault(t, {})[row["prime"]] = v
    doc = dict(meta)
    doc.setdefault("schema", SCHEMA)
    doc["slices"] = [{"t": t, "weights": table[t]} for t in sorted(table)]
    return validate(doc)

def load(path: Path) -> Series:
    path = Path(path)
    if path.suffix == ".csv":
        meta_path = path.with_suffix(".meta.json")
        if not meta_path.exists():
            raise SeriesError("E_SCHEMA", str(meta_path), "CSV input needs a .meta.json sidecar")
        return load_csv(path, json.loads(meta_path.read_text()))
    try:
        doc = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise SeriesError("E_SCHEMA", str(path), f"invalid JSON: {exc}") from exc
    return validate(doc)
