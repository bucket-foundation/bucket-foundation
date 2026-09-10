"""Property/behavior tests for `hte.corpus`'s own dataclasses:
`GroundTruthEvent`, `RetrievalEnvelope`, and `Corpus` itself, including its
`save`/`load` round trip (the two uncovered line ranges `tests/COVERAGE.md`
names for this file, 120-121 and 125-126). Every one of the four shipped
corpus adapters (`quantum_history`, `fixtures`, `education_atlas`,
`production`) returns one of these `Corpus` objects, but none of their own
test files exercises `to_dict`/`from_dict`/`save`/`load` on the container
itself; this file holds that shape fixed and checks it in isolation,
building small hand-made `Source`/`EvidenceItem`/`Vocabulary` fixtures
rather than depending on any one adapter's own corpus shape.
"""
from __future__ import annotations

from hypothesis import given, settings
from hypothesis import strategies as st

from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus, GroundTruthEvent, RetrievalEnvelope
from hte.corpus import fixtures as fixtures_corpus
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier

_ascii_text = st.text(
    alphabet=st.characters(min_codepoint=0x20, max_codepoint=0x7E), min_size=1, max_size=20
)


# --------------------------------------------------------------------------
# GroundTruthEvent: to_dict/from_dict round trip.
# --------------------------------------------------------------------------


@given(
    id_=_ascii_text,
    label=_ascii_text,
    year=st.integers(min_value=-20000, max_value=3000),
    doc_id=_ascii_text,
    discovery_year=st.integers(min_value=-20000, max_value=3000),
)
@settings(max_examples=40)
def test_ground_truth_event_round_trips_through_dict(id_, label, year, doc_id, discovery_year):
    event = GroundTruthEvent(id=id_, label=label, year=year, doc_id=doc_id, discovery_year=discovery_year)
    recovered = GroundTruthEvent.from_dict(event.to_dict())
    assert recovered == event


def test_ground_truth_event_from_dict_coerces_string_years_to_int():
    """`from_dict` calls `int(...)` on both year fields rather than trusting
    the caller already passed an `int`, the one behavior no round-trip test
    above exercises since `to_dict` only ever emits real ints itself."""
    d = {"id": "gt-1", "label": "l", "year": "1950", "doc_id": "doc-a", "discovery_year": "1962"}
    event = GroundTruthEvent.from_dict(d)
    assert event.year == 1950
    assert event.discovery_year == 1962


# --------------------------------------------------------------------------
# RetrievalEnvelope: to_dict/from_dict round trip, including the optional
# fields' own None defaults.
# --------------------------------------------------------------------------


@given(
    retrieval_run_id=_ascii_text,
    doc_id=_ascii_text,
    source_path=_ascii_text,
    fetched_at=_ascii_text,
    fixture=st.booleans(),
)
@settings(max_examples=40)
def test_retrieval_envelope_round_trips_through_dict_with_defaults(
    retrieval_run_id, doc_id, source_path, fetched_at, fixture
):
    envelope = RetrievalEnvelope(
        retrieval_run_id=retrieval_run_id, doc_id=doc_id, source_path=source_path,
        fetched_at=fetched_at, fixture=fixture,
    )
    recovered = RetrievalEnvelope.from_dict(envelope.to_dict())
    assert recovered == envelope
    assert recovered.manifest_fingerprint is None
    assert recovered.protocol_version is None
    assert recovered.citation_count is None
    assert recovered.lineage_count is None


def test_retrieval_envelope_round_trips_with_every_optional_field_populated():
    envelope = RetrievalEnvelope(
        retrieval_run_id="run-1", doc_id="doc-a", source_path="/a.md", fetched_at="2026-09-10T00:00:00Z",
        fixture=False, manifest_fingerprint="abc123", protocol_version="feed402-v1",
        citation_count=3, lineage_count=2,
    )
    recovered = RetrievalEnvelope.from_dict(envelope.to_dict())
    assert recovered == envelope


def test_retrieval_envelope_from_dict_defaults_fixture_true_when_absent():
    d = {
        "retrieval_run_id": "run-1", "doc_id": "doc-a", "source_path": "/a.md",
        "fetched_at": "2026-09-10T00:00:00Z",
    }
    envelope = RetrievalEnvelope.from_dict(d)
    assert envelope.fixture is True


# --------------------------------------------------------------------------
# Corpus: to_dict/from_dict round trip, and save/load through a real file
# (the file's own two uncovered branches).
# --------------------------------------------------------------------------


def _small_corpus() -> Corpus:
    span = EvidenceSpan(doc_id="doc-a", locator="doc-a#1", quote="the sky is blue", char_start=0, char_end=15)
    source = Source(id="doc-a", kind=EvidenceKind.TEXTUAL, date="2026", stemma_parents=[])
    item = EvidenceItem(
        id="ev-1", kind=EvidenceKind.TEXTUAL, tier=Tier.T2, source_id="doc-a", span=span,
        provenance="fixture",
    )
    vocab = Vocabulary()
    vocab.add(Concept(id="actor-1", slot=Slot.ACTOR, label="actor-1", prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS))
    gt = GroundTruthEvent(id="ev-1", label="sky", year=2026, doc_id="doc-a", discovery_year=2026)
    provenance = RetrievalEnvelope(
        retrieval_run_id="run-1", doc_id="doc-a", source_path="doc-a.md", fetched_at="2026-09-10T00:00:00Z",
    )
    return Corpus(sources={"doc-a": source}, evidence=[item], ground_truth=[gt], provenance=[provenance], vocab=vocab)


def test_corpus_round_trips_through_dict():
    corpus = _small_corpus()
    recovered = Corpus.from_dict(corpus.to_dict())
    assert set(recovered.sources) == {"doc-a"}
    assert [e.id for e in recovered.evidence] == ["ev-1"]
    assert [g.id for g in recovered.ground_truth] == ["ev-1"]
    assert [p.doc_id for p in recovered.provenance] == ["doc-a"]
    assert recovered.vocab.get(Slot.ACTOR, "actor-1") is not None


def test_corpus_from_dict_defaults_every_field_when_given_an_empty_mapping():
    corpus = Corpus.from_dict({})
    assert corpus.sources == {}
    assert corpus.evidence == []
    assert corpus.ground_truth == []
    assert corpus.provenance == []
    assert isinstance(corpus.vocab, Vocabulary)


def test_corpus_save_then_load_round_trips_to_an_equal_shape(tmp_path):
    corpus = _small_corpus()
    path = tmp_path / "corpus.json"
    corpus.save(path)
    assert path.exists()
    reloaded = Corpus.load(path)
    assert reloaded.to_dict() == corpus.to_dict()


def test_corpus_save_accepts_a_string_path_not_only_a_path_object(tmp_path):
    corpus = _small_corpus()
    path_str = str(tmp_path / "corpus-str.json")
    corpus.save(path_str)
    reloaded = Corpus.load(path_str)
    assert reloaded.to_dict() == corpus.to_dict()


def test_a_real_shipped_corpus_survives_a_save_load_round_trip(tmp_path):
    """`fixtures.build()` is the one shipped adapter with no ingestion
    side effects of its own; round-tripping it through the same
    `save`/`load` path exercises the container against a real, larger
    corpus shape rather than only this file's own hand-built minimal one."""
    corpus = fixtures_corpus.build()
    path = tmp_path / "fixtures-corpus.json"
    corpus.save(path)
    reloaded = Corpus.load(path)
    assert reloaded.to_dict() == corpus.to_dict()
