"""Shared strategies for the stable-module test swarm (bkt-hte-test-swarm).

Every file under `tests/swarm/` targets a module the two other agents
working this branch are not touching (see the module docstring list in
`tools/hypothesis-engine/README.md`'s Module map): `hte.timeline`,
`hte.concepts`, `hte.address`, `hte.hypothesis`, `hte.evidence`,
`hte.belief`, `hte.unknowns`, `hte.export`, `hte.periods`, `hte.retrieval`,
`hte.paper`, `hte.referee`, `hte.publish`, `hte.pipeline`, `hte.llm`. This
file holds the composite strategies several of those files share:
intervals crossing the BCE/CE boundary and zero-length instants,
vocabularies with and without an already-present `OTHER` entry, opinions
sitting on the belief simplex boundary, evidence/source sets carrying a
stemma cycle or a self-reference, and unicode labels.

`hypothesis` (the property-testing library, distinct from this package's
own name) is installed in this environment; every file here uses it
directly rather than falling back to seeded `random`.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from hypothesis import strategies as st

from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from hte.timeline import Interval

# The active hypothesis profile (`fast`, 40 examples, default; `full`, 300
# examples, via `HTE_TEST_PROFILE=full`) is registered and loaded once in
# `tests/conftest.py`, which pytest imports before this file. Nothing here
# loads a profile of its own.

# --------------------------------------------------------------------------
# Years, intervals (BCE/CE boundary, zero-length instants)
# --------------------------------------------------------------------------

YEAR_MIN = -50_000
YEAR_MAX = 50_000

years = st.integers(min_value=YEAR_MIN, max_value=YEAR_MAX)
small_nonneg = st.integers(min_value=0, max_value=5_000)
small_pos = st.integers(min_value=1, max_value=5_000)


@st.composite
def intervals(draw, *, allow_zero_length: bool = True):
    """An `Interval` whose `start` ranges across the astronomical-year
    axis's own BCE/CE boundary (0), with `end - start` occasionally 0 (a
    zero-length instant) when `allow_zero_length` is set."""
    start = draw(years)
    length = draw(small_nonneg if allow_zero_length else small_pos)
    return Interval(start=start, end=start + length)


@st.composite
def interval_pairs(draw, *, allow_zero_length: bool = True):
    """Two independently drawn intervals, for relation-symmetry checks."""
    a = draw(intervals(allow_zero_length=allow_zero_length))
    b = draw(intervals(allow_zero_length=allow_zero_length))
    return a, b


unicode_labels = st.text(min_size=0, max_size=40)
unicode_nonempty_labels = st.text(min_size=1, max_size=40)


# --------------------------------------------------------------------------
# Vocabularies (with and without an already-present OTHER entry)
# --------------------------------------------------------------------------


def fresh_vocabulary() -> Vocabulary:
    """A `Vocabulary` built with no explicit `by_slot`: `OTHER` is added by
    `__post_init__` alone, the "without OTHER already in the input" case."""
    return Vocabulary()


def vocabulary_with_other_preseeded() -> Vocabulary:
    """A `Vocabulary` whose `by_slot` already names every slot's `OTHER`
    concept before construction, the "with OTHER already in the input"
    case: `__post_init__`'s own `any(c.id == other_id(slot) ...)` guard
    must not append a second one."""
    from hte.concepts import other_concept

    by_slot = {slot: [other_concept(slot)] for slot in Slot}
    return Vocabulary(by_slot=by_slot)


def vocabulary_with_extra(slot: Slot, labels: list[str], *, alpha: float = 1.0) -> Vocabulary:
    """A fresh vocabulary with one extra `CONSENSUS` concept per label in
    `labels`, appended to `slot` in order."""
    vocab = Vocabulary(default_alpha=alpha)
    for i, label in enumerate(labels):
        vocab.add(Concept(
            id=f"{slot.value}-extra-{i}", slot=slot, label=label,
            prior_logit=0.0, consensus_status=ConsensusStatus.CONSENSUS,
        ))
    return vocab


consensus_statuses = st.sampled_from(list(ConsensusStatus))
slots_st = st.sampled_from(list(Slot))


# --------------------------------------------------------------------------
# Opinions on the belief simplex (including its boundary)
# --------------------------------------------------------------------------

unit_floats = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)


@st.composite
def simplex_points(draw):
    """`(b, d, u)` with `b + d + u == 1` exactly (a two-cut of the unit
    interval), including the three pure-vertex boundary cases (`b=1`,
    `d=1`, `u=1`) at roughly the rate a uniform cut would miss."""
    if draw(st.booleans()):
        # Force a boundary vertex some of the time: continuous sampling
        # below would hit b==1.0 or d==1.0 or u==1.0 on a set of measure
        # zero, so the boundary needs its own explicit branch.
        return draw(st.sampled_from([(1.0, 0.0, 0.0), (0.0, 1.0, 0.0), (0.0, 0.0, 1.0)]))
    x = draw(unit_floats)
    y = draw(unit_floats)
    lo, hi = min(x, y), max(x, y)
    b, d, u = lo, hi - lo, 1.0 - hi
    return b, d, u


evidence_weights = st.floats(min_value=0.0, max_value=1_000_000.0, allow_nan=False, allow_infinity=False)
positive_W = st.floats(min_value=1e-6, max_value=1_000.0, allow_nan=False, allow_infinity=False)


# --------------------------------------------------------------------------
# Evidence / Source sets with a stemma cycle or a self-reference
# --------------------------------------------------------------------------


def cyclic_sources(prefix: str, n: int, *, kind: EvidenceKind = EvidenceKind.TEXTUAL) -> list[Source]:
    """`n` `Source` nodes (`n >= 1`) whose `stemma_parents` chain each one
    to the next, wrapping the last back to the first: a stemma cycle
    (`n >= 2`) or a pure self-reference (`n == 1`, a source naming itself
    as its own parent). `hte.belief.effective_count`'s union-find must
    collapse either shape to exactly one connected component without
    looping forever, since a `while parent[x] != x` walk terminates on a
    cycle the same way it does on a tree."""
    ids = [f"{prefix}-{i}" for i in range(n)]
    return [
        Source(id=ids[i], kind=kind, stemma_parents=[ids[(i + 1) % n]])
        for i in range(n)
    ]


def evidence_span(text: str = "quoted text", doc_id: str = "doc-1") -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator="p1", quote=text, char_start=0, char_end=len(text))


def evidence_item(
    item_id: str,
    *,
    kind: EvidenceKind = EvidenceKind.TEXTUAL,
    tier: Tier = Tier.T3,
    source_id: str = "src-1",
    supports: list[int] | None = None,
    refutes: list[int] | None = None,
    is_absence: bool = False,
    stance: Stance = Stance.POSITIVE,
) -> EvidenceItem:
    return EvidenceItem(
        id=item_id, kind=kind, tier=tier, source_id=source_id,
        span=evidence_span(), provenance="test-fixture",
        supports=list(supports or []), refutes=list(refutes or []),
        is_absence=is_absence, stance=stance,
    )


evidence_kinds_st = st.sampled_from(list(EvidenceKind))
tiers_st = st.sampled_from(list(Tier))
