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

def test_stemma_ancestors_skips_a_sources_own_self_reference():
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

    assert graph[a.address] == {b.address}
    assert graph[b.address] == set()

def test_stemma_ancestors_handles_a_two_source_copy_cycle_with_no_infinite_loop():
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

    graph = propagate.build_derivation_graph([a, b], evidence, sources)
    assert set(graph.keys()) == {a.address, b.address}

def test_topological_order_appends_a_cycles_leftover_nodes_in_sorted_order():
    nodes = {30, 10, 20}
    graph = {10: {20}, 20: {30}, 30: {10}}

    order = propagate._topological_order(nodes, graph)

    assert set(order) == nodes
    assert order == sorted(nodes)

def test_topological_order_resolves_a_mixed_cycle_and_dag_component():
    nodes = {1, 2, 10, 20}
    graph = {1: set(), 2: {1}, 10: {20}, 20: {10}}

    order = propagate._topological_order(nodes, graph)

    assert set(order) == nodes
    assert order.index(1) < order.index(2)
    assert order[-2:] == [10, 20]

def test_propagate_skips_a_dependent_whose_only_parent_never_moved():
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

def test_propagate_skips_an_order_entry_with_no_materialized_hypothesis(monkeypatch):
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

    report = propagate.propagate(
        hypotheses, opinions_after_a, {a.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    assert phantom_address not in {e.address for e in report.entries}
    assert phantom_address not in report.updated_opinions

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
