from __future__ import annotations

import csv
import io
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SCOPES = ("local", "global", "cross")
BACKENDS = ("brute", "kdtree", "hnsw", "pgvector")

@dataclass
class Neighbor:
    index: int
    id: str
    title: str
    distance: float
    label: int

@dataclass
class NeighborSpace:
    vectors: np.ndarray
    ids: list[str]
    titles: list[str]
    labels: np.ndarray | None = None
    meta: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.vectors = np.ascontiguousarray(self.vectors, dtype=np.float64)
        if len(self.ids) != self.vectors.shape[0] or len(self.titles) != self.vectors.shape[0]:
            raise ValueError("ids, titles and vectors must have the same row count")
        if self.labels is not None and len(self.labels) != self.vectors.shape[0]:
            raise ValueError("labels must have one entry per row")
        self._pos = {v: i for i, v in enumerate(self.ids)}

    def position(self, key: str | int) -> int:
        if isinstance(key, (int, np.integer)):
            return int(key)
        if key not in self._pos:
            raise KeyError(f"unknown id {key!r}")
        return self._pos[key]

def distances(vectors: np.ndarray, query: np.ndarray) -> np.ndarray:
    diff = vectors - query[None, :]
    return np.sqrt(np.einsum("ij,ij->i", diff, diff))

