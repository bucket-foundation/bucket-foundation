import dataclasses

from hte import calibrate
from hte.belief import Constants
from hte.concepts import Concept, Slot
from hte.corpus import vindication_fixture


def test_frozen_at_drops_concepts_introduced_at_or_after_the_cutoff_and_keeps_order():
    corpus = vindication_fixture.build()
    vocab = corpus.vocab
    place = vocab.by_slot[Slot.PLACE]
    place[1] = dataclasses.replace(place[1], introduced_year=1965)
    frozen = vocab.frozen_at(1965)
    assert [c.id for c in frozen.by_slot[Slot.PLACE]] == [place[0].id, "other-place"]  # OTHER is timeless
    assert [c.id for c in frozen.by_slot[Slot.ACTOR]] == [c.id for c in vocab.by_slot[Slot.ACTOR]]
    assert len(vocab.by_slot[Slot.PLACE]) == 3
    assert Concept.from_dict(place[1].to_dict()).introduced_year == 1965
    assert Concept.from_dict({**place[0].to_dict(), "introduced_year": None}).introduced_year is None


def test_run_holdout_links_pre_cutoff_evidence_so_a_supported_candidate_reads_above_its_prior():
    corpus = vindication_fixture.build()
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=1975)
    assert result["n_linked_pre_cutoff_items"] > 0
    true_rows = [p for p in result["predictions"] if p["reading"] == "true"]
    assert true_rows and any(p["predicted"] > 0.2 for p in true_rows)


def test_freeze_vocab_removes_coverage_a_future_concept_would_have_given():
    corpus = vindication_fixture.build()
    place = corpus.vocab.by_slot[Slot.PLACE]
    idx = next(i for i, c in enumerate(place) if c.id == "alpha-observatory")
    place[idx] = dataclasses.replace(place[idx], introduced_year=1970)
    unfrozen = calibrate.run_holdout(corpus, Constants(), cutoff_years=1965)
    frozen = calibrate.run_holdout(corpus, Constants(), cutoff_years=1965, freeze_vocab=True)
    assert frozen["n_frozen_concepts"] == 1 and unfrozen["n_frozen_concepts"] == 0
    assert frozen["n_covered_events"] <= unfrozen["n_covered_events"]
