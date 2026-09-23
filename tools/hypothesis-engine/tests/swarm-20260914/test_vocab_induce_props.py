from __future__ import annotations

import string

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from hte import vocab_induce
from hte.concepts import ConsensusStatus, Slot, Vocabulary
from hte.corpus import Corpus
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.timeline import Interval
from hte.vocab_induce import _ID_SHAPED_RE, _truncate, stable_id

_GIVEN = settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])

_raw_value_text = st.text(
    alphabet=string.ascii_letters + string.digits + " -_'\".,()/&:éñüçß",
    min_size=0, max_size=80,
)

def _item(item_id: str, **slots: str | None) -> EvidenceItem:
    quote = f"evidence for {item_id}"
    return EvidenceItem(
        id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T3, source_id=f"src-{item_id}",
        span=EvidenceSpan(doc_id=f"src-{item_id}", locator="p0", quote=quote, char_start=0, char_end=len(quote)),
        provenance="test-fixture", stance=Stance.POSITIVE,
        actor=slots.get("actor"), action=slots.get("action"), object=slots.get("object"),
        place=slots.get("place"), mechanism=slots.get("mechanism"), interval=Interval(start=2020, end=2020),
    )

def _corpus(items: list[EvidenceItem]) -> Corpus:
    sources = {e.source_id: Source(id=e.source_id, kind=e.kind) for e in items}
    return Corpus(sources=sources, evidence=items, ground_truth=[], provenance=[], vocab=Vocabulary())

@given(value=_raw_value_text)
@_GIVEN
def test_stable_id_output_always_matches_the_id_shaped_pattern(value):
    result = stable_id(value)
    assert _ID_SHAPED_RE.fullmatch(result), repr(result)

@given(value=_raw_value_text)
@_GIVEN
def test_stable_id_is_never_empty_and_never_exceeds_the_max_length(value):
    result = stable_id(value)
    assert 1 <= len(result) <= 60

@given(value=st.text(alphabet=" !@#$%^&*()+=[]{}|\\<>?~`", min_size=0, max_size=30))
@_GIVEN
def test_stable_id_of_text_with_no_alnum_falls_back_to_unlabeled(value):
    assert stable_id(value) == "unlabeled"

@given(value=_raw_value_text)
@_GIVEN
def test_stable_id_is_idempotent(value):
    once = stable_id(value)
    twice = stable_id(once)
    assert once == twice

@given(text=st.text(min_size=0, max_size=300), limit=st.integers(min_value=4, max_value=200))
@_GIVEN
def test_truncate_never_exceeds_the_limit(text, limit):
    assert len(_truncate(text, limit)) <= limit

@given(text=st.text(min_size=0, max_size=300), limit=st.integers(min_value=4, max_value=200))
@_GIVEN
def test_truncate_leaves_text_at_or_under_the_limit_unchanged(text, limit):
    if len(text) <= limit:
        assert _truncate(text, limit) == text

@given(text=st.text(min_size=5, max_size=300), limit=st.integers(min_value=4, max_value=200))
@_GIVEN
def test_truncate_of_longer_text_ends_with_an_ellipsis(text, limit):
    if len(text) > limit:
        assert _truncate(text, limit).endswith("...")

_colliding_actor_values = st.lists(
    st.sampled_from(["New York", "new-york", "NEW YORK", "new_york", "New  York!", "Paris", "paris", "PARIS."]),
    min_size=1, max_size=12,
)

@given(values=_colliding_actor_values)
@_GIVEN
def test_induced_concept_ids_are_always_unique_within_a_slot_even_under_slug_collisions(values):
    items = [_item(f"e{i}", actor=v) for i, v in enumerate(values)]
    vocab = vocab_induce.induce(_corpus(items))
    ids = [c.id for c in vocab.concepts(Slot.ACTOR)]
    assert len(ids) == len(set(ids))

@given(values=_colliding_actor_values)
@_GIVEN
def test_induce_is_deterministic_across_repeated_calls_on_the_same_corpus(values):
    items = [_item(f"e{i}", actor=v) for i, v in enumerate(values)]
    corpus = _corpus(items)
    first = [c.id for c in vocab_induce.induce(corpus).concepts(Slot.ACTOR)]
    second = [c.id for c in vocab_induce.induce(corpus).concepts(Slot.ACTOR)]
    assert first == second

@given(values=_colliding_actor_values)
@_GIVEN
def test_every_distinct_raw_value_resolves_to_exactly_one_induced_concept(values):
    items = [_item(f"e{i}", actor=v) for i, v in enumerate(values)]
    vocab = vocab_induce.induce(_corpus(items))
    induced = [c for c in vocab.concepts(Slot.ACTOR) if c.consensus_status == ConsensusStatus.CONSENSUS]
    for c in induced:
        assert _ID_SHAPED_RE.fullmatch(c.id)
        assert c.label

@given(
    values=st.lists(
        st.text(alphabet=string.ascii_lowercase + string.digits + "- ", min_size=1, max_size=20),
        min_size=1, max_size=15,
    ),
)
@_GIVEN
def test_induce_never_raises_over_arbitrary_lowercase_slot_text(values):
    items = [_item(f"e{i}", actor=v) for i, v in enumerate(values)]
    vocab = vocab_induce.induce(_corpus(items))
    ids = [c.id for c in vocab.concepts(Slot.ACTOR)]
    assert len(ids) == len(set(ids))
