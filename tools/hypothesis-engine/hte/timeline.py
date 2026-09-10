"""Timeline substrate: astronomical-year intervals and Allen's interval algebra.

Mirrors `Bucket.Timeline` (`papers/history-hypothesis-engine/lean/Bucket/Timeline.lean`)
and `TIMELINE-AND-COMBINATORICS-SPEC.md` §1: a signed integer year axis with no
BCE/CE gap, an uncertainty tag per interval, the thirteen Allen relations, and
the resolution ladder that buckets a point on the axis at five widths.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Sequence

# --------------------------------------------------------------------------
# Calendar mapping
# --------------------------------------------------------------------------
#
# `main.tex` §Timeline model: "A historical year n BCE maps to astronomical
# year -(n-1); n CE maps to astronomical year n." Astronomical year 0 is
# 1 BCE; there is no astronomical year between 0 and 1, matching the historical
# count having no year between 1 BCE and 1 CE.


def bce_to_astronomical(n: int) -> int:
    """`n` BCE as an astronomical year. `bce_to_astronomical(1) == 0`."""
    if n < 1:
        raise ValueError("a BCE year is counted from 1, not 0 or negative")
    return -(n - 1)


def ce_to_astronomical(n: int) -> int:
    """`n` CE as an astronomical year. `ce_to_astronomical(1) == 1`."""
    if n < 1:
        raise ValueError("a CE year is counted from 1, not 0 or negative")
    return n


def astronomical_to_calendar(year: int) -> tuple[int, str]:
    """The inverse of `bce_to_astronomical`/`ce_to_astronomical`: an
    astronomical year as a `(calendar_year, "BCE" | "CE")` pair."""
    if year >= 1:
        return year, "CE"
    return 1 - year, "BCE"


def bp_to_astronomical(bp: float, base_year: int = 1950) -> float:
    """A "years Before Present" date as an astronomical year, using the
    radiocarbon convention's 1950 CE baseline for "present"."""
    return base_year - bp


def ka_to_astronomical(ka: float, base_year: int = 1950) -> float:
    """A "ka" (kiloannum before present) date as an astronomical year, per
    `bp_to_astronomical` at the same 1950 baseline (`tab:pilot-periods`'s
    Younger Dryas range, "12.9 to 11.7 ka")."""
    return bp_to_astronomical(ka * 1000.0, base_year)


# --------------------------------------------------------------------------
# Uncertainty and Interval
# --------------------------------------------------------------------------


class UncertaintyKind(str, Enum):
    """The four-way split `TIMELINE-AND-COMBINATORICS-SPEC.md` §1's
    `uncertainty.distribution` field draws. `SAMPLED` stands in for the
    spec's `oxcal-posterior` case, whose payload is a sampled posterior curve
    rather than a closed-form distribution (`Bucket.Timeline.Uncertainty`)."""
    POINT = "point"
    UNIFORM = "uniform"
    NORMAL = "normal"
    SAMPLED = "sampled"


@dataclass(frozen=True)
class Uncertainty:
    """How an interval's boundary is known (`def:interval`). `params` carries
    the shape's own numbers: empty for `POINT`, `{"min", "max"}` for
    `UNIFORM`, `{"mu", "sigma"}` for `NORMAL`, `{"pdf"}` (a list of
    `(year, density)` pairs) for `SAMPLED`."""
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
    """A dated interval on the astronomical-year axis (`def:interval`,
    `Bucket.Timeline.Interval`). `start <= end` is checked at construction,
    matching the guarantee the Lean structure's `le` proof field carries."""
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


# --------------------------------------------------------------------------
# Allen's interval algebra
# --------------------------------------------------------------------------


class AllenRelation(str, Enum):
    """Allen's thirteen qualitative interval relations (`def:allen`,
    `Bucket.Timeline.AllenRelation`), the relation vocabulary for every
    sequence hypothesis and every edge between two dated nodes. Declaration
    order here is the fixed vocabulary-index order `hte.address` uses to
    encode the RELATION slot of a sequence address."""
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
    """The relation that holds between `b` and `a` whenever `relation` holds
    between `a` and `b`. `relate(a, b) == before` iff `relate(b, a) ==
    after`, and so on for each of the thirteen relations
    (`relate_converse_before_after`, `relate_converse_meets_metBy`); `equal`
    converses to itself."""
    return _CONVERSE[relation]


def relate(a: Interval, b: Interval) -> AllenRelation:
    """Decide which of the thirteen Allen relations holds between `a` and
    `b` (`Bucket.Timeline.relate`). The branches below are checked in the
    exact order the Lean source fixes them, each falling through to the
    next, so exactly one branch fires for any pair of intervals: this is
    `relate_total` (trivially, since this is an ordinary function) plus
    `relate_before_iff` through `relate_metBy_iff`'s closed-arithmetic
    characterization of the first four branches, carried over unchanged.
    """
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


# --------------------------------------------------------------------------
# Resolution ladder
# --------------------------------------------------------------------------


class Resolution(str, Enum):
    """The five bucket widths a dated point on the axis can carry
    (`TIMELINE-AND-COMBINATORICS-SPEC.md` §1). `ERA` sits above `MILLENNIUM`
    as the widest rung; unlike the other four, the source material fixes no
    numeric width for it (`period.level`'s era/period/event/year nesting is
    a node hierarchy, a separate axis from this precision ladder), so
    `ERA_WIDTH_YEARS` below is a documented placeholder rather than a value
    read off any spec."""
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
    Resolution.ERA: 10_000,  # placeholder: no fixed era width is stated in the source material
}


