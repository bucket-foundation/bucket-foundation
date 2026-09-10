from hte.corpus import Corpus, GroundTruthEvent, RetrievalEnvelope, fixtures, quantum_history


def test_quantum_history_ingest_meets_size_floor():
    corpus = quantum_history.ingest()
    assert len(corpus.sources) >= 16
    assert len(corpus.evidence) >= 30
    assert len(corpus.ground_truth) > 0


def test_quantum_history_evidence_spans_are_valid_and_anchored():
    corpus = quantum_history.ingest()
    raw_by_doc = {}
    for e in corpus.evidence:
        doc_id = e.span.doc_id
        if doc_id not in raw_by_doc:
            path = next(
                (p for p in [
                    quantum_history.DEFAULT_CORPUS_DIR / f"{doc_id}.md",
                    quantum_history.DEFAULT_CORPUS_DIR / "_CHAPTER.md",
                ] if p.is_file()),
                None,
            )
            raw_by_doc[doc_id] = path.read_text() if path else None
        raw = raw_by_doc[doc_id]
        assert raw is not None
        assert e.span.char_start >= 0
        assert e.span.char_end > e.span.char_start
        assert raw[e.span.char_start:e.span.char_end] == e.span.quote


def test_quantum_history_ground_truth_years_in_range():
    corpus = quantum_history.ingest()
    for g in corpus.ground_truth:
        assert 1600 <= g.year <= 2100
        assert g.doc_id in corpus.sources


def test_quantum_history_provenance_is_fixture_only():
    corpus = quantum_history.ingest()
    assert len(corpus.provenance) == len(corpus.sources)
    for envelope in corpus.provenance:
        assert envelope.fixture is True
        assert isinstance(envelope, RetrievalEnvelope)


def test_quantum_history_stemma_parents_reference_real_sources():
    corpus = quantum_history.ingest()
    for source in corpus.sources.values():
        for parent in source.stemma_parents:
            assert parent in corpus.sources
            assert parent != source.id


def test_quantum_history_missing_directory_raises():
    import pytest
    with pytest.raises(FileNotFoundError):
        quantum_history.ingest("/no/such/directory")


def test_fixtures_corpus_shape():
    corpus = fixtures.build()
    assert len(corpus.sources) == 3
    assert len(corpus.evidence) == len(corpus.ground_truth) == 6
    for e in corpus.evidence:
        text = fixtures.FIXTURE_DOCS[e.span.doc_id]
        assert text[e.span.char_start:e.span.char_end] == e.span.quote


def test_corpus_roundtrips_through_dict():
    corpus = fixtures.build()
    restored = Corpus.from_dict(corpus.to_dict())
    assert set(restored.sources) == set(corpus.sources)
    assert len(restored.evidence) == len(corpus.evidence)
    assert len(restored.ground_truth) == len(corpus.ground_truth)


def test_ground_truth_event_roundtrip():
    g = GroundTruthEvent(id="g1", label="thing happened", year=1950, doc_id="doc-1", discovery_year=1950)
    assert GroundTruthEvent.from_dict(g.to_dict()) == g


def test_retrieval_envelope_roundtrip():
    env = RetrievalEnvelope(retrieval_run_id="r1", doc_id="doc-1", source_path="p", fetched_at="2026-01-01T00:00:00Z")
    assert RetrievalEnvelope.from_dict(env.to_dict()) == env
