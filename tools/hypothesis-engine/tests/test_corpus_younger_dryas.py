"""`hte.corpus.younger_dryas`: 47 open-metadata, DOI-verified cards on the
Younger Dryas boundary (12.9-11.7 ka BP) impact-hypothesis debate, the
engine's first contested-science corpus. See that module's own top
docstring for the design decisions these tests check against.
"""
import re

import pytest

from hte.concepts import ConsensusStatus, Slot
from hte.corpus import younger_dryas as yd
from hte.evidence import Stance, Tier
from hte.timeline import UncertaintyKind

_DOI_RE = re.compile(r"^10\.\d{4,9}/\S+$")


def test_younger_dryas_load_meets_size_floor():
    corpus = yd.load()
    assert 40 <= len(corpus.sources) <= 50
    assert len(corpus.evidence) >= len(corpus.sources)
    assert len(corpus.ground_truth) > 0


def test_younger_dryas_sources_keyed_by_real_doi():
    corpus = yd.load()
    for source_id, source in corpus.sources.items():
        assert source.id == source_id
        assert _DOI_RE.match(source_id), source_id


def test_younger_dryas_every_card_carries_a_non_empty_doi_check():
    for card in yd.load_raw():
        assert card.doi_check
        assert card.doi in card.doi_check
        assert "crossref" in card.doi_check.lower()


def test_younger_dryas_evidence_spans_are_valid_and_anchored():
    corpus = yd.load()
    cards_by_doi = {c.doi: c for c in yd.load_raw()}
    for e in corpus.evidence:
        assert e.span.char_start >= 0
        assert e.span.char_end > e.span.char_start
        card = cards_by_doi[e.source_id]
        raw = (yd.DEFAULT_CARDS_DIR / f"{card.slug}.md").read_text()
        assert raw[e.span.char_start:e.span.char_end] == e.span.quote
        assert e.span.quote == e.span.quote.strip()


def test_younger_dryas_stemma_parents_reference_real_sources_and_no_self_loop():
    corpus = yd.load()
    for source in corpus.sources.values():
        for parent in source.stemma_parents:
            assert parent in corpus.sources
            assert parent != source.id


def test_younger_dryas_rebuts_and_replicates_reference_real_cards():
    slugs = {c.slug for c in yd.load_raw()}
    for card in yd.load_raw():
        for ref in (*card.rebuts, *card.replicates):
            assert ref in slugs
            assert ref != card.slug


def test_younger_dryas_slots_resolve_to_known_concepts_never_other():
    """Every claim in this corpus is authored with a real vocabulary id
    already attached (this module's own top docstring, "Claims, slots,
    and stance"): no card should ever fall back to the open-world
    `OTHER` placeholder the way a lexicon-inferred corpus's own edge
    cases can."""
    corpus = yd.load()
    for e in corpus.evidence:
        for slot, value in (
            (Slot.ACTOR, e.actor), (Slot.ACTION, e.action), (Slot.OBJECT, e.object),
            (Slot.PLACE, e.place), (Slot.MECHANISM, e.mechanism),
        ):
            assert value is not None
            concept = corpus.vocab.get(slot, value)
            assert concept is not None, f"{slot.value}={value!r} not in vocab"
            assert concept.consensus_status != ConsensusStatus.OTHER


def test_younger_dryas_vocab_keeps_five_non_consensus_actors():
    vocab = yd.load_vocab()
    non_consensus = [
        c for c in vocab.concepts(Slot.ACTOR)
        if c.consensus_status in (ConsensusStatus.FRINGE, ConsensusStatus.CONTESTED)
    ]
    assert len(non_consensus) == 5


def test_younger_dryas_vocab_cosmic_impact_is_contested_not_fringe():
    """This module's own top docstring, "Ground truth": the impact
    hypothesis is a real scientific contender, distinguishable from the
    exotic minority actors (a fragmenting-comet swarm, a solar proton
    event, a nearby supernova), never conflated with them."""
    vocab = yd.load_vocab()
    cosmic_impact = vocab.get(Slot.ACTOR, "cosmic-impact")
    assert cosmic_impact is not None
    assert cosmic_impact.consensus_status == ConsensusStatus.CONTESTED
    fringe_actors = {c.id for c in vocab.concepts(Slot.ACTOR) if c.consensus_status == ConsensusStatus.FRINGE}
    assert "cosmic-impact" not in fringe_actors
    assert fringe_actors == {"taurid-complex-swarm", "solar-proton-event", "supernova-event"}


def test_younger_dryas_vocab_meltwater_pulse_is_the_consensus_actor():
    vocab = yd.load_vocab()
    meltwater = vocab.get(Slot.ACTOR, "meltwater-pulse")
    assert meltwater is not None
    assert meltwater.consensus_status == ConsensusStatus.CONSENSUS
    assert meltwater.prior_logit > 0


def test_younger_dryas_registered_in_cli_and_runner_loaders():
    from hte.cli import _CORPUS_LOADERS as cli_loaders
    from hte.runner import _CORPUS_LOADERS as runner_loaders

    assert cli_loaders["younger-dryas"] is yd.load
    assert runner_loaders["younger-dryas"] is yd.load


def test_younger_dryas_tier_by_venue_type():
    corpus = yd.load()
    cards_by_doi = {c.doi: c for c in yd.load_raw()}
    chapters = [doi for doi, c in cards_by_doi.items() if c.venue_type == "book-chapter"]
    assert len(chapters) == 1
    for e in corpus.evidence:
        expected = Tier.T3 if e.source_id in chapters else Tier.T2
        assert e.tier == expected


