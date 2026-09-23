from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Iterable, Iterator, Sequence

import numpy as np
from scipy import sparse

RANKERS = ("random", "degree_product", "common_neighbours", "adamic_adar", "jaccard")
AGGREGATIONS = ("min", "geomean", "product")

@dataclass(frozen=True)
class Work:
    year: int
    topics: tuple[int, ...]
    field: int | None = None

@dataclass
class Snapshot:
    vertices: np.ndarray
    index: dict[int, int]
    adjacency: sparse.csr_matrix
    degree: np.ndarray
    before_triples: set[tuple[int, int, int]]

def snapshot(works: Iterable[Work], cutoff: int, min_works: int) -> Snapshot:
    before = [w for w in works if w.year <= cutoff]
    counts: dict[int, int] = {}
    for w in before:
        for t in set(w.topics):
            counts[t] = counts.get(t, 0) + 1
    vertices = np.array(sorted(t for t, c in counts.items() if c >= min_works), dtype=np.int64)
    index = {int(t): i for i, t in enumerate(vertices)}
    rows: list[int] = []
    cols: list[int] = []
    triples: set[tuple[int, int, int]] = set()
    for w in before:
        kept = sorted({index[t] for t in w.topics if t in index})
        for a, b in combinations(kept, 2):
            rows += [a, b]
            cols += [b, a]
        triples.update(combinations(kept, 3))
    n = len(vertices)
    adj = sparse.csr_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n))
    adj.sum_duplicates()
    adj.data[:] = 1.0
    degree = np.asarray(adj.sum(axis=1)).ravel()
    return Snapshot(vertices, index, adj.tocsr(), degree, triples)

def candidate_pairs(snap: Snapshot) -> tuple[np.ndarray, np.ndarray]:
    us: list[np.ndarray] = []
    vs: list[np.ndarray] = []
    for u, v in iter_candidate_pairs(snap):
        us.append(u)
        vs.append(v)
    if not us:
        return np.empty(0, dtype=np.int64), np.empty(0, dtype=np.int64)
    return np.concatenate(us), np.concatenate(vs)

def iter_candidate_pairs(snap: Snapshot, block: int = 2048) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    n = len(snap.vertices)
    for start in range(0, n, block):
        stop = min(n, start + block)
        dense = snap.adjacency[start:stop].toarray() > 0
        for offset, row in enumerate(dense):
            u = start + offset
            v = np.nonzero(~row[u + 1 :])[0] + u + 1
            if len(v):
                yield np.full(len(v), u, dtype=np.int64), v.astype(np.int64)

def minimal_triples(snap: Snapshot) -> np.ndarray:
    adj = snap.adjacency
    out: list[tuple[int, int, int]] = []
    for u in range(adj.shape[0]):
        nu = adj.indices[adj.indptr[u] : adj.indptr[u + 1]]
        nu = np.sort(nu[nu > u])
        nu_set = set(nu.tolist())
        for v in nu:
            nv = adj.indices[adj.indptr[v] : adj.indptr[v + 1]]
            for w in np.sort(nv[nv > v]):
                if int(w) in nu_set and (u, int(v), int(w)) not in snap.before_triples:
                    out.append((u, int(v), int(w)))
    return np.array(out, dtype=np.int64).reshape(-1, 3)

def window_counts(works: Iterable[Work], snap: Snapshot, cutoff: int, horizon: int) -> tuple[dict[tuple[int, int], int], dict[tuple[int, int, int], int]]:
    pairs: dict[tuple[int, int], int] = {}
    triples: dict[tuple[int, int, int], int] = {}
    for w in works:
        if not (cutoff < w.year <= cutoff + horizon):
            continue
        kept = sorted({snap.index[t] for t in w.topics if t in snap.index})
        for p in combinations(kept, 2):
            pairs[p] = pairs.get(p, 0) + 1
        for t in combinations(kept, 3):
            triples[t] = triples.get(t, 0) + 1
    return pairs, triples

def _mix(x: np.ndarray, seed: int) -> np.ndarray:
    with np.errstate(over="ignore"):
        return _splitmix(x, seed)

def _splitmix(x: np.ndarray, seed: int) -> np.ndarray:
    z = (x.astype(np.uint64) + np.uint64(seed) * np.uint64(0x9E3779B97F4A7C15)) & np.uint64(0xFFFFFFFFFFFFFFFF)
    z = (z ^ (z >> np.uint64(30))) * np.uint64(0xBF58476D1CE4E5B9)
    z = (z ^ (z >> np.uint64(27))) * np.uint64(0x94D049BB133111EB)
    z = z ^ (z >> np.uint64(31))
    return (z >> np.uint64(11)).astype(np.float64) / float(1 << 53)

def pair_scores(snap: Snapshot, kind: str, u: np.ndarray, v: np.ndarray, seed: int = 0, chunk: int = 1_000_000) -> np.ndarray:
    if kind not in RANKERS:
        raise ValueError(f"unknown ranker {kind}")
    n = len(snap.vertices)
    out = np.empty(len(u), dtype=np.float64)
    with np.errstate(divide="ignore", invalid="ignore"):
        weights = np.where(snap.degree > 1, 1.0 / np.log(np.maximum(snap.degree, 2)), 0.0)
    for s in range(0, len(u), chunk):
        uu = u[s : s + chunk]
        vv = v[s : s + chunk]
        if kind == "random":
            out[s : s + chunk] = _mix(np.minimum(uu, vv) * n + np.maximum(uu, vv), seed)
            continue
        if kind == "degree_product":
            out[s : s + chunk] = snap.degree[uu] * snap.degree[vv]
            continue
        common = snap.adjacency[uu].multiply(snap.adjacency[vv])
        if kind == "common_neighbours":
            out[s : s + chunk] = np.asarray(common.sum(axis=1)).ravel()
        elif kind == "adamic_adar":
            out[s : s + chunk] = np.asarray(common @ weights).ravel()
        else:
            cn = np.asarray(common.sum(axis=1)).ravel()
            union = snap.degree[uu] + snap.degree[vv] - cn
            out[s : s + chunk] = np.where(union > 0, cn / np.where(union > 0, union, 1), 0.0)
    return out

def triple_scores(snap: Snapshot, kind: str, triples: np.ndarray, aggregation: str, seed: int = 0) -> np.ndarray:
    if aggregation not in AGGREGATIONS:
        raise ValueError(f"unknown aggregation {aggregation}")
    if len(triples) == 0:
        return np.empty(0)
    a, b, c = triples[:, 0], triples[:, 1], triples[:, 2]
    s = np.stack([pair_scores(snap, kind, a, b, seed), pair_scores(snap, kind, a, c, seed), pair_scores(snap, kind, b, c, seed)])
    if aggregation == "min":
        return s.min(axis=0)
    if aggregation == "product":
        return s.prod(axis=0)
    return np.cbrt(s.prod(axis=0))

def labels_for(keys: Sequence[tuple[int, ...]], counts: dict, m: int) -> np.ndarray:
    return np.array([counts.get(tuple(k), 0) >= m for k in keys], dtype=bool)
