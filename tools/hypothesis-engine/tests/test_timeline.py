import random

import pytest

from hte.timeline import (
    AllenRelation,
    DEFAULT_BIN_WIDTH,
    DEFAULT_SPAN_START,
    Interval,
    NodeLevel,
    Period,
    RESOLUTION_WIDTH_YEARS,
    Resolution,
    Uncertainty,
    auto_resolution,
    bce_to_astronomical,
    bin,
    bin_bounds,
    bin_label,
    astronomical_to_calendar,
    ce_to_astronomical,
    combine_date_observations,
    converse,
    ka_to_astronomical,
    bp_to_astronomical,
    relate,
    time_bin_index,
)


def test_calendar_roundtrip_bce():
    for n in [1, 2, 100, 7000, 12900]:
        year = bce_to_astronomical(n)
        back, era = astronomical_to_calendar(year)
        assert era == "BCE"
        assert back == n


def test_calendar_roundtrip_ce():
    for n in [1, 100, 2026]:
        year = ce_to_astronomical(n)
        back, era = astronomical_to_calendar(year)
        assert era == "CE"
        assert back == n


def test_calendar_no_gap_between_1bce_and_1ce():
    # main.tex def:interval: "there is no gap between 1 BCE and 1 CE."
    assert bce_to_astronomical(1) == 0
    assert ce_to_astronomical(1) == 1


def test_bp_and_ka():
    assert bp_to_astronomical(1950) == 0
    assert bp_to_astronomical(0) == 1950
    assert ka_to_astronomical(12.9) == pytest.approx(1950 - 12900)


def test_interval_rejects_start_after_end():
    with pytest.raises(ValueError):
        Interval(start=10, end=5)


def test_uncertainty_roundtrip():
    for unc in [Uncertainty.point(), Uncertainty.uniform(-100, 100),
                Uncertainty.normal(0.0, 5.0), Uncertainty.sampled([(1.0, 0.1), (2.0, 0.2)])]:
        d = unc.to_dict()
        assert Uncertainty.from_dict(d) == unc


def _random_interval(rng: random.Random) -> Interval:
    a = rng.randint(-20000, 20000)
    b = rng.randint(-20000, 20000)
    if a > b:
        a, b = b, a
    return Interval(start=a, end=b)


def test_relate_totality_and_converse():
    """`relate_total` (trivial: every function is total) plus the converse
    pairing `relate_converse_before_after`/`relate_converse_meets_metBy`
    generalized across all thirteen relations: `relate(a, b)` should be the
    converse of `relate(b, a)` for any pair, except the one degenerate case
    Lean documents (both intervals collapse to the same zero-length instant),
    which this test excludes explicitly, the same exclusion
    `relate_converse_meets_metBy`'s `hnondeg` hypothesis states.
    """
    rng = random.Random(42)
    for _ in range(2000):
        a = _random_interval(rng)
        b = _random_interval(rng)
        r_ab = relate(a, b)
        assert isinstance(r_ab, AllenRelation)  # totality
        # `relate_converse_meets_metBy`'s own exclusion: both intervals
        # zero-length (not necessarily at the same point) is the case its
        # `hnondeg` hypothesis rules out to make the proof go through.
        degenerate = (a.start == a.end) and (b.start == b.end)
        if degenerate:
            continue
        r_ba = relate(b, a)
        assert r_ab == converse(r_ba), (a, b, r_ab, r_ba)


def test_relate_before_after_examples():
    a = Interval(start=0, end=10)
    b = Interval(start=20, end=30)
    assert relate(a, b) == AllenRelation.BEFORE
    assert relate(b, a) == AllenRelation.AFTER


def test_relate_equal():
    a = Interval(start=5, end=15)
    b = Interval(start=5, end=15)
    assert relate(a, b) == AllenRelation.EQUAL
    assert converse(AllenRelation.EQUAL) == AllenRelation.EQUAL


def test_relate_meets_and_metby():
    a = Interval(start=0, end=10)
    b = Interval(start=10, end=20)
    assert relate(a, b) == AllenRelation.MEETS
    assert relate(b, a) == AllenRelation.MET_BY


def test_relate_during_contains():
    outer = Interval(start=0, end=100)
    inner = Interval(start=10, end=20)
    assert relate(inner, outer) == AllenRelation.DURING
    assert relate(outer, inner) == AllenRelation.CONTAINS


def test_bin_bounds_century():
    start, end = bin_bounds(-6950, Resolution.CENTURY)
    assert start == -7000
    assert end == -6901


def test_bin_returns_point_interval():
    interval = Interval(start=-6950, end=-6900)
    binned = bin(interval, Resolution.CENTURY)
    assert binned.start == -7000
    assert binned.end == -6901


