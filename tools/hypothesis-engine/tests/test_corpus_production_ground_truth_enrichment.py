"""`bkt-hte-ground-truth-enrichment`'s own 22 additions to
`hte/data/production-fixtures/` (`prod-013.json` through `prod-034.json`),
exercised against `hte.corpus.production` directly rather than against
`hte.calibrate` (`docs/COVERAGE-2026-09-10.md` carries the calibration
numbers this batch of fixtures buys; this file checks the fixtures'
own shape and diversity invariants, the input to that measurement rather
than the measurement itself).

Every test reads `production.load_raw()` (no `status_min` filtering) or
`production.load()` (`status_min="peer-reviewed"` default, the one
`hte calibrate --corpus production` itself reads), never the network.
"""
from __future__ import annotations

from collections import Counter

import pytest

from hte.corpus import production

NEW_IDS = {f"prod-{n:03d}" for n in range(13, 35)}


@pytest.fixture(scope="module")
def raw():
    return production.load_raw()


@pytest.fixture(scope="module")
def new_productions(raw):
    return [p for p in raw if p.id in NEW_IDS]


def test_twenty_two_new_productions_are_on_disk(new_productions):
    assert len(new_productions) == 22
    assert {p.id for p in new_productions} == NEW_IDS


def test_four_grade_bands_present_across_the_full_fixture_set(raw):
    assert {p.grade_band for p in raw} == {"3-5", "6-8", "9-10", "11-12"}


def test_three_pseudonymous_districts_present_across_the_full_fixture_set(raw):
    # "research-os-phase-0" is the Research OS sentinel (Phase 0 has no
    # roster or district concept, `normalize_research_os_record`'s own
    # docstring); it names no fourth pilot district.
    districts = {p.school_or_district_id for p in raw}
    assert {"district-a", "district-b", "district-c"}.issubset(districts)


def test_three_retracted_productions(raw):
    retracted = [p for p in raw if p.review.status == "retracted"]
    assert len(retracted) == 3
    assert {p.id for p in retracted} == {"prod-010", "prod-033", "prod-034"}


def test_at_least_twelve_new_accepted_claims(new_productions):
    accepted = [p for p in new_productions if p.review.status == "accepted"]
    assert sum(len(p.claims) for p in accepted) >= 12


def test_two_revised_then_reaccepted_productions(new_productions):
    # A production whose own review history reaches "accepted", is sent
    # back down the ladder for revision, and reaches "accepted" again:
    # two "accepted" entries in `review.history`, `Review.date_of`'s own
    # first-match read returning the first (the discovery date `hte.
    # corpus.production`'s own ground-truth event uses) while the full
    # history still carries the later reacceptance.
    revised = [
        p for p in new_productions
        if sum(1 for h in p.review.history if h.status == "accepted") >= 2
    ]
    assert {p.id for p in revised} == {"prod-021", "prod-022"}
    for p in revised:
        assert p.review.status == "accepted"
        statuses = [h.status for h in p.review.history]
        # the ladder dips back below "accepted" before climbing again
        first_accept = statuses.index("accepted")
        assert "peer-reviewed" in statuses[first_accept + 1:]


def test_citation_chain_depth_three(raw):
    corpus = production.load(status_min="draft")
    chain = ["prod-023", "prod-024", "prod-025", "prod-026"]
    for citer, cited in zip(chain[1:], chain[:-1]):
        assert cited in corpus.sources[citer].stemma_parents
    # the pre-existing depth-2 chain (prod-011 -> prod-005 -> prod-001)
    # is untouched by this change
    assert "prod-005" in corpus.sources["prod-011"].stemma_parents
    assert "prod-001" in corpus.sources["prod-005"].stemma_parents


@pytest.mark.parametrize(
    "pre_id,post_id",
    [
        ("prod-013", "prod-014"),
        ("prod-015", "prod-016"),
        ("prod-017", "prod-018"),
        ("prod-019", "prod-020"),
    ],
)
def test_cross_district_replication_pairs_share_every_slot(raw, pre_id, post_id):
    by_id = {p.id: p for p in raw}
    pre, post = by_id[pre_id], by_id[post_id]
    assert pre.school_or_district_id != post.school_or_district_id
    assert pre.claims[0].slots == post.claims[0].slots
    assert pre.review.status == post.review.status == "accepted"


def test_at_least_four_replication_pairs_span_different_districts(raw):
    # Every accepted claim's own slot tuple, grouped; a group of two or
    # more distinct districts sharing one tuple is a replication pair.
    by_tuple: dict[tuple, set[str]] = {}
    for p in raw:
        if p.review.status != "accepted":
            continue
        for claim in p.claims:
            key = tuple(sorted(claim.slots.items()))
            by_tuple.setdefault(key, set()).add(p.school_or_district_id)
    cross_district_pairs = sum(1 for districts in by_tuple.values() if len(districts) >= 2)
    assert cross_district_pairs >= 4


def test_every_new_production_validates_against_the_schema_loader(raw):
    # `load_raw()` already raised if any of the 22 new fixtures failed
    # `Production.from_dict`; this test names the fixture files
    # explicitly so a future removal of one is caught here too.
    ids = {p.id for p in raw}
    assert NEW_IDS.issubset(ids)


def test_the_research_os_shape_still_loads_alongside_the_new_fixtures(raw):
    # `research-os-sky-blue.json`'s two `graph.productions`-shaped rows
    # keep normalizing through `Production.from_dict` regardless of how
    # many `PRODUCTION-SCHEMA.md`-shaped fixtures share the directory.
    ros_ids = {p.id for p in raw if p.id.startswith("ros-sky-blue-")}
    assert ros_ids == {"ros-sky-blue-001", "ros-sky-blue-002"}


def test_status_counts_across_the_full_fixture_set(raw):
    counts = Counter(p.review.status for p in raw)
    assert counts["retracted"] == 3
    assert counts["accepted"] >= 12
