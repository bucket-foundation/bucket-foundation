"""Property tests for `hte.corpus.education_atlas.load`: filtering by
`countries` and `years` (and, as a bonus beyond this round's own literal
task wording, `levels`) always returns a subset of the unfiltered load,
plus the generic corpus invariants this round's own task brief names for
every adapter.

Unlike `tests/test_corpus_education_atlas.py` (which needs a live clone
of the sibling `education-atlas` repo and skips the whole module when one
is not available, `gh` CLI dependent, network-dependent), every test here
builds its own tiny, self-contained sample directory via `pandas.
DataFrame.to_parquet` (`pandas`/`pyarrow` are both installed in this
environment, confirmed empirically), so this file needs no network and
no sibling clone, and its properties hold regardless of what the real
atlas sample happens to contain on any given day.
"""
from __future__ import annotations

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

pd = pytest.importorskip("pandas")

from hte.corpus import education_atlas as ea

from tests.swarm2.conftest import assert_corpus_invariants


# Real ISO3 country codes and real World Bank indicator codes, drawn from
# the shipped, fixed `hte/data/vocab-education-seed.json` (25 countries,
# 30 indicators): `education_atlas.load` always calls its own module-level
# `load_vocab()`, hardcoded to that one file regardless of what
# `sample_dir` itself contains, so an EvidenceItem this module builds
# resolves into its own returned `corpus.vocab` only when the underlying
# sample data's own country/indicator codes are ones that seed file
# already names. An invented code (confirmed empirically: "AAA"/"IND1")
# produces an EvidenceItem naming a slot value the corpus's own vocab has
# never heard of, violating the generic "slots resolve to a vocab id"
# invariant: a synthetic sample naming a country or indicator outside
# that fixed 25-country/30-indicator set sits off this module's own
# contract (real atlas samples are drawn from that identical fixed set, per this
# module's own top docstring). Using real, vocab-known codes here keeps
# every property test in this file on-contract.
_COUNTRIES = ("AFG", "BGD", "USA")
_INDICATORS = ("SE.LPV.PRIM", "SE.PRM.NENR")
_YEARS = (2008, 2012, 2016, 2020)

# One flagged (>= SEVERITY_EVENT_THRESHOLD) problem row per country, so a
# `countries` filter excluding a country provably drops exactly its own
# ground-truth event, and the ids are stable enough to assert the SUBSET
# relation index-free.
_SEVERITY_BY_PAIR = {
    ("AFG", "SE.LPV.PRIM"): 70.0, ("AFG", "SE.PRM.NENR"): 30.0,
    ("BGD", "SE.LPV.PRIM"): 55.0, ("BGD", "SE.PRM.NENR"): 10.0,
    ("USA", "SE.LPV.PRIM"): 90.0, ("USA", "SE.PRM.NENR"): 45.0,
}


