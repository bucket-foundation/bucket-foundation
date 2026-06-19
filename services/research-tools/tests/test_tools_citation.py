"""No-network unit tests for CitationGraph (tools_citation).

Verifies the ACTUAL graph construction + centrality:
  * DOI / OpenAlex-ID / title inputs are classified correctly;
  * the induced 1-hop neighborhood is built from references + citing works;
  * degree centrality ranks the most-connected related work first;
  * the full runner resolves a seed and returns the contract shape, offline.

The OpenAlex client (tools_rag.*) is monkeypatched to fixtures and TOOLS_OFFLINE
is set, so a real network call would raise — these run offline.

Run:  cd services/research-tools && python3 -m pytest tests/test_tools_citation.py -q
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["TOOLS_OFFLINE"] = "1"

import pytest  # noqa: E402

import tools_rag as _rag  # noqa: E402
import tools_citation as cg  # noqa: E402
from fixtures import CITING_WORKS, REFERENCES_WORKS, SEED_WORK  # noqa: E402


# =========================================================================
# Pure ID handling
# =========================================================================
def test_parse_paper_id_classifies():
    p1, k1 = cg.parse_paper_id("https://openalex.org/W2755950973")
    assert k1 == "openalex" and "W2755950973" in (p1 or "")
    p2, k2 = cg.parse_paper_id("https://doi.org/10.1038/nature12373")
    assert k2 == "doi" and "10.1038/nature12373" in (p2 or "")
    p3, k3 = cg.parse_paper_id("protein folding kinetics review")
    assert k3 == "title" and p3 is None


def test_short_id():
    assert cg.short_id("https://openalex.org/W123") == "W123"
    assert cg.short_id("W456") == "W456"


# =========================================================================
# Pure graph + centrality
# =========================================================================
def test_degree_centrality_ranks_hub():
    nodes = ["A", "B", "C", "D"]
    edges = [("A", "B"), ("A", "C"), ("A", "D")]  # A is the hub
    cent = cg.degree_centrality(nodes, edges)
    assert cent["A"] == 1.0  # degree 3 / (4-1)
    assert cent["B"] < cent["A"]


def test_degree_centrality_ignores_external_edges():
    cent = cg.degree_centrality(["A", "B"], [("A", "X"), ("A", "B")])
    # only the A-B edge counts (X is not a node)
    assert cent["A"] == 1.0 and cent["B"] == 1.0


def test_build_neighborhood_induces_edges_and_centrality():
    g = cg.build_neighborhood(SEED_WORK, REFERENCES_WORKS, CITING_WORKS)
    assert g["seed_id"] == "W100"
    # seed has 3 refs + 1 citer = 4 neighbors
    assert g["n_nodes"] == 5  # seed + 4
    # there are seed->ref, citer->seed, AND neighbor-neighbor edges (W10-W11, W200-W10)
    assert g["n_edges"] >= 4
    # W10 is connected to seed, to W11 (it references it), and to W200 (cites it):
    # it should be among the most central neighbors.
    top_ids = [n["id"] for n in g["nodes"]]
    assert "W10" in top_ids
    assert g["nodes"][0]["centrality"] >= g["nodes"][-1]["centrality"]


# =========================================================================
# Full runner against fixtures (no network)
# =========================================================================
def _patch(monkeypatch):
    monkeypatch.setattr(cg, "fetch_work", lambda path: dict(SEED_WORK))
    monkeypatch.setattr(cg, "fetch_works_by_ids", lambda ids, limit: list(REFERENCES_WORKS))
    monkeypatch.setattr(cg, "fetch_citing_works", lambda sid, limit: list(CITING_WORKS))


def test_run_citation_graph_builds_neighborhood(monkeypatch):
    _patch(monkeypatch)
    out = cg.run_citation_graph({"paper": "https://openalex.org/W100"})
    assert out.get("error") is None
    assert out["resolved_as"] == "openalex"
    assert out["seed"]["id"] == "W100"
    assert out["neighborhood"]["n_references_fetched"] == 3
    assert out["neighborhood"]["n_citations_fetched"] == 1
    assert out["key_related_works"], "should surface related works"
    assert out["most_central"], "should surface the most-central works"
    # the most-central node has the highest centrality in the list
    cents = [n["centrality"] for n in out["key_related_works"]]
    assert cents == sorted(cents, reverse=True)


def test_run_citation_graph_title_resolution(monkeypatch):
    # title path: search_works resolves to the seed id, then fetch_work loads it
    monkeypatch.setattr(_rag, "search_works", lambda *a, **k: [{"id": "https://openalex.org/W100"}])
    monkeypatch.setattr(cg, "fetch_work", lambda path: dict(SEED_WORK))
    monkeypatch.setattr(cg, "fetch_works_by_ids", lambda ids, limit: list(REFERENCES_WORKS))
    monkeypatch.setattr(cg, "fetch_citing_works", lambda sid, limit: list(CITING_WORKS))
    out = cg.run_citation_graph({"paper": "a landmark paper on protein folding kinetics"})
    assert out.get("error") is None
    assert out["resolved_as"] == "title"
    assert out["seed"]["id"] == "W100"


def test_run_citation_graph_validation():
    assert cg.run_citation_graph({"paper": "x"}).get("error")
    assert cg.run_citation_graph({}).get("error")


def test_run_citation_graph_unresolved(monkeypatch):
    def boom(*a, **k):
        raise _rag.NetworkUnavailable("offline")

    monkeypatch.setattr(cg, "fetch_work", boom)
    out = cg.run_citation_graph({"paper": "https://openalex.org/W999999"})
    assert out.get("error") is None
    assert out["degraded"] is True
    assert out["nodes"] == []


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
