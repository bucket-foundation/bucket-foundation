from __future__ import annotations

import numpy as np

from . import canon, clean, corpora, graph, model
from .model import PrimeResult
from .neighbors import NeighborSpace

def vectors_of(result: PrimeResult, space: str = "raw") -> np.ndarray:
    if space == "raw":
        return result.raw_scores
    if space == "z":
        return result.scores
    raise ValueError("space must be raw or z")

def graph_space(
    dsn: str | None = None,
    include_private: bool = False,
    k: int = 12,
    seed: int = 0,
    space: str = "raw",
    weighting: str = "idf-rownorm",
) -> tuple[NeighborSpace, PrimeResult]:
    g = graph.load_graph(dsn, exclude_patterns=() if include_private else graph.PRIVATE_PATTERNS)
    result = graph.fit_graph(g, k=k, seed=seed, weighting=weighting, min_df=3, max_df=0.15)
    rank, _ = graph.pagerank(g.adjacency(symmetric=False))
    clusters = canon.canon_clusters(result, g.adjacency(), rank, [n.branch for n in g.nodes], seed=seed, shuffles=1)
    ns = NeighborSpace(
        vectors_of(result, space), [n.slug for n in g.nodes], [n.title for n in g.nodes], clusters.labels,
        meta={"canons": [c["name"] for c in clusters.clusters], "space": space},
    )
    return ns, result

def corpus_space(name: str, k: int = 12, seed: int = 0, space: str = "raw") -> tuple[NeighborSpace, PrimeResult]:
    spec = corpora.load_registry()[name]
    if spec.private:
        raise ValueError(f"{name} is private; use it only with outputs outside the repo")
    docs, _ = clean.strip_boilerplate(corpora.load(spec), **spec.clean)
    result = model.fit(name, docs, k=k, seed=seed)
    labels = canon.assign(result.scores)
    return NeighborSpace(vectors_of(result, space), result.doc_ids, result.titles, labels, meta={"space": space}), result
