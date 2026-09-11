import pytest

from hte.concepts import ConsensusStatus, Slot
from hte.corpus import sacred_history
from hte.evidence import Stance


def test_sacred_history_ingest_meets_size_floor():
    corpus = sacred_history.ingest()
    assert len(corpus.sources) == 13
    assert len(corpus.evidence) >= 49  # one per correlation, plus counter-consideration items
    assert len(corpus.ground_truth) > 0


def test_sacred_history_sources_keyed_by_tradition():
    corpus = sacred_history.ingest()
    assert set(corpus.sources) == set(corpus.sources[s].id for s in corpus.sources)
    for tradition, source in corpus.sources.items():
        assert source.id == tradition


def test_sacred_history_evidence_spans_are_valid_and_anchored():
    corpus = sacred_history.ingest()
    raw = sacred_history.DEFAULT_CORPUS_PATH.read_text(encoding="utf-8")
    for e in corpus.evidence:
        assert e.span.char_start >= 0
        assert e.span.char_end > e.span.char_start
        assert raw[e.span.char_start:e.span.char_end] == e.span.quote


def test_sacred_history_stemma_parents_reference_real_sources_and_no_self_loop():
    corpus = sacred_history.ingest()
    for source in corpus.sources.values():
        for parent in source.stemma_parents:
            assert parent in corpus.sources
            assert parent != source.id


def test_sacred_history_correlation_confidence_carried_into_blended_a_view():
    corpus = sacred_history.ingest()
    correlation_items = [e for e in corpus.evidence if e.provenance == "sacred-history-correlation"]
    assert correlation_items
    for e in correlation_items:
        assert "blended_a" in e.views
        assert 0.0 <= e.views["blended_a"] <= 0.99


def test_sacred_history_counter_considerations_become_negative_stance_items():
    corpus = sacred_history.ingest()
    counter_items = [e for e in corpus.evidence if e.provenance == "sacred-history-counter-consideration"]
    assert counter_items
    for e in counter_items:
        assert e.stance == Stance.NEGATIVE


def test_sacred_history_slots_resolve_to_known_concepts_or_other():
    corpus = sacred_history.ingest()
    for e in corpus.evidence:
        for slot, value in ((Slot.ACTOR, e.actor), (Slot.ACTION, e.action), (Slot.OBJECT, e.object),
                             (Slot.PLACE, e.place), (Slot.MECHANISM, e.mechanism)):
            assert value is not None
            assert corpus.vocab.get(slot, value) is not None


def test_sacred_history_ground_truth_from_non_disputed_timeline_events():
    corpus = sacred_history.ingest()
    for g in corpus.ground_truth:
        assert g.doc_id == "sacred-history.json"
        assert g.discovery_year == g.year


def test_sacred_history_intervals_have_start_le_end_when_present():
    corpus = sacred_history.ingest()
    for e in corpus.evidence:
        if e.interval is not None:
            assert e.interval.start <= e.interval.end


def test_sacred_history_provenance_is_one_fixture_envelope():
    corpus = sacred_history.ingest()
    assert len(corpus.provenance) == 1
    assert corpus.provenance[0].fixture is True
    assert corpus.provenance[0].citation_count == 49


def test_sacred_history_missing_file_raises():
    with pytest.raises(FileNotFoundError):
        sacred_history.ingest("/no/such/file.json")


def test_sacred_history_vocab_keeps_five_non_consensus_actors():
    vocab = sacred_history.load_vocab()
    non_consensus = [
        c for c in vocab.concepts(Slot.ACTOR)
        if c.consensus_status in (ConsensusStatus.FRINGE, ConsensusStatus.CONTESTED)
    ]
    assert len(non_consensus) == 5


def test_sacred_history_vocab_carries_every_figure_as_actor_and_object():
    vocab = sacred_history.load_vocab()
    actor_ids = {c.id for c in vocab.concepts(Slot.ACTOR)}
    object_ids = {c.id for c in vocab.concepts(Slot.OBJECT)}
    assert "moses" in actor_ids and "moses" in object_ids
    assert "manu" in actor_ids and "deucalion" in object_ids


def test_sacred_history_registered_in_cli_and_runner_loaders():
    from hte.cli import _CORPUS_LOADERS as cli_loaders
    from hte.runner import _CORPUS_LOADERS as runner_loaders

    assert cli_loaders["sacred-history"] is sacred_history.ingest
    assert runner_loaders["sacred-history"] is sacred_history.ingest
