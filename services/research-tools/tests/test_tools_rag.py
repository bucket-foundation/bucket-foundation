"""No-network unit tests for the T1 research tools (services/research-tools).

Two layers:
  1. Pure functions (ranking, scoring, matching, stance) — deterministic, no IO.
  2. Full run_<tool>() — monkeypatch the OpenAlex/grant data sources to fixtures,
     set TOOLS_OFFLINE so a real network call would raise, and assert the
     contract output shape + the real logic decisions.

Run:  cd services/research-tools && python3 -m pytest tests -q
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# make tools_rag importable + force offline (any accidental fetch raises)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ["TOOLS_OFFLINE"] = "1"

import pytest  # noqa: E402

import tools_rag as t  # noqa: E402
from fixtures import (  # noqa: E402
    CLAIM,
    NSF_AWARDS,
    QBIO_CLAIM,
    QBIO_FRINGE_CLAIM,
    WORKS_CLAIM,
    WORKS_PROTEIN_DYNAMICS,
    WORKS_QBIO,
    WORKS_QBIO_FRINGE,
)


# =========================================================================
# Layer 1 — pure functions
# =========================================================================
def test_reconstruct_abstract():
    inv = {"protein": [0, 3], "folds": [1], "fast": [2]}
    assert t.reconstruct_abstract(inv) == "protein folds fast protein"


def test_reconstruct_abstract_empty():
    assert t.reconstruct_abstract(None) == ""


def test_tokenize_drops_stopwords():
    toks = t.tokenize("The protein and the enzyme were studied with data")
    assert "protein" in toks and "enzyme" in toks
    assert "the" not in toks and "and" not in toks


def test_jaccard():
    assert t.jaccard({"a", "b"}, {"a", "b"}) == 1.0
    assert t.jaccard({"a"}, {"b"}) == 0.0
    assert t.jaccard(set(), {"a"}) == 0.0


def test_search_query_strips_punctuation_and_interrogatives():
    q = t.search_query("How do I predict which mutations destabilize my enzyme?")
    assert "?" not in q
    assert "how" not in q.split() and "predict" not in q.split()
    assert "mutations" in q and "enzyme" in q


def test_score_paper_radar_recency_and_velocity():
    interests = t.keyword_set("protein folding dynamics markov")
    recent = t.score_paper_radar(WORKS_PROTEIN_DYNAMICS[0], interests, 2026)
    old = t.score_paper_radar(WORKS_PROTEIN_DYNAMICS[1], interests, 2026)
    # the recent on-topic paper should score its recency higher than the 2019 one
    assert recent["recency"] > old["recency"]
    # both relevant papers beat the unrelated soil paper
    soil = t.score_paper_radar(WORKS_PROTEIN_DYNAMICS[2], interests, 2026)
    assert recent["score"] > soil["score"]


def test_match_our_tools_picks_right_tool():
    res = t.match_our_tools("predict which mutations destabilize my enzyme")
    assert res and res[0]["slug"] == "stabilitydesigner"
    res2 = t.match_our_tools("detect synaptic currents in patch-clamp recordings")
    assert res2 and res2[0]["slug"] == "patchseqml"
    res3 = t.match_our_tools("find metastable states in my MD trajectory")
    assert res3 and res3[0]["slug"] == "trajmine"


def test_match_our_tools_handles_hyphen_and_plural():
    # "patch-clamp" must match the patch/clamp signals; "currents" -> current
    res = t.match_our_tools("synaptic currents in patch-clamp")
    slugs = [r["slug"] for r in res]
    assert "patchseqml" in slugs


def test_rank_grants_relevance_and_filtering():
    grants = [t._grant_record(a) for a in NSF_AWARDS]
    ranked = t.rank_grants("biomolecular condensates phase separation", grants)
    # the two condensate grants rank; the quantum-dot grant is filtered (rel 0)
    titles = [g["title"] for g in ranked]
    assert any("condensate" in x.lower() for x in titles)
    assert all("quantum dots" not in x.lower() for x in titles)
    # ranking is by relevance descending
    rels = [g["relevance"] for g in ranked]
    assert rels == sorted(rels, reverse=True)


def test_draft_specific_aims_are_grounded():
    grants = t.rank_grants(
        "biomolecular condensates phase separation",
        [t._grant_record(a) for a in NSF_AWARDS],
    )
    aims = t.draft_specific_aims("biomolecular condensates phase separation", grants)
    assert len(aims) >= 1
    assert aims[0]["grounded_in"] is not None
    assert "condensate" in aims[0]["grounded_in"]["title"].lower()


def test_claim_polarity():
    assert t._claim_polarity("cold exposure increases uncoupling") > 0
    assert t._claim_polarity("drug does not reduce tumor growth") < 0


def test_stance_supports_and_contradicts():
    terms = t.keyword_set(CLAIM)
    pol = t._claim_polarity(CLAIM)
    pos = t.stance_for_paper(CLAIM, terms, pol, WORKS_CLAIM[0])
    neg = t.stance_for_paper(CLAIM, terms, pol, WORKS_CLAIM[1])
    off = t.stance_for_paper(CLAIM, terms, pol, WORKS_CLAIM[2])
    assert pos["stance"] == "supports"
    assert neg["stance"] == "contradicts"
    assert off["stance"] == "off-topic"
    # the supporting paper quotes a real sentence from its abstract
    assert "uncoupling" in pos["evidence"].lower()


# =========================================================================
# Layer 2 — full run_<tool>() against fixtures (no network)
# =========================================================================
def test_run_paper_radar(monkeypatch):
    monkeypatch.setattr(t, "search_works", lambda *a, **k: list(WORKS_PROTEIN_DYNAMICS))
    out = t.run_paper_radar({"interests": "protein folding, markov dynamics", "limit": 5})
    assert "feed" in out and len(out["feed"]) >= 2
    # top item is on-topic, carries a why_it_matters blurb + all contract fields
    top = out["feed"][0]
    for k in ("title", "score", "relevance", "recency", "citation_velocity", "why_it_matters", "url"):
        assert k in top
    # the unrelated soil paper should NOT outrank the protein papers
    assert "soil" not in out["feed"][0]["title"].lower()


def test_run_paper_radar_validation():
    assert t.run_paper_radar({"interests": "x"}).get("error")


def test_run_grant_draft(monkeypatch):
    monkeypatch.setattr(t, "_iter_atlas_nsf_awards", lambda: list(NSF_AWARDS))
    out = t.run_grant_draft({"topic": "biomolecular condensates phase separation"})
    assert out["source"] == "research-atlas/nsf"
    assert out["matched_grants"], "should match real awarded grants"
    assert out["specific_aims"][0]["grounded_in"] is not None
    assert out["top_funders"]
    # the quantum-dot grant is irrelevant and must not appear
    assert all("quantum" not in g["title"].lower() for g in out["matched_grants"])


def test_run_grant_draft_validation():
    assert t.run_grant_draft({"topic": "x"}).get("error")


def test_run_methods_matcher(monkeypatch):
    monkeypatch.setattr(t, "search_works", lambda *a, **k: list(WORKS_PROTEIN_DYNAMICS))
    out = t.run_methods_matcher({"question": "find metastable states in my MD trajectory"})
    assert out["our_tools"] and out["our_tools"][0]["slug"] == "trajmine"
    # methods are mined from the (fixture) literature concepts
    methods = [m["method"] for m in out["recommended_methods"]]
    assert any("Markov" in m or "Molecular dynamics" in m for m in methods)
    assert out["exemplar_papers"]


def test_run_methods_matcher_validation():
    assert t.run_methods_matcher({"question": "short"}).get("error")


def test_run_review_guard(monkeypatch):
    monkeypatch.setattr(t, "search_works", lambda *a, **k: list(WORKS_CLAIM))
    out = t.run_review_guard({"claim": CLAIM})
    assert out["counts"]["supports"] >= 1
    assert out["counts"]["contradicts"] >= 1
    assert out["verdict"].startswith("CONTESTED")
    # off-topic paper is excluded from all stance buckets
    all_titles = [
        r["title"] for r in out["supporting"] + out["contradicting"] + out["neutral"]
    ]
    assert all("photosynthesis" not in x.lower() for x in all_titles)


def test_run_review_guard_validation():
    assert t.run_review_guard({"claim": "short"}).get("error")


# =========================================================================
# QuantumBioRAG — claim-strength RAG (evidence-weighted stance + consensus)
# =========================================================================
def test_evidence_strength_rewards_cited_ontopic_recent():
    terms = t.keyword_set(QBIO_CLAIM)
    strong = t.evidence_strength(WORKS_QBIO[0], terms, 2026)  # 320 cites, on-topic, 2024
    weak = t.evidence_strength(WORKS_QBIO[2], terms, 2026)    # 4 cites, off-topic, 2022
    assert strong > weak
    assert 0.0 <= strong <= 1.0


def test_run_quantum_bio_rag_well_supported_outscores_fringe(monkeypatch):
    # a well-supported claim: strong supporting paper (320 cites) + weaker contra
    monkeypatch.setattr(t, "search_works", lambda *a, **k: list(WORKS_QBIO))
    good = t.run_quantum_bio_rag({"claim": QBIO_CLAIM})
    assert good.get("error") is None
    assert good["in_quantum_biology_scope"] is True
    assert good["counts"]["supports"] >= 1
    # the heavily-cited supporting paper dominates the weighted support score
    assert good["support_score"] > 0.5

    # a fringe claim: only a contradicting paper in the set -> poorly supported
    monkeypatch.setattr(t, "search_works", lambda *a, **k: list(WORKS_QBIO_FRINGE))
    fringe = t.run_quantum_bio_rag({"claim": QBIO_FRINGE_CLAIM})
    assert fringe["support_score"] < good["support_score"], (
        "a fringe/contradicted claim must score lower than a well-supported one"
    )
    assert fringe["support_strength"] in ("weak", "contested")


def test_run_quantum_bio_rag_validation():
    assert t.run_quantum_bio_rag({"claim": "short"}).get("error")


def test_offline_degraded_paths(monkeypatch):
    # With TOOLS_OFFLINE=1 and a cache miss, search_works raises NetworkUnavailable;
    # the run_* functions must degrade gracefully (no exception, degraded flag).
    def boom(*a, **k):
        raise t.NetworkUnavailable("offline")

    monkeypatch.setattr(t, "search_works", boom)
    monkeypatch.setattr(t, "_iter_atlas_nsf_awards", lambda: [])
    pr = t.run_paper_radar({"interests": "anything topical"})
    assert pr.get("degraded") is True
    gd = t.run_grant_draft({"topic": "anything topical here"})
    assert gd.get("degraded") is True
    mm = t.run_methods_matcher({"question": "a real question about something"})
    assert mm.get("degraded") is True
    rg = t.run_review_guard({"claim": "a real claim about something measurable"})
    assert rg.get("degraded") is True
    qb = t.run_quantum_bio_rag({"claim": "quantum coherence in some biological process"})
    assert qb.get("degraded") is True


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
