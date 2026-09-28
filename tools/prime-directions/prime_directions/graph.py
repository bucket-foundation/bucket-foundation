from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import scipy.sparse as sp

from .clean import scrub, strip_boilerplate
from .corpora import Doc
from .corpora import resolve_path
from .model import PrimeResult, TermStats, fit_matrix, vectorize

PRIVATE_PATTERNS = ("kruse",)

LOCAL_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

NODES_SQL = """
select id::text, slug, title, kind, branch, coalesce(summary, ''), labels, provenance
from graph.nodes
where visibility = 'public' and superseded_by is null
order by slug
"""

EDGES_SQL = """
select e.from_id::text, e.to_id::text, e.kind, coalesce(e.weight, 1.0) * coalesce(e.confidence, 1.0)
from graph.edges e
join graph.nodes a on a.id = e.from_id and a.visibility = 'public' and a.superseded_by is null
join graph.nodes b on b.id = e.to_id and b.visibility = 'public' and b.superseded_by is null
"""

@dataclass
class Node:
    id: str
    slug: str
    title: str
    kind: str
    branch: str
    text: str
    source: str = "graph"

@dataclass
class Graph:
    nodes: list[Node]
    edges: list[tuple[int, int, str, float]]
    meta: dict = field(default_factory=dict)

    def index(self) -> dict[str, int]:
        return {n.id: i for i, n in enumerate(self.nodes)}

    def adjacency(self, symmetric: bool = True) -> sp.csr_matrix:
        n = len(self.nodes)
        if not self.edges:
            return sp.csr_matrix((n, n))
        rows = np.array([e[0] for e in self.edges])
        cols = np.array([e[1] for e in self.edges])
        data = np.array([max(e[3], 0.0) for e in self.edges], dtype=float)
        a = sp.csr_matrix((data, (rows, cols)), shape=(n, n))
        a.sum_duplicates()
        return (a + a.T).tocsr() if symmetric else a

def label_text(labels) -> str:
    if isinstance(labels, str):
        try:
            labels = json.loads(labels)
        except ValueError:
            return labels
    out: list[str] = []

    def walk(value) -> None:
        if isinstance(value, str):
            out.append(value)
        elif isinstance(value, dict):
            for v in value.values():
                walk(v)
        elif isinstance(value, list):
            for v in value:
                walk(v)

    walk(labels)
    return " ".join(out)

def academy_atoms(corpus_dir: Path) -> dict[str, dict]:
    atoms = {}
    for f in sorted(corpus_dir.glob("[0-9b]*.json")):
        data = json.loads(f.read_text("utf-8"))
        for atom in data.get("atoms", []) if isinstance(data, dict) else []:
            if isinstance(atom, dict) and atom.get("id"):
                atoms[str(atom["id"])] = {**atom, "_branch": f.stem}
    return atoms

def atom_text(atom: dict) -> str:
    parts = [str(atom.get("summary") or ""), str(atom.get("lesson") or "")]
    depths = atom.get("depths")
    if isinstance(depths, (dict, list)):
        parts.append(label_text(depths))
    return "\n".join(p for p in parts if p)

def fetch_rows(dsn: str) -> tuple[list[tuple], list[tuple]]:
    import psycopg2

    con = psycopg2.connect(dsn, connect_timeout=10)
    try:
        con.set_session(readonly=True)
        with con.cursor() as cur:
            cur.execute(NODES_SQL)
            nodes = cur.fetchall()
            cur.execute(EDGES_SQL)
            edges = cur.fetchall()
    finally:
        con.close()
    return nodes, edges

