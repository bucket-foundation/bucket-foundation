#!/usr/bin/env python3
from __future__ import annotations

import re
from typing import Any, Optional

import tools_rag as _rag

_DOI_RE = re.compile(r"10\.\d{4,9}/\S+")
_OAID_RE = re.compile(r"\bW\d{3,}\b", re.I)

def parse_paper_id(s: str) -> tuple[Optional[str], str]:
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
    return (openalex_id or "").rsplit("/", 1)[-1]

def degree_centrality(nodes: list[str], edges: list[tuple[str, str]]) -> dict[str, float]:
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
        edges.append((seed_id, wid))
    for w in citations:
        wid = short_id(w["id"])
        if not wid:
            continue
        nodes.setdefault(wid, w)
        roles.setdefault(wid, "citation")
        edges.append((wid, seed_id))

    seed_refs = set(seed.get("referenced_ids") or [])
    for w in references + citations:
        wid = short_id(w["id"])
        wrefs = set(w.get("referenced_ids") or [])
        for other in references + citations:
            oid = short_id(other["id"])
            if wid == oid:
                continue
            if oid in wrefs or ("https://openalex.org/" + oid) in wrefs:
                edges.append((wid, oid))
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

def _normalize_with_refs(w: dict) -> dict:
    nw = _rag.normalize_work(w)
    refs = w.get("referenced_works") or []
    nw["referenced_ids"] = [short_id(r) for r in refs]
    return nw

def fetch_work(path: str) -> dict:
    body = _rag.cached_get_json(_rag._oa_url(path, {}))
    return _normalize_with_refs(body)

def fetch_works_by_ids(ids: list[str], limit: int) -> list[dict]:
    ids = [short_id(i) for i in ids if i][:limit]
    if not ids:
        return []
    url = _rag._oa_url("/works", {"filter": "openalex_id:" + "|".join(ids), "per-page": min(len(ids), 50)})
    body = _rag.cached_get_json(url)
    return [_normalize_with_refs(w) for w in body.get("results", [])]

def fetch_citing_works(seed_id: str, limit: int) -> list[dict]:
    url = _rag._oa_url("/works", {
        "filter": f"cites:{short_id(seed_id)}",
        "sort": "cited_by_count:desc",
        "per-page": min(limit, 50),
    })
    body = _rag.cached_get_json(url)
    return [_normalize_with_refs(w) for w in body.get("results", [])]

def run_citation_graph(payload: dict) -> dict:
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

CITATION_RUNNERS = {
    "citationgraph": run_citation_graph,
}
