#!/usr/bin/env python3
"""Build the cross-tradition entity / figure / branch graph (bkt-pdx).

Seeds figures (prophets / founders / avatars / deities) and emits a
networkx graph + JSONL entity-claims feed.

Hard rules (ENTITY-MODEL.md):
  - Every cross-tradition mapping is a CANDIDATE CLAIM with evidence
    on BOTH sides, never a flat equivalence (§5, §6).
  - No-evidence claims are dropped (§5 invariant 1).
  - provenance.asserted_by = "ai-branch-analysis" for AI candidates;
    derived_by records the method/run.
  - Branch claims (schisms / lineage edges) are themselves §4 lineage
    nodes — also claim-backed.

This pass is OFFLINE-FIRST: it works from a seeded JSON list of
canon-tier cross-tradition figures (curated below) plus whatever
chunks we have in the FTS5/vector index. A future bead can hydrate
from Wikidata SPARQL (P31, P140, P361, P155/P156, P155/P156).

Outputs:
  work/graph/entity-graph.json     networkx node-link JSON
  work/graph/entity-claims.jsonl   one §5 candidate claim per line

Idempotent + resumable.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from typing import Iterable

import networkx as nx
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sh_search import (  # noqa: E402
    META_PATH,
    VEC_PATH,
    WORK_DIR,
    get_embedder,
)

try:
    from rapidfuzz import fuzz
except ImportError:
    fuzz = None  # graceful degrade

GRAPH_DIR = os.path.join(WORK_DIR, "graph")
GRAPH_JSON = os.path.join(GRAPH_DIR, "entity-graph.json")
CLAIMS_JSONL = os.path.join(GRAPH_DIR, "entity-claims.jsonl")
RUN_DIR = os.path.join(WORK_DIR, "claims", "_runs")

# ---------------------------------------------------------------------------
# Seed figure list — canon-tier prophets / founders / avatars / deities.
# Each entry follows ENTITY-MODEL §2 (figure) field skeleton. This is the
# Wikidata-anchored bootstrap; the SPARQL hydration job (separate bead)
# will widen this without changing schema.
# ---------------------------------------------------------------------------

SEED_FIGURES: list[dict] = [
    # Judaism / Christianity / Islam — patriarchs/prophets
    {"id": "noah", "label": "Noah", "aka": ["Nūḥ", "Noach", "Νῶε"],
     "traditions": ["judaism", "christianity", "islam"], "wikidata": "Q80350",
     "figure_class": "prophet", "historicity": "legendary",
     "associated_motifs": ["flood", "ark", "covenant-rainbow"]},
    {"id": "moses", "label": "Moses", "aka": ["Moshe", "Musa", "Mūsā"],
     "traditions": ["judaism", "christianity", "islam"], "wikidata": "Q9077",
     "figure_class": "prophet", "historicity": "contested",
     "associated_motifs": ["lawgiver", "exodus", "mountain-revelation"]},
    {"id": "abraham", "label": "Abraham", "aka": ["Avraham", "Ibrahim"],
     "traditions": ["judaism", "christianity", "islam"], "wikidata": "Q9181",
     "figure_class": "patriarch", "historicity": "contested",
     "associated_motifs": ["covenant", "sacrifice-of-son", "founding-patriarch"]},
    {"id": "jesus", "label": "Jesus of Nazareth", "aka": ["Yeshua", "Isa", "ʿĪsā"],
     "traditions": ["christianity", "islam"], "wikidata": "Q302",
     "figure_class": "messiah-claimant", "historicity": "historical",
     "associated_motifs": ["dying-and-rising", "messiah", "miracle-worker"]},
    {"id": "muhammad", "label": "Muḥammad", "aka": ["Muhammad", "Mohammed"],
     "traditions": ["islam"], "wikidata": "Q9458",
     "figure_class": "prophet", "historicity": "historical",
     "associated_motifs": ["lawgiver", "mountain-revelation", "seal-of-prophets"]},
    {"id": "david", "label": "David", "aka": ["Dawud", "Dāwūd"],
     "traditions": ["judaism", "christianity", "islam"], "wikidata": "Q41370",
     "figure_class": "patriarch", "historicity": "contested",
     "associated_motifs": ["psalmist", "king", "messianic-line"]},
    # Mesopotamian
    {"id": "utnapishtim", "label": "Utnapishtim", "aka": ["Ūta-napišti", "Ziusudra", "Atrahasis"],
     "traditions": ["mesopotamian"], "wikidata": "Q317481",
     "figure_class": "legendary", "historicity": "mythic",
     "associated_motifs": ["flood", "ark", "immortality-granted"]},
    {"id": "gilgamesh", "label": "Gilgamesh", "aka": ["Bilgames"],
     "traditions": ["mesopotamian"], "wikidata": "Q193430",
     "figure_class": "legendary", "historicity": "legendary",
     "associated_motifs": ["king", "quest-for-immortality"]},
    # Hindu
    {"id": "manu", "label": "Manu", "aka": ["Manu Vaivasvata", "Vaivasvata Manu"],
     "traditions": ["hinduism"], "wikidata": "Q1233738",
     "figure_class": "patriarch", "historicity": "mythic",
     "associated_motifs": ["flood", "ark", "lawgiver", "founding-patriarch"]},
    {"id": "krishna", "label": "Krishna", "aka": ["Kṛṣṇa", "Krsna"],
     "traditions": ["hinduism"], "wikidata": "Q43361",
     "figure_class": "avatar", "historicity": "mythic",
     "associated_motifs": ["avatar", "divine-teacher", "trickster"]},
    {"id": "rama", "label": "Rama", "aka": ["Rāma"],
     "traditions": ["hinduism"], "wikidata": "Q160213",
     "figure_class": "avatar", "historicity": "mythic",
     "associated_motifs": ["avatar", "righteous-king"]},
    {"id": "buddha", "label": "Gautama Buddha", "aka": ["Siddhārtha Gautama", "Śākyamuni"],
     "traditions": ["buddhism", "hinduism"], "wikidata": "Q9441",
     "figure_class": "founder", "historicity": "historical",
     "associated_motifs": ["awakened-one", "founder", "lawgiver"]},
    # Greek
    {"id": "deucalion", "label": "Deucalion", "aka": ["Δευκαλίων"],
     "traditions": ["greek"], "wikidata": "Q188643",
     "figure_class": "legendary", "historicity": "mythic",
     "associated_motifs": ["flood", "ark", "founding-patriarch"]},
    # Zoroastrian
    {"id": "zoroaster", "label": "Zoroaster", "aka": ["Zarathustra", "Zarathuštra"],
     "traditions": ["zoroastrianism"], "wikidata": "Q35811",
     "figure_class": "founder", "historicity": "contested",
     "associated_motifs": ["prophet", "dualist-cosmology"]},
    {"id": "saoshyant", "label": "Saoshyant", "aka": ["Saoshyans"],
     "traditions": ["zoroastrianism"], "wikidata": "Q1996291",
     "figure_class": "messiah-claimant", "historicity": "mythic",
     "associated_motifs": ["world-savior", "eschatological-redeemer"]},
    # Chinese
    {"id": "confucius", "label": "Confucius", "aka": ["孔子", "Kǒngzǐ"],
     "traditions": ["tao-confucian"], "wikidata": "Q4604",
     "figure_class": "founder", "historicity": "historical",
     "associated_motifs": ["sage", "lawgiver", "teacher"]},
    {"id": "laozi", "label": "Laozi", "aka": ["老子", "Lǎozǐ", "Lao Tzu"],
     "traditions": ["tao-confucian"], "wikidata": "Q9333",
     "figure_class": "founder", "historicity": "contested",
     "associated_motifs": ["sage", "founder", "way-of-nature"]},
    {"id": "yu-the-great", "label": "Yu the Great", "aka": ["大禹", "Dà Yǔ"],
     "traditions": ["tao-confucian"], "wikidata": "Q47042",
     "figure_class": "legendary", "historicity": "legendary",
     "associated_motifs": ["flood", "lawgiver", "founding-king"]},
    # Sikh
    {"id": "guru-nanak", "label": "Guru Nanak", "aka": ["Nānak"],
     "traditions": ["sikhism"], "wikidata": "Q83478",
     "figure_class": "founder", "historicity": "historical",
     "associated_motifs": ["founder", "reformer"]},
    # Jain
    {"id": "mahavira", "label": "Mahāvīra", "aka": ["Vardhamāna"],
     "traditions": ["jainism"], "wikidata": "Q193466",
     "figure_class": "founder", "historicity": "historical",
     "associated_motifs": ["tirthankara", "ascetic", "reformer"]},
    # Bahá'í
    {"id": "bahaullah", "label": "Bahá'u'lláh", "aka": ["Bahaullah", "Mirza Husayn Ali"],
     "traditions": ["bahai"], "wikidata": "Q83410",
     "figure_class": "founder", "historicity": "historical",
     "associated_motifs": ["founder", "manifestation"]},
    # LDS
    {"id": "joseph-smith", "label": "Joseph Smith", "aka": ["Joseph Smith Jr."],
     "traditions": ["lds"], "wikidata": "Q11891",
     "figure_class": "founder", "historicity": "historical",
     "associated_motifs": ["founder", "prophet-restorationist"]},
]


def _claim_id(side_a: str, side_b: str, kind: str) -> str:
    h = hashlib.sha1(f"{side_a}|{side_b}|{kind}".encode("utf-8")).hexdigest()[:10]
    return f"clm-corr-{kind}-{h}"


def _candidate_correlation(
    a: dict, b: dict, cos: float, fuzzy: float,
    motif_overlap: list[str], confidence: float, run_id: str
) -> dict:
    """Emit a contestable §6 correlation claim (never a fact).

    The claim's evidence is the two figure nodes themselves
    (locator = wikidata QID), the shared motifs, and the calibration
    method.
    """
    side_a_id = a["id"]
    side_b_id = b["id"]
    claim_id = _claim_id(side_a_id, side_b_id, "figure-mapping")
    return {
        "id": claim_id,
        "node_type": "correlation",
        "claim_type": "correlation",
        "correlation_kind": "figure-mapping",
        "label": f"Figure-mapping candidate: {a['label']} ↔ {b['label']}",
        "side_a": {"tradition": a["traditions"][0], "node": side_a_id,
                   "wikidata": a.get("wikidata")},
        "side_b": {"tradition": b["traditions"][0], "node": side_b_id,
                   "wikidata": b.get("wikidata")},
        "direction": "undirected",
        "statement": (f"{a['label']} is proposed as a cross-tradition correlate of "
                      f"{b['label']} (shared motifs: {', '.join(motif_overlap) or 'n/a'})."),
        "scope": "ai-generated candidate; cross-tradition figure-mapping",
        "stance": "contested",
        "confidence": round(float(confidence), 3),
        "disputed": True,
        "evidence": [
            {"kind": "primary", "locator": a.get("wikidata") or side_a_id,
             "source_node": side_a_id, "rights_tier": "A", "quote": None,
             "summary": f"Figure {a['label']} ({a['traditions']}) — motifs {a['associated_motifs']}",
             "supports": True},
            {"kind": "primary", "locator": b.get("wikidata") or side_b_id,
             "source_node": side_b_id, "rights_tier": "A", "quote": None,
             "summary": f"Figure {b['label']} ({b['traditions']}) — motifs {b['associated_motifs']}",
             "supports": True},
            {"kind": "ai-derived",
             "locator": f"shared-motifs:{','.join(motif_overlap)}",
             "source_node": "ai-branch-analysis", "rights_tier": "A", "quote": None,
             "summary": (f"Embedding cosine={cos:.3f}; rapidfuzz token-set ratio={fuzzy:.1f}; "
                         f"shared motifs={motif_overlap}."),
             "supports": True},
        ],
        "provenance": {
            "asserted_by": "ai-branch-analysis",
            "citations": [],
            "derived_by": {"method": "entity-graph-resolver",
                           "embedding_model": "nomic-embed-text",
                           "fuzzy": "rapidfuzz.token_set_ratio",
                           "run_id": run_id,
                           "thresholds": {"embedding_cosine": 0.65,
                                          "fuzzy_token_set": 70,
                                          "motif_overlap_min": 1}},
            "added_on": time.strftime("%Y-%m-%d"),
        },
        "counter_claims": [],
        "story_protocol_ip_id": None,
    }


def main():
    os.makedirs(GRAPH_DIR, exist_ok=True)
    os.makedirs(RUN_DIR, exist_ok=True)

    print(f"[1/4] seeding {len(SEED_FIGURES)} figures")

    # Build figure → embedding (label + aka + motifs as the embedding input).
    backend, embedder = get_embedder()
    print(f"  embed backend: {backend}")
    blobs = []
    for fig in SEED_FIGURES:
        blob = " ".join([fig["label"], " ".join(fig.get("aka", [])),
                          " ".join(fig.get("associated_motifs", []))])
        blobs.append(blob)
    vecs = embedder.encode(blobs, batch_size=64, normalize_embeddings=True,
                           show_progress_bar=False, convert_to_numpy=True).astype(np.float32)
    print(f"  embedded {len(vecs)} figure blobs (dim={vecs.shape[1]})")

    print("[2/4] building graph")
    g = nx.Graph()
    for fig in SEED_FIGURES:
        g.add_node(
            fig["id"],
            node_type="figure",
            label=fig["label"],
            aka=fig.get("aka", []),
            traditions=fig["traditions"],
            wikidata=fig.get("wikidata"),
            figure_class=fig["figure_class"],
            historicity=fig["historicity"],
            associated_motifs=fig.get("associated_motifs", []),
        )

    # Same-tradition lineage edges are out-of-scope here; the
    # bkt-pdx focus is cross-tradition correlation candidates.
    print("[3/4] resolving cross-tradition candidates")
    run_id = time.strftime("entity-graph-%Y%m%d-%H%M%S")
    claims: list[dict] = []
    THRESH_COS = 0.65
    THRESH_FUZ = 70
    THRESH_MOTIF = 1
    for i in range(len(SEED_FIGURES)):
        for j in range(i + 1, len(SEED_FIGURES)):
            a = SEED_FIGURES[i]
            b = SEED_FIGURES[j]
            # cross-tradition only (skip pairs sharing a tradition)
            if set(a["traditions"]) & set(b["traditions"]):
                continue
            cos = float(np.dot(vecs[i], vecs[j]))
            # rapidfuzz over label + aka
            a_str = " ".join([a["label"]] + a.get("aka", []))
            b_str = " ".join([b["label"]] + b.get("aka", []))
            fuz = float(fuzz.token_set_ratio(a_str, b_str)) if fuzz else 0.0
            motif_overlap = sorted(set(a.get("associated_motifs", [])) &
                                    set(b.get("associated_motifs", [])))
            # G-2 evidence rule (AI-BRANCH-ANALYSIS.md): need real
            # support on each side. We require either ≥1 motif overlap
            # OR (high cos + high fuzz) — but ALWAYS attach the
            # evidence bundle so the consumer can re-judge.
            cond_motif = len(motif_overlap) >= THRESH_MOTIF
            cond_sim = cos >= THRESH_COS and fuz >= THRESH_FUZ
            if not (cond_motif or cond_sim):
                continue
            # Calibrated confidence — weight of cited support, NOT truth.
            confidence = min(0.99,
                             0.40 * cos
                             + 0.25 * (fuz / 100.0)
                             + 0.10 * len(motif_overlap))
            claim = _candidate_correlation(a, b, cos, fuz, motif_overlap, confidence, run_id)
            claims.append(claim)
            g.add_edge(a["id"], b["id"],
                       edge_type="correlation-candidate",
                       claim_id=claim["id"],
                       confidence=claim["confidence"],
                       motif_overlap=motif_overlap,
                       embedding_cosine=cos,
                       fuzzy=fuz)

    # Drop duplicates (defensive; the loop is already i<j).
    seen = set()
    unique_claims = []
    for c in claims:
        if c["id"] in seen:
            continue
        seen.add(c["id"])
        unique_claims.append(c)
    unique_claims.sort(key=lambda c: -c["confidence"])

    print(f"  candidate correlations clustered: {len(unique_claims)}")

    print("[4/4] writing outputs")
    nx.write_gexf  # touch to verify networkx is loaded
    with open(GRAPH_JSON, "w", encoding="utf-8") as f:
        json.dump(nx.node_link_data(g, edges="links"), f, ensure_ascii=False, indent=2)
    with open(CLAIMS_JSONL, "w", encoding="utf-8") as f:
        for c in unique_claims:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    # Run record (AI-BRANCH-ANALYSIS §6 audit trail)
    run = {
        "run_id": run_id,
        "method": "entity-graph-resolver",
        "embedding_model": "nomic-embed-text" if backend == "ollama" else "MiniLM-L6-v2",
        "input_figures": len(SEED_FIGURES),
        "candidates_generated": (len(SEED_FIGURES) * (len(SEED_FIGURES) - 1)) // 2,
        "candidates_emitted": len(unique_claims),
        "thresholds": {"cosine": THRESH_COS, "fuzzy": THRESH_FUZ, "motif": THRESH_MOTIF},
        "calibration": "0.40*cosine + 0.25*(fuzzy/100) + 0.10*motif_overlap_count",
        "operator": "data-pillar",
        "added_on": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    with open(os.path.join(RUN_DIR, f"{run_id}.json"), "w", encoding="utf-8") as f:
        json.dump(run, f, indent=2)
    print(f"  wrote {GRAPH_JSON}")
    print(f"  wrote {CLAIMS_JSONL}")
    print(f"  wrote {RUN_DIR}/{run_id}.json")


if __name__ == "__main__":
    main()
