#!/usr/bin/env python3
"""Sacred-History AI branch-analysis engine (bkt-fvg).

Per AI-BRANCH-ANALYSIS.md (DRAFT, founder-requested feature):
proposes cross-tradition correlations as CONTESTABLE CLAIMS with
evidence and provenance — NEVER as facts.

Pipeline (§5 of the spec):

  corpus + graph
    ├─ candidate generation (HDBSCAN/Agglomerative cluster on embeddings)
    │   to surface motif/figure parallels
    ├─ evidence binding (each side → real corpus node + locator [G-2])
    ├─ rights gate (Tier B → locator-only [G-6])
    ├─ counter-claim search (link existing opposing claims [G-5])
    ├─ confidence calibration (documented method [G-4])
    └─ provenance stamp (model/run/prompt hash [G-3])
        → emit correlation claim → work/claims/ (NEVER fact [G-1])

LLM is constrained by prompt template:
  - forbidden words: "is", "are", "fact", "proven"
  - required phrasing: "is proposed", "is correlated with", "is hypothesized"
  - required fields: claim_text, evidence ≥1, counter_claims (list, may be empty), confidence
  - Output schema validator drops claims missing evidence or counter-considerations.

LLM cascade:
  1. llama3.2:3b — fast pass for candidate drafting
  2. qwen3.5     — escalation for top-confidence claims (optional)

Local-only — zero network AI calls.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

import numpy as np
import networkx as nx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sh_search import (  # noqa: E402
    META_PATH,
    VEC_PATH,
    WORK_DIR,
    OLLAMA_URL,
)

CLAIMS_DIR = os.path.join(WORK_DIR, "claims")
CLAIMS_JSONL = os.path.join(CLAIMS_DIR, "claims.jsonl")
RUN_DIR = os.path.join(CLAIMS_DIR, "_runs")
GRAPH_DIR = os.path.join(WORK_DIR, "graph")
ENTITY_CLAIMS = os.path.join(GRAPH_DIR, "entity-claims.jsonl")
TIMELINE_JSONL = os.path.join(GRAPH_DIR, "timeline-events.jsonl")

LLM_FAST = os.environ.get("OLLAMA_LLM_FAST", "llama3.2:3b")
LLM_ESCALATE = os.environ.get("OLLAMA_LLM_ESCALATE", "qwen3.5:latest")


# ---------------------------------------------------------------------------
# Prompt template — guardrails baked in (AI-BRANCH-ANALYSIS §4 G-1..G-7)
# ---------------------------------------------------------------------------

FORBIDDEN_WORDS = ["fact", "proven", "is true", "is false", "established",
                   "confirmed", "actually is"]

PROMPT_TEMPLATE = """\
You are the sacred-history corpus AI branch-analysis engine.

You will be given a cluster of corpus chunks that an embedding model
flagged as semantically similar. Your job is to PROPOSE a single
cross-tradition correlation claim — NEVER assert a fact.

HARD RULES (these are non-negotiable; output that breaks them is dropped):
  1. NEVER use the words: "fact", "proven", "is true", "is false",
     "established", "confirmed", "actually is".
  2. ALWAYS use one of: "is proposed", "is correlated with",
     "is hypothesized", "appears parallel to", "may share".
  3. EVERY claim must list at least ONE counter-consideration
     (a reason a careful scholar could reject this correlation).
  4. EVERY claim must cite at least ONE concrete evidence locator
     from the chunks provided (do not invent locators).
  5. The output is one of these correlation_kind values:
     motif-parallel | figure-mapping | textual-borrowing |
     chronological | structural | etymological.

Output STRICT JSON only, no prose, no markdown, no code-fence:

{{
  "claim_text": "<one sentence using approved phrasing>",
  "correlation_kind": "<one of the values above>",
  "side_a_tradition": "<tradition id>",
  "side_b_tradition": "<tradition id>",
  "side_a_locator": "<locator string from cluster>",
  "side_b_locator": "<locator string from cluster>",
  "evidence_summary": "<short text describing the shared signal>",
  "counter_considerations": ["<at least one reason a scholar might reject this>"],
  "confidence_self_report": <float in 0.0..1.0, your own calibrated weight>
}}

