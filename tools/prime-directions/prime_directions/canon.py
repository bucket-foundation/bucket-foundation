from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import scipy.sparse as sp
from sklearn.metrics import normalized_mutual_info_score, silhouette_score

from .model import PrimeResult


@dataclass
class CanonClusters:
    labels: np.ndarray
    order: list[int]
    clusters: list[dict]
    metrics: dict


def assign(scores: np.ndarray) -> np.ndarray:
    comp = np.argmax(np.abs(scores), axis=1)
    negative = scores[np.arange(scores.shape[0]), comp] < 0
    return comp * 2 + negative


def pole(label: int) -> tuple[int, int]:
    return label // 2, (-1 if label % 2 else 1)


def louvain_modularity(adj: sp.csr_matrix, seed: int = 0) -> tuple[float, int]:
    import networkx as nx

    g = nx.from_scipy_sparse_array(sp.csr_matrix(adj))
    communities = nx.community.louvain_communities(g, weight="weight", seed=seed)
    return float(nx.community.modularity(g, communities, weight="weight")), len(communities)


def modularity(adj: sp.csr_matrix, labels: np.ndarray) -> float:
    adj = sp.csr_matrix(adj)
    two_m = float(adj.sum())
    if two_m == 0:
        return 0.0
    degree = np.asarray(adj.sum(axis=1)).ravel()
    coo = adj.tocoo()
    same = labels[coo.row] == labels[coo.col]
    internal = float(coo.data[same].sum())
    k = int(labels.max()) + 1 if labels.size else 0
    deg_by = np.bincount(labels, weights=degree, minlength=k)
    return internal / two_m - float(((deg_by / two_m) ** 2).sum())


def five_number(values: np.ndarray) -> dict:
    q = np.percentile(values, [0, 25, 50, 75, 100])
    return {
        "min": float(q[0]), "q1": float(q[1]), "median": float(q[2]), "q3": float(q[3]), "max": float(q[4]),
        "mean": float(values.mean()), "sd": float(values.std()),
    }


def summaries(result: PrimeResult) -> list[dict]:
    return [{"component": k + 1, **five_number(result.raw_scores[:, k])} for k in range(result.k)]


def canon_clusters(
    result: PrimeResult,
    adj: sp.csr_matrix,
    rank: np.ndarray,
    branches: list[str],
    seed: int = 0,
    shuffles: int = 20,
    silhouette_sample: int = 3000,
) -> CanonClusters:
    labels = assign(result.scores)
    poles = 2 * result.k
    mass = np.bincount(labels, weights=rank, minlength=poles)
    present = [int(c) for c in np.argsort(-mass) if (labels == c).any()]
    renumber = np.full(poles, -1, dtype=int)
    renumber[present] = np.arange(len(present))
    canon = renumber[labels]
    order = present
    clusters = []
    for number, lab in enumerate(order, start=1):
        comp, sign = pole(lab)
        members = np.flatnonzero(labels == lab)
        top_nodes = members[np.argsort(-rank[members])][:5]
        ranked = [t for t, _ in result.top_terms(comp, 12, sign=sign)]
        terms = [t for t in ranked if not t.startswith("@")][:4]
        branch_counts: dict[str, int] = {}
        for i in members:
            branch_counts[branches[i]] = branch_counts.get(branches[i], 0) + 1
        clusters.append({
            "canon": number,
            "name": f"Canon {number}: {' / '.join(terms[:3] or [result.titles[i] for i in top_nodes[:3]])}",
            "component": comp + 1,
            "pole": "+" if sign > 0 else "-",
            "size": int(members.size),
            "pagerank_mass": round(float(mass[lab]), 6),
            "top_terms": terms,
            "anchors": [{"title": result.titles[i], "pagerank": round(float(rank[i]), 6)} for i in top_nodes],
            "branches": dict(sorted(branch_counts.items(), key=lambda kv: -kv[1])[:5]),
        })
    rng = np.random.default_rng(seed)
    q = modularity(adj, canon)
    null = [modularity(adj, rng.permutation(canon)) for _ in range(shuffles)]
    branch_ids = np.unique(np.array(branches), return_inverse=True)[1]
    sample = rng.choice(len(canon), size=min(silhouette_sample, len(canon)), replace=False)
    sil = float(silhouette_score(result.scores[sample], canon[sample])) if len(set(canon[sample])) > 1 else float("nan")
    louvain_q, louvain_n = louvain_modularity(adj, seed)
    metrics = {
        "clusters": len(order),
        "modularity": round(q, 4),
        "modularity_louvain": round(louvain_q, 4),
        "louvain_communities": louvain_n,
        "modularity_shuffled_mean": round(float(np.mean(null)), 4),
        "modularity_shuffled_sd": round(float(np.std(null)), 4),
        "modularity_branches": round(modularity(adj, branch_ids), 4),
        "nmi_vs_branch": round(float(normalized_mutual_info_score(branch_ids, canon)), 4),
        "silhouette": round(sil, 4),
        "silhouette_sample": int(sample.size),
    }
    return CanonClusters(canon, order, clusters, metrics)
