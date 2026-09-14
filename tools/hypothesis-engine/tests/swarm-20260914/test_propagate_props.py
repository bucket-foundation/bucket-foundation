"""Property/behavior tests for `hte.propagate`'s own less-covered branches:
`tests/test_propagate.py` already exercises the founder's own worked
example (retract `R`, watch `A`/`B`/`C`/`D`) end to end, but never plants a
self-referencing `stemma_parents` entry, never drives `_topological_order`
into its own cycle fallback, never gives `independent_support_share` an
address with zero supporting evidence, and never exercises `propagate`'s
own "reached only via an inactive parent" skip on a hypothesis with a real
but currently-inactive derivation-graph parent.

`_topological_order`'s OTHER defensive branch, `if n not in remaining:
continue` (a node already popped from `ready` once, guarding against a
double append), is not tested here: `in_degree` and `forward` are built
from the identical edge set inside the same function, always via `set`
operations (deduping any repeated parent/child pair), so a node's own
in-degree can reach exactly `0` at most once, which means `ready.append`
for a given node fires at most once too. Every construction tried, a
diamond-shaped two-parent child, a self-loop, a self-loop plus one real
parent, a three-node cycle, hits the cycle fallback (`if remaining:
order.extend(sorted(remaining))`, covered below by
`test_topological_order_appends_a_cycles_leftover_nodes_in_sorted_order`)
or resolves cleanly with a single append; none reaches the guarded branch.
No defect: a currently-unreachable defensive line given this function's
own internal invariants, no xfail warranted.
"""
from __future__ import annotations

from hte import propagate
from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.belief import Constants, score as belief_score
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval

TBIN_START = DEFAULT_SPAN_START
INTERVAL = Interval(start=TBIN_START, end=TBIN_START + DEFAULT_BIN_WIDTH - 1)


