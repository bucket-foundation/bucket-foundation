from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from .belief import Constants, DetectabilityTable, Opinion, cluster_weight, effective_count, pooled_weight, sigmoid
from .concepts import Vocabulary
from .evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Tier
from .hypothesis import Hypothesis

DerivationGraph = dict[int, set[int]]

def build_derivation_graph(
    hypotheses: Sequence[Hypothesis],
    evidence: Sequence[EvidenceItem],
    sources: Mapping[str, Source] | None = None,
) -> DerivationGraph:
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
        ancestor_cache[source_id] = set()
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
    children: dict[int, set[int]] = {addr: set() for addr in graph}
    for child, parents in graph.items():
        for parent in parents:
            children.setdefault(parent, set()).add(child)
    return children

def _topological_order(nodes: set[int], graph: DerivationGraph) -> list[int]:
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

def derived_weight(base_weight: float, parent_projections: Sequence[float]) -> float:
    factor = 1.0
    for p in parent_projections:
        factor *= p
    return base_weight * factor

def _damp_and_share(active_parents: Sequence[int], current: Mapping[int, Opinion]) -> tuple[float, float]:
    damp = 1.0
    for p in active_parents:
        proj = current[p].project()
        proj = min(max(proj, 1e-9), 1.0 - 1e-12)
        damp *= proj
    return damp, 1.0

@dataclass(frozen=True)
class CascadeEntry:
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
            continue
        parents = graph.get(addr, set())
        active_parents = sorted(p for p in parents if p in active)
        if not active_parents:
            continue

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
    sources = sources or {}
    out: set[int] = set()
    for item in evidence:
        retracted = item.retracted_by is not None
        if not retracted and item.source_id in sources:
            retracted = sources[item.source_id].retracted_by is not None
        if retracted:
            out |= set(item.supports) | set(item.refutes)
    return out

FRAGILITY_FLAG_THRESHOLD = 2.0

def independent_support_share(
    address: int,
    evidence: Sequence[EvidenceItem],
    sources: Mapping[str, Source] | None = None,
    *,
    theta_prune: float = 0.6,
) -> float:
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
