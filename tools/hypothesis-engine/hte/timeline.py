from __future__ import annotations

import logging
import math
import threading
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Sequence

logger = logging.getLogger("hte.timeline")

class _ClampLog:

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._events: list[dict[str, int]] = []

    def record(self, *, year: int, span_start: int) -> None:
        with self._lock:
            self._events.append({"year": year, "span_start": span_start})

    def snapshot(self) -> list[dict[str, int]]:
        with self._lock:
            return list(self._events)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()

_CLAMP_LOG = _ClampLog()

def clamp_log() -> list[dict[str, int]]:
    return _CLAMP_LOG.snapshot()

def reset_clamp_log() -> None:
    _CLAMP_LOG.reset()

def bce_to_astronomical(n: int) -> int:
    if n < 1:
        raise ValueError("a BCE year is counted from 1, not 0 or negative")
    return -(n - 1)

def ce_to_astronomical(n: int) -> int:
    if n < 1:
        raise ValueError("a CE year is counted from 1, not 0 or negative")
    return n

def astronomical_to_calendar(year: int) -> tuple[int, str]:
    if year >= 1:
        return year, "CE"
    return 1 - year, "BCE"

def bp_to_astronomical(bp: float, base_year: int = 1950) -> float:
    return base_year - bp

def ka_to_astronomical(ka: float, base_year: int = 1950) -> float:
    return bp_to_astronomical(ka * 1000.0, base_year)

class UncertaintyKind(str, Enum):
    POINT = "point"
    UNIFORM = "uniform"
    NORMAL = "normal"
    SAMPLED = "sampled"

@dataclass(frozen=True)
class Uncertainty:
    kind: UncertaintyKind = UncertaintyKind.POINT
    params: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def point(cls) -> "Uncertainty":
        return cls(UncertaintyKind.POINT, {})

    @classmethod
    def uniform(cls, min_year: float, max_year: float) -> "Uncertainty":
        if max_year < min_year:
            raise ValueError("max_year must be >= min_year")
        return cls(UncertaintyKind.UNIFORM, {"min": min_year, "max": max_year})

    @classmethod
    def normal(cls, mu: float, sigma: float) -> "Uncertainty":
        if sigma < 0:
            raise ValueError("sigma must be >= 0")
        return cls(UncertaintyKind.NORMAL, {"mu": mu, "sigma": sigma})

    @classmethod
    def sampled(cls, pdf: list[tuple[float, float]]) -> "Uncertainty":
        return cls(UncertaintyKind.SAMPLED, {"pdf": [list(p) for p in pdf]})

    def to_dict(self) -> dict:
        return {"kind": self.kind.value, "params": self.params}

    @classmethod
    def from_dict(cls, d: dict) -> "Uncertainty":
        return cls(kind=UncertaintyKind(d["kind"]), params=dict(d.get("params", {})))

@dataclass(frozen=True)
class Interval:
    start: int
    end: int
    uncertainty: Uncertainty = field(default_factory=Uncertainty.point)

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise ValueError(f"interval start ({self.start}) must be <= end ({self.end})")

    def to_dict(self) -> dict:
        return {"start": self.start, "end": self.end, "uncertainty": self.uncertainty.to_dict()}

    @classmethod
    def from_dict(cls, d: dict) -> "Interval":
        unc = Uncertainty.from_dict(d["uncertainty"]) if "uncertainty" in d else Uncertainty.point()
        return cls(start=d["start"], end=d["end"], uncertainty=unc)

class AllenRelation(str, Enum):
    BEFORE = "before"
    AFTER = "after"
    MEETS = "meets"
    MET_BY = "met-by"
    STARTS = "starts"
    STARTED_BY = "started-by"
    FINISHES = "finishes"
    FINISHED_BY = "finished-by"
    DURING = "during"
    CONTAINS = "contains"
    OVERLAPS = "overlaps"
    OVERLAPPED_BY = "overlapped-by"
    EQUAL = "equal"

_CONVERSE: dict[AllenRelation, AllenRelation] = {
    AllenRelation.BEFORE: AllenRelation.AFTER,
    AllenRelation.AFTER: AllenRelation.BEFORE,
    AllenRelation.MEETS: AllenRelation.MET_BY,
    AllenRelation.MET_BY: AllenRelation.MEETS,
    AllenRelation.STARTS: AllenRelation.STARTED_BY,
    AllenRelation.STARTED_BY: AllenRelation.STARTS,
    AllenRelation.FINISHES: AllenRelation.FINISHED_BY,
    AllenRelation.FINISHED_BY: AllenRelation.FINISHES,
    AllenRelation.DURING: AllenRelation.CONTAINS,
    AllenRelation.CONTAINS: AllenRelation.DURING,
    AllenRelation.OVERLAPS: AllenRelation.OVERLAPPED_BY,
    AllenRelation.OVERLAPPED_BY: AllenRelation.OVERLAPS,
    AllenRelation.EQUAL: AllenRelation.EQUAL,
}

def converse(relation: AllenRelation) -> AllenRelation:
    return _CONVERSE[relation]

def relate(a: Interval, b: Interval) -> AllenRelation:
    if a.start == a.end and b.start == b.end and a.start == b.start:
        return AllenRelation.EQUAL
    if a.end < b.start:
        return AllenRelation.BEFORE
    if b.end < a.start:
        return AllenRelation.AFTER
    if a.end == b.start:
        return AllenRelation.MEETS
    if b.end == a.start:
        return AllenRelation.MET_BY
    if a.start == b.start and a.end == b.end:
        return AllenRelation.EQUAL
    if a.start == b.start and a.end < b.end:
        return AllenRelation.STARTS
    if a.start == b.start:
        return AllenRelation.STARTED_BY
    if a.end == b.end and a.start < b.start:
        return AllenRelation.FINISHED_BY
    if a.end == b.end:
        return AllenRelation.FINISHES
    if b.start < a.start and a.end < b.end:
        return AllenRelation.DURING
    if a.start < b.start and b.end < a.end:
        return AllenRelation.CONTAINS
    if a.start < b.start:
        return AllenRelation.OVERLAPS
    return AllenRelation.OVERLAPPED_BY

