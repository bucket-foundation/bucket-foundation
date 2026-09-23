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

def small_vocab() -> Vocabulary:
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

years_in_default_span = st.integers(min_value=1000, max_value=1900)
small_nonneg = st.integers(min_value=0, max_value=50)

@st.composite
def intervals_in_span(draw):
    start = draw(years_in_default_span)
    length = draw(small_nonneg)
    return Interval(start=start, end=start + length)

slots_st = st.sampled_from(list(Slot)[:6])
concept_slots_st = st.sampled_from((Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM))

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

def assert_corpus_invariants(corpus: Corpus, *, check_stemma_resolves: bool = True) -> None:
    assert len(corpus.sources) == len({s.id for s in corpus.sources.values()})
    for key, source in corpus.sources.items():
        assert source.id == key

    for item in corpus.evidence:
        assert item.source_id in corpus.sources, (
            f"evidence item {item.id!r} names source_id {item.source_id!r}, "
            f"not present in corpus.sources"
        )

    for item in corpus.evidence:
        span = item.span
        assert len(span.quote) > 0, f"evidence item {item.id!r} carries an empty quote"
        assert span.char_start >= 0
        assert span.char_end >= span.char_start
        assert span.char_end - span.char_start == len(span.quote), (
            f"evidence item {item.id!r}: char range "
            f"[{span.char_start}, {span.char_end}) does not span its own {len(span.quote)}-char quote"
        )

    for item in corpus.evidence:
        if item.interval is not None:
            assert item.interval.start <= item.interval.end

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

    for gt in corpus.ground_truth:
        assert gt.doc_id in corpus.sources, (
            f"ground truth event {gt.id!r} names doc_id {gt.doc_id!r}, not present in corpus.sources"
        )

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
