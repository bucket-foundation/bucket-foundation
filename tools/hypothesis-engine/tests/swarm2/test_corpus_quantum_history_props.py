"""Property tests for `hte.corpus.quantum_history.ingest`: the generic
corpus invariants every adapter in this round's own task brief names
(unique source ids, evidence source_id resolves, non-empty in-range
spans, `start <= end` intervals, slots resolving to a vocab id or
`None`, ground-truth dates inside the corpus span, no stemma self-loop),
plus FINDING-2026-09-10-102: a stemma parent extracted from free "Go
deeper"-style prose in a card's own `## Sources` section can dangle
(name a doc id no card in the ingested corpus carries), since
`_CROSS_REF_RE` matches ANY `T-[a-z0-9]+`-shaped token in that section's
text, with no check that the matched id resolves to a real ingested
card.

Every card is built from one fixed, high-signal bullet template naming
real quantum-history vocabulary labels ("Max Planck", "quantized," "the
blackbody spectrum," "Copenhagen," "energy quantization"), since
`ingest()` always reads bullets against the shipped, non-overridable
`load_vocab()` (a domain-matched, fixed vocabulary of physicists and
labs): a bullet using generic placeholder words would never resolve any
slot at all, leaving the "slots resolve to a vocab id" half of the
invariant untested.
"""
from __future__ import annotations

import string

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte.corpus import quantum_history as qh

from tests.swarm2.conftest import assert_corpus_invariants

_MILESTONE_TEMPLATE = (
    "In {year}, Max Planck quantized the blackbody spectrum at Copenhagen "
    "via energy quantization for card {doc_id} milestone {i}. T{tier} citation-{doc_id}-{i}"
)
_CLAIM_TEMPLATE = "claim: card {doc_id} claim {i} about quantization. T{tier}{negation}"
_NEGATION_SUFFIX = " status: disputed, no independent confirmation"

_DOC_ID_ALPHABET = string.ascii_lowercase + string.digits


def _doc_id(n: int) -> str:
    return f"T-card{n}"


def _build_card_text(doc_id: str, milestones: list[tuple[int, int]], claims: list[tuple[int, bool]], cross_refs: list[str]) -> str:
    lines = [f"# Card {doc_id} · {doc_id}", "", "## Milestone timeline"]
    for i, (year, tier) in enumerate(milestones):
        lines.append("- " + _MILESTONE_TEMPLATE.format(year=year, doc_id=doc_id, i=i, tier=tier))
    lines += ["", "## Key graded claims"]
    for i, (tier, negated) in enumerate(claims):
        suffix = _NEGATION_SUFFIX if negated else ""
        lines.append("- " + _CLAIM_TEMPLATE.format(doc_id=doc_id, i=i, tier=tier, negation=suffix))
    lines += ["", "## Sources"]
    if cross_refs:
        refs_text = ", ".join(cross_refs)
        lines.append(f"- **Go deeper:** {refs_text}")
    else:
        lines.append(f"- a plain citation for {doc_id}, no cross references")
    return "\n".join(lines) + "\n"


def _build_corpus_dir(tmp_path, cards: list[dict]):
    for card in cards:
        (tmp_path / f"{card['doc_id']}.md").write_text(
            _build_card_text(card["doc_id"], card["milestones"], card["claims"], card["cross_refs"])
        )
    return tmp_path


# --------------------------------------------------------------------------
# Strategy: a small corpus of 1-4 cards, each with 1-3 milestone bullets
# (year, tier) and 0-2 claim bullets (tier, negated), cross-referencing
# only SIBLING doc ids already in this same corpus (no ghost refs, no
# self refs) -- the safe subset the generic invariants hold over.
# --------------------------------------------------------------------------

years_st = st.integers(min_value=1900, max_value=2030)
tiers_st = st.integers(min_value=1, max_value=6)


@st.composite
def safe_corpus_spec(draw):
    n_cards = draw(st.integers(min_value=1, max_value=4))
    doc_ids = [_doc_id(i) for i in range(n_cards)]
    cards = []
    for i, doc_id in enumerate(doc_ids):
        n_milestones = draw(st.integers(min_value=1, max_value=3))
        milestones = draw(st.lists(st.tuples(years_st, tiers_st), min_size=n_milestones, max_size=n_milestones))
        n_claims = draw(st.integers(min_value=0, max_value=2))
        claims = draw(st.lists(st.tuples(tiers_st, st.booleans()), min_size=n_claims, max_size=n_claims))
        siblings = [d for d in doc_ids if d != doc_id]
        cross_refs = draw(st.lists(st.sampled_from(siblings), max_size=len(siblings), unique=True)) if siblings else []
        cards.append({"doc_id": doc_id, "milestones": milestones, "claims": claims, "cross_refs": cross_refs})
    return cards