def build_graph(node_rows, edge_rows, atoms: dict[str, dict] | None = None) -> Graph:
    atoms = atoms or {}
    nodes: list[Node] = []
    mirrored: set[str] = set()
    for node_id, slug, title, kind, branch, summary, labels, provenance in node_rows:
        prov = provenance if isinstance(provenance, dict) else json.loads(provenance or "{}")
        parts = [title, summary, label_text(labels)]
        atom_id = prov.get("atom_id") if prov.get("type") == "academy_atom" else None
        if atom_id and atom_id in atoms:
            parts.append(atom_text(atoms[atom_id]))
            mirrored.add(atom_id)
        bridged = prov.get("academy_atom_id")
        if bridged:
            mirrored.add(bridged)
        nodes.append(Node(node_id, slug, title, kind, branch, scrub("\n".join(p for p in parts if p))))
    graph_slugs = {n.slug for n in nodes}
    for atom_id, atom in atoms.items():
        if atom_id in mirrored or atom_id in graph_slugs:
            continue
        nodes.append(Node(
            f"academy:{atom_id}", atom_id, str(atom.get("title") or atom_id), "academy_atom",
            atom["_branch"], scrub(f"{atom.get('title', '')}\n{atom_text(atom)}"), source="academy",
        ))
    index = {n.id: i for i, n in enumerate(nodes)}
    atom_nodes = {n.slug: index[n.id] for n in nodes if n.source == "academy"}
    slug_index = {n.slug: i for i, n in enumerate(nodes)}
    edges = [(index[a], index[b], kind, float(w)) for a, b, kind, w in edge_rows if a in index and b in index]
    for atom_id, i in atom_nodes.items():
        for req in atoms[atom_id].get("requires") or []:
            j = slug_index.get(str(req))
            if j is not None:
                edges.append((j, i, "prerequisite", 1.0))
    meta = {
        "graph_nodes": len(node_rows),
        "academy_added": len(atom_nodes),
        "academy_mirrored": len(mirrored),
        "edges": len(edges),
    }
    return Graph(nodes, edges, meta)

VIDEO_ID = re.compile(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})")

def video_ids(provenance) -> set[str]:
    text = provenance if isinstance(provenance, str) else json.dumps(provenance, default=str)
    return set(VIDEO_ID.findall(text))