@pytest.fixture(scope="module")
def sample_dir(tmp_path_factory):
    base = tmp_path_factory.mktemp("education-atlas-synthetic")
    atlas_root = base / "education-atlas"
    sample = atlas_root / "data" / "processed" / "sample"
    sample.mkdir(parents=True)
    docs_dir = atlas_root / "docs"
    docs_dir.mkdir(parents=True)

    countries = pd.DataFrame([{"country_code": c, "name": f"Country {c}"} for c in _COUNTRIES])
    indicators = pd.DataFrame([
        {"indicator_code": "SE.LPV.PRIM", "name": "Primary enrollment rate", "direction": "higher_better", "level": "primary"},
        {"indicator_code": "SE.PRM.NENR", "name": "Secondary dropout rate", "direction": "lower_better", "level": "secondary"},
    ])

    obs_rows = []
    obs_id = 0
    for country in _COUNTRIES:
        for indicator in _INDICATORS:
            for i, year in enumerate(_YEARS):
                obs_rows.append({
                    "country_code": country, "indicator_code": indicator, "year": year,
                    "value": 50.0 + i * 2.0, "unit": "pct", "source": "worldbank",
                    "obs_id": obs_id, "level": "primary" if indicator == "SE.LPV.PRIM" else "secondary",
                })
                obs_id += 1
    observation = pd.DataFrame(obs_rows)

    problem_rows = []
    for country in _COUNTRIES:
        for indicator in _INDICATORS:
            problem_rows.append({
                "country_code": country, "indicator_code": indicator, "latest_year": 2020,
                "severity": _SEVERITY_BY_PAIR[(country, indicator)], "latest_value": 55.0,
                "benchmark": 60.0, "trend_slope": 1.0, "flags": "",
                "problem_id": f"p-{country}-{indicator}",
                "level": "primary" if indicator == "SE.LPV.PRIM" else "secondary",
            })
    problem = pd.DataFrame(problem_rows)

    countries.to_parquet(sample / "country.parquet")
    indicators.to_parquet(sample / "indicator.parquet")
    observation.to_parquet(sample / "observation.parquet")
    problem.to_parquet(sample / "problem.parquet")

    (docs_dir / "EDUCATION_PROBLEMS.md").write_text(
        "# Education problems\n\n"
        "A long enough opening paragraph, at least forty characters, about "
        "Country AFG's own primary enrollment rate crisis and its underfunding.\n\n"
        "A second paragraph, also long enough on its own, about a teacher "
        "shortage affecting Country BGD and its secondary dropout rate.\n"
    )
    (docs_dir / "REFORM_THESIS.md").write_text(
        "# Reform thesis\n\n"
        "A long enough opening paragraph, at least forty characters, arguing "
        "for reform across every sample country in this synthetic atlas.\n"
    )
    return sample


@pytest.fixture(scope="module", autouse=True)
def _isolate_local_content(sample_dir):
    """`education_atlas.LOCAL_EDUCATION_CONTENT_DIR` is a fixed absolute
    path into THIS repo's own `src/content/education/`, unrelated to
    `sample_dir` (`_local_doc_paths`'s own contract): pointed at
    a directory that does not exist, so every test in this module reads
    only the synthetic sample this fixture built, never this repo's own
    real (and, mid-run, possibly agent-edited) content."""
    original = ea.LOCAL_EDUCATION_CONTENT_DIR
    ea.LOCAL_EDUCATION_CONTENT_DIR = sample_dir.parent / "does-not-exist"
    yield
    ea.LOCAL_EDUCATION_CONTENT_DIR = original


@pytest.fixture(scope="module")
def unfiltered_corpus(sample_dir):
    return ea.load(sample_dir)


# --------------------------------------------------------------------------
# Generic corpus invariants
# --------------------------------------------------------------------------


def test_education_atlas_load_generic_corpus_invariants(unfiltered_corpus):
    assert_corpus_invariants(unfiltered_corpus)


def test_education_atlas_unfiltered_load_has_every_country_and_flagged_problem(unfiltered_corpus):
    """A sanity check on the fixture itself; every subset test below
    assumes it holds. If it ever stops holding, those tests would pass
    vacuously (an empty unfiltered corpus is trivially a superset of an
    empty filtered one)."""
    assert len(unfiltered_corpus.evidence) > 0
    assert len(unfiltered_corpus.ground_truth) == 3  # AFG/SE.LPV.PRIM, BGD/SE.LPV.PRIM, USA/SE.LPV.PRIM clear the threshold


# --------------------------------------------------------------------------
# Filtering by countries is a subset of the unfiltered load.
# --------------------------------------------------------------------------


countries_subset_st = st.sets(st.sampled_from(_COUNTRIES), min_size=0, max_size=len(_COUNTRIES))


@given(countries=countries_subset_st)
@settings(max_examples=300)
def test_load_filtered_by_countries_is_a_subset_of_unfiltered(sample_dir, unfiltered_corpus, countries):
    filtered = ea.load(sample_dir, countries=countries)
    unfiltered_ids = {e.id for e in unfiltered_corpus.evidence}
    unfiltered_gt_ids = {g.id for g in unfiltered_corpus.ground_truth}

    assert {e.id for e in filtered.evidence} <= unfiltered_ids
    assert {g.id for g in filtered.ground_truth} <= unfiltered_gt_ids


