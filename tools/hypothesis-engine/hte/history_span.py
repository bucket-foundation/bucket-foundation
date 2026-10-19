from __future__ import annotations

from typing import Any, Mapping

from .timeline import Interval, NodeLevel, Period, Resolution, Uncertainty, UncertaintyKind

PRECISION_RESOLUTION: dict[str, Resolution] = {
    "day": Resolution.YEAR,
    "month": Resolution.YEAR,
    "year": Resolution.YEAR,
    "decade": Resolution.DECADE,
    "century": Resolution.CENTURY,
    "millennium": Resolution.MILLENNIUM,
    "ka": Resolution.MILLENNIUM,
    "10ka": Resolution.ERA,
    "100ka": Resolution.ERA,
}

BOUND_KEYS = ("start_min", "start_max", "end_min", "end_max")

def precision_resolution(precision: str) -> Resolution:
    if precision not in PRECISION_RESOLUTION:
        raise ValueError(f"unknown span precision {precision!r}")
    return PRECISION_RESOLUTION[precision]

def _bounds(row: Mapping[str, Any]) -> tuple[int, int, int, int]:
    missing = [k for k in BOUND_KEYS if k not in row]
    if missing:
        raise ValueError(f"span row lacks {', '.join(missing)}")
    start_min, start_max, end_min, end_max = (int(row[k]) for k in BOUND_KEYS)
    if not (start_min <= start_max and end_min <= end_max and start_min <= end_min and start_max <= end_max):
        raise ValueError(f"span bounds out of order: {start_min}, {start_max}, {end_min}, {end_max}")
    return start_min, start_max, end_min, end_max

def bounds_uncertainty(start_min: int, start_max: int, end_min: int, end_max: int) -> Uncertainty:
    if start_min == start_max and end_min == end_max:
        return Uncertainty.point()
    params = dict(Uncertainty.uniform(start_min, end_max).params)
    params["endpoints"] = {"start": [start_min, start_max], "end": [end_min, end_max]}
    return Uncertainty(UncertaintyKind.UNIFORM, params)

def factoid_interval(row: Mapping[str, Any]) -> Interval:
    start_min, start_max, end_min, end_max = _bounds(row)
    start, end = int(row["start_year"]), int(row["end_year"])
    if not (start_min <= start <= start_max and end_min <= end <= end_max):
        raise ValueError(f"nominal years {start}..{end} fall outside their bounds")
    return Interval(start, end, bounds_uncertainty(start_min, start_max, end_min, end_max))

def period_from_row(row: Mapping[str, Any]) -> Period:
    start_min, start_max, end_min, end_max = _bounds(row)
    return Period(
        id=str(row["id"]),
        level=NodeLevel.PERIOD,
        interval=Interval(start_min, end_max, bounds_uncertainty(start_min, start_max, end_min, end_max)),
        label=str(row.get("label", "")),
        region=list(row.get("spatial_qids") or []),
        disputed=bool(row.get("disputed", False)),
    )
