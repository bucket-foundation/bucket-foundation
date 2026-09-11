import pytest

from hte.concepts import ConsensusStatus, Slot
from hte.corpus import sacred_history
from hte.evidence import Stance, Tier
from hte.timeline import UncertaintyKind


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
    assert corpus.provenance[0].citation_count == 52


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


def test_sacred_history_greek_and_mesopotamian_dated_from_external_anchors():
    corpus = sacred_history.ingest()
    assert corpus.sources["mesopotamian"].date == "-1200"
    assert corpus.sources["greek"].date == "-700"


def test_sacred_history_every_correlation_evidence_item_has_a_dated_interval():
    corpus = sacred_history.ingest()
    correlation_items = [e for e in corpus.evidence if e.provenance == "sacred-history-correlation"]
    assert len(correlation_items) == 52
    for e in correlation_items:
        assert e.interval is not None


def test_sacred_history_correlation_intervals_are_always_uniform_never_point():
    corpus = sacred_history.ingest()
    correlation_items = [e for e in corpus.evidence if e.provenance == "sacred-history-correlation"]
    for e in correlation_items:
        assert e.interval.uncertainty.kind == UncertaintyKind.UNIFORM


def test_sacred_history_interval_derivation_recorded_in_views():
    corpus = sacred_history.ingest()
    correlation_items = [e for e in corpus.evidence if e.provenance == "sacred-history-correlation"]
    flagged = [e for e in correlation_items if "interval_is_overlap" in e.views]
    assert flagged
    for e in flagged:
        assert e.views["interval_is_overlap"] in (0.0, 1.0)


def test_sacred_history_stemma_edges_are_mutual_undirected_pairs():
    """Every correlation this bundle ships is undirected (`direction`
    absent, see `hte.corpus.sacred_history`'s own top docstring): a
    cross-tradition pair with a correlation between them lists each other
    as `stemma_parents`, the mutual-pair flag for "undirected"."""
    corpus = sacred_history.ingest()
    assert "greek" in corpus.sources["hinduism"].stemma_parents
    assert "hinduism" in corpus.sources["greek"].stemma_parents


def test_sacred_history_three_non_contested_correlations_are_ground_truth_matching_evidence():
    """The fix for the build-history campaign's own zero-coverage finding
    (`docs/BUILD-HISTORY.md`, "Data fixes"): a correlation-sourced ground
    truth event's own id matches an `EvidenceItem` id, so `hte.calibrate`'s
    `ev_by_id.get(g.id)` lookup resolves to a real, figure-slotted item."""
    corpus = sacred_history.ingest()
    ev_by_id = {e.id: e for e in corpus.evidence}
    correlation_ground_truth = [g for g in corpus.ground_truth if g.id in ev_by_id]
    assert len(correlation_ground_truth) == 3
    for g in correlation_ground_truth:
        item = ev_by_id[g.id]
        assert item.stance.value == "positive"
        for slot, value in ((Slot.ACTOR, item.actor), (Slot.OBJECT, item.object)):
            concept = corpus.vocab.get(slot, value)
            assert concept is not None
            assert concept.consensus_status != ConsensusStatus.OTHER


def test_sacred_history_human_curated_correlations_get_tier_t3_ai_derived_get_t4():
    corpus = sacred_history.ingest()
    by_id = {e.id: e for e in corpus.evidence}
    human_curated_ids = [
        "clm-corr-motif-parallel-99eb113edd",
        "clm-corr-figure-mapping-ad5075f70a",
        "clm-corr-motif-parallel-411bd30b84",
    ]
    for cid in human_curated_ids:
        assert by_id[cid].tier == Tier.T3
    ai_derived = [e for e in corpus.evidence if e.provenance == "sacred-history-correlation" and e.id not in human_curated_ids]
    assert ai_derived
    for e in ai_derived:
        assert e.tier == Tier.T4
