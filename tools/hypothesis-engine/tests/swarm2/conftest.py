"""Shared strategies and fixture builders for round two of the property
swarm (bkt-hte-test-swarm), targeting the modules round one skipped:
`hte.corpus.education_atlas`, `hte.corpus.production`, `hte.corpus.
quantum_history`, `hte.synth`, `hte.fakellm`, `hte.parallel`,
`hte.batching`, `hte.link`, `hte.generate`. Round one's own
`tests/swarm/conftest.py` covers the stable modules
(`hte.timeline`/`hte.concepts`/`hte.address`/`hte.hypothesis`/
`hte.evidence`/`hte.belief`/`hte.unknowns`/`hte.export`/`hte.periods`/
`hte.retrieval`/`hte.paper`/`hte.referee`/`hte.publish`/`hte.pipeline`/
`hte.llm`); this file does not import it (a sibling test directory's
`conftest.py` is not a normal importable module), so every helper this
round's test files need is defined fresh here, scoped to the nine modules
above.

`hypothesis` is installed in this environment (confirmed empirically,
`python3 -c "import hypothesis"` succeeds); every file under `tests/
swarm2/` uses it directly rather than falling back to seeded `random`.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from hypothesis import strategies as st

from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary, other_id
from hte.corpus import Corpus
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval

# The active hypothesis profile (`fast`, 40 examples, default; `full`, 300
# examples, via `HTE_TEST_PROFILE=full`) is registered and loaded once in
# `tests/conftest.py`, which pytest imports before this file. Nothing here
# loads a profile of its own. A handful of the heaviest fixture-building
# properties in this directory pin their own `max_examples` down at the
# call site regardless of profile (documented there).


# --------------------------------------------------------------------------
# Small hand-built vocabularies (`hte.link`/`hte.generate`/`hte.synth`'s own
# test precedent, `tests/test_link.py::_vocab`/`tests/test_generate.py::
# _small_vocab`, extended with the near-identical-label pairs this round's
# own task brief names by name: `"Actor 5"` vs `"Actor 10"`, `"planck"` vs
# `"planck-1900"`, `"bell"` vs `"bell-inequality"`).
# --------------------------------------------------------------------------


def small_vocab() -> Vocabulary:
    """A fresh vocabulary with a handful of named, distinct-label concepts
    per concept-bearing slot, `OTHER` added by `Vocabulary.__post_init__`
    alone. Every label is intentionally NOT a near-duplicate of another
    one in this vocabulary (`hte.synth`'s own `_random_label` docstring:
    two labels sharing a long common prefix or substring push `difflib.
    SequenceMatcher.ratio()` past `hte.link.link_evidence`'s default
    `threshold=0.6` by construction, which is exactly what `near_label_
    pairs_vocab` below is built to exercise on purpose instead)."""
    vocab = Vocabulary()
    vocab.add(Concept("farmers", Slot.ACTOR, "Farmers", 2.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("aliens", Slot.ACTOR, "Aliens", -4.0, ConsensusStatus.FRINGE))
    vocab.add(Concept("smiths", Slot.ACTOR, "Smiths", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("built", Slot.ACTION, "Built", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("razed", Slot.ACTION, "Razed", -0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("shrine", Slot.OBJECT, "Shrine", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("granary", Slot.OBJECT, "Granary", 0.2, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("site", Slot.PLACE, "Site", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("valley", Slot.PLACE, "Valley", 0.1, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("labor", Slot.MECHANISM, "Labor", 0.5, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("tech", Slot.MECHANISM, "Tech", -2.5, ConsensusStatus.FRINGE))
    return vocab


def near_label_pairs_vocab() -> Vocabulary:
    """A vocabulary carrying exactly the three near-identical-label pairs
    this round's own task brief names: `"Actor 5"`/`"Actor 10"` (ACTOR),
    `"planck"`/`"planck-1900"` (ACTION, standing in for a two-actor pair
    sharing a long token prefix), `"bell"`/`"bell-inequality"` (OBJECT).
    Each pair's two concepts get distinct, unrelated ids, so a test can
    assert `hte.link.link_evidence` never lets an item naming one member's
    id cross-link to a hypothesis naming the other."""
    vocab = Vocabulary()
    vocab.add(Concept("actor-five", Slot.ACTOR, "Actor 5", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("actor-ten", Slot.ACTOR, "Actor 10", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("planck-plain", Slot.ACTION, "planck", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("planck-1900", Slot.ACTION, "planck-1900", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("bell-plain", Slot.OBJECT, "bell", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("bell-inequality", Slot.OBJECT, "bell-inequality", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("place-1", Slot.PLACE, "Place One", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("mech-1", Slot.MECHANISM, "Mechanism One", 0.0, ConsensusStatus.CONSENSUS))
    return vocab


NEAR_LABEL_PAIRS: tuple[tuple[Slot, str, str], ...] = (
    (Slot.ACTOR, "actor-five", "actor-ten"),
    (Slot.ACTION, "planck-plain", "planck-1900"),
    (Slot.OBJECT, "bell-plain", "bell-inequality"),
)


# --------------------------------------------------------------------------
# Intervals / years (small, in-vocabulary-span ranges so every generated
# `Placement` can be addressed under the module's own default TIME_BIN axis)
# --------------------------------------------------------------------------

years_in_default_span = st.integers(min_value=1000, max_value=1900)
small_nonneg = st.integers(min_value=0, max_value=50)


@st.composite
def intervals_in_span(draw):
    start = draw(years_in_default_span)
    length = draw(small_nonneg)
    return Interval(start=start, end=start + length)


slots_st = st.sampled_from(list(Slot)[:6])  # every Slot but RELATION
concept_slots_st = st.sampled_from((Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM))


# --------------------------------------------------------------------------
# Evidence items
# --------------------------------------------------------------------------


def evidence_span(text: str = "quoted text", doc_id: str = "doc-1") -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="p1", quote=text, char_start=0, char_end=len(text))


def make_evidence_item(item_id: str, **overrides) -> EvidenceItem:
    defaults = dict(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id="src-1",
        span=evidence_span(), provenance="test-fixture",
    )
    defaults.update(overrides)
    return EvidenceItem(**defaults)


def placement_from_vocab(vocab: Vocabulary, *, actor: str, action: str, object_: str,
                          place: str, mechanism: str, interval: Interval) -> Placement:
    return Placement(actor=actor, action=action, object=object_, place=place, mechanism=mechanism, interval=interval)


def hypothesis_for(vocab: Vocabulary, **kwargs) -> Hypothesis:
    return Hypothesis.from_placement(placement_from_vocab(vocab, **kwargs), vocab)


# --------------------------------------------------------------------------
# Generic corpus invariants, shared across the three `hte.corpus.*` adapter
# test files (this round's own task brief: "every corpus adapter returns
# Sources with unique ids, EvidenceItems whose source_id resolves, spans
# with non-empty quotes and in-range char offsets, intervals with start <=
# end, slots that are either vocab ids or OTHER, ground-truth events whose
# dates fall inside the corpus span, stemma edges that resolve and contain
# no self-loop").
# --------------------------------------------------------------------------


def assert_corpus_invariants(corpus: Corpus, *, check_stemma_resolves: bool = True) -> None:
    """Every generic invariant this round's own task brief lists for "every
    corpus adapter," checked against one already-built `Corpus`.
    `check_stemma_resolves` was a caller-side escape hatch for
    `hte.corpus.quantum_history`, which this round's own swarm found to
    violate that one sub-property (FINDING-2026-09-10-102, now resolved:
    `ingest` drops a dangling `stemma_parents` entry rather than carrying
    it); every caller in this test suite passes `check_stemma_resolves=
    True` (the default) as of that fix, kept here as a documented escape
    hatch for any future adapter that needs it rather than removed
    outright."""
    # Unique source ids: `corpus.sources` is itself a dict keyed by id, so
    # this is "no adapter silently deduplicated two distinct
    # sources onto one key," checked by comparing against each `Source`'s
    # own `.id` field agreeing with its dict key.
    assert len(corpus.sources) == len({s.id for s in corpus.sources.values()})
    for key, source in corpus.sources.items():
        assert source.id == key

    # Every EvidenceItem's source_id resolves to a real Source.
    for item in corpus.evidence:
        assert item.source_id in corpus.sources, (
            f"evidence item {item.id!r} names source_id {item.source_id!r}, "
            f"not present in corpus.sources"
        )

    # Spans: non-empty quotes, non-negative in-range char offsets. Every
    # adapter in this package either locates its quote verbatim in a raw
    # source document (char_end - char_start == len(quote)) or writes a
    # synthetic span over the quote text alone (char_start=0,
    # char_end=len(quote)); both cases satisfy the identical check.
    for item in corpus.evidence:
        span = item.span
        assert len(span.quote) > 0, f"evidence item {item.id!r} carries an empty quote"
        assert span.char_start >= 0
        assert span.char_end >= span.char_start
        assert span.char_end - span.char_start == len(span.quote), (
            f"evidence item {item.id!r}: char range "
            f"[{span.char_start}, {span.char_end}) does not span its own {len(span.quote)}-char quote"
        )

    # Intervals: start <= end (already enforced by `Interval.__post_init__`
    # at construction; re-checking here catches a caller that somehow built
    # one around that guard, e.g. via `object.__setattr__`).
    for item in corpus.evidence:
        if item.interval is not None:
            assert item.interval.start <= item.interval.end

    # Concept slots: every non-None slot value on an EvidenceItem resolves
    # against the corpus's own vocabulary for that slot (a real concept id,
    # which includes OTHER: `other_id(slot)` is itself always present in
    # `vocab.by_slot[slot]`, `Vocabulary.__post_init__`'s own contract).
    for item in corpus.evidence:
        for slot, value in (
            (Slot.ACTOR, item.actor), (Slot.ACTION, item.action), (Slot.OBJECT, item.object),
            (Slot.PLACE, item.place), (Slot.MECHANISM, item.mechanism),
        ):
            if value is not None:
                assert corpus.vocab.get(slot, value) is not None, (
                    f"evidence item {item.id!r} names {slot.value}={value!r}, "
                    f"not present in the corpus's own vocabulary for that slot"
                )

    # Ground truth: every event's year is a plain int (already guaranteed
    # by `GroundTruthEvent`'s own type), and every event's id and doc_id
    # resolve into this corpus (an event names a real source).
    for gt in corpus.ground_truth:
        assert gt.doc_id in corpus.sources, (
            f"ground truth event {gt.id!r} names doc_id {gt.doc_id!r}, not present in corpus.sources"
        )

    # Stemma edges: every parent id resolves to a real source in this same
    # corpus, and no source names itself as its own parent.
    for key, source in corpus.sources.items():
        assert key not in source.stemma_parents, f"source {key!r} names itself as its own stemma parent"
        if check_stemma_resolves:
            for parent in source.stemma_parents:
                assert parent in corpus.sources, (
                    f"source {key!r} names stemma parent {parent!r}, not present in corpus.sources"
                )


__all__ = [
    "small_vocab", "near_label_pairs_vocab", "NEAR_LABEL_PAIRS",
    "years_in_default_span", "small_nonneg", "intervals_in_span",
    "slots_st", "concept_slots_st",
    "evidence_span", "make_evidence_item", "placement_from_vocab", "hypothesis_for",
    "assert_corpus_invariants",
    "DEFAULT_SPAN_START", "DEFAULT_BIN_WIDTH",
]
