# Tiered Canon Architecture — Nucleus, Functional, Edge

*Drafted 2026-05-11. Founder's mental model: canon is a confidence
gradient, not a single tier. The closer to the nucleus, the more
primitive and certain the truth.*

## The three concentric tiers

```
            ┌───────────────────────────────────────┐
            │            EDGE                       │
            │   fringe · contested · speculative    │
            │   confidence < 0.4                    │
            │   ┌─────────────────────────────┐    │
            │   │       FUNCTIONAL             │    │
            │   │   peer-reviewed · applied    │    │
            │   │   confidence 0.4 – 0.8       │    │
            │   │   ┌───────────────────┐     │    │
            │   │   │     NUCLEUS       │     │    │
            │   │   │   core canon      │     │    │
            │   │   │   axioms · laws · │     │    │
            │   │   │   primitives      │     │    │
            │   │   │   confidence ≥0.8 │     │    │
            │   │   └───────────────────┘     │    │
            │   └─────────────────────────────┘    │
            └───────────────────────────────────────┘
```

| Tier | What lives here | Confidence | Tradeoff |
|---|---|---|---|
| **Nucleus** | Axioms, laws, mathematical theorems, primary derivations | ≥ 0.8 | Few items, very high reliability — these are the things AI agents can *build on* without checking |
| **Functional** | Peer-reviewed claims, replicated experimental results, applied science | 0.4 – 0.8 | Most material lives here — useful but always cite |
| **Edge** | Unreplicated experiments, fringe science, ancient mystery, contested claims | < 0.4 | Surface as cultural-record / hypotheses, never as canon |

## How confidence is computed (proposed)

A claim's `confidence_score ∈ [0, 1]` is a weighted sum of evidence signals:

```
confidence = (
    0.30 · peer_review_score          # has author with OpenAlex h-index ≥ 20
  + 0.20 · citation_count_score       # corpus has ≥3 distinct citing papers
  + 0.20 · replication_score          # ≥2 independent sources state the same primitive
  + 0.15 · cross_branch_score         # appears in detected multi-branch cluster (rare → high)
  + 0.10 · primary_source_score       # cited authors include the primary discoverer
  + 0.05 · falsifiability_score       # has a stated falsifiability test
)
```

All signals already exist in the data we've collected:
- peer_review_score → OpenAlex h-index of author profiles
- citation_count_score → openalex-citers/ data
- replication_score → corpus evidence cosine similarity > threshold from N distinct sources
- cross_branch_score → membership in detected/<N>/ cluster
- primary_source_score → author name appears in OpenAlex profile list

## Where this slots into existing canon structure

```
bucket-canon/
  01-mathematics/
    sub-claims/
      <concept>/
        001-<slug>.md              ← existing claim card
  ...
  _bridges/
    detected/
      01-non-symmetry-principle/   ← LLM-named bridges (current)
      ...
  _tier/                           ← NEW: tier rollups
    nucleus/                       ← symlinks to confidence ≥ 0.8 claims
    functional/                    ← symlinks to 0.4–0.8
    edge/                          ← symlinks to < 0.4
    TIER-STATS.md                  ← per-branch tier distribution
```

Each existing claim card gets a frontmatter field `tier: nucleus|functional|edge`
plus a `confidence: 0.NN` numeric score, computed automatically.

## Web app surface

`/canon` should render a **confidence layer slider**:

- All on: see everything
- Functional + Nucleus: hide edge, focus on peer-reviewed
- Nucleus only: see the bedrock — the 50-100 strongest primitives

This is the UX expression of the tier architecture.

## Why this matters for AI consumers

If an AI agent is querying canon for grounding, **the tier label is the
trust signal**. Nucleus material can be cited without further check.
Functional material requires citation. Edge material requires
disclaimer ("hypothesis, not consensus").

This is what makes bucket.foundation usable as a *substrate* for other
AI systems, not just as a corpus. The tier is the API contract.
