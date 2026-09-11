"""Tests for `hte.propagate`: retraction propagation and fragility.

The planted graph every test in this file's first half shares: a root
`R` with strong, high-credence, thinly-corroborated support; `A` and
`B` each `depends_on` `R` directly; `C` `depends_on` `A` (two hops from
`R`); `D` carries its own independent support from two evidence kinds
and has no derivation-graph edge to anything. Retracting `R` should
drag `A` and `B` toward their own base rate with rising uncertainty and
unchanged disbelief, drag `C` there too but by less (per-hop damping),
leave `D` untouched, and rank `R` as the most fragile node of the five
before any of this happens.
"""
from __future__ import annotations

import pytest

from hte import propagate
from hte.address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START
from hte.belief import Constants, score as belief_score
from hte.concepts import Concept, ConsensusStatus, Slot, Vocabulary
from hte.corpus import quantum_history
from hte.evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier
from hte.hypothesis import Hypothesis, Placement
from hte.timeline import Interval

TBIN_START = DEFAULT_SPAN_START
INTERVAL = Interval(start=TBIN_START, end=TBIN_START + DEFAULT_BIN_WIDTH - 1)


def _vocab() -> Vocabulary:
    vocab = Vocabulary()
    for actor_id in ("r-actor", "a-actor", "b-actor", "c-actor", "d-actor"):
        vocab.add(Concept(actor_id, Slot.ACTOR, actor_id, 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("act", Slot.ACTION, "Acted", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("obj", Slot.OBJECT, "Object", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("place", Slot.PLACE, "Place", 0.0, ConsensusStatus.CONSENSUS))
    vocab.add(Concept("mech", Slot.MECHANISM, "Mechanism", 0.0, ConsensusStatus.CONSENSUS))
    return vocab


def _hypothesis(actor_id: str, vocab: Vocabulary, *, depends_on: list[int] | None = None) -> Hypothesis:
    placement = Placement(actor=actor_id, action="act", object="obj", place="place", mechanism="mech", interval=INTERVAL)
    return Hypothesis.from_placement(placement, vocab, depends_on=depends_on or [])


def _item(item_id: str, address: int, kind: EvidenceKind, tier: Tier, source_id: str) -> EvidenceItem:
    return EvidenceItem(
        id=item_id, kind=kind, tier=tier, source_id=source_id,
        span=EvidenceSpan(doc_id="doc", locator=item_id, quote="q", char_start=0, char_end=1),
        provenance="test-fixture", supports=[address],
    )


def _planted_graph():
    """Builds `R`, `A`, `B`, `C`, `D`, their evidence, and a `sources`
    map, returning `(vocab, hypotheses, evidence, sources)`. `R` carries
    two `T1` items of one kind sharing one stemma archetype (thin
    corroboration: `independent_support_share(R) == 0.5`); `A`, `B`,
    `C` each carry one ordinary, fully-independent `T2` item; `D`
    carries two items of two different kinds, each its own independent
    source, with no edge to anything."""
    vocab = _vocab()

    r = _hypothesis("r-actor", vocab)
    a = _hypothesis("a-actor", vocab, depends_on=[r.address])
    b = _hypothesis("b-actor", vocab, depends_on=[r.address])
    c = _hypothesis("c-actor", vocab, depends_on=[a.address])
    d = _hypothesis("d-actor", vocab)
    hypotheses = [r, a, b, c, d]

    sources = {
        "src-r1": Source(id="src-r1", kind=EvidenceKind.MATERIAL),
        "src-r2": Source(id="src-r2", kind=EvidenceKind.MATERIAL, stemma_parents=["src-r1"]),
        "src-a1": Source(id="src-a1", kind=EvidenceKind.MATERIAL),
        "src-b1": Source(id="src-b1", kind=EvidenceKind.MATERIAL),
        "src-c1": Source(id="src-c1", kind=EvidenceKind.MATERIAL),
        "src-d1": Source(id="src-d1", kind=EvidenceKind.GENETIC),
        "src-d2": Source(id="src-d2", kind=EvidenceKind.ASTRONOMICAL),
    }

    evidence = [
        _item("ev-r1", r.address, EvidenceKind.MATERIAL, Tier.T1, "src-r1"),
        _item("ev-r2", r.address, EvidenceKind.MATERIAL, Tier.T1, "src-r2"),
        _item("ev-a1", a.address, EvidenceKind.MATERIAL, Tier.T2, "src-a1"),
        _item("ev-b1", b.address, EvidenceKind.MATERIAL, Tier.T2, "src-b1"),
        _item("ev-c1", c.address, EvidenceKind.MATERIAL, Tier.T2, "src-c1"),
        _item("ev-d1", d.address, EvidenceKind.GENETIC, Tier.T2, "src-d1"),
        _item("ev-d2", d.address, EvidenceKind.ASTRONOMICAL, Tier.T2, "src-d2"),
    ]

    return vocab, hypotheses, evidence, sources


def _opinions(hypotheses, evidence, vocab, sources):
    return {h.address: belief_score(h, evidence, vocab, sources=sources, constants=Constants()) for h in hypotheses}


def _retract_root(evidence, sources, root_address):
    """Applies two independent retracting items to `root_address` (two
    different evidence kinds and families, so the retraction's own
    cross-kind bonus applies): the collapse this test file's own
    docstring describes as "turns out false"."""
    propagate.apply_retraction(
        evidence, sources, target_address=root_address,
        retracting_source=Source(id="src-retraction-1", kind=EvidenceKind.TEXTUAL),
        tier=Tier.T1, item_id="ev-retraction-1",
        span=EvidenceSpan(doc_id="retraction-doc", locator="l1", quote="retracted", char_start=0, char_end=1),
        provenance="test-retraction",
    )
    propagate.apply_retraction(
        evidence, sources, target_address=root_address,
        retracting_source=Source(id="src-retraction-2", kind=EvidenceKind.GEOLOGICAL),
        tier=Tier.T1, item_id="ev-retraction-2",
        span=EvidenceSpan(doc_id="retraction-doc-2", locator="l1", quote="also retracted", char_start=0, char_end=1),
        provenance="test-retraction",
    )


# --------------------------------------------------------------------------
# build_derivation_graph
# --------------------------------------------------------------------------


def test_build_derivation_graph_reads_depends_on_edges():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    graph = propagate.build_derivation_graph([r, a, b, c, d], evidence, sources)
    assert graph[a.address] == {r.address}
    assert graph[b.address] == {r.address}
    assert graph[c.address] == {a.address}
    assert graph[d.address] == set()
    assert graph[r.address] == set()


def test_invert_gives_fan_out_children():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    graph = propagate.build_derivation_graph([r, a, b, c, d], evidence, sources)
    children = propagate._invert(graph)
    assert children[r.address] == {a.address, b.address}
    assert children[a.address] == {c.address}
    assert children.get(c.address, set()) == set()


# --------------------------------------------------------------------------
# The founder's question: retract R, watch A, B, C, D
# --------------------------------------------------------------------------


def test_retraction_drags_direct_dependents_toward_base_rate():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    opinions_before = _opinions([r, a, b, c, d], evidence, vocab, sources)

    _retract_root(evidence, sources, r.address)
    opinions_after_root = _opinions([r, a, b, c, d], evidence, vocab, sources)

    report = propagate.propagate(
        [r, a, b, c, d], opinions_after_root, {r.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    by_address = {e.address: e for e in report.entries}
    for h in (a, b):
        entry = by_address[h.address]
        op_before = opinions_before[h.address]
        op_after = report.updated_opinions[h.address]

        # d unchanged: neither A nor B ever carried refuting evidence of
        # its own, before or after damping (damping scales r and s by
        # the same factor, and 0 * anything is still 0).
        assert op_before.d == pytest.approx(0.0)
        assert op_after.d == pytest.approx(0.0)

        # u up.
        assert op_after.u > op_before.u

        # Moved toward its own base rate a = 0.5 (every concept in this
        # fixture carries prior_logit=0.0).
        a_rate = 0.5
        assert abs(op_after.project() - a_rate) < abs(op_before.project() - a_rate)

        # One hop from the root, and the entry's own old/new P matches
        # what was just asserted above via the Opinion objects directly.
        assert entry.hops == 1
        assert entry.old_p == pytest.approx(op_before.project())
        assert entry.new_p == pytest.approx(op_after.project())
        assert entry.routed_share == pytest.approx(1.0)


def test_two_hop_dependent_moves_less_than_one_hop(monkeypatch=None):
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    opinions_before = _opinions([r, a, b, c, d], evidence, vocab, sources)

    _retract_root(evidence, sources, r.address)
    opinions_after_root = _opinions([r, a, b, c, d], evidence, vocab, sources)

    report = propagate.propagate(
        [r, a, b, c, d], opinions_after_root, {r.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )
    by_address = {e.address: e for e in report.entries}

    assert a.address in by_address and c.address in by_address
    delta_a = abs(by_address[a.address].new_p - by_address[a.address].old_p)
    delta_c = abs(by_address[c.address].new_p - by_address[c.address].old_p)
    assert delta_c < delta_a
    assert by_address[c.address].hops == 2
    assert by_address[c.address].routed_share == pytest.approx(1.0)

    # C's own d is unchanged too, same reasoning as A/B.
    assert opinions_before[c.address].d == pytest.approx(0.0)
    assert report.updated_opinions[c.address].d == pytest.approx(0.0)


def test_independent_node_is_not_touched():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    opinions_before = _opinions([r, a, b, c, d], evidence, vocab, sources)

    _retract_root(evidence, sources, r.address)
    opinions_after_root = _opinions([r, a, b, c, d], evidence, vocab, sources)

    report = propagate.propagate(
        [r, a, b, c, d], opinions_after_root, {r.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    assert d.address not in report.addresses()
    assert d.address not in report.updated_opinions
    # D's own opinion, recomputed fresh, is exactly what it was before
    # the retraction: nothing about D's own evidence or its derivation
    # graph moved.
    d_opinion_after_root = opinions_after_root[d.address]
    assert d_opinion_after_root.project() == pytest.approx(opinions_before[d.address].project())


def test_cascade_report_lists_a_b_c_with_correct_hops_and_shares():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    opinions_before = _opinions([r, a, b, c, d], evidence, vocab, sources)
    _retract_root(evidence, sources, r.address)
    opinions_after_root = _opinions([r, a, b, c, d], evidence, vocab, sources)

    report = propagate.propagate(
        [r, a, b, c, d], opinions_after_root, {r.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )

    addresses = report.addresses()
    assert addresses == {a.address, b.address, c.address}
    assert set(report.roots) == {r.address}

    hops_by_address = {e.address: e.hops for e in report.entries}
    assert hops_by_address[a.address] == 1
    assert hops_by_address[b.address] == 1
    assert hops_by_address[c.address] == 2

    for e in report.entries:
        assert e.routed_share == pytest.approx(1.0)

    # to_dict round trips into plain JSON types (`cascade.json`'s own contract).
    as_dict = report.to_dict()
    assert as_dict["roots"] == [r.address]
    assert {e["address"] for e in as_dict["entries"]} == addresses


def test_propagate_is_deterministic():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    _retract_root(evidence, sources, r.address)
    opinions_after_root = _opinions([r, a, b, c, d], evidence, vocab, sources)

    report1 = propagate.propagate(
        [r, a, b, c, d], opinions_after_root, {r.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )
    report2 = propagate.propagate(
        [r, a, b, c, d], opinions_after_root, {r.address},
        evidence=evidence, vocab=vocab, sources=sources,
    )
    assert report1.to_dict() == report2.to_dict()


def test_propagate_guards_against_a_depends_on_cycle():
    """A malformed `depends_on` cycle (X depends on Y, Y depends on X)
    does not hang `propagate`: `_topological_order`'s own fallback
    processes the cycle once, off whatever of its own members were
    already resolved, and `propagate` returns instead of looping."""
    vocab = _vocab()
    x = _hypothesis("a-actor", vocab)
    y = Hypothesis.from_placement(
        Placement(actor="b-actor", action="act", object="obj", place="place", mechanism="mech", interval=INTERVAL),
        vocab, depends_on=[x.address],
    )
    x = Hypothesis(address=x.address, content=x.content, depends_on=[y.address])
    evidence = [
        _item("ev-x1", x.address, EvidenceKind.MATERIAL, Tier.T2, "src-x1"),
        _item("ev-y1", y.address, EvidenceKind.MATERIAL, Tier.T2, "src-y1"),
    ]
    opinions = _opinions([x, y], evidence, vocab, {})
    # Root the cascade at x itself (as if x had just been retracted);
    # y depends on x, and x depends on y, a two-node cycle.
    report = propagate.propagate(
        [x, y], opinions, {x.address}, evidence=evidence, vocab=vocab, sources={},
    )
    # Finished at all (no hang) is this test's own point; y is reachable
    # from x and gets processed exactly once.
    assert isinstance(report, propagate.CascadeReport)


# --------------------------------------------------------------------------
# Fragility
# --------------------------------------------------------------------------


def test_fragility_ranks_root_first_before_retraction():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    ranked = propagate.rank_fragility([r, a, b, c, d], evidence, sources)
    assert ranked[0]["address"] == r.address
    assert ranked[0]["fragility"] > 0
    # Everyone else has either no dependents or fully independent
    # support (or both), so their own fragility reads exactly 0.
    for row in ranked[1:]:
        assert row["fragility"] == pytest.approx(0.0)


def test_independent_support_share_hand_computed():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    # R's two T1 items share one stemma component: one item's own
    # weight counts as independent, the other is a duplicate of the
    # same archetype. Both carry equal weight, so the share is exactly
    # one half.
    share = propagate.independent_support_share(r.address, evidence, sources)
    assert share == pytest.approx(0.5)
    # A's own single, unshared item is fully independent by construction.
    assert propagate.independent_support_share(a.address, evidence, sources) == pytest.approx(1.0)


def test_fan_out_counts_direct_dependents_only():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    graph = propagate.build_derivation_graph([r, a, b, c, d], evidence, sources)
    assert propagate.fragility(r.address, [r, a, b, c, d], evidence, sources, graph=graph) == pytest.approx(1.0)
    assert propagate.fragility(a.address, [r, a, b, c, d], evidence, sources, graph=graph) == pytest.approx(0.0)


# --------------------------------------------------------------------------
# Retraction as an event, never a deletion
# --------------------------------------------------------------------------


def test_apply_retraction_never_deletes_the_original_item():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    original_items = [e for e in evidence if r.address in e.supports]
    original_supports = [list(e.supports) for e in original_items]

    _retract_root(evidence, sources, r.address)

    # The original supporting items are all still on file, unedited,
    # now carrying a retracted_by marker; nothing was removed from
    # `evidence`, and nothing about what they originally claimed moved.
    # Two retractions were applied in sequence; the second stamp wins
    # (the most recent superseding event), the same "last write" reading
    # a real corpus would give two independent debunking papers.
    for item, supports_before in zip(original_items, original_supports):
        assert item.supports == supports_before
        assert item.retracted_by == "src-retraction-2"
        assert sources[item.source_id].retracted_by == "src-retraction-2"

    retraction_items = [e for e in evidence if e.id in ("ev-retraction-1", "ev-retraction-2")]
    assert len(retraction_items) == 2
    for ritem in retraction_items:
        assert ritem.refutes == [r.address]
        assert ritem.supports == []
        assert ritem.retracted_by is None  # the retraction itself is not retracted


def test_changed_from_retractions_reads_the_corpus():
    vocab, (r, a, b, c, d), evidence, sources = _planted_graph()
    assert propagate.changed_from_retractions(evidence, sources) == set()
    _retract_root(evidence, sources, r.address)
    assert propagate.changed_from_retractions(evidence, sources) == {r.address}


# --------------------------------------------------------------------------
# An existing replay run is unchanged when nothing is retracted
# --------------------------------------------------------------------------


def test_quantum_history_corpus_carries_no_retraction_by_default():
    """The real, shipped `quantum-history` corpus (`hte.corpus.
    quantum_history.ingest`, a pure, deterministic, no-LLM call) names
    no retracted item or source: `changed_from_retractions` over it is
    the empty set, so `hte.runner.run_campaign`'s own propagation stage
    is a structural no-op for this corpus today, exactly as it was
    before this module existed."""
    corpus = quantum_history.ingest()
    assert propagate.changed_from_retractions(corpus.evidence, corpus.sources) == set()


def test_run_campaign_replay_only_writes_an_empty_cascade_when_nothing_retracted(tmp_path, monkeypatch):
    # Reuses `tests/test_runner.py`'s own `FIXTURE_CONFIG` exactly (same
    # campaign name, same committed cache): several of this config's own
    # values are baked into the cache key of the seeded fixture
    # responses (`test_runner.py`'s own module docstring on
    # `FIXTURE_CONFIG`), so a different campaign name here would miss
    # that cache entirely rather than replay it.
    from hte import runner
    from tests.test_runner import FIXTURE_CONFIG

    monkeypatch.delenv("HTE_LLM_MODE", raising=False)
    cfg = {**FIXTURE_CONFIG, "out_dir": str(tmp_path)}
    artifacts = runner.run_campaign(cfg)

    cascade_path = artifacts.run_dir / "cascade.json"
    assert cascade_path.is_file()
    cascade = __import__("json").loads(cascade_path.read_text())
    assert cascade["entries"] == []
    assert cascade["roots"] == []

    manifest = __import__("json").loads((artifacts.run_dir / "MANIFEST.json").read_text())
    assert "fragility_top10" in manifest["counts"]

    self_report = __import__("json").loads((artifacts.run_dir / "self-report.json").read_text())
    assert "fragility_top10" in self_report
