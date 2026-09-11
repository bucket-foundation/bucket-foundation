"""Retraction propagation over the derivation graph, and fragility.

The founder's question: a node held at high credence that serves as
evidence for others turns out false. How does that move its nearest and
further neighbors?

This module answers it in three parts.

**The derivation graph.** A hypothesis derives from another one of two
ways: an explicit `hte.hypothesis.Hypothesis.depends_on` edge (the
hypothesis presupposes the address it names), or an evidence-derived
edge (an `EvidenceItem` naming this hypothesis in `supports`/`refutes`
whose own `Source.stemma_parents` chain leads to a source that itself
grounds a different, materialized hypothesis in the same population).
`build_derivation_graph` returns both as one child-to-parent-set
mapping; see its own docstring for why a `depends_on` edge is read as
whole-hypothesis, structural dependency, while a stemma edge is not
distinguished from it for the recompute below (`propagate`'s own
docstring says why that distinction does not matter at the grain this
module recomputes at).

**Propagation.** `propagate` recomputes every hypothesis reachable from
a changed (retracted, or otherwise moved) root, in topological order,
by scaling that hypothesis's own pooled evidence weight `(r, s)` by the
product of its active parents' current projected probability
(`derived_weight`, `Eq. propagation`): a per-hop damping, since a
two-hop dependent's own damping factor is built from its one-hop
parent's own ALREADY-damped number, itself already a hop removed from
the root's own raw number. Scaling `r` and `s` by one shared factor
`k < 1` moves the opinion toward `u = 1` (`Opinion.from_evidence`'s own
denominator `r + s + W` shrinks toward `W` alone as `k -> 0`), which is
why a collapsed root drags its dependents toward their own base rate
`a` with rising uncertainty `u`, and leaves disbelief `d` where it
stood: `d` rises only when NEW refuting weight joins the pool, the
retraction event itself, landing on the retracted root; scaling an
EXISTING pool down changes its magnitude, never its own `r`-to-`s`
ratio.

**Fragility.** `fragility(address) = fan_out(address) * (1 -
independent_support_share(address))`: how many other hypotheses this
one would drag down if it collapsed, weighted up when its own support
is thin corroboration (one kind, one archetype) rather than several
independent lines of evidence.

**Retraction as an event.** `apply_retraction` materializes a
retraction the way `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` and this
module's own docstring insist on: a new `refutes` item, carrying the
retracting source's own tier and kind, never a deletion of what the
retracted item originally claimed. `changed_from_retractions` reads
`EvidenceItem.retracted_by`/`Source.retracted_by` (`hte.evidence`) back
off the corpus, so a caller needs no side channel to know which
addresses this run's own retractions touched.

Mirrors `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §2's opinion model (`hte.
belief.Opinion`) and `hte.hypothesis.Hypothesis.depends_on`/`hte.
evidence.Source.stemma_parents`, extended here with no Lean counterpart
of its own yet: propagation and fragility are this package's own design,
documented in place rather than read off a proof, the same convention
`hte.generate`'s own module docstring states for the generator.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from .belief import Constants, DetectabilityTable, Opinion, cluster_weight, effective_count, pooled_weight, sigmoid
from .concepts import Vocabulary
from .evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier
from .hypothesis import Hypothesis

# child address -> the set of parent addresses it derives from.
DerivationGraph = dict[int, set[int]]


# --------------------------------------------------------------------------
# Derivation graph
# --------------------------------------------------------------------------


def build_derivation_graph(
    hypotheses: Sequence[Hypothesis],
    evidence: Sequence[EvidenceItem],
    sources: Mapping[str, Source] | None = None,
) -> DerivationGraph:
    """`child_address -> {parent_address, ...}`, from two sources:

    1. `Hypothesis.depends_on`: `h.depends_on` names the address(es) `h`
       presupposes. Read as whole-hypothesis, structural dependency:
       `h`'s ENTIRE evidentiary basis is conditioned on each parent,
       since a hypothesis that presupposes a precondition has no
       meaning independent of that precondition holding.
    2. Evidence-derived edges: an `EvidenceItem` naming `h`'s own address
       in `supports`/`refutes` whose own `Source.stemma_parents` chain
       (transitively, `hte.belief.effective_count`'s own stemma-graph
       reading, but unpruned here: ANY declared copy edge counts for
       this purpose, regardless of `theta_prune`, since a derivation
       edge is a claim about textual lineage, a question separate from
       whether that lineage still corroborates independently) leads to
       a source that ALSO grounds a different hypothesis materialized
       in `hypotheses`: that hypothesis is a parent of `h`, since `h`'s
       own evidentiary basis copies from (or shares an archetype with) the
       same source lineage the other hypothesis rests on.

    Only edges between two addresses BOTH present in `hypotheses` are
    kept: a `depends_on` address naming a hypothesis this population
    never materialized has nothing on file to propagate through, and is
    silently dropped rather than raising (the same "documented gap, not
    a crash" convention `hte.canon_writeback`'s own `unrecoverable_
    survivor_ids` follows for a comparable case).

    A self-loop (`parent_addr == h.address`) is never added, structural
    or evidence-derived: a hypothesis cannot derive from itself.
    """
    by_address = {h.address: h for h in hypotheses}
    graph: DerivationGraph = {addr: set() for addr in by_address}

    for h in hypotheses:
        for parent_addr in h.depends_on:
            if parent_addr in by_address and parent_addr != h.address:
                graph[h.address].add(parent_addr)

    sources = sources or {}
    address_sources: dict[int, set[str]] = {}
    for item in evidence:
        for addr in set(item.supports) | set(item.refutes):
            if addr in by_address:
                address_sources.setdefault(addr, set()).add(item.source_id)

    source_addresses: dict[str, set[int]] = {}
    for addr, sids in address_sources.items():
        for sid in sids:
            source_addresses.setdefault(sid, set()).add(addr)

    ancestor_cache: dict[str, set[str]] = {}

    def stemma_ancestors(source_id: str) -> set[str]:
        if source_id in ancestor_cache:
            return ancestor_cache[source_id]
        ancestor_cache[source_id] = set()  # cycle guard: a source graph with a copy cycle reads as no further ancestors past the point it revisits itself
        out: set[str] = set()
        src = sources.get(source_id)
        if src is not None:
            for parent_id in src.stemma_parents:
                if parent_id == source_id:
                    continue
                out.add(parent_id)
                out |= stemma_ancestors(parent_id)
        out.discard(source_id)
        ancestor_cache[source_id] = out
        return out

    for addr, sids in address_sources.items():
        ancestor_ids: set[str] = set()
        for sid in sids:
            ancestor_ids |= stemma_ancestors(sid)
        for anc_sid in ancestor_ids:
            for parent_addr in source_addresses.get(anc_sid, ()):
                if parent_addr != addr:
                    graph[addr].add(parent_addr)

    return graph


def _invert(graph: DerivationGraph) -> dict[int, set[int]]:
    """`parent_address -> {child_address, ...}`, the forward direction
    `propagate`'s own cascade walks (a retracted root's dependents are
    its CHILDREN in `graph`'s own child-to-parent convention)."""
    children: dict[int, set[int]] = {addr: set() for addr in graph}
    for child, parents in graph.items():
        for parent in parents:
            children.setdefault(parent, set()).add(child)
    return children


def _topological_order(nodes: set[int], graph: DerivationGraph) -> list[int]:
    """Kahn's algorithm over the subgraph induced by `nodes`: edges
    child-to-parent restricted to a parent ALSO inside `nodes` (a parent
    outside `nodes`, a changed root or any node this cascade never
    reached, is a fixed input with nothing further to wait on, so it
    contributes no in-degree here). A node that never reaches in-degree
    zero (a real `depends_on` cycle) is appended at the end, in
    address order, rather than looping forever: `hte.hypothesis.
    Hypothesis.depends_on` enforces no acyclicity of its own, so this
    function's own guard is what keeps a malformed cycle from hanging
    `propagate`, documented here rather than left to happen silently.
    """
    in_degree = {n: 0 for n in nodes}
    forward: dict[int, set[int]] = {n: set() for n in nodes}
    for child in nodes:
        for parent in graph.get(child, ()):
            if parent in nodes:
                in_degree[child] += 1
                forward[parent].add(child)

    ready = sorted(n for n, d in in_degree.items() if d == 0)
    order: list[int] = []
    remaining = set(nodes)
    while ready:
        ready.sort()
        n = ready.pop(0)
        if n not in remaining:
            continue
        order.append(n)
        remaining.discard(n)
        for child in forward.get(n, ()):
            if child in remaining:
                in_degree[child] -= 1
                if in_degree[child] == 0:
                    ready.append(child)

    if remaining:
        order.extend(sorted(remaining))
    return order


# --------------------------------------------------------------------------
# Propagation
# --------------------------------------------------------------------------


def derived_weight(base_weight: float, parent_projections: Sequence[float]) -> float:
    """`Eq. propagation`: `derived_weight(item) = base_weight(item) *
    P(parent)`, the product taken along the derivation chain
    (`parent_projections`, one entry per hop, order does not matter
    since multiplication commutes). Each hop's own factor is that hop's
    parent's CURRENT projected probability, already reflecting any
    damping applied further up the chain, so a two-hop dependent's own
    damping compounds off its one-hop parent's own post-retraction
    number rather than off the root's number raised to a power. An
    empty `parent_projections` (no derivation edge at all) returns
    `base_weight` unchanged, the identity a hypothesis with no parent
    gets by construction."""
    factor = 1.0
    for p in parent_projections:
        factor *= p
    return base_weight * factor


def _damp_and_share(active_parents: Sequence[int], current: Mapping[int, Opinion]) -> tuple[float, float]:
    """The per-hop damping factor (`derived_weight`, the product of
    every active parent's own current projected probability) and the
    share of this node's own damping attributable to the cascade's
    root(s). `active_parents` is pre-filtered, by `propagate`'s own only
    caller, to parents this cascade has touched; an inactive
    parent (one this cascade never reached) contributes no damping at
    all, business as usual, since nothing about its own credence moved.
    Because every parent considered here is, by that same filtering,
    itself connected back to some root in this cascade, ALL of this
    node's damping this round routes through the cascade's own root(s)
    by construction: `share` is always `1.0` when `active_parents` is
    non-empty (this function's only call site already guards the empty
    case out before calling it). A future caller propagating more than
    one independently-moving root through a shared dependent, and
    wanting THAT split, would need `propagate` to track which root each
    active parent itself descends from; this module does not need that
    distinction for the case `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` names
    (one collapsed root), so it is not built here."""
    damp = 1.0
    for p in active_parents:
        proj = current[p].project()
        proj = min(max(proj, 1e-9), 1.0 - 1e-12)
        damp *= proj
    return damp, 1.0


@dataclass(frozen=True)
class CascadeEntry:
    """One affected address's own record: its projected probability
    before and after this cascade, its hop count from the nearest root
    that moved it, and the share of its own damping load attributable
    to that root (`_damp_and_share`)."""
    address: int
    short_id: str
    old_p: float | None
    new_p: float
    hops: int
    routed_share: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "address": self.address, "short_id": self.short_id,
            "old_p": self.old_p, "new_p": self.new_p,
            "hops": self.hops, "routed_share": self.routed_share,
        }


@dataclass(frozen=True)
class CascadeReport:
    """`propagate`'s own return value: every root this cascade started
    from, the threshold it converged against, and one `CascadeEntry`
    per dependent address whose own projected probability moved by more
    than `threshold`. `updated_opinions` carries the full recomputed
    `Opinion` for every entry, keyed by address, so a caller (`hte.
    runner.run_campaign`) can fold the cascade's own result back into
    its own `opinions` dict with one `dict.update` call rather than
    re-deriving it from `entries`' own bare floats."""
    roots: tuple[int, ...]
    threshold: float
    entries: tuple[CascadeEntry, ...] = field(default_factory=tuple)
    updated_opinions: dict[int, Opinion] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "roots": list(self.roots),
            "threshold": self.threshold,
            "entries": [e.to_dict() for e in self.entries],
        }

    def addresses(self) -> set[int]:
        """Every address this cascade moved by more than its
        own `threshold`, `hte.canon_writeback`'s own read of "support
        routed through a retracted node" for the `canon_tier: contested`
        gate."""
        return {e.address for e in self.entries}


def propagate(
    population: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
    changed: set[int] | frozenset[int],
    *,
    evidence: Sequence[EvidenceItem],
    vocab: Vocabulary,
    sources: Mapping[str, Source] | None = None,
    stemma_edge_weights: Mapping[tuple[str, str], float] | None = None,
    detect_table: DetectabilityTable | None = None,
    period: str | None = None,
    constants: Constants = Constants(),
    threshold: float = 0.05,
) -> CascadeReport:
    """Recompute every hypothesis in `population` reachable from
    `changed` through the derivation graph (`build_derivation_graph`),
    in topological order, damping each one's own pooled evidence weight
    by the product of its active parents' current projected probability
    (`derived_weight`), stopping the walk down any one branch the moment
    a node's own move sits at or below `threshold`: a node whose own
    opinion barely moved has nothing worth passing further downstream,
    so its own children are left at their original opinion rather than
    being recomputed off a change too small to matter.

    `opinions[addr]` for every `addr` in `changed` is read as ALREADY
    reflecting whatever moved it (a retraction's own new refuting
    `EvidenceItem`, ordinarily scored through `hte.belief.score` before
    this function is ever called): `propagate` never recomputes a
    changed root itself, only its dependents, since "how does this move
    ITS neighbors" is this module's own question, not "what is this
    node's own opinion." A `changed` address absent from both
    `population` and `opinions` contributes nothing (there is no node
    on file to root a cascade at), rather than raising.

    Guards against a `depends_on` cycle through `_topological_order`'s
    own fallback (a node in a cycle is processed once, off whatever of
    its parents were already resolved, rather than looped over forever).
    """
    by_address = {h.address: h for h in population}
    graph = build_derivation_graph(population, evidence, sources)
    children = _invert(graph)

    roots = tuple(sorted(a for a in changed if a in by_address or a in opinions))

    reachable: set[int] = set()
    frontier = list(roots)
    seen = set(roots)
    while frontier:
        cur = frontier.pop()
        for child in children.get(cur, ()):
            if child not in seen:
                seen.add(child)
                reachable.add(child)
                frontier.append(child)

    order = _topological_order(reachable, graph)

    current: dict[int, Opinion] = dict(opinions)
    hops: dict[int, int] = {r: 0 for r in roots}
    active: set[int] = set(roots)
    entries: list[CascadeEntry] = []

    for addr in order:
        h = by_address.get(addr)
        if h is None:
            continue  # reachable via the graph but never materialized in this population; nothing to recompute
        parents = graph.get(addr, set())
        active_parents = sorted(p for p in parents if p in active)
        if not active_parents:
            continue  # reached only via a parent this cascade never touched; no ripple to report, opinion stays as given

        damp, share = _damp_and_share(active_parents, current)
        base_r, base_s = pooled_weight(
            evidence, addr, sources=sources, stemma_edge_weights=stemma_edge_weights,
            detect_table=detect_table, period=period, constants=constants,
        )
        a = sigmoid(h.prior_logit(vocab))
        new_opinion = Opinion.from_evidence(
            derived_weight(base_r, [damp]), derived_weight(base_s, [damp]), constants.W, a,
        )

        old_opinion = opinions.get(addr)
        old_p = old_opinion.project() if old_opinion is not None else None
        new_p = new_opinion.project()
        delta = abs(new_p - old_p) if old_p is not None else new_p

        current[addr] = new_opinion
        hop = min(hops[p] for p in active_parents) + 1
        hops[addr] = hop

        if delta > threshold:
            active.add(addr)
            entries.append(CascadeEntry(
                address=addr, short_id=h.short_id, old_p=old_p, new_p=new_p,
                hops=hop, routed_share=share,
            ))

    return CascadeReport(
        roots=roots, threshold=threshold, entries=tuple(entries),
        updated_opinions={e.address: current[e.address] for e in entries},
    )


# --------------------------------------------------------------------------
# Retraction as an event
# --------------------------------------------------------------------------


def apply_retraction(
    evidence: list[EvidenceItem],
    sources: dict[str, Source],
    *,
    target_address: int,
    retracting_source: Source,
    tier: Tier,
    item_id: str,
    span: EvidenceSpan,
    provenance: str,
) -> EvidenceItem:
    """Materializes a retraction of `target_address` as a NEW
    `EvidenceItem` refuting it (never a deletion, per this module's own
    top docstring): a `refutes=[target_address]` item carrying
    `retracting_source`'s own `kind` and the caller-given `tier` (`Source`
    carries no tier of its own; `tier` names the retracting source's own
    reliability the same way any other `EvidenceItem.tier` does).

    Every existing item that SUPPORTS `target_address` (asserting the
    now-doubted claim, as opposed to one already refuting it, including
    an earlier retraction of the same address) is stamped `retracted_by
    = retracting_source.id` (`EvidenceItem.retracted_by`), and so is its
    own `Source` (`Source.retracted_by`), alongside its own unedited
    `supports`/`refutes`/`stance`: a marker that this item's own claim
    has been superseded, never a rewrite of what it originally asserted.
    An item that already refutes `target_address` (ordinary skeptical
    evidence, or an earlier retraction) is left untouched: a second,
    independent retraction reinforces the first one, it does not
    supersede it, so the first retraction's own `retracted_by` stays
    `None`.

    `retracting_source` is added to `sources` (keyed by its own `id`)
    if not already present. Mutates `evidence` and `sources` in place
    and returns the new retraction item; `hte.runner.run_campaign`'s
    own `changed_from_retractions` call reads the result of this
    mutation back off the corpus rather than needing this item handed
    to it directly.
    """
    sources.setdefault(retracting_source.id, retracting_source)
    for item in evidence:
        if target_address in item.supports:
            item.retracted_by = retracting_source.id
            src = sources.get(item.source_id)
            if src is not None:
                src.retracted_by = retracting_source.id

    retraction_item = EvidenceItem(
        id=item_id, kind=retracting_source.kind, tier=tier, source_id=retracting_source.id,
        span=span, provenance=provenance, refutes=[target_address],
    )
    evidence.append(retraction_item)
    return retraction_item


def changed_from_retractions(evidence: Sequence[EvidenceItem], sources: Mapping[str, Source] | None = None) -> set[int]:
    """Every hypothesis address named in `supports` or `refutes` by an
    `EvidenceItem` that is itself retracted (`item.retracted_by` set) or
    whose own `Source` is retracted (`sources[item.source_id].
    retracted_by` set): `propagate`'s own `changed` argument, read
    straight off the corpus (`hte.runner.run_campaign`'s own wiring)
    rather than tracked by hand by a separate caller-side channel.

    The new retraction item `apply_retraction` itself appends carries
    no `retracted_by` of its own: it is the CAUSE of a cascade, and
    this function reads it that way. The address it targets is already
    flagged by every OTHER, now-retracted item that named that same
    address before this one was added.
    """
    sources = sources or {}
    out: set[int] = set()
    for item in evidence:
        retracted = item.retracted_by is not None
        if not retracted and item.source_id in sources:
            retracted = sources[item.source_id].retracted_by is not None
        if retracted:
            out |= set(item.supports) | set(item.refutes)
    return out


# --------------------------------------------------------------------------
# Fragility
# --------------------------------------------------------------------------

# Documented flag threshold (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` names no
# fixed number for this reading, the same "no fixed threshold stated in
# the source material" case `hte.unknowns.robustness`'s own `stable_
# threshold` documents): a node with more than two dependents leaning on
# support that is LESS than half independent (`fan_out=3, share=0.5` ->
# `fragility=1.5`; `fan_out=5, share=0.5` -> `2.5`) crosses it. Kept as
# one module constant, read by both `hte.runner` and `TIMELINE.md`'s
# own flag, so this number lives in exactly one place.
FRAGILITY_FLAG_THRESHOLD = 2.0


def independent_support_share(
    address: int,
    evidence: Sequence[EvidenceItem],
    sources: Mapping[str, Source] | None = None,
    *,
    theta_prune: float = 0.6,
) -> float:
    """The share of `address`'s own pooled SUPPORTING weight
    (`item.supports` containing `address`) that comes from true,
    non-duplicated corroboration: at most one representative item's
    own weight per (evidence kind, stemma component) pair, reusing
    `hte.belief.effective_count`'s own stemma-component reading the
    same way `hte.belief.pooled_weight`'s `D(n_eff)` discount already
    does for scoring, applied here to rank a node's own fragility
    instead. `sources` absent (or an item's own `source_id` missing
    from it) reads that kind's own items as already-independent (one
    component per item, `hte.belief.effective_count`'s own
    no-stemma-information default), the same convention `hte.belief.
    pooled_weight` itself falls back to.

    Reads `0.0` for an address with no supporting evidence at all
    (nothing to be independent OR dependent about) or with supporting
    weight summing to zero (a zero-strength item, `hte.belief.
    edge_strength`'s own floor case)."""
    supporting = [e for e in evidence if address in e.supports]
    if not supporting:
        return 0.0
    total_weight = sum(cluster_weight(e) for e in supporting)
    if total_weight <= 0:
        return 0.0

    by_kind: dict[EvidenceKind, list[EvidenceItem]] = {}
    for e in supporting:
        by_kind.setdefault(e.kind, []).append(e)

    independent_weight = 0.0
    for kind_items in by_kind.values():
        kind_sources = (
            [sources[i.source_id] for i in kind_items if i.source_id in sources] if sources else []
        )
        n_eff = effective_count(kind_sources, theta_prune=theta_prune) if kind_sources else len(kind_items)
        ranked = sorted(kind_items, key=cluster_weight, reverse=True)
        independent_weight += sum(cluster_weight(i) for i in ranked[:n_eff])

    return min(1.0, independent_weight / total_weight)


def fragility(
    address: int,
    hypotheses: Sequence[Hypothesis],
    evidence: Sequence[EvidenceItem],
    sources: Mapping[str, Source] | None = None,
    *,
    graph: DerivationGraph | None = None,
    theta_prune: float = 0.6,
) -> float:
    """`fragility(address) = fan_out(address) * (1 -
    independent_support_share(address))`: how many other hypotheses
    would move if `address` collapsed (`fan_out`, its DIRECT dependent
    count in the derivation graph), weighted up when its own support is
    thin corroboration rather than several independent lines of
    evidence (`1 - independent_support_share`, `0.0` for a node backed
    entirely by independent evidence, `1.0` for one backed by a single
    witness copied several times). `graph` is `build_derivation_graph`'s
    own result, computed once and passed in by `rank_fragility` so
    ranking a whole population does not rebuild it per address."""
    graph = graph if graph is not None else build_derivation_graph(hypotheses, evidence, sources)
    children = _invert(graph)
    fan_out = len(children.get(address, ()))
    share = independent_support_share(address, evidence, sources, theta_prune=theta_prune)
    return fan_out * (1.0 - share)


def rank_fragility(
    hypotheses: Sequence[Hypothesis],
    evidence: Sequence[EvidenceItem],
    sources: Mapping[str, Source] | None = None,
    *,
    top_n: int = 10,
    theta_prune: float = 0.6,
) -> list[dict[str, Any]]:
    """Every hypothesis in `hypotheses`, ranked by `fragility`
    descending, capped at `top_n`. Each row: `address`, `short_id`,
    `fragility`, `fan_out`, `independent_support_share`, and `flagged`
    (`fragility > FRAGILITY_FLAG_THRESHOLD`), the shape `hte.runner.
    run_campaign` writes verbatim into `self-report.json["fragility_
    top10"]` and `MANIFEST.json["counts"]["fragility_top10"]`, and
    `hte.export.write_views` reads for `TIMELINE.md`'s own fragility
    section."""
    graph = build_derivation_graph(hypotheses, evidence, sources)
    children = _invert(graph)
    rows: list[dict[str, Any]] = []
    for h in hypotheses:
        fan_out = len(children.get(h.address, ()))
        share = independent_support_share(h.address, evidence, sources, theta_prune=theta_prune)
        score = fan_out * (1.0 - share)
        rows.append({
            "address": h.address, "short_id": h.short_id, "fragility": score,
            "fan_out": fan_out, "independent_support_share": share,
            "flagged": score > FRAGILITY_FLAG_THRESHOLD,
        })
    rows.sort(key=lambda r: r["fragility"], reverse=True)
    return rows[:top_n]


__all__ = [
    "DerivationGraph",
    "build_derivation_graph",
    "derived_weight",
    "CascadeEntry",
    "CascadeReport",
    "propagate",
    "apply_retraction",
    "changed_from_retractions",
    "FRAGILITY_FLAG_THRESHOLD",
    "independent_support_share",
    "fragility",
    "rank_fragility",
]