def bin_bounds(year: int, resolution: Resolution) -> tuple[int, int]:
    """The `[start, end)`-style inclusive bucket of width `resolution` that
    contains `year`, floor-dividing the axis at that width from year 0."""
    width = RESOLUTION_WIDTH_YEARS[resolution]
    bucket = math.floor(year / width)
    start = bucket * width
    return start, start + width - 1


def bin(interval: Interval, resolution: Resolution) -> Interval:
    """The resolution-ladder bucket covering `interval` (`TIMELINE-AND-
    COMBINATORICS-SPEC.md` §1): the bucket of the given width containing
    `interval.start`, returned as a point-uncertainty `Interval`. An
    interval that spans more than one bucket at this resolution is bucketed
    by its start, the interval's own anchor into the ladder, rather than
    split across every bucket it touches."""
    start, end = bin_bounds(interval.start, resolution)
    return Interval(start=start, end=end)


# --------------------------------------------------------------------------
# Century time bins for the combinatorial address scheme
# --------------------------------------------------------------------------
#
# `main.tex` §Combinatorics fixes TIME_BIN at 200 century bins across a
# 20,000-year span for its own vocabulary sizing; `DEFAULT_SPAN_START` and
# `DEFAULT_BIN_WIDTH` below reproduce exactly that span and width, so a
# default-configured `hte.address` encoding matches the paper's own
# `|H|` calculation.

DEFAULT_SPAN_START = -20_000
DEFAULT_BIN_WIDTH = 100


def auto_resolution(
    intervals: Sequence[Interval],
    *,
    min_bins: int = 8,
    max_bins: int = 40,
) -> Resolution:
    """The finest resolution-ladder rung giving between `min_bins` and
    `max_bins` bins over the span `intervals` covers (`bkt-hte-auto-
    resolution`): `hte.runner.run_campaign`'s own default for a
    campaign config that leaves `resolution` unset, so a 126-year corpus
    (quantum-history) gets decade bins instead of the two century bins
    its own span rounds down to under the paper's fixed 20,000-year/
    century default.

    Iterates the ladder finest-to-coarsest (`Resolution`'s own
    declaration order) and returns the first rung whose bin count over
    `[start, end]` (the min start and max end across every interval)
    lands in `[min_bins, max_bins]`, preferring the finest rung that
    fits. When no rung's bin count falls in that window at all (a span
    far narrower or wider than the ladder's five widths can resolve into
    that range), returns whichever rung's own bin count sits closest to
    the window instead of raising: this function's own read of `main.
    tex`'s combinatorics section leaves this case unaddressed, so the
    closest rung is this package's own defensible fallback rather than an
    arbitrary one. An empty `intervals` returns `Resolution.CENTURY`,
    matching this module's own century default everywhere else a span
    cannot be read off any data.
    """
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
    """The bin label the runner exports (`1900s`, `1910s`, ...) in place
    of a bare numeric bin index (`bkt-hte-auto-resolution`): the bin's
    own start year, suffixed `s` at every rung except `YEAR` (a single
    year reads as itself, "1925", not "1925s")."""
    if RESOLUTION_WIDTH_YEARS[resolution] == 1:
        return str(bin_start)
    return f"{bin_start}s"


def time_bin_index(year: int, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH) -> int:
    """The 0-based century-bin index of `year` within a fixed span starting
    at `span_start` (`TIME_BIN`, `main.tex` §Combinatorics). `TIME_BIN` is a
    numeric axis rather than a named concept vocabulary, so this function,
    not `hte.concepts.Vocabulary`, is what `hte.address.encode` calls to
    resolve a placement's time slot."""
    if year < span_start:
        raise ValueError(f"year {year} sits before the span start {span_start}")
    return (year - span_start) // bin_width


# --------------------------------------------------------------------------
# Period nodes (bkt-hte-period-model)
# --------------------------------------------------------------------------


class NodeLevel(str, Enum):
    """The four levels a timeline node nests at (`main.tex` §Timeline model:
    "Nodes nest four levels deep, era, period, event, year"). This is a node-
    hierarchy axis, distinct from `Resolution`'s precision-width axis even
    though both name `year` and `era`."""
    ERA = "era"
    PERIOD = "period"
    EVENT = "event"
    YEAR = "year"


@dataclass
class DatePosterior:
    """A period's date posterior summary (`HISTORY-HYPOTHESIS-ENGINE-SPEC.md`
    §4): a mean astronomical year and its 68%/95% highest-density intervals,
    tagged with the model that produced them."""
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
    """A period's date posterior from a list of `(mean, sigma)` dated
    observations, by inverse-variance-weighted Gaussian pooling.

    This stands in for the OxCal-style Gibbs-sampled phase model
    `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` §4 and `main.tex`'s `retrieval-
    envelope` provenance paragraph describe: that sampler is a substantial
    piece of statistical machinery in its own right and is out of scope for
    this core package (no generator, tournament, or calibration run is
    built here either). This function gives the period node the same
    `DatePosterior` shape a real phase model would populate, computed by
    the simplest defensible combination rule, so `hte.timeline.Period` has
    something to hold before the real sampler lands.
    """
    if not observations:
        raise ValueError("combine_date_observations needs at least one observation")
    weights = [1.0 / (sigma ** 2) if sigma > 0 else float("inf") for _, sigma in observations]
    if any(math.isinf(w) for w in weights):
        # A zero-sigma observation is exact: it alone fixes the mean, and
        # every finite-sigma observation contributes no further information.
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
    """A timeline node at one of the four `NodeLevel`s (`HISTORY-HYPOTHESIS-
    ENGINE-SPEC.md` §4). `parents` is a list rather than one pointer, since a
    period can sit under two eras at once when a regional and a global
    chronology frame it differently."""
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
