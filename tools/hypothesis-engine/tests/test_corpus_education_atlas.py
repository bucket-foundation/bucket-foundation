"""`hte.corpus.education_atlas`: the education-atlas sample tables plus its
docs and this repo's own local education content mirror, as a `Corpus`.

Every test here needs a live `education-atlas` sample directory (its
`data/processed/sample/` ships Parquet, outside this repo's own git
tree); `sample_dir` below tries the same local-checkout resolution `hte.corpus.
education_atlas.DEFAULT_SAMPLE_DIR` itself uses first (`$EDUCATION_ATLAS_
DIR`, then the sibling-clone convention), no network, before falling
back to `gh repo clone` into a per-module temp directory. It skips the
whole module, with the reason, when neither a local checkout nor `gh`
can produce one, rather than failing the suite when both are
unavailable.
"""
from __future__ import annotations

import shutil
import subprocess

import pytest

from hte.concepts import Slot
from hte.corpus import education_atlas

# `sample_dir` below falls back to a real `gh repo clone`; opts every test
# in this module out of `tests/conftest.py`'s autouse subprocess guard.
pytestmark = pytest.mark.allow_subprocess


@pytest.fixture(scope="module")
def sample_dir(tmp_path_factory):
    if education_atlas.DEFAULT_SAMPLE_DIR is not None and education_atlas.DEFAULT_SAMPLE_DIR.is_dir():
        return education_atlas.DEFAULT_SAMPLE_DIR
    if shutil.which("gh") is None:
        pytest.skip("education-atlas checkout not found; set EDUCATION_ATLAS_DIR")
    dest = tmp_path_factory.mktemp("education-atlas")
    try:
        result = subprocess.run(
            ["gh", "repo", "clone", "bucket-foundation/education-atlas", str(dest), "--", "--depth", "1"],
            capture_output=True, text=True, timeout=180,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        pytest.skip(f"could not clone bucket-foundation/education-atlas: {exc}")
    if result.returncode != 0:
        pytest.skip(f"could not clone bucket-foundation/education-atlas: {result.stderr.strip()[:300]}")
    sample = dest / "data" / "processed" / "sample"
    if not sample.is_dir():
        pytest.skip(f"cloned education-atlas has no sample directory at {sample}")
    return sample


@pytest.fixture(scope="module")
def corpus(sample_dir):
    return education_atlas.load(sample_dir)


# --------------------------------------------------------------------------
# counts
# --------------------------------------------------------------------------


def test_load_meets_size_floor(corpus):
    assert len(corpus.sources) >= 20
    assert len(corpus.evidence) >= 1000
    assert len(corpus.ground_truth) >= 20


def test_ground_truth_id_shared_with_its_evidence_item(corpus):
    # Every `GroundTruthEvent` this module writes shares its own id with
    # the `EvidenceItem` that carries its slots (`GroundTruthEvent` itself
    # has none), the same shape `hte.corpus.quantum_history`'s milestone
    # bullets use.
    evidence_by_id = {e.id: e for e in corpus.evidence}
    assert len(corpus.ground_truth) > 0
    for g in corpus.ground_truth:
        assert g.id in evidence_by_id


# --------------------------------------------------------------------------
# slot validity
# --------------------------------------------------------------------------


def test_evidence_slots_resolve_in_the_vocabulary(corpus):
    vocab = corpus.vocab
    slot_by_field = {
        "actor": Slot.ACTOR, "action": Slot.ACTION, "object": Slot.OBJECT,
        "place": Slot.PLACE, "mechanism": Slot.MECHANISM,
    }
    checked = 0
    for e in corpus.evidence:
        for field, slot in slot_by_field.items():
            value = getattr(e, field)
            if value is not None:
                assert vocab.get(slot, value) is not None, f"{e.id}.{field}={value!r} not in vocabulary"
                checked += 1
    assert checked > 0


def test_observation_evidence_carries_a_country_actor_and_place(corpus):
    obs_evidence = [e for e in corpus.evidence if e.provenance == "education-atlas-observation"]
    assert len(obs_evidence) > 0
    for e in obs_evidence:
        assert e.actor is not None and e.actor.startswith("polity-")
        assert e.place is not None and e.place.startswith("country-")
        assert e.action in {"improved", "worsened", "stagnant"}


def test_evidence_source_ids_reference_real_sources(corpus):
    for e in corpus.evidence:
        assert e.source_id in corpus.sources
        assert e.span.doc_id == e.source_id


# --------------------------------------------------------------------------
# interval years
# --------------------------------------------------------------------------


def test_observation_evidence_intervals_are_points_in_range(corpus):
    obs_evidence = [e for e in corpus.evidence if e.provenance == "education-atlas-observation"]
    for e in obs_evidence:
        assert e.interval is not None
        assert e.interval.start == e.interval.end
        assert 2000 <= e.interval.start <= 2024


def test_ground_truth_years_in_range(corpus):
    for g in corpus.ground_truth:
        assert 2000 <= g.year <= 2024
        assert g.discovery_year == g.year
        assert g.doc_id in corpus.sources


# --------------------------------------------------------------------------
# stemma links
# --------------------------------------------------------------------------


def test_stemma_parents_reference_real_sources(corpus):
    for source in corpus.sources.values():
        for parent in source.stemma_parents:
            assert parent in corpus.sources
            assert parent != source.id


def test_owid_sources_link_to_their_world_bank_origin(corpus):
    owid_sources = [s for s in corpus.sources.values() if s.id.startswith("owid-")]
    assert len(owid_sources) > 0
    linked = [s for s in owid_sources if s.stemma_parents]
    assert len(linked) > 0
    for s in linked:
        assert s.stemma_parents == [f"worldbank-{s.id[len('owid-'):]}"]


def test_local_doc_mirrors_link_to_their_atlas_origin(corpus):
    mirrored = [
        s for s in corpus.sources.values()
        if s.id.startswith("local-") and s.stemma_parents
    ]
    assert len(mirrored) > 0
    for s in mirrored:
        assert s.stemma_parents == [f"atlas-{s.id[len('local-'):]}"]


# --------------------------------------------------------------------------
# doc paragraph spans (verbatim, anchored)
# --------------------------------------------------------------------------


def test_doc_paragraph_spans_are_valid_and_anchored(corpus, sample_dir):
    atlas_docs_dir = education_atlas._atlas_docs_dir(sample_dir)
    doc_evidence = [e for e in corpus.evidence if e.provenance == "education-atlas-doc-paragraph"]
    assert len(doc_evidence) > 0
    raw_by_source: dict[str, str] = {}
    for e in doc_evidence:
        source_id = e.source_id
        if source_id not in raw_by_source:
            if source_id.startswith("atlas-"):
                path = atlas_docs_dir / f"{source_id[len('atlas-'):]}.md"
            else:
                path = education_atlas.LOCAL_EDUCATION_CONTENT_DIR / f"{source_id[len('local-'):]}.md"
            raw_by_source[source_id] = path.read_text()
        raw = raw_by_source[source_id]
        assert e.span.char_start >= 0
        assert e.span.char_end > e.span.char_start
        assert raw[e.span.char_start:e.span.char_end] == e.span.quote
        assert e.actor == "other-actor"
        assert e.action == "other-action"
        assert e.mechanism == "other-mechanism"


# --------------------------------------------------------------------------
# filters and the missing-directory error path
# --------------------------------------------------------------------------


def test_load_filters_by_country_and_level(sample_dir):
    filtered = education_atlas.load(sample_dir, countries=["usa", "fin"], levels=["primary"])
    obs_evidence = [e for e in filtered.evidence if e.provenance == "education-atlas-observation"]
    assert len(obs_evidence) > 0
    for e in obs_evidence:
        assert e.place in {"country-usa", "country-fin"}


def test_load_filters_by_years(sample_dir):
    filtered = education_atlas.load(sample_dir, years=(2020, 2024))
    obs_evidence = [e for e in filtered.evidence if e.provenance == "education-atlas-observation"]
    assert len(obs_evidence) > 0
    for e in obs_evidence:
        assert 2020 <= e.interval.start <= 2024


def test_load_missing_directory_raises():
    with pytest.raises(FileNotFoundError):
        education_atlas.load("/no/such/directory")