@given(cards=safe_corpus_spec())
@settings(max_examples=60, deadline=None)
def test_quantum_history_ingest_generic_corpus_invariants(tmp_path_factory, cards):
    corpus_dir = tmp_path_factory.mktemp("qh-corpus")
    _build_corpus_dir(corpus_dir, cards)
    corpus = qh.ingest(corpus_dir)
    assert_corpus_invariants(corpus, check_stemma_resolves=True)


@given(cards=safe_corpus_spec())
@settings(max_examples=60, deadline=None)
def test_quantum_history_ground_truth_dates_fall_inside_the_corpus_span(tmp_path_factory, cards):
    corpus_dir = tmp_path_factory.mktemp("qh-corpus-span")
    _build_corpus_dir(corpus_dir, cards)
    corpus = qh.ingest(corpus_dir)

    all_years = [year for card in cards for year, _tier in card["milestones"]]
    assert all_years, "at least one card carries at least one milestone bullet"
    lo, hi = min(all_years), max(all_years)
    assert corpus.ground_truth, "every milestone bullet names a year, so every one becomes a ground truth event"
    for gt in corpus.ground_truth:
        assert lo <= gt.year <= hi
        # documented simplification (hte.corpus.GroundTruthEvent's own
        # docstring): discovery_year == year for this corpus.
        assert gt.discovery_year == gt.year


@given(cards=safe_corpus_spec())
@settings(max_examples=60, deadline=None)
def test_quantum_history_milestone_bullets_resolve_actor_and_action_slots(tmp_path_factory, cards):
    """Every milestone bullet (built from the fixed high-signal template)
    resolves ACTOR to Planck's own id and ACTION to "quantized," a
    regression check that the generic "slots resolve to a vocab id"
    invariant is being exercised by real matches, not only by the trivial
    all-`None` case."""
    corpus_dir = tmp_path_factory.mktemp("qh-corpus-slots")
    _build_corpus_dir(corpus_dir, cards)
    corpus = qh.ingest(corpus_dir)

    milestone_items = [e for e in corpus.evidence if e.provenance == "quantum-history-card-milestone"]
    assert milestone_items
    for item in milestone_items:
        assert item.actor == "planck"
        assert item.action == "quantized"


# --------------------------------------------------------------------------
# No self-loop: a card referencing its own doc id in its Sources section
# never appears in its own stemma_parents.
# --------------------------------------------------------------------------


def test_quantum_history_self_cross_reference_is_excluded_from_stemma_parents(tmp_path):
    cards = [{
        "doc_id": "T-selfref", "milestones": [(1950, 1)], "claims": [],
        "cross_refs": ["T-selfref"],  # a self-reference, on purpose
    }]
    _build_corpus_dir(tmp_path, cards)
    corpus = qh.ingest(tmp_path)
    assert "T-selfref" not in corpus.sources["T-selfref"].stemma_parents


# --------------------------------------------------------------------------
# FINDING-2026-09-10-102: RESOLVED. A "Go deeper"-style cross-reference to
# a doc id not present anywhere in the ingested corpus no longer becomes
# a dangling stemma parent: `ingest` now runs
# `_drop_dangling_stemma_parents` once every card (and the chapter) has
# been parsed, dropping any `stemma_parents` entry absent from the final
# `sources` dict and logging one warning per drop.
# --------------------------------------------------------------------------


def test_finding_2026_09_10_102_cross_reference_to_a_nonexistent_card_no_longer_dangles(tmp_path, caplog):
    """One card whose Sources section names `T-ghost`, a doc id with no
    corresponding `T-ghost.md` file anywhere in `corpus_dir`. Every
    stemma parent resolves to a real source in the corpus (this round's
    own generic invariant): `T-ghost` is dropped from `T-real`'s own
    `stemma_parents` rather than left dangling, and a warning naming both
    ids is logged."""
    cards = [{
        "doc_id": "T-real", "milestones": [(1950, 1)], "claims": [],
        "cross_refs": ["T-ghost"],
    }]
    _build_corpus_dir(tmp_path, cards)
    with caplog.at_level("WARNING", logger="hte.corpus.quantum_history"):
        corpus = qh.ingest(tmp_path)
    assert_corpus_invariants(corpus, check_stemma_resolves=True)
    assert corpus.sources["T-real"].stemma_parents == []
    assert any("T-ghost" in record.getMessage() for record in caplog.records)
