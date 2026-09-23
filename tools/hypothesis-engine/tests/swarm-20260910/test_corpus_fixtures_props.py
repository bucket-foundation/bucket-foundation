from __future__ import annotations

from hte.calibrate import choose_holdout_mode, holdout_by_discovery_date
from hte.corpus import Corpus, fixtures

from tests.swarm2.conftest import assert_corpus_invariants

def _build() -> Corpus:
    return fixtures.build()

def test_fixtures_corpus_satisfies_the_generic_corpus_invariants():
    assert_corpus_invariants(_build(), check_stemma_resolves=True)

def test_build_is_deterministic_across_repeated_calls():
    a, b = _build(), _build()
    assert [s.id for s in a.evidence] == [s.id for s in b.evidence]
    assert [(gt.id, gt.year, gt.discovery_year) for gt in a.ground_truth] == \
        [(gt.id, gt.year, gt.discovery_year) for gt in b.ground_truth]
    assert set(a.sources) == set(b.sources)

def test_every_span_offset_round_trips_into_fixture_docs():
    corpus = _build()
    for item in corpus.evidence:
        doc_text = fixtures.FIXTURE_DOCS[item.span.doc_id]
        recovered = doc_text[item.span.char_start:item.span.char_end]
        assert recovered == item.span.quote, (
            f"evidence item {item.id!r}: offsets [{item.span.char_start}, "
            f"{item.span.char_end}) recover {recovered!r} from {item.span.doc_id!r}, "
            f"its own recorded quote is {item.span.quote!r}"
        )

def test_every_evidence_source_id_matches_its_own_span_doc_id():
    for item in _build().evidence:
        assert item.source_id == item.span.doc_id

def test_every_evidence_item_has_a_matching_ground_truth_event_by_id():
    corpus = _build()
    evidence_ids = {item.id for item in corpus.evidence}
    ground_truth_ids = {gt.id for gt in corpus.ground_truth}
    assert evidence_ids == ground_truth_ids

def test_ground_truth_ids_are_unique():
    corpus = _build()
    ids = [gt.id for gt in corpus.ground_truth]
    assert len(ids) == len(set(ids))

def test_ground_truth_year_matches_the_source_evidence_items_own_span_year():
    corpus = _build()
    by_id = {item.id: item for item in corpus.evidence}
    for gt in corpus.ground_truth:
        item = by_id[gt.id]
        doc_text = fixtures.FIXTURE_DOCS[item.span.doc_id]
        assert str(gt.year) in doc_text, (
            f"ground truth {gt.id!r} claims year {gt.year}, not found anywhere "
            f"in its own doc {item.span.doc_id!r}"
        )

def test_discovery_date_split_at_1960_matches_the_docstrings_own_claim():
    corpus = _build()
    pre, post = holdout_by_discovery_date(corpus.ground_truth, cutoff=1960)
    pre_ids, post_ids = {g.id for g in pre}, {g.id for g in post}

    assert "gt-alpha" in pre_ids
    assert "gt-alpha-confirm" in post_ids
    assert "gt-gamma" in pre_ids
    assert "gt-gamma-downgrade" in post_ids
    assert "gt-beta" in post_ids
    assert "gt-beta-contested" in post_ids
    assert not ({"gt-beta", "gt-beta-contested"} & pre_ids)

def test_downgrade_item_is_the_only_absence_flagged_item():
    corpus = _build()
    absence_ids = {item.id for item in corpus.evidence if item.is_absence}
    assert absence_ids == {"gt-gamma-downgrade"}

def test_doc_beta_names_doc_alpha_as_its_one_stemma_parent():
    corpus = _build()
    assert corpus.sources["doc-beta"].stemma_parents == ["doc-alpha"]
    assert corpus.sources["doc-alpha"].stemma_parents == []
    assert corpus.sources["doc-gamma"].stemma_parents == []

def test_choose_holdout_mode_picks_kfold_for_the_fixtures_corpus():
    mode, _reason = choose_holdout_mode(_build())
    assert mode == "kfold"
