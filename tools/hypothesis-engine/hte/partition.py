"""Explanandum partitions: normalized posterior shares and evidence-only
Bayes factors between rival hypotheses (`STATISTICAL-AUDIT-2026-09-15.md`,
"Hypothesis space and sampling"). Every address is scored as an
independent proposition today, so the best meltwater and the best impact
hypothesis for one Younger Dryas event can both sit above 0.9 on the same
evidence; a partition names the rivalry, one competing set per event.
"""
from __future__ import annotations

from typing import Mapping, Sequence

from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START, time_bin_index
from .belief import Constants, Opinion, pooled_weight
from .evidence import EvidenceItem
from .hypothesis import Hypothesis

# Jeffreys' fix (audit, Priors table): prior odds and the Bayes factor
# apart. Keeps a zero-refute member from dividing by zero.
EPSILON = 0.01

PartitionKey = tuple


def partition(
    hypotheses: Sequence[Hypothesis],
    *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> dict[PartitionKey, list[Hypothesis]]:
    """Groups `hypotheses` into one competing set per explanandum: a
    placement's (OBJECT, PLACE, TIME_BIN); a sequence's ordered event
    pair (`hte.export.timeline_views`'s own `pair_views` key)."""
    groups: dict[PartitionKey, list[Hypothesis]] = {}
    for h in hypotheses:
        if h.is_sequence:
            seq = h.content
            key = ("sequence", (seq.first.object, seq.first.place), (seq.second.object, seq.second.place))
        else:
            p = h.content
            tbin = time_bin_index(p.interval.start, span_start, bin_width)
            key = ("placement", p.object, p.place, tbin)
        groups.setdefault(key, []).append(h)
    return groups


def partition_odds(
    members: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
    evidence: Sequence[EvidenceItem] = (),
) -> dict[int, dict]:
    """Per member, keyed by `Hypothesis.address`, within one set from
    `partition`: `share` (`P_i / sum(P_j)`, `P`=0 for no opinion;
    singleton reads 1.0); `shared_evidence`, ids of items in `evidence`
    whose `supports`/`refutes` names two or more of the set's addresses
    at once (an item naming OBJECT/PLACE/TIME but not ACTOR links every
    actor proposed), attached to every member; and `bayes_factor_vs_
    best`, `(b_i + eps)/(d_i + eps)` over the same ratio for whichever
    other member has the highest lift (`b - d`; `None` for a singleton).
    A member `shared_evidence` touches gets `b`/`d` recomputed from
    `evidence` with those items removed first (`hte.belief.pooled_
    weight`), so they cannot inflate both sides in step.
    """
    addresses = [h.address for h in members]
    projected = {a: (opinions[a].project() if a in opinions else 0.0) for a in addresses}
    total = sum(projected.values())
    singleton = len(addresses) == 1
    shares = {a: 1.0 if singleton else (projected[a] / total if total > 0 else 0.0) for a in addresses}

    addr_set = set(addresses)
    linked: dict[int, set[str]] = {a: set() for a in addresses}
    for item in evidence:
        hit = (set(item.supports) | set(item.refutes)) & addr_set
        if len(hit) >= 2:
            for a in hit:
                linked[a].add(item.id)
    shared_evidence = sorted({eid for ids in linked.values() for eid in ids})

    def bd_of(addr: int) -> tuple[float, float]:
        opinion = opinions.get(addr)
        if opinion is None:
            return 0.0, 0.0
        if not linked[addr]:
            return opinion.b, opinion.d
        remaining = [i for i in evidence if i.id not in linked[addr]]
        r, s = pooled_weight(remaining, addr, constants=Constants())
        adjusted = Opinion.from_evidence(r, s, Constants().W, a=0.0)
        return adjusted.b, adjusted.d

    bd = {a: bd_of(a) for a in addresses}
    lift = {a: bd[a][0] - bd[a][1] for a in addresses}

    result: dict[int, dict] = {}
    for addr in addresses:
        others = [a for a in addresses if a != addr]
        factor = None
        if others:
            best = max(others, key=lambda a: lift[a])
            b_i, d_i = bd[addr]
            b_j, d_j = bd[best]
            factor = ((b_i + EPSILON) / (d_i + EPSILON)) / ((b_j + EPSILON) / (d_j + EPSILON))
        result[addr] = {"share": shares[addr], "bayes_factor_vs_best": factor, "shared_evidence": list(shared_evidence)}
    return result


__all__ = ["partition", "partition_odds", "EPSILON"]
