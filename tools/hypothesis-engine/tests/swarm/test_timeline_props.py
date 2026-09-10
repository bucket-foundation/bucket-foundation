"""Property tests over `hte.timeline`: Allen's algebra, the resolution
ladder, and the calendar conversions, none of which any other agent on
this branch is editing.
"""
from __future__ import annotations

import math

import pytest
from conftest import intervals, interval_pairs, years
from hypothesis import assume, given
from hypothesis import strategies as st

from hte import timeline as tl

# tests/swarm/FINDINGS-2026-09-10.md - resolved, kept for the docstring
# cross-reference `relate`'s own special case still carries.
FINDING_ZERO_LENGTH_EQUAL = "FINDING-2026-09-10-001"


# --------------------------------------------------------------------------
# Allen's interval algebra: totality and converse symmetry
# --------------------------------------------------------------------------


@given(interval_pairs())
def test_relate_is_total_and_returns_an_allen_relation(pair):
    a, b = pair
    result = tl.relate(a, b)
    assert isinstance(result, tl.AllenRelation)


@given(interval_pairs())
def test_relate_converse_symmetry_holds_for_general_pairs(pair):
    # FINDING-2026-09-10-001 resolved: relate()'s own EQUAL special case
    # for two coincident zero-length intervals means converse symmetry
    # now holds with no exclusion, including that one instant-on-instant
    # collision.
    a, b = pair
    r_ab = tl.relate(a, b)
    r_ba = tl.relate(b, a)
    assert tl.converse(r_ab) == r_ba, (a, b, r_ab, r_ba)


def test_converse_covers_all_thirteen_relations_and_is_its_own_inverse():
    for relation in tl.AllenRelation:
        once = tl.converse(relation)
        twice = tl.converse(once)
        assert twice == relation, relation


@given(intervals())
def test_relate_of_a_nondegenerate_interval_with_itself_is_equal(iv):
    assume(iv.start != iv.end)
    assert tl.relate(iv, iv) == tl.AllenRelation.EQUAL


def test_relate_zero_length_interval_against_itself_should_be_equal():
    # FINDING_ZERO_LENGTH_EQUAL resolved: relate() now special-cases two
    # coincident zero-length intervals to EQUAL ahead of the inherited
    # MEETS/MET_BY checks, restoring reflexivity for point intervals.
    zero = tl.Interval(start=7, end=7)
    assert tl.relate(zero, zero) == tl.AllenRelation.EQUAL


@given(years)
def test_relate_of_any_zero_length_interval_against_itself_is_equal(year):
    """Generalizes the fixed example above across the whole axis
    (FINDING-2026-09-10-001)."""
    zero = tl.Interval(start=year, end=year)
    assert tl.relate(zero, zero) == tl.AllenRelation.EQUAL


# --------------------------------------------------------------------------
# Resolution ladder: bin() monotone in start; every point in exactly one bin
# --------------------------------------------------------------------------


@given(years, years, st.sampled_from(list(tl.Resolution)))
def test_bin_bounds_is_monotone_in_year(y1, y2, resolution):
    lo, hi = (y1, y2) if y1 <= y2 else (y2, y1)
    start_lo, _ = tl.bin_bounds(lo, resolution)
    start_hi, _ = tl.bin_bounds(hi, resolution)
    assert start_lo <= start_hi


@given(intervals(), intervals(), st.sampled_from(list(tl.Resolution)))
def test_bin_is_monotone_in_interval_start(a, b, resolution):
    if a.start > b.start:
        a, b = b, a
    bin_a = tl.bin(a, resolution)
    bin_b = tl.bin(b, resolution)
    assert bin_a.start <= bin_b.start


@given(years, st.sampled_from(list(tl.Resolution)))
def test_every_point_lands_in_exactly_one_bin_at_every_resolution(year, resolution):
    start, end = tl.bin_bounds(year, resolution)
    width = tl.RESOLUTION_WIDTH_YEARS[resolution]
    assert start <= year <= end
    assert end - start + 1 == width
    # The neighboring bin (one width to either side) does not also claim
    # this year: the ladder partitions the line with no overlap.
    prev_start, prev_end = tl.bin_bounds(year - width, resolution)
    next_start, next_end = tl.bin_bounds(year + width, resolution)
    assert not (prev_start <= year <= prev_end)
    assert not (next_start <= year <= next_end)
    assert prev_end + 1 == start
    assert end + 1 == next_start


@given(years, st.sampled_from(list(tl.Resolution)))
def test_bin_bounds_is_idempotent_on_its_own_start(year, resolution):
    start, _ = tl.bin_bounds(year, resolution)
    start2, end2 = tl.bin_bounds(start, resolution)
    assert start2 == start
    assert start <= end2


# --------------------------------------------------------------------------
# Calendar conversions round-trip (BCE/CE, BP, ka)
# --------------------------------------------------------------------------


@given(st.integers(min_value=1, max_value=100_000))
def test_bce_round_trips_through_astronomical_to_calendar(n):
    year = tl.bce_to_astronomical(n)
    assert tl.astronomical_to_calendar(year) == (n, "BCE")


@given(st.integers(min_value=1, max_value=100_000))
def test_ce_round_trips_through_astronomical_to_calendar(n):
    year = tl.ce_to_astronomical(n)
    assert tl.astronomical_to_calendar(year) == (n, "CE")


def test_bce_ce_boundary_has_no_shared_or_skipped_year():
    # 1 BCE -> astronomical 0; 1 CE -> astronomical 1: adjacent, no year 0.
    assert tl.bce_to_astronomical(1) == 0
    assert tl.ce_to_astronomical(1) == 1


@given(st.floats(min_value=0.0, max_value=50_000.0, allow_nan=False, allow_infinity=False),
       st.integers(min_value=-10_000, max_value=10_000))
def test_bp_to_astronomical_inverts_cleanly(bp, base_year):
    year = tl.bp_to_astronomical(bp, base_year)
    assert math.isclose(base_year - year, bp, rel_tol=1e-9, abs_tol=1e-9)


@given(st.floats(min_value=0.0, max_value=50.0, allow_nan=False, allow_infinity=False),
       st.integers(min_value=-10_000, max_value=10_000))
def test_ka_to_astronomical_matches_bp_at_1000x(ka, base_year):
    via_ka = tl.ka_to_astronomical(ka, base_year)
    via_bp = tl.bp_to_astronomical(ka * 1000.0, base_year)
    assert math.isclose(via_ka, via_bp, rel_tol=1e-9, abs_tol=1e-9)
    assert math.isclose((base_year - via_ka) / 1000.0, ka, rel_tol=1e-9, abs_tol=1e-9)


@given(st.integers(min_value=0, max_value=100))
def test_bce_year_below_one_raises(n):
    import pytest
    with pytest.raises(ValueError):
        tl.bce_to_astronomical(-n)


@given(st.integers(min_value=0, max_value=100))
def test_ce_year_below_one_raises(n):
    import pytest
    with pytest.raises(ValueError):
        tl.ce_to_astronomical(-n)
