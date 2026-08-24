#!/usr/bin/env python3
"""
research-tools, CitationGraph (REAL logic, CPU, live OpenAlex)
==============================================================

FUNCTIONAL backend for CitationGraph (docs/research-tools/
02-tool-roadmap.md, the "build its local citation neighborhood" tool). Given a
paper (DOI, OpenAlex ID, or a title to resolve), it builds the paper's LOCAL
citation neighborhood from the live OpenAlex graph and surfaces the key related
works + which are most central:

 * the seed paper (resolved on OpenAlex)
 * its REFERENCES (what it cites) and CITATIONS (what cites it), real edges
 from OpenAlex `referenced_works` + a cited-by query
 * a co-citation / shared-reference layer that links neighbors to each other
 * a CENTRALITY ranking over the neighborhood (degree centrality on the induced
 subgraph) so the most-connected related works rise to the top

Design rules (match tools_rag.py / tools_toxin.py):
 * Reuses the OpenAlex client (cached_get_json, normalize_work) + text utils
 from tools_rag (live HTTP, disk cached, graceful `degraded` fallback).
 * Pure functions for graph construction + centrality so they unit-test with
 fixtures, ZERO network, ZERO GPU (see tests/).
 * run_citation_graph(payload) -> dict returns the `output` payload only; the
 gateway wraps it in the v1 job-result envelope + provenance.

The gateway imports CITATION_RUNNERS from here.

TODO(deploy): a full multi-hop centrality (eigenvector/PageRank over a 2-hop
neighborhood) is a documented heavier path; the shipped centrality is real
degree centrality over the induced 1-hop subgraph (deterministic, cheap, and
informative). Expanding the hop radius is a config change.
"""
from __future__ import annotations

import re
from typing import Any, Optional

import tools_rag as _rag


# ===========================================================================
# Pure ID handling
# ===========================================================================
_DOI_RE = re.compile(r"10\.\d{4,9}/\S+")
_OAID_RE = re.compile(r"\bW\d{3,}\b", re.I)


def parse_paper_id(s: str) -> tuple[Optional[str], str]:
    """Classify the input as an OpenAlex ID, a DOI, or free-text title.
 Returns (openalex_path_or_None, kind). Pure function.

 kind ∈ {"openalex", "doi", "title"}. For openalex/doi we can fetch the work
 directly; for a title we must search first.
    """
    s = (s or "").strip()
    m = _OAID_RE.search(s)
    if m:
        return f"/works/{m.group(0).upper()}", "openalex"
    if "doi.org/" in s.lower():
        s2 = s.rsplit("doi.org/", 1)[-1]
    else:
        s2 = s
    dm = _DOI_RE.search(s2)
    if dm:
        return f"/works/https://doi.org/{dm.group(0)}", "doi"
    return None, "title"


def short_id(openalex_id: str) -> str:
    """Strip the URL prefix from an OpenAlex work id. Pure function."""
    return (openalex_id or "").rsplit("/", 1)[-1]


# ===========================================================================
# Pure graph construction + centrality
# ===========================================================================
def degree_centrality(nodes: list[str], edges: list[tuple[str, str]]) -> dict[str, float]:
    """Degree centrality on an undirected induced subgraph. Pure function.

 centrality(v) = degree(v) / (N - 1) (the standard normalization). Only edges
 whose BOTH endpoints are in `nodes` count (the induced neighborhood)."""
    nodeset = set(nodes)
    deg: dict[str, int] = {n: 0 for n in nodes}
    seen: set[tuple[str, str]] = set()
    for a, b in edges:
        if a in nodeset and b in nodeset and a != b:
            key = (a, b) if a < b else (b, a)
            if key in seen:
                continue
            seen.add(key)
            deg[a] += 1
            deg[b] += 1
    denom = max(len(nodes) - 1, 1)
    return {n: round(d / denom, 4) for n, d in deg.items()}