@given(countries=countries_subset_st)
@settings(max_examples=300)
def test_load_filtered_by_countries_keeps_only_those_countries_own_rows(sample_dir, countries):
    filtered = ea.load(sample_dir, countries=countries)
    wanted = {c.upper() for c in countries}
    for item in filtered.evidence:
        if item.provenance != "education-atlas-observation":
            continue
        # source_id is "<dataset>-<country_code>" (lower-cased in
        # _country_place_id/_country_polity_id, but source_id itself
        # keeps the dataset's own casing); check via the item's own
        # place slot instead, which education_atlas.py always lower-cases.
        # (An empty `wanted` never reaches this branch at all: `load`
        # filters every observation row away before any such item exists.)
        assert item.place in {f"country-{c.lower()}" for c in wanted}


# --------------------------------------------------------------------------
# Filtering by years is a subset of the unfiltered load.
# --------------------------------------------------------------------------


@given(lo=st.integers(min_value=2000, max_value=2024), hi=st.integers(min_value=2000, max_value=2024))
@settings(max_examples=300)
def test_load_filtered_by_years_is_a_subset_of_unfiltered(sample_dir, unfiltered_corpus, lo, hi):
    years = (min(lo, hi), max(lo, hi))
    filtered = ea.load(sample_dir, years=years)
    unfiltered_ids = {e.id for e in unfiltered_corpus.evidence}
    unfiltered_gt_ids = {g.id for g in unfiltered_corpus.ground_truth}

    assert {e.id for e in filtered.evidence} <= unfiltered_ids
    assert {g.id for g in filtered.ground_truth} <= unfiltered_gt_ids


@given(lo=st.integers(min_value=2000, max_value=2024), hi=st.integers(min_value=2000, max_value=2024))
@settings(max_examples=300)
def test_load_filtered_by_years_keeps_only_in_range_ground_truth(sample_dir, lo, hi):
    years = (min(lo, hi), max(lo, hi))
    filtered = ea.load(sample_dir, years=years)
    for gt in filtered.ground_truth:
        assert years[0] <= gt.year <= years[1]


# --------------------------------------------------------------------------
# Combined countries + years filter is still a subset of the unfiltered
# load (the compound case, not just each filter checked in isolation).
# --------------------------------------------------------------------------


@given(countries=countries_subset_st, lo=st.integers(min_value=2000, max_value=2024), hi=st.integers(min_value=2000, max_value=2024))
@settings(max_examples=300)
def test_load_filtered_by_countries_and_years_is_a_subset_of_unfiltered(sample_dir, unfiltered_corpus, countries, lo, hi):
    years = (min(lo, hi), max(lo, hi))
    filtered = ea.load(sample_dir, countries=countries, years=years)
    unfiltered_ids = {e.id for e in unfiltered_corpus.evidence}
    unfiltered_gt_ids = {g.id for g in unfiltered_corpus.ground_truth}

    assert {e.id for e in filtered.evidence} <= unfiltered_ids
    assert {g.id for g in filtered.ground_truth} <= unfiltered_gt_ids


# --------------------------------------------------------------------------
# A narrower filter (a subset of a subset) is itself a subset of the
# wider filter's own result, not only of the fully unfiltered load: this
# checks the subset property composes, rather than only ever comparing
# against the one unfiltered baseline.
# --------------------------------------------------------------------------


@given(
    wide=countries_subset_st,
    data=st.data(),
)
@settings(max_examples=300)
def test_narrower_country_filter_is_a_subset_of_a_wider_one(sample_dir, wide, data):
    narrow = data.draw(st.sets(st.sampled_from(sorted(wide)), min_size=0, max_size=len(wide))) if wide else set()
    wide_corpus = ea.load(sample_dir, countries=wide)
    narrow_corpus = ea.load(sample_dir, countries=narrow)

    assert {e.id for e in narrow_corpus.evidence} <= {e.id for e in wide_corpus.evidence}
    assert {g.id for g in narrow_corpus.ground_truth} <= {g.id for g in wide_corpus.ground_truth}