def _vocab(actor_ids):
    vocab = Vocabulary()
    for actor_id in actor_ids:
        vocab.add(Concept(actor_id, Slot.ACTOR, actor_id, 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("act", Slot.ACTION, "Acted", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("obj", Slot.OBJECT, "Object", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("place", Slot.PLACE, "Place", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("mech", Slot.MECHANISM, "Mechanism", 0.0, ConsensusStatus.CONSENSUS))
    return vocab


def _hypothesis(actor_id, vocab, *, depends_on=None):
    placement = Placement(actor=actor_id, action="act", object="obj", place="place", mechanism="mech", interval=INTERVAL)
    return Hypothesis.from_placement(placement, vocab, depends_on=depends_on or [])


def _item(item_id, address, kind, tier, source_id):
    return EvidenceItem(
        id=item_id, kind=kind, tier=tier, source_id=source_id,
        span=EvidenceSpan(doc_id="doc", locator=item_id, quote="q", char_start=0, char_end=1),
        provenance="test-fixture", supports=[address],
    )


# --------------------------------------------------------------------------
# build_derivation_graph / stemma_ancestors: a source that cites itself
# --------------------------------------------------------------------------


def test_stemma_ancestors_skips_a_sources_own_self_reference():
    """A source whose own `stemma_parents` names itself (a copy-edge
    typo, or a corpus adapter that failed to exclude the self case
    `hte.corpus.quantum_history`'s own cross-reference parser already
    guards against) contributes no ancestor edge for itself; the derived
    graph still resolves the source's OTHER, real parent."""
    vocab = _vocab(["a-actor", "b-actor"])
    a = _hypothesis("a-actor", vocab)
    b = _hypothesis("b-actor", vocab)

    sources = {
        "src-a": Source(id="src-a", kind=EvidenceKind.MATERIAL, stemma_parents=["src-a", "src-b"]),
        "src-b": Source(id="src-b", kind=EvidenceKind.MATERIAL),
    }
    evidence = [
        _item("ev-a", a.address, EvidenceKind.MATERIAL, Tier.T2, "src-a"),
        _item("ev-b", b.address, EvidenceKind.MATERIAL, Tier.T2, "src-b"),
    ]

    graph = propagate.build_derivation_graph([a, b], evidence, sources)

    # The self-reference is dropped; the real edge to src-b's own
    # hypothesis (b) survives, so a depends on b via the stemma chain.
    assert graph[a.address] == {b.address}
    assert graph[b.address] == set()


def test_stemma_ancestors_handles_a_two_source_copy_cycle_with_no_infinite_loop():
    """Two sources that cite each other (`src-a` <- `src-b` <- `src-a`,
    a copy cycle no single adapter would author on purpose but nothing
    in `Source.stemma_parents` forbids) resolve without recursing
    forever: the cycle guard seeds `ancestor_cache[source_id] = set()`
    before recursing, so the second entry into an already-in-progress
    id returns the empty in-progress placeholder rather than looping."""
    vocab = _vocab(["a-actor", "b-actor"])
    a = _hypothesis("a-actor", vocab)
    b = _hypothesis("b-actor", vocab)

    sources = {
        "src-a": Source(id="src-a", kind=EvidenceKind.MATERIAL, stemma_parents=["src-b"]),
        "src-b": Source(id="src-b", kind=EvidenceKind.MATERIAL, stemma_parents=["src-a"]),
    }
    evidence = [
        _item("ev-a", a.address, EvidenceKind.MATERIAL, Tier.T2, "src-a"),
        _item("ev-b", b.address, EvidenceKind.MATERIAL, Tier.T2, "src-b"),
    ]

    # Terminates instead of recursing forever.
    graph = propagate.build_derivation_graph([a, b], evidence, sources)
    assert set(graph.keys()) == {a.address, b.address}


# --------------------------------------------------------------------------
# _topological_order: the cycle fallback
# --------------------------------------------------------------------------


def test_topological_order_appends_a_cycles_leftover_nodes_in_sorted_order():
    """A `depends_on` cycle (nothing in `Hypothesis.depends_on` enforces
    acyclicity) leaves every cycle member at in-degree > 0 forever;
    `ready` never gets past its own initial, empty state (no node ever
    starts at in-degree 0), so the whole cycle falls through to the
    `if remaining: order.extend(sorted(remaining))` fallback, in address
    order, rather than hanging."""
    nodes = {30, 10, 20}
    # 10 depends on 20, 20 depends on 30, 30 depends on 10: a 3-cycle.
    graph = {10: {20}, 20: {30}, 30: {10}}

    order = propagate._topological_order(nodes, graph)

    assert set(order) == nodes
    assert order == sorted(nodes)


def test_topological_order_resolves_a_mixed_cycle_and_dag_component():
    """A cycle (`10`/`20`) alongside an independent, resolvable chain
    (`1` depends on nothing, `2` depends on `1`) resolves the DAG part
    through the normal `ready` queue and appends only the cycle's own
    two members via the fallback."""
    nodes = {1, 2, 10, 20}
    graph = {1: set(), 2: {1}, 10: {20}, 20: {10}}

    order = propagate._topological_order(nodes, graph)

    assert set(order) == nodes
    # The resolvable pair comes out in dependency order, ahead of the
    # unresolved cycle's own sorted-fallback tail.
    assert order.index(1) < order.index(2)
    assert order[-2:] == [10, 20]


# --------------------------------------------------------------------------
# propagate: the "reached only via an inactive parent" skip
# --------------------------------------------------------------------------


def test_propagate_skips_a_dependent_whose_only_parent_never_moved():
    """`C` depends on `A`, but only `B` (unrelated to `C`) is retracted.
    `C` is never reached from `B`'s own cascade at all (it is not a
    child of `B` in the derivation graph), so it is absent from the
    report entirely: the "no active parent" skip this test targets fires
    inside `build_derivation_graph`'s own `children` traversal, one level
    before the loop body's own `if not active_parents: continue` would
    even see `C` as a candidate, confirming the two skips compose rather
    than conflict."""
    vocab = _vocab(["a-actor", "b-actor", "c-actor"])
    a = _hypothesis("a-actor", vocab)
    b = _hypothesis("b-actor", vocab)
    c = _hypothesis("c-actor", vocab, depends_on=[a.address])
    hypotheses = [a, b, c]

    sources = {
        "src-a": Source(id="src-a", kind=EvidenceKind.MATERIAL),
        "src-b": Source(id="src-b", kind=EvidenceKind.MATERIAL),
        "src-c": Source(id="src-c", kind=EvidenceKind.MATERIAL),
    }
    evidence = [
        _item("ev-a", a.address, EvidenceKind.MATERIAL, Tier.T2, "src-a"),
        _item("ev-b", b.address, EvidenceKind.MATERIAL, Tier.T2, "src-b"),
        _item("ev-c", c.address, EvidenceKind.MATERIAL, Tier.T2, "src-c"),
    ]
    opinions = {h.address: belief_score(h, evidence, vocab, sources=sources, constants=Constants()) for h in hypotheses}

    report = propagate.propagate(
        hypotheses, opinions, {b.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    assert {e.address for e in report.entries} == set()


def test_propagate_reports_a_dependent_reached_through_an_active_parent():
    """The mirror case: `C` depends on `A`, and `A` is the one retracted,
    so `C` IS a child of `A` in the derivation graph and does get
    recomputed (a real, non-skip path through the same branch)."""
    vocab = _vocab(["a-actor", "c-actor"])
    a = _hypothesis("a-actor", vocab)
    c = _hypothesis("c-actor", vocab, depends_on=[a.address])
    hypotheses = [a, c]

    sources = {
        "src-a1": Source(id="src-a1", kind=EvidenceKind.MATERIAL),
        "src-a2": Source(id="src-a2", kind=EvidenceKind.MATERIAL),
        "src-c": Source(id="src-c", kind=EvidenceKind.MATERIAL),
    }
    evidence = [
        _item("ev-a1", a.address, EvidenceKind.MATERIAL, Tier.T1, "src-a1"),
        _item("ev-a2", a.address, EvidenceKind.MATERIAL, Tier.T1, "src-a2"),
        _item("ev-c", c.address, EvidenceKind.MATERIAL, Tier.T2, "src-c"),
    ]

    propagate.apply_retraction(
        evidence, sources, target_address=a.address,
        retracting_source=Source(id="src-retraction", kind=EvidenceKind.TEXTUAL),
        tier=Tier.T1, item_id="ev-retraction", provenance="test-retraction",
        span=EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1),
    )
    opinions_after_a = {h.address: belief_score(h, evidence, vocab, sources=sources, constants=Constants()) for h in hypotheses}

    report = propagate.propagate(
        hypotheses, opinions_after_a, {a.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    assert c.address in {e.address for e in report.entries}


# --------------------------------------------------------------------------
# propagate: an address reachable via the graph but never materialized
# --------------------------------------------------------------------------


def test_propagate_skips_an_order_entry_with_no_materialized_hypothesis(monkeypatch):
    """`by_address.get(addr)` reading `None` is unreachable through the
    public API as written: `propagate` builds its own `graph` from the
    exact same `population` it builds `by_address` from
    (`build_derivation_graph(population, ...)`), and every edge that
    function ever adds is pre-filtered to addresses already in that same
    `by_address` (`if parent_addr in by_address`, the evidence-derived
    edges' own `if addr in by_address` gate). This test forces the
    branch directly by monkeypatching `build_derivation_graph` to hand
    back a graph naming one extra, unmaterialized address, confirming
    the defensive `continue` does what its own comment says: skip
    cleanly, contribute nothing to the report, and not raise
    `KeyError`/`AttributeError` reading `h.short_id` off `None`."""
    vocab = _vocab(["a-actor", "c-actor"])
    a = _hypothesis("a-actor", vocab)
    c = _hypothesis("c-actor", vocab, depends_on=[a.address])
    hypotheses = [a, c]
    phantom_address = max(a.address, c.address) + 1

    sources = {
        "src-a1": Source(id="src-a1", kind=EvidenceKind.MATERIAL),
        "src-a2": Source(id="src-a2", kind=EvidenceKind.MATERIAL),
        "src-c": Source(id="src-c", kind=EvidenceKind.MATERIAL),
    }
    evidence = [
        _item("ev-a1", a.address, EvidenceKind.MATERIAL, Tier.T1, "src-a1"),
        _item("ev-a2", a.address, EvidenceKind.MATERIAL, Tier.T1, "src-a2"),
        _item("ev-c", c.address, EvidenceKind.MATERIAL, Tier.T2, "src-c"),
    ]

    real_build = propagate.build_derivation_graph

    def _patched_build(population, evidence_, sources_):
        graph = real_build(population, evidence_, sources_)
        # Give the phantom address a real child (c) so it is reached by
        # the cascade's own child-traversal, and make c depend on it too
        # so the loop body visits the phantom as an active
        # parent candidate ahead of its own `h is None` check.
        graph[phantom_address] = set()
        graph[c.address] = graph[c.address] | {phantom_address}
        return graph

    monkeypatch.setattr(propagate, "build_derivation_graph", _patched_build)

    propagate.apply_retraction(
        evidence, sources, target_address=a.address,
        retracting_source=Source(id="src-retraction", kind=EvidenceKind.TEXTUAL),
        tier=Tier.T1, item_id="ev-retraction", provenance="test-retraction",
        span=EvidenceSpan(doc_id="d", locator="l", quote="q", char_start=0, char_end=1),
    )
    opinions_after_a = {h.address: belief_score(h, evidence, vocab, sources=sources, constants=Constants()) for h in hypotheses}
    # Seed the phantom address's own opinion so it can be a `changed`
    # root candidate too (`roots` accepts an address "in opinions"
    # with no matching `Hypothesis`); not required for this test's own
    # target branch, kept minimal instead: only c's own edge to the
    # phantom matters here.

    report = propagate.propagate(
        hypotheses, opinions_after_a, {a.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    # No crash, and the phantom address never appears in the report
    # (nothing was ever materialized for it to report on).
    assert phantom_address not in {e.address for e in report.entries}
    assert phantom_address not in report.updated_opinions


# --------------------------------------------------------------------------
# independent_support_share: no supporting evidence at all
# --------------------------------------------------------------------------


def test_independent_support_share_is_zero_with_no_supporting_evidence():
    vocab = _vocab(["a-actor"])
    a = _hypothesis("a-actor", vocab)
    assert propagate.independent_support_share(a.address, []) == 0.0


def test_independent_support_share_is_zero_when_evidence_supports_a_different_address():
    vocab = _vocab(["a-actor", "b-actor"])
    a = _hypothesis("a-actor", vocab)
    b = _hypothesis("b-actor", vocab)
    evidence = [_item("ev-b", b.address, EvidenceKind.MATERIAL, Tier.T2, "src-b")]
    assert propagate.independent_support_share(a.address, evidence) == 0.0