class Resolution(str, Enum):
    YEAR = "year"
    DECADE = "decade"
    CENTURY = "century"
    MILLENNIUM = "millennium"
    ERA = "era"

RESOLUTION_WIDTH_YEARS: dict[Resolution, int] = {
    Resolution.YEAR: 1,
    Resolution.DECADE: 10,
    Resolution.CENTURY: 100,
    Resolution.MILLENNIUM: 1000,
    Resolution.ERA: 10_000,
}

def bin_bounds(year: int, resolution: Resolution) -> tuple[int, int]:
    width = RESOLUTION_WIDTH_YEARS[resolution]
    bucket = math.floor(year / width)
    start = bucket * width
    return start, start + width - 1

def bin(interval: Interval, resolution: Resolution) -> Interval:
    start, end = bin_bounds(interval.start, resolution)
    return Interval(start=start, end=end)

DEFAULT_SPAN_START = -20_000
DEFAULT_BIN_WIDTH = 100

def auto_resolution(
    intervals: Sequence[Interval],
    *,
    min_bins: int = 8,
    max_bins: int = 40,
) -> Resolution:
    if not intervals:
        return Resolution.CENTURY
    start = min(iv.start for iv in intervals)
    end = max(iv.end for iv in intervals)
    span = max(1, end - start + 1)

    def n_bins(resolution: Resolution) -> int:
        return math.ceil(span / RESOLUTION_WIDTH_YEARS[resolution])

    def distance(n: int) -> int:
        if min_bins <= n <= max_bins:
            return 0
        return min(abs(n - min_bins), abs(n - max_bins))

    best: tuple[Resolution, int] | None = None
    for resolution in Resolution:
        n = n_bins(resolution)
        if min_bins <= n <= max_bins:
            return resolution
        if best is None or distance(n) < distance(best[1]):
            best = (resolution, n)
    return best[0]

def bin_label(bin_start: int, resolution: Resolution) -> str:
    if RESOLUTION_WIDTH_YEARS[resolution] == 1:
        return str(bin_start)
    return f"{bin_start}s"

def time_bin_index(year: int, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH) -> int:
    if year < span_start:
        logger.warning(
            "hte.timeline.time_bin_index: year %d sits %d year(s) before span_start %d; "
            "clamped to bin 0 rather than raising", year, span_start - year, span_start,
        )
        _CLAMP_LOG.record(year=year, span_start=span_start)
        return 0
    return (year - span_start) // bin_width

class NodeLevel(str, Enum):
    ERA = "era"
    PERIOD = "period"
    EVENT = "event"
    YEAR = "year"

@dataclass
class DatePosterior:
    mean: float
    hpd_68: tuple[float, float]
    hpd_95: tuple[float, float]
    model: str

    def to_dict(self) -> dict:
        return {"mean": self.mean, "hpd_68": list(self.hpd_68), "hpd_95": list(self.hpd_95), "model": self.model}

    @classmethod
    def from_dict(cls, d: dict) -> "DatePosterior":
        return cls(mean=d["mean"], hpd_68=tuple(d["hpd_68"]), hpd_95=tuple(d["hpd_95"]), model=d["model"])

def combine_date_observations(observations: list[tuple[float, float]], model: str = "gaussian-precision-v0") -> DatePosterior:
    if not observations:
        raise ValueError("combine_date_observations needs at least one observation")
    weights = [1.0 / (sigma ** 2) if sigma > 0 else float("inf") for _, sigma in observations]
    if any(math.isinf(w) for w in weights):
        exact_means = [mean for (mean, sigma), w in zip(observations, weights) if math.isinf(w)]
        mean = sum(exact_means) / len(exact_means)
        return DatePosterior(mean=mean, hpd_68=(mean, mean), hpd_95=(mean, mean), model=model)
    total_w = sum(weights)
    mean = sum(w * m for w, (m, _) in zip(weights, observations)) / total_w
    pooled_sigma = math.sqrt(1.0 / total_w)
    return DatePosterior(
        mean=mean,
        hpd_68=(mean - pooled_sigma, mean + pooled_sigma),
        hpd_95=(mean - 1.96 * pooled_sigma, mean + 1.96 * pooled_sigma),
        model=model,
    )

@dataclass
class Period:
    id: str
    level: NodeLevel
    interval: Interval
    label: str = ""
    parents: list[str] = field(default_factory=list)
    date_posterior: DatePosterior | None = None
    region: list[str] = field(default_factory=list)
    disputed: bool = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "level": self.level.value,
            "interval": self.interval.to_dict(),
            "label": self.label,
            "parents": list(self.parents),
            "date_posterior": self.date_posterior.to_dict() if self.date_posterior else None,
            "region": list(self.region),
            "disputed": self.disputed,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Period":
        return cls(
            id=d["id"],
            level=NodeLevel(d["level"]),
            interval=Interval.from_dict(d["interval"]),
            label=d.get("label", ""),
            parents=list(d.get("parents", [])),
            date_posterior=DatePosterior.from_dict(d["date_posterior"]) if d.get("date_posterior") else None,
            region=list(d.get("region", [])),
            disputed=bool(d.get("disputed", False)),
        )