def video_metadata(ids: set[str], yt_dir: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not yt_dir.is_dir():
        return out
    for vid in ids:
        for folder in yt_dir.glob(f"{glob_escape(vid)}-*"):
            meta = folder / "metadata.json"
            if meta.is_file():
                try:
                    data = json.loads(meta.read_text("utf-8"))
                except ValueError:
                    continue
                out[vid] = " ".join(str(data.get(k) or "") for k in ("title", "channel", "uploader", "description"))
                break
    return out

def glob_escape(text: str) -> str:
    return re.sub(r"([\[\]*?])", r"[\1]", text)

def exclude_private(node_rows, patterns=PRIVATE_PATTERNS, videos: dict[str, str] | None = None) -> tuple[list[tuple], int]:
    if not patterns:
        return list(node_rows), 0
    rx = re.compile("|".join(re.escape(p) for p in patterns), re.IGNORECASE)
    videos = videos or {}
    blobs = []
    flagged_videos: set[str] = set()
    for row in node_rows:
        ids = video_ids(row[7])
        blob = " ".join(json.dumps(v, default=str) if not isinstance(v, str) else v for v in row[1:])
        blob += " " + " ".join(videos.get(v, "") for v in ids)
        hit = bool(rx.search(blob))
        if hit:
            flagged_videos |= ids
        blobs.append((row, ids, hit))
    kept = [row for row, ids, hit in blobs if not hit and not (ids & flagged_videos)]
    return kept, len(node_rows) - len(kept)

def load_graph(
    dsn: str | None = None,
    academy_dir: str = "learning/app/corpus",
    exclude_patterns=PRIVATE_PATTERNS,
    yt_dir: str = "yt",
) -> Graph:
    dsn = dsn or os.environ.get("PRIME_GRAPH_DSN", LOCAL_DSN)
    node_rows, edge_rows = fetch_rows(dsn)
    videos = {}
    if exclude_patterns:
        ids = set().union(*(video_ids(r[7]) for r in node_rows)) if node_rows else set()
        videos = video_metadata(ids, resolve_path(yt_dir))
    node_rows, excluded = exclude_private(node_rows, exclude_patterns, videos)
    path = resolve_path(academy_dir)
    atoms = academy_atoms(path) if path.exists() else {}
    graph = build_graph(node_rows, edge_rows, atoms)
    graph.meta["excluded_private"] = excluded
    graph.meta["private_patterns"] = len(exclude_patterns or ())
    graph.meta["video_metadata_resolved"] = len(videos)
    return graph

def pagerank(adj: sp.csr_matrix, damping: float = 0.85, tol: float = 1e-10, max_iter: int = 200) -> tuple[np.ndarray, int]:
    n = adj.shape[0]
    out = np.asarray(adj.sum(axis=1)).ravel()
    dangling = out == 0
    inv = np.where(dangling, 0.0, 1.0 / np.where(dangling, 1.0, out))
    transition = sp.diags(inv) @ adj
    rank = np.full(n, 1.0 / n)
    for it in range(1, max_iter + 1):
        new = damping * (transition.T @ rank + rank[dangling].sum() / n) + (1 - damping) / n
        if np.abs(new - rank).sum() < tol:
            return new / new.sum(), it
        rank = new
    return rank / rank.sum(), max_iter

def feature_matrix(
    graph: Graph,
    min_df: int = 3,
    max_df: float = 0.15,
    max_features: int = 30000,
    edge_weight: float = 1.0,
    weighting: str = "idf-rownorm",
) -> tuple[sp.csr_matrix, np.ndarray, TermStats]:
    if weighting not in WEIGHTINGS:
        raise ValueError(f"weighting must be one of {WEIGHTINGS}")
    docs = [Doc(n.id, n.title, n.text) for n in graph.nodes]
    cleaned, _ = strip_boilerplate(docs, min_chars=0)
    by_id = {d.id: d.text for d in cleaned}
    text, vocab, stats = vectorize([by_id.get(n.id, "") or n.title for n in graph.nodes], min_df, max_df, max_features)
    adj = graph.adjacency(symmetric=True)
    adj.data = np.ones_like(adj.data)
    keep = np.flatnonzero(np.asarray(adj.getnnz(axis=0)).ravel() >= 2)
    link_vocab = np.array([f"@{graph.nodes[j].slug}" for j in keep], dtype=object)
    links = adj[:, keep] * edge_weight
    matrix = sp.hstack([text, links], format="csr")
    matrix = weight_matrix(matrix, weighting)
    return matrix, np.concatenate([vocab.astype(object), link_vocab]), stats

WEIGHTINGS = ("binary", "rownorm", "idf-rownorm")

def weight_matrix(matrix: sp.csr_matrix, weighting: str) -> sp.csr_matrix:
    if weighting == "binary":
        return matrix.tocsr()
    if weighting == "idf-rownorm":
        n = matrix.shape[0]
        df = np.asarray((matrix > 0).sum(axis=0)).ravel()
        matrix = matrix @ sp.diags(np.log((1 + n) / (1 + df)) + 1)
    norms = np.sqrt(np.asarray(matrix.multiply(matrix).sum(axis=1)).ravel())
    norms[norms == 0] = 1
    return (sp.diags(1 / norms) @ matrix).tocsr()

def fit_graph(
    graph: Graph, k: int = 12, seed: int = 0, edge_weight: float = 1.0, weighting: str = "idf-rownorm", **kwargs
) -> PrimeResult:
    matrix, vocab, stats = feature_matrix(graph, edge_weight=edge_weight, weighting=weighting, **kwargs)
    params = {"edge_weight": edge_weight, "weighting": weighting, **kwargs}
    return fit_matrix(
        "bucket-graph", matrix, vocab, [n.id for n in graph.nodes], [n.title for n in graph.nodes],
        stats, k=k, seed=seed, params=params,
    )