def test_time_bin_index_matches_paper_span():
    # main.tex Eq. size-h: TIME_BIN = 200 century bins across a 20,000-year span.
    assert time_bin_index(DEFAULT_SPAN_START, DEFAULT_SPAN_START, DEFAULT_BIN_WIDTH) == 0
    last_year = DEFAULT_SPAN_START + 200 * DEFAULT_BIN_WIDTH - 1
    assert time_bin_index(last_year, DEFAULT_SPAN_START, DEFAULT_BIN_WIDTH) == 199


def test_time_bin_index_rejects_year_before_span():
    with pytest.raises(ValueError):
        time_bin_index(DEFAULT_SPAN_START - 1)


def test_combine_date_observations_weights_tighter_sigma_more():
    posterior = combine_date_observations([(-11000.0, 100.0), (-10800.0, 10.0)])
    # The tight observation should pull the pooled mean close to itself.
    assert abs(posterior.mean - (-10800.0)) < abs(posterior.mean - (-11000.0))
    assert posterior.hpd_68[0] < posterior.mean < posterior.hpd_68[1]
    assert posterior.hpd_95[0] < posterior.hpd_68[0]
    assert posterior.hpd_95[1] > posterior.hpd_68[1]


def test_period_roundtrip():
    interval = Interval(start=-12900, end=-9700)
    posterior = combine_date_observations([(-11300.0, 300.0)])
    period = Period(
        id="per-younger-dryas", level=NodeLevel.PERIOD, interval=interval,
        label="Younger Dryas", parents=["era-late-pleistocene"],
        date_posterior=posterior, region=["global"], disputed=False,
    )
    d = period.to_dict()
    back = Period.from_dict(d)
    assert back.id == period.id
    assert back.level == period.level
    assert back.interval == period.interval
    assert back.parents == period.parents
    assert back.date_posterior.mean == pytest.approx(posterior.mean)


# --------------------------------------------------------------------------
# auto_resolution / bin_label
# --------------------------------------------------------------------------


def test_auto_resolution_empty_intervals_is_century():
    assert auto_resolution([]) == Resolution.CENTURY


def test_auto_resolution_picks_decade_for_a_126_year_span():
    # quantum-history's own span (1900-2026): century gives 2 bins (too
    # few), year gives 127 (too many); decade's 13 lands in [8, 40].
    intervals = [Interval(1900, 1900), Interval(2026, 2026)]
    resolution = auto_resolution(intervals)
    assert resolution == Resolution.DECADE
    width = RESOLUTION_WIDTH_YEARS[resolution]
    n_bins = -(-(2026 - 1900 + 1) // width)  # ceil
    assert 8 <= n_bins <= 40


def test_auto_resolution_prefers_the_finest_rung_that_fits():
    # A 20-year span: decade gives 2 bins (too few), year gives 20, which
    # already sits in [8, 40] -- the finer rung should win.
    intervals = [Interval(2000, 2000), Interval(2019, 2019)]
    assert auto_resolution(intervals) == Resolution.YEAR


def test_auto_resolution_falls_back_to_the_closest_rung_when_none_fits():
    # A 5-year span: every rung's own bin count sits outside [8, 40];
    # year (5 bins) is numerically closest to the window's own floor of 8.
    intervals = [Interval(2000, 2000), Interval(2004, 2004)]
    assert auto_resolution(intervals) == Resolution.YEAR


def test_auto_resolution_reads_both_interval_ends():
    intervals = [Interval(1900, 1905), Interval(2020, 2026)]
    resolution = auto_resolution(intervals)
    width = RESOLUTION_WIDTH_YEARS[resolution]
    n_bins = -(-(2026 - 1900 + 1) // width)
    assert 8 <= n_bins <= 40


def test_bin_label_suffixes_s_except_at_year_resolution():
    assert bin_label(1900, Resolution.DECADE) == "1900s"
    assert bin_label(1900, Resolution.CENTURY) == "1900s"
    assert bin_label(1925, Resolution.YEAR) == "1925"


def test_a_point_event_lands_in_exactly_the_bin_containing_it():
    span_start = bin_bounds(1900, Resolution.DECADE)[0]
    width = RESOLUTION_WIDTH_YEARS[Resolution.DECADE]
    for year in (1900, 1905, 1909, 1910, 1962, 2026):
        idx = time_bin_index(year, span_start, width)
        start = span_start + idx * width
        end = start + width - 1
        assert start <= year <= end
        # and no *other* bin also contains it
        if start - 1 >= span_start:
            assert time_bin_index(start - 1, span_start, width) != idx
        assert time_bin_index(end + 1, span_start, width) != idx
