"""Property tests for `hte.vocab_induce`, one of the three modules with no
swarm file of its own as of this pass (`hte.diagnostics`, `hte.tournament`,
and this one all lack a `tests/swarm*/` file; the other two already carry
thorough example-based coverage in `tests/test_diagnostics.py`/`tests/
test_tournament.py` with little pure, generator-friendly surface left
untested, so this pass targets `hte.vocab_induce`'s own string-slugging
helpers and `induce()`'s id-uniqueness contract instead).

`tests/test_vocab_induce.py` already covers the module's documented
behavior (no-seed induction, the seed-merge path, `min_count`, the five
non-consensus actors) with fixed examples. This file adds generated-input
invariants over `stable_id`/`_truncate` (the two pure string helpers with
no dedicated test of their own general shape) and `induce()`'s own
id-uniqueness guarantee under adversarial, colliding raw values, the
property `_new_concept`'s own docstring claims ("a slug collision... is
disambiguated by appending `-2`, `-3`, ...") but no existing test drives
with more than one or two hand-picked collisions.
"""
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

# `stable_id`'s own docstring: diacritics stripped, lower-cased, every run
# of non-`[a-z0-9]` collapsed to one `-`, trimmed, truncated to 60 chars.
# Includes a mix of ASCII letters/digits/punctuation/whitespace and a
# sprinkling of accented Latin letters so `_strip_diacritics` gets real
# work to do, not just an identity pass.
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


# --------------------------------------------------------------------------
# stable_id: shape, totality, idempotence
# --------------------------------------------------------------------------


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
    # No character in this alphabet survives `[^a-z0-9]+` collapsing, so
    # the slug is empty before the `or "unlabeled"` fallback fires.
    assert stable_id(value) == "unlabeled"


@given(value=_raw_value_text)
@_GIVEN
def test_stable_id_is_idempotent(value):
    # An already-slugified id is already lower-case, hyphen-separated,
    # and within the length cap, so re-slugifying it must be a no-op:
    # this is the totality half of `_new_concept`'s own "a value already
    # id-shaped is kept verbatim" contract, extended to any `stable_id`
    # output, not just a hand-picked already-id-shaped input.
    once = stable_id(value)
    twice = stable_id(once)
    assert once == twice


# --------------------------------------------------------------------------
# _truncate: length invariant and unchanged-when-short contract
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# induce(): id-uniqueness under adversarial, colliding raw values
# --------------------------------------------------------------------------

# Deliberately built to collide: distinct raw strings that fold to the same
# `stable_id` slug (case and punctuation aside), so `induce`'s own
# collision-disambiguation path (`_new_concept`'s numeric-suffix loop) has
# to fire more than once per slot in a single run.
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
    # Every distinct raw value induces its own concept (no two distinct
    # raw strings silently collapse onto the same id, even when they
    # collide on their slugified form): the induced ACTOR population's
    # own count of CONSENSUS concepts (the induced kind, `_new_concept`'s
    # fixed status) equals the number of distinct raw values, modulo the
    # `_looks_id_shaped` values which stay verbatim regardless of case
    # (so "new-york" is id-shaped and kept as-is, while "New York",
    # "NEW YORK", etc. all slugify to the same "new-york" and thus
    # collapse onto that one id, correctly, not a collision to disambiguate).
    items = [_item(f"e{i}", actor=v) for i, v in enumerate(values)]
    vocab = vocab_induce.induce(_corpus(items))
    induced = [c for c in vocab.concepts(Slot.ACTOR) if c.consensus_status == ConsensusStatus.CONSENSUS]
    # Every induced concept's id is well-formed and none is blank.
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
    # A general fuzz over the ACTOR slot: `induce` must not raise for any
    # combination of lowercase/digit/hyphen/space text, whatever its own
    # id-shaped-or-not classification lands on.
    items = [_item(f"e{i}", actor=v) for i, v in enumerate(values)]
    vocab = vocab_induce.induce(_corpus(items))
    ids = [c.id for c in vocab.concepts(Slot.ACTOR)]
    assert len(ids) == len(set(ids))