def build_neighborhood(
    seed: dict, references: list[dict], citations: list[dict]
) -> dict:
    """Assemble the induced 1-hop citation neighborhood + degree centrality.
 Pure function over already-fetched works.

 seed: normalized seed work, must carry `referenced_ids` (list of OA ids)
 references: normalized works the seed cites (each may carry referenced_ids)
 citations: normalized works that cite the seed (each may carry referenced_ids)
    """
    seed_id = short_id(seed["id"])
    nodes: dict[str, dict] = {seed_id: seed}
    edges: list[tuple[str, str]] = []
    roles: dict[str, str] = {seed_id: "seed"}

    for w in references:
        wid = short_id(w["id"])
        if not wid:
            continue
        nodes.setdefault(wid, w)
        roles.setdefault(wid, "reference")
        edges.append((seed_id, wid))  # seed -> cites -> reference
    for w in citations:
        wid = short_id(w["id"])
        if not wid:
            continue
        nodes.setdefault(wid, w)
        roles.setdefault(wid, "citation")
        edges.append((wid, seed_id))  # citation -> cites -> seed

    # co-citation / shared-reference edges: any neighbor that references the seed
    # OR shares a referenced work with the seed, linked to the seed's references.
    seed_refs = set(seed.get("referenced_ids") or [])
    for w in references + citations:
        wid = short_id(w["id"])
        wrefs = set(w.get("referenced_ids") or [])
        # edge between two neighbors when one cites the other (within the set)
        for other in references + citations:
            oid = short_id(other["id"])
            if wid == oid:
                continue
            if oid in wrefs or ("https://openalex.org/" + oid) in wrefs:
                edges.append((wid, oid))
        # bibliographic coupling with the seed (shared references) -> weak link
        if seed_refs and (wrefs & seed_refs):
            edges.append((seed_id, wid))

    central = degree_centrality(list(nodes), edges)

    node_rows = []
    for nid, w in nodes.items():
        if nid == seed_id:
            continue
        node_rows.append({
            "id": nid,
            "title": w.get("title", ""),
            "year": w.get("publication_year"),
            "venue": w.get("venue", ""),
            "cited_by_count": w.get("cited_by_count", 0),
            "url": w.get("oa_url", ""),
            "role": roles.get(nid, "neighbor"),
            "centrality": central.get(nid, 0.0),
        })
    node_rows.sort(key=lambda r: (r["centrality"], r["cited_by_count"]), reverse=True)

    # dedupe undirected edges for reporting
    seen: set[tuple[str, str]] = set()
    uniq_edges: list[tuple[str, str]] = []
    nodeset = set(nodes)
    for a, b in edges:
        if a in nodeset and b in nodeset and a != b:
            key = (a, b) if a < b else (b, a)
            if key not in seen:
                seen.add(key)
                uniq_edges.append((a, b))

    return {
        "seed_id": seed_id,
        "nodes": node_rows,
        "n_nodes": len(nodes),
        "n_edges": len(uniq_edges),
        "edges": [{"source": a, "target": b} for a, b in uniq_edges],
        "centrality": central,
    }


# ===========================================================================
# Live fetch helpers (thin; cached via tools_rag.cached_get_json)
# ===========================================================================
def _normalize_with_refs(w: dict) -> dict:
    """normalize_work + keep the referenced_works ids (short form). Pure-ish."""
    nw = _rag.normalize_work(w)
    refs = w.get("referenced_works") or []
    nw["referenced_ids"] = [short_id(r) for r in refs]
    return nw


def fetch_work(path: str) -> dict:
    """Fetch one OpenAlex work by /works/<id|doi> path. Raises NetworkUnavailable."""
    body = _rag.cached_get_json(_rag._oa_url(path, {}))
    return _normalize_with_refs(body)


def fetch_works_by_ids(ids: list[str], limit: int) -> list[dict]:
    """Batch-fetch works by OpenAlex ids via a single filter query. Cached."""
    ids = [short_id(i) for i in ids if i][:limit]
    if not ids:
        return []
    url = _rag._oa_url("/works", {"filter": "openalex_id:" + "|".join(ids), "per-page": min(len(ids), 50)})
    body = _rag.cached_get_json(url)
    return [_normalize_with_refs(w) for w in body.get("results", [])]