def test_younger_dryas_intervals_have_start_le_end_when_present():
    corpus = yd.load()
    for e in corpus.evidence:
        if e.interval is not None:
            assert e.interval.start <= e.interval.end


def test_younger_dryas_point_intervals_read_point_wider_intervals_read_uniform():
    corpus = yd.load()
    for e in corpus.evidence:
        if e.interval is None:
            continue
        if e.interval.start == e.interval.end:
            assert e.interval.uncertainty.kind == UncertaintyKind.POINT
        else:
            assert e.interval.uncertainty.kind == UncertaintyKind.UNIFORM


def test_younger_dryas_onset_and_termination_ground_truth_match_periods_seed():
    """`hte/data/periods-seed.json`'s own `younger-dryas-boundary` row:
    "12.9 to 11.7 ka BP." Each boundary event's own `id` names a real
    `EvidenceItem` (`hte.calibrate.run_holdout`'s own `ev_by_id.get(g.id)`
    lookup contract, this module's own top docstring, "Ground truth"):
    the onset anchors to Rasmussen and colleagues 2006's own ice-core
    chronology, the termination to Steffensen and colleagues 2008's own
    direct dating of the transition's abruptness, neither one disputed
    by either side of this corpus's own debate."""
    corpus = yd.load()
    by_id = {g.id: g for g in corpus.ground_truth}
    evidence_ids = {e.id for e in corpus.evidence}
    onset, termination = by_id["rasmussen-2006-c0"], by_id["steffensen-2008-c0"]
    assert onset.id in evidence_ids and termination.id in evidence_ids
    assert onset.year == round(1950 - 12900)
    assert termination.year == round(1950 - 11700)
    assert onset.doc_id == "10.1029/2005jd006079"
    assert termination.doc_id == "10.1126/science.1157707"
    assert onset.discovery_year == 2006
    assert termination.discovery_year == 2008


def test_younger_dryas_rebutted_cards_never_seed_corroboration_ground_truth():
    """This module's own tightening past `hte.corpus.literature`'s
    method 3 (module docstring, "Ground truth," item 2): a card named in
    any other card's own `rebuts:` list can never anchor a corroboration
    `GroundTruthEvent`, so a still-disputed finding (Firestone and
    colleagues 2007, Kennett and colleagues 2009's nanodiamond claim)
    never reads as "independently corroborated" ground truth. Every
    `GroundTruthEvent.id` names a real `EvidenceItem.id`
    (`test_younger_dryas_onset_and_termination_ground_truth_match_
    periods_seed` checks the two chronology anchors; this test checks
    every corroboration-seeded event past those two)."""
    corpus = yd.load()
    cards = yd.load_raw()
    chronology_ids = {"rasmussen-2006-c0", "steffensen-2008-c0"}
    rebutted_dois = {c.doi for c in cards if any(other.rebuts and c.slug in other.rebuts for other in cards)}
    corroboration_events = [g for g in corpus.ground_truth if g.id not in chronology_ids]
    assert corroboration_events
    evidence_ids = {e.id for e in corpus.evidence}
    for g in corroboration_events:
        assert g.id in evidence_ids
        assert g.doc_id not in rebutted_dois
    firestone_doi = next(c.doi for c in cards if c.slug == "firestone-2007")
    kennett_nanodiamonds_doi = next(c.doi for c in cards if c.slug == "kennett-2009-nanodiamonds")
    assert firestone_doi not in {g.doc_id for g in corroboration_events}
    assert kennett_nanodiamonds_doi not in {g.doc_id for g in corroboration_events}


def test_younger_dryas_provenance_one_envelope_per_source():
    corpus = yd.load()
    assert len(corpus.provenance) == len(corpus.sources)
    assert {p.doc_id for p in corpus.provenance} == set(corpus.sources)
    assert all(p.fixture for p in corpus.provenance)


def test_younger_dryas_missing_dir_raises():
    with pytest.raises(FileNotFoundError):
        yd.load_raw("/no/such/directory")


def test_younger_dryas_side_and_kind_cover_both_debate_sides_and_six_kinds():
    cards = yd.load_raw()
    sides = {c.side for c in cards}
    kinds = {c.kind for c in cards}
    assert sides == {"proponent", "critic", "alternative", "neutral"}
    assert kinds == {"astronomical", "geological", "material", "genetic", "model_prior", "textual"}
    assert sum(1 for c in cards if c.side == "proponent") >= 10
    assert sum(1 for c in cards if c.side == "critic") >= 10


def test_younger_dryas_stance_and_action_are_independent_dimensions():
    """`action` names what happened to a *finding* (triggered/
    corroborated/refuted/inconclusive); `stance` names whether *this
    claim's own* slot values are asserted true or denied
    (`hte.evidence.Stance`'s own docstring). The two are not one flag
    doubled: a card can carry `action=refuted` while asserting its own
    reading positively, when the thing it refutes is an earlier
    rebuttal rather than the original finding (LeCompte and colleagues
    2012 and Kinzie and colleagues 2014 both refute a critic's null
    result, reasserting the original proponent claim, `stance=positive`
    on an `action=refuted` item)."""
    corpus = yd.load()
    refuted_stances = {e.stance for e in corpus.evidence if e.action == "refuted"}
    assert refuted_stances == {Stance.POSITIVE, Stance.NEGATIVE}
    by_source_slug = {e.id.rsplit("-c", 1)[0]: e for e in corpus.evidence}
    assert by_source_slug["lecompte-2012"].action == "refuted"
    assert by_source_slug["lecompte-2012"].stance == Stance.POSITIVE