CLUSTER (each line is a corpus chunk; format: [tradition] source/locator — preview):

{cluster_text}

Remember: you are a CLAIM-GENERATOR, not a TRUTH-ORACLE.
"""


# ---------------------------------------------------------------------------
# Ollama client (zero deps)
# ---------------------------------------------------------------------------


def ollama_generate(model: str, prompt: str, timeout: int = 240) -> str:
    body = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2, "num_predict": 350},
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate", data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.loads(r.read().decode("utf-8"))
    return d.get("response", "")


# ---------------------------------------------------------------------------
# Cluster the embeddings
# ---------------------------------------------------------------------------


def load_index() -> tuple[np.ndarray, list[dict]] | None:
    if not (os.path.exists(VEC_PATH) and os.path.exists(META_PATH)):
        return None
    vecs = np.load(VEC_PATH)
    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return vecs, meta


def cluster_chunks(vectors: np.ndarray, meta: list[dict],
                   n_clusters: int | None = None,
                   distance_threshold: float | None = None,
                   ) -> dict[int, list[int]]:
    """Cosine AgglomerativeClustering (sklearn) — CPU-friendly, deterministic.

    Either fixed `n_clusters` OR `distance_threshold` (in [0,1] cosine
    distance). Threshold mode produces many small tight clusters which
    is what cross-tradition motif surfacing needs.
    """
    from sklearn.cluster import AgglomerativeClustering

    norms = np.linalg.norm(vectors, axis=1)
    keep = np.where(norms > 0.01)[0]
    if keep.size < 4:
        return {}
    X = vectors[keep]
    if distance_threshold is not None:
        model = AgglomerativeClustering(
            n_clusters=None, metric="cosine", linkage="average",
            distance_threshold=distance_threshold,
        )
    else:
        k = min(n_clusters or 20, max(2, len(X) // 8))
        model = AgglomerativeClustering(
            n_clusters=k, metric="cosine", linkage="average",
        )
    labels = model.fit_predict(X)
    out: dict[int, list[int]] = {}
    for local_i, lab in enumerate(labels):
        out.setdefault(int(lab), []).append(int(keep[local_i]))
    return out


# ---------------------------------------------------------------------------
# Cluster quality + cross-tradition gate
# ---------------------------------------------------------------------------


def cross_tradition_score(cluster_meta: list[dict]) -> tuple[int, set[str]]:
    trads = {m.get("tradition", "cross") for m in cluster_meta}
    return (len(trads), trads)


def build_cluster_text(cluster_meta: list[dict], max_lines: int = 14) -> str:
    """Trim cluster to a small prompt-sized sample."""
    sample = cluster_meta[:max_lines]
    lines = []
    for m in sample:
        prev = m.get("chunk_preview", "")[:160].replace("\n", " ")
        lines.append(f"[{m.get('tradition','?')}] {m.get('source_id','?')}/{m.get('locator','?')} — {prev}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Output validation (drops claims that break guardrails)
# ---------------------------------------------------------------------------


def validate_llm_output(raw: str) -> dict | None:
    """Parse + enforce G-1..G-5 invariants. Returns None if invalid."""
    # Pull the first JSON object out of the response.
    m = re.search(r"\{[\s\S]*\}", raw)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
    except Exception:
        return None
    required = ["claim_text", "correlation_kind", "side_a_tradition",
                "side_b_tradition", "side_a_locator", "side_b_locator",
                "evidence_summary", "counter_considerations", "confidence_self_report"]
    for k in required:
        if k not in obj:
            return None
    # G-1/G-7: forbidden words filter (descriptive, not evaluative)
    txt = (obj["claim_text"] + " " + obj["evidence_summary"]).lower()
    for w in FORBIDDEN_WORDS:
        if w in txt:
            return None
    # G-5: counter_considerations required (non-empty)
    cc = obj.get("counter_considerations") or []
    if not (isinstance(cc, list) and len(cc) >= 1 and all(isinstance(s, str) and s.strip() for s in cc)):
        return None
    # G-2: locators must be present (we re-validate against the actual cluster
    # downstream, but the LLM must have included strings)
    if not obj["side_a_locator"] or not obj["side_b_locator"]:
        return None
    if obj["side_a_tradition"] == obj["side_b_tradition"]:
        return None  # not a cross-tradition correlation
    if not (0.0 <= float(obj.get("confidence_self_report", 0)) <= 1.0):
        return None
    if obj.get("correlation_kind") not in {
        "motif-parallel", "figure-mapping", "textual-borrowing",
        "chronological", "structural", "etymological"
    }:
        return None
    return obj


# ---------------------------------------------------------------------------
# Schema mapping — LLM draft → ENTITY-MODEL §5/§6 claim object
# ---------------------------------------------------------------------------


def to_correlation_claim(draft: dict, cluster_meta: list[dict],
                         calibrated_conf: float, model_used: str,
                         run_id: str, prompt_hash: str) -> dict | None:
    """Bind to real corpus nodes; if a locator doesn't resolve, drop (G-2).

    Bind sides to chunks by matching tradition + (locator or source_id
    substring). We pick the first chunk per side whose tradition matches
    and whose locator/source_id overlaps with the LLM's locator string.
    If we can't find a tradition-matching chunk, fall back to ANY
    matching locator — but still require one chunk per side from the
    cluster.
    """
    def pick(side_locator: str, side_tradition: str):
        # Exact locator or source_id match w/ tradition.
        for m in cluster_meta:
            if m.get("tradition") != side_tradition:
                continue
            if (m.get("locator") == side_locator or
                m.get("source_id") == side_locator or
                (side_locator and side_locator in (m.get("locator") or "")) or
                (side_locator and side_locator in (m.get("source_id") or ""))):
                return m
        # Fallback: any chunk in this tradition from the cluster.
        for m in cluster_meta:
            if m.get("tradition") == side_tradition:
                return m
        return None

    a_chunk = pick(draft["side_a_locator"], draft["side_a_tradition"])
    b_chunk = pick(draft["side_b_locator"], draft["side_b_tradition"])
    if not a_chunk or not b_chunk:
        return None
    if a_chunk["chunk_id"] == b_chunk["chunk_id"]:
        return None
    claim_id = f"clm-corr-{draft['correlation_kind']}-{hashlib.sha1((draft['claim_text']+prompt_hash).encode('utf-8')).hexdigest()[:10]}"
    return {
        "id": claim_id,
        "node_type": "correlation",
        "claim_type": "correlation",
        "correlation_kind": draft["correlation_kind"],
        "label": draft["claim_text"][:200],
        "side_a": {"tradition": draft["side_a_tradition"],
                   "node": a_chunk["source_id"],
                   "locator": a_chunk["locator"]},
        "side_b": {"tradition": draft["side_b_tradition"],
                   "node": b_chunk["source_id"],
                   "locator": b_chunk["locator"]},
        "direction": "undirected",
        "statement": draft["claim_text"],
        "scope": "ai-generated candidate; cluster-derived",
        "stance": "contested",
        "confidence": round(float(calibrated_conf), 3),
        "disputed": True,
        "evidence": [
            {"kind": "primary", "locator": a_chunk["locator"],
             "source_node": a_chunk["source_id"], "rights_tier": a_chunk.get("rights_tier", "A"),
             "quote": None, "summary": a_chunk.get("chunk_preview", "")[:300],
             "supports": True},
            {"kind": "primary", "locator": b_chunk["locator"],
             "source_node": b_chunk["source_id"], "rights_tier": b_chunk.get("rights_tier", "A"),
             "quote": None, "summary": b_chunk.get("chunk_preview", "")[:300],
             "supports": True},
            {"kind": "ai-derived",
             "locator": f"cluster:{a_chunk['source_id']}+{b_chunk['source_id']}",
             "source_node": "ai-branch-analysis", "rights_tier": "A", "quote": None,
             "summary": draft["evidence_summary"][:500], "supports": True},
        ],
        "provenance": {
            "asserted_by": "ai-branch-analysis",
            "citations": [],
            "derived_by": {"model": model_used,
                           "run_id": run_id,
                           "prompt_hash": prompt_hash,
                           "self_reported_confidence": draft["confidence_self_report"]},
            "added_on": time.strftime("%Y-%m-%d"),
        },
        "counter_claims": [],
        "counter_considerations": draft["counter_considerations"],
        "story_protocol_ip_id": None,
    }


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------


def main():
    os.makedirs(CLAIMS_DIR, exist_ok=True)
    os.makedirs(RUN_DIR, exist_ok=True)
    run_id = time.strftime("branch-analysis-%Y%m%d-%H%M%S")

    print(f"[1/5] loading vector index from {VEC_PATH}")
    idx = load_index()
    if not idx:
        print("  no vector index — run build-index.py first; aborting")
        sys.exit(2)
    vectors, meta = idx
    print(f"  {len(meta)} chunks; dim={vectors.shape[1]}")

    print("[2/5] clustering chunks (tight cosine threshold)")
    # Sweep tight thresholds — surfaces small high-similarity clusters
    # where the cross-tradition signal actually lives. Coarse k-based
    # clustering hides it in mono-tradition mega-buckets.
    candidate_clusters: list = []
    seen_keys: set = set()
    for thr in (0.25, 0.32, 0.40):
        clusters = cluster_chunks(vectors, meta, distance_threshold=thr)
        # Only keep small-to-medium clusters (LLM prompt can't usefully
        # take 1000+ chunks). Cap each cluster at 16 members.
        kept_count = 0
        for lab, members in clusters.items():
            if not (3 <= len(members) <= 60):
                continue
            cm = [meta[i] for i in members]
            n_trads, trads = cross_tradition_score(cm)
            if n_trads >= 2:
                key = frozenset((m["source_id"] for m in cm))
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                # cap cluster size for prompt
                cm_capped = cm[:16]
                members_capped = members[:16]
                candidate_clusters.append((lab, members_capped, cm_capped, n_trads, trads))
                kept_count += 1
        print(f"  threshold={thr}: {len(clusters)} clusters → {kept_count} cross-tradition")
    candidate_clusters.sort(key=lambda t: (-t[3], -len(t[1])))
    print(f"  {len(candidate_clusters)} unique cross-tradition clusters (≥2 traditions, 3-60 chunks)")

    # ALSO seed clusters from the entity graph's existing correlation
    # candidates (build-entity-graph.py output). Each existing
    # entity-correlation becomes a 2-member "cluster" the LLM can
    # elaborate. This is the high-yield path because the entity graph
    # has already done the cross-language motif work.
    if os.path.exists(ENTITY_CLAIMS):
        print(f"[2b/5] adding entity-graph-seeded clusters")
        seeded = 0
        with open(ENTITY_CLAIMS, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    ec = json.loads(line)
                except Exception:
                    continue
                # Treat the two figure nodes as a synthetic cluster.
                a = ec["side_a"]
                b = ec["side_b"]
                cm = [
                    {"chunk_id": f"figure:{a['node']}",
                     "source_id": a["node"],
                     "locator": a.get("wikidata") or a["node"],
                     "title": a["node"],
                     "tradition": a["tradition"],
                     "rights_tier": "A",
                     "chunk_preview": ec["evidence"][0]["summary"]},
                    {"chunk_id": f"figure:{b['node']}",
                     "source_id": b["node"],
                     "locator": b.get("wikidata") or b["node"],
                     "title": b["node"],
                     "tradition": b["tradition"],
                     "rights_tier": "A",
                     "chunk_preview": ec["evidence"][1]["summary"]},
                ]
                # add the ai-derived motif summary as a third "chunk"
                cm.append({
                    "chunk_id": f"motifs:{ec['id']}",
                    "source_id": "ai-branch-analysis",
                    "locator": ec["evidence"][2]["locator"],
                    "title": "shared motifs",
                    "tradition": "cross",
                    "rights_tier": "A",
                    "chunk_preview": ec["evidence"][2]["summary"],
                })
                candidate_clusters.append((f"ent-{seeded}", [0, 1, 2], cm, 2,
                                            {a["tradition"], b["tradition"]}))
                seeded += 1
        # Stable sort: keep entity-seeded first since they're the highest signal.
        candidate_clusters.sort(key=lambda t: (
            0 if isinstance(t[0], str) and str(t[0]).startswith("ent-") else 1,
            -t[3], -len(t[1])
        ))
        print(f"  added {seeded} entity-seeded clusters; total={len(candidate_clusters)}")

    print(f"[3/5] drafting claims with LLM ({LLM_FAST})")
    drafted = 0
    dropped_g1g7 = 0
    dropped_unbindable = 0
    emitted_claims: list[dict] = []
    MAX_CLUSTERS = int(os.environ.get("MAX_CLUSTERS", "20"))

    for c_i, (lab, members, cm, n_trads, trads) in enumerate(candidate_clusters[:MAX_CLUSTERS], 1):
        cluster_text = build_cluster_text(cm)
        prompt = PROMPT_TEMPLATE.format(cluster_text=cluster_text)
        prompt_hash = hashlib.sha1(prompt.encode("utf-8")).hexdigest()[:12]
        print(f"  [cluster {c_i}/{min(MAX_CLUSTERS, len(candidate_clusters))} lab={lab}] traditions={sorted(trads)} size={len(members)}", flush=True)
        raw = ""
        for attempt in range(2):
            try:
                raw = ollama_generate(LLM_FAST, prompt, timeout=240)
                break
            except Exception as e:
                print(f"  [retry cluster {lab} attempt {attempt+1}] llm error: {e}", flush=True)
                raw = ""
        if not raw:
            continue
        draft = validate_llm_output(raw)
        if draft is None:
            dropped_g1g7 += 1
            continue
        # Calibrated confidence (G-4): blend the LLM self-report with
        # structural support (cluster size + tradition diversity).
        struct = min(1.0, 0.10 * len(members) + 0.10 * n_trads)
        calibrated = min(0.95, 0.55 * float(draft["confidence_self_report"]) + 0.45 * struct)
        claim = to_correlation_claim(draft, cm, calibrated, LLM_FAST, run_id, prompt_hash)
        if claim is None:
            dropped_unbindable += 1
            continue
        drafted += 1
        emitted_claims.append(claim)

    # Sort by confidence desc.
    emitted_claims.sort(key=lambda c: -c["confidence"])

    print(f"  drafted: {drafted}; dropped G-1/G-7: {dropped_g1g7}; "
          f"dropped unbindable G-2: {dropped_unbindable}")

    print(f"[4/5] linking counter-claims (from entity-claims.jsonl)")
    # If the entity graph already proposed a correlation between the
    # same two source nodes, link it as a sibling counter_claim (the
    # consumer can decide if it's supporting or opposing).
    by_pair: dict[tuple[str, str], list[str]] = {}
    if os.path.exists(ENTITY_CLAIMS):
        with open(ENTITY_CLAIMS, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    ec = json.loads(line)
                except Exception:
                    continue
                key = tuple(sorted([ec["side_a"]["node"], ec["side_b"]["node"]]))
                by_pair.setdefault(key, []).append(ec["id"])
    linked = 0
    for c in emitted_claims:
        key = tuple(sorted([c["side_a"]["node"], c["side_b"]["node"]]))
        for sibling in by_pair.get(key, []):
            if sibling != c["id"]:
                c["counter_claims"].append(sibling)
                linked += 1
    print(f"  cross-linked {linked} sibling claims from entity graph")

    print(f"[5/5] writing outputs")
    with open(CLAIMS_JSONL, "w", encoding="utf-8") as f:
        for c in emitted_claims:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    run_record = {
        "run_id": run_id,
        "model_fast": LLM_FAST,
        "model_escalate": LLM_ESCALATE,
        "corpus_chunks": len(meta),
        "clusters_total": len(clusters),
        "candidate_clusters": len(candidate_clusters),
        "clusters_processed": min(MAX_CLUSTERS, len(candidate_clusters)),
        "claims_emitted": len(emitted_claims),
        "dropped_g1g7": dropped_g1g7,
        "dropped_unbindable": dropped_unbindable,
        "calibration": "0.55*llm_self_report + 0.45*structural(cluster_size, tradition_diversity)",
        "operator": "data-pillar",
        "added_on": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    with open(os.path.join(RUN_DIR, f"{run_id}.json"), "w", encoding="utf-8") as f:
        json.dump(run_record, f, indent=2)
    print(f"  wrote {len(emitted_claims)} claims → {CLAIMS_JSONL}")
    print(f"  run record → {RUN_DIR}/{run_id}.json")


if __name__ == "__main__":
    main()