def fetch_citing_works(seed_id: str, limit: int) -> list[dict]:
    """Fetch works that CITE the seed (cited_by query). Cached."""
    url = _rag._oa_url("/works", {
        "filter": f"cites:{short_id(seed_id)}",
        "sort": "cited_by_count:desc",
        "per-page": min(limit, 50),
    })
    body = _rag.cached_get_json(url)
    return [_normalize_with_refs(w) for w in body.get("results", [])]


# ===========================================================================
# Public runner
# ===========================================================================
def run_citation_graph(payload: dict) -> dict:
    """payload: { paper: str (DOI / OpenAlex ID / title), limit?: int }

 Builds the paper's local citation neighborhood from the live OpenAlex graph
 and surfaces the key related works + which are most central (degree
 centrality on the induced 1-hop subgraph).
    """
    raw = (payload.get("paper") or payload.get("doi") or payload.get("input") or "").strip()
    if len(raw) < 4:
        return {"error": "enter a DOI, an OpenAlex ID (W…), or a paper title"}
    limit = max(3, min(int(payload.get("limit") or 15), 40))

    path, kind = parse_paper_id(raw)
    degraded = False
    seed: Optional[dict] = None
    try:
        if path is not None:
            seed = fetch_work(path)
        else:
            hits = _rag.search_works(_rag.search_query(raw), per_page=1, sort="relevance_score:desc")
            if not hits:
                hits = _rag.search_works(raw, per_page=1)
            if hits:
                # the search result lacks referenced_works; refetch the full work
                seed = fetch_work(f"/works/{short_id(hits[0]['id'])}")
    except _rag.NetworkUnavailable:
        degraded = True

    if seed is None:
        return {
            "input": raw,
            "resolved_as": kind,
            "degraded": degraded,
            "message": (
                "Could not resolve the paper on OpenAlex"
                + (" (the API was unreachable)." if degraded else ".")
            ),
            "nodes": [],
            "edges": [],
        }

    seed_id = short_id(seed["id"])

    # fetch references (what the seed cites) + citations (what cites the seed)
    references: list[dict] = []
    citations: list[dict] = []
    try:
        references = fetch_works_by_ids(seed.get("referenced_ids") or [], limit)
    except _rag.NetworkUnavailable:
        degraded = True
    try:
        citations = fetch_citing_works(seed_id, limit)
    except _rag.NetworkUnavailable:
        degraded = True

    graph = build_neighborhood(seed, references, citations)
    key_related = graph["nodes"][:limit]

    return {
        "method": "live OpenAlex citation graph + degree centrality on the induced 1-hop neighborhood",
        "input": raw,
        "resolved_as": kind,
        "degraded": degraded,
        "seed": {
            "id": seed_id,
            "title": seed.get("title", ""),
            "year": seed.get("publication_year"),
            "venue": seed.get("venue", ""),
            "cited_by_count": seed.get("cited_by_count", 0),
            "url": seed.get("oa_url", ""),
            "n_references": len(seed.get("referenced_ids") or []),
        },
        "neighborhood": {
            "n_nodes": graph["n_nodes"],
            "n_edges": graph["n_edges"],
            "n_references_fetched": len(references),
            "n_citations_fetched": len(citations),
        },
        "key_related_works": key_related,
        "most_central": key_related[:5],
        "edges": graph["edges"][:400],
        "note": (
            "Edges are real OpenAlex citation relationships (references + cited-by + "
            "co-citation within the set). Centrality is degree centrality on the "
            "induced 1-hop neighborhood, the most-connected related works rise to "
            "the top. A full PageRank over a 2-hop neighborhood is a documented "
            "heavier path."
        ),
    }


# Registry the gateway imports.
CITATION_RUNNERS = {
    "citationgraph": run_citation_graph,
}