def brute_knn(vectors: np.ndarray, queries: np.ndarray, k: int, sq_norms: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    queries = np.atleast_2d(queries)
    k = min(k, vectors.shape[0])
    sq = (vectors**2).sum(axis=1) if sq_norms is None else sq_norms
    d2 = sq[None, :] + (queries**2).sum(axis=1)[:, None] - 2.0 * queries @ vectors.T
    np.maximum(d2, 0, out=d2)
    part = np.argpartition(d2, k - 1, axis=1)[:, :k]
    rows = np.arange(queries.shape[0])[:, None]
    diff = vectors[part] - queries[:, None, :]
    exact = np.sqrt(np.einsum("qkd,qkd->qk", diff, diff))
    order = np.argsort(exact, axis=1, kind="stable")
    return part[rows, order], exact[rows, order]

class BruteIndex:
    name = "brute"

    def __init__(self, vectors: np.ndarray) -> None:
        self.vectors = np.ascontiguousarray(vectors, dtype=np.float64)
        self.sq = (self.vectors**2).sum(axis=1)

    def query(self, queries: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        return brute_knn(self.vectors, queries, k, self.sq)

    def close(self) -> None:
        pass

class KDTreeIndex:
    name = "kdtree"

    def __init__(self, vectors: np.ndarray, leafsize: int = 16, workers: int = 1) -> None:
        from scipy.spatial import cKDTree

        self.tree = cKDTree(vectors, leafsize=leafsize)
        self.workers = workers

    def query(self, queries: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        dist, idx = self.tree.query(np.atleast_2d(queries), k=k, workers=self.workers)
        return np.atleast_2d(idx).reshape(-1, k), np.atleast_2d(dist).reshape(-1, k)

    def close(self) -> None:
        pass

class HNSWIndex:
    name = "hnsw"

    def __init__(self, vectors: np.ndarray, m: int = 32, ef_construction: int = 200, ef_search: int = 64) -> None:
        import faiss

        self.index = faiss.IndexHNSWFlat(vectors.shape[1], m)
        self.index.hnsw.efConstruction = ef_construction
        self.index.hnsw.efSearch = ef_search
        self.index.add(np.ascontiguousarray(vectors, dtype=np.float32))

    def query(self, queries: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        d2, idx = self.index.search(np.ascontiguousarray(np.atleast_2d(queries), dtype=np.float32), k)
        return idx, np.sqrt(np.maximum(d2, 0))

    def close(self) -> None:
        pass

class PgvectorIndex:
    name = "pgvector"

    def __init__(self, vectors: np.ndarray, dsn: str, m: int = 16, ef_construction: int = 64, ef_search: int = 64) -> None:
        import psycopg2

        self.con = psycopg2.connect(dsn, connect_timeout=10)
        self.con.autocommit = False
        dim = vectors.shape[1]
        with self.con.cursor() as cur:
            cur.execute("set search_path to pg_temp, public, extensions")
            cur.execute(f"create temporary table pd_vectors (i integer primary key, v vector({dim}))")
            buf = io.StringIO("".join(f"{i}\t{_literal(v)}\n" for i, v in enumerate(vectors)))
            cur.copy_expert("copy pd_vectors (i, v) from stdin", buf)
            cur.execute(
                f"create index on pd_vectors using hnsw (v vector_l2_ops) "
                f"with (m = {int(m)}, ef_construction = {int(ef_construction)})"
            )
            cur.execute(f"set hnsw.ef_search = {int(ef_search)}")
            cur.execute("analyze pd_vectors")

    def query(self, queries: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        queries = np.atleast_2d(queries)
        idx = np.full((queries.shape[0], k), -1, dtype=np.int64)
        dist = np.full((queries.shape[0], k), np.inf)
        with self.con.cursor() as cur:
            for r, q in enumerate(queries):
                cur.execute("select i, v <-> %s::vector as d from pd_vectors order by v <-> %s::vector limit %s",
                            (_literal(q), _literal(q), k))
                for c, (i, d) in enumerate(cur.fetchall()):
                    idx[r, c], dist[r, c] = i, d
        return idx, dist

    def close(self) -> None:
        try:
            self.con.rollback()
        finally:
            self.con.close()

def _literal(v: np.ndarray) -> str:
    return "[" + ",".join(f"{x:.7g}" for x in v) + "]"

def build_index(backend: str, vectors: np.ndarray, dsn: str | None = None, **kwargs):
    if backend == "brute":
        return BruteIndex(vectors)
    if backend == "kdtree":
        return KDTreeIndex(vectors, **kwargs)
    if backend == "hnsw":
        return HNSWIndex(vectors, **kwargs)
    if backend == "pgvector":
        if not dsn:
            raise ValueError("pgvector needs a DSN")
        return PgvectorIndex(vectors, dsn, **kwargs)
    raise ValueError(f"backend must be one of {BACKENDS}")

def neighbors(
    space: NeighborSpace,
    query: str | int | np.ndarray,
    k: int = 10,
    scope: str = "global",
    index=None,
) -> list[Neighbor]:
    if scope not in SCOPES:
        raise ValueError(f"scope must be one of {SCOPES}")
    if isinstance(query, np.ndarray):
        vec, self_pos, own = query.astype(np.float64), None, None
        if scope != "global":
            raise ValueError("local and cross scopes need a query that is a member of the space")
    else:
        self_pos = space.position(query)
        vec = space.vectors[self_pos]
        own = None if space.labels is None else int(space.labels[self_pos])
    if scope != "global" and space.labels is None:
        raise ValueError("local and cross scopes need cluster labels")
    if scope == "global" and index is not None:
        idx, dist = index.query(vec[None, :], k + 1)
        pairs = [(int(i), float(d)) for i, d in zip(idx[0], dist[0]) if i >= 0 and i != self_pos][:k]
    else:
        mask = np.ones(space.vectors.shape[0], dtype=bool)
        if scope == "local":
            mask &= space.labels == own
        elif scope == "cross":
            mask &= space.labels != own
        if self_pos is not None:
            mask[self_pos] = False
        cand = np.flatnonzero(mask)
        if cand.size == 0:
            return []
        d = distances(space.vectors[cand], vec)
        take = np.argsort(d, kind="stable")[:k]
        pairs = [(int(cand[t]), float(d[t])) for t in take]
    return [
        Neighbor(i, space.ids[i], space.titles[i], d, -1 if space.labels is None else int(space.labels[i]))
        for i, d in pairs
    ]

@dataclass
class TablePCA:
    columns: list[str]
    mean: np.ndarray
    scale: np.ndarray
    components: np.ndarray
    explained: np.ndarray

    def transform(self, rows: np.ndarray) -> np.ndarray:
        return ((np.atleast_2d(rows) - self.mean) / self.scale) @ self.components.T

def fit_table_pca(table: np.ndarray, columns: list[str], k: int | None = None) -> TablePCA:
    table = np.asarray(table, dtype=np.float64)
    mean = table.mean(axis=0)
    scale = table.std(axis=0)
    scale[scale == 0] = 1
    z = (table - mean) / scale
    _, s, vt = np.linalg.svd(z, full_matrices=False)
    k = min(k or vt.shape[0], vt.shape[0])
    var = s**2
    return TablePCA(columns, mean, scale, vt[:k], var[:k] / var.sum() if var.sum() > 0 else var[:k])

def read_table(path: Path, id_col: str, name_col: str | None = None) -> tuple[list[str], list[str], list[str], np.ndarray]:
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise ValueError(f"{path} has no rows")
    numeric = []
    for col in rows[0]:
        if col in (id_col, name_col):
            continue
        try:
            [float(r[col]) for r in rows]
        except (TypeError, ValueError):
            continue
        numeric.append(col)
    if not numeric:
        raise ValueError(f"{path} has no numeric columns")
    ids = [r[id_col] for r in rows]
    names = [r[name_col] if name_col else r[id_col] for r in rows]
    data = np.array([[float(r[c]) for c in numeric] for r in rows])
    return ids, names, numeric, data

def advisor_space(path: Path, id_col: str = "id", name_col: str | None = "name", k: int | None = None) -> tuple[NeighborSpace, TablePCA]:
    ids, names, cols, data = read_table(path, id_col, name_col)
    pca = fit_table_pca(data, cols, k)
    return NeighborSpace(pca.transform(data), ids, names, meta={"columns": cols}), pca

def match_advisors(space: NeighborSpace, pca: TablePCA, profile: dict[str, float], k: int = 5) -> list[Neighbor]:
    missing = [c for c in pca.columns if c not in profile]
    if missing:
        raise ValueError(f"profile lacks columns {missing}")
    vec = pca.transform(np.array([float(profile[c]) for c in pca.columns]))[0]
    return neighbors(space, vec, k=k, scope="global")

def recall_at_k(found: np.ndarray, truth: np.ndarray) -> float:
    hits = sum(len(set(f.tolist()) & set(t.tolist())) for f, t in zip(found, truth))
    return hits / truth.size

def distance_recall(found_dist: np.ndarray, truth_dist: np.ndarray, tol: float = 1e-9) -> float:
    kth = truth_dist[:, -1:]
    return float((found_dist <= kth + tol).sum() / truth_dist.size)

def benchmark(
    vectors: np.ndarray,
    backends: list[str],
    k: int = 10,
    n_queries: int = 500,
    seed: int = 0,
    dsn: str | None = None,
    threads: int = 1,
    repeats: int = 3,
    pg_max_rows: int = 200_000,
    build_threads: int | None = None,
) -> list[dict]:
    import os

    build_threads = build_threads or os.cpu_count() or 1
    from threadpoolctl import threadpool_limits

    rng = np.random.default_rng(seed)
    qidx = rng.choice(vectors.shape[0], size=min(n_queries, vectors.shape[0]), replace=False)
    queries = vectors[qidx]
    truth, truth_dist = brute_knn(vectors, queries, k)
    rows = []
    for backend in backends:
        base = {"backend": backend, "n": int(vectors.shape[0]), "dim": int(vectors.shape[1]), "k": k}
        if backend == "pgvector" and vectors.shape[0] > pg_max_rows:
            rows.append({**base, "skipped": f"over {pg_max_rows} rows"})
            continue
        _set_faiss_threads(build_threads)
        start = time.perf_counter()
        try:
            opts = {"workers": threads} if backend == "kdtree" else {}
            index = build_index(backend, vectors, dsn=dsn, **opts)
        except Exception as exc:
            rows.append({**base, "error": f"{type(exc).__name__}: {exc}"})
            continue
        build_s = time.perf_counter() - start
        with threadpool_limits(threads):
            _set_faiss_threads(threads)
            try:
                single = min(len(queries), 100 if backend == "pgvector" else len(queries))
                per_query = []
                for _ in range(repeats):
                    t0 = time.perf_counter()
                    for q in queries[:single]:
                        index.query(q[None, :], k)
                    per_query.append((time.perf_counter() - t0) / single)
                t0 = time.perf_counter()
                found, found_dist = index.query(queries, k)
                batch = time.perf_counter() - t0
            finally:
                index.close()
        rows.append({
            **base,
            "queries": int(len(queries)),
            "threads": threads,
            "build_threads": build_threads if backend == "hnsw" else 1,
            "build_ms": round(build_s * 1000, 2),
            "query_us": round(float(np.median(per_query)) * 1e6, 1),
            "batch_query_us": round(batch / len(queries) * 1e6, 2),
            "recall_at_k": round(recall_at_k(found, truth), 4),
            "tie_aware_recall": round(distance_recall(found_dist, truth_dist, 1e-6), 4),
        })
    return rows

def _set_faiss_threads(threads: int) -> None:
    try:
        import faiss

        faiss.omp_set_num_threads(threads)
    except ImportError:
        pass
