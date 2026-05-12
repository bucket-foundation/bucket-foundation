# What does bucket.foundation actually provide to users?

*Drafted 2026-05-11. Audit of the current website value-prop vs. what
the underlying data + models can deliver.*

## What's live RIGHT NOW

| Route | What user gets | Audience |
|---|---|---|
| `/canon` | 7-branch grid + interactive 3D globe of canon structure | First-time visitor — orientation |
| `/canon/[slug]` | Single branch page (math, physics, etc.) — entries, contributors, status | Researcher exploring a domain |
| `/canon/[slug]/figures/[figure]` | Per-contributor page (Penrose, Kruse, etc.) — what they've contributed | Curious about a specific person |
| `/canon/claims` | List of all 599 curated claim cards across 9 branches | Browse what canon *says* |
| `/canon/claims/[concept]` | Claims for a concept (e.g. "topology", "consciousness") | Concept deep-dive |
| `/canon/claims/[concept]/[slug]` | Single claim card with source citation, timestamp, video link | Read one specific claim |
| `/canon/bridges` | Index of bridges (curated + detected primitives) | Find cross-branch concepts |
| `/canon/bridges/[slug]` | Curated bridge page (light, time, music, etc.) | Read one bridge |
| `/canon/bridges/detected/[slug]` | Algorithm-discovered primitive bridge with vocabulary map | The cross-domain isomorphism layer |
| `/canon/graph` | Collaboration network table (most central authors, top pairs) | See the intellectual lineage |
| `/api/research` | x402-paid feed402 proxy → PubMed/Semantic Scholar/etc. | AI agents that need fresh research |
| `/api/kruse/search` | FTS5 search over the Kruse corpus | Niche: longevity researchers |
| `/chat` | Gated chat surface (auth + env flag) | Future product |

That's a **read-only canon library** with an interactive structure
overview, claim cards, and cross-branch bridges. The core value
proposition today is: **"a citable, browsable, foundational-science
canon you can read."**

## What we have under the hood but don't expose

| Asset | Where it lives | Why it's not on the web yet |
|---|---|---|
| 67,286 paragraph embeddings | `_intake/embeddings/corpus/` | No search UI shipped |
| 599 claim-card embeddings | `_intake/embeddings/claims-vectors.f32.bin` | No semantic search UI |
| Top-10 corpus evidence per claim | `_intake/embeddings/claim-evidence.jsonl` | Data exists, not rendered on claim pages |
| canon-tuned bge-small (triplet 0.93→0.98) | `_intake/training/canon-bge-small-v1/` | No server-side inference yet |
| Tier classifier (nucleus/functional/edge) | `_intake/training/tier-classifier.pt` | No tier slider in UI |
| Knowledge graph (1,133 nodes, PageRank centrality) | `_intake/training/kg-*` | Static `/canon/graph` only shows authors |
| v2 cluster re-detection (7-branch bridge!) | `_intake/embeddings-v2/` | Naming in progress |

## The 6 things we should ship to expose the value

### 1. Semantic search box on `/canon` ⭐⭐⭐⭐⭐

User types: *"what does canon say about why consciousness can't be computed?"*

System returns: top-10 claim cards ranked by canon-tuned embedding
similarity. Each card shows branch + concept + excerpt + score.

**This is the killer feature.** Today the canon is "browse a tree of
folders." Tomorrow it could be "ask a question and find the answer."

### 2. Evidence panel on `/canon/claims/[concept]/[slug]` ⭐⭐⭐⭐

For each claim card, render the top-K corpus passages that support
it. Data already exists in `claim-evidence.jsonl` — just needs UI.

Today: "claim from Kruse podcast at 12:34"
Tomorrow: "claim from Kruse + 3 PubMed papers + 2 archive.org books + 1 SEP entry"

### 3. Confidence tier slider on `/canon/claims` ⭐⭐⭐

A slider: nucleus only | nucleus + functional | all.

Today the list shows 599 claims unordered. With the tier slider,
nucleus-only is ~190 of the strongest. The 50-100 most-cited become
the natural "canon-canon."

### 4. `/api/canon/search` JSON endpoint ⭐⭐⭐⭐

```
GET /api/canon/search?q=<question>&top_k=10&tier=nucleus
→ { results: [{branch, concept, slug, score, title, excerpt}], ... }
```

This is **how AI agents consume bucket.foundation as a substrate**.
The grant case + open-source thesis depends on this endpoint
existing.

### 5. `/canon/concept/[term]` — cross-branch concept finder ⭐⭐⭐

User searches "energy" or "information" or "wholeness" — system
shows that concept's appearance in every canon branch via the
detected-bridge data.

> "energy in:
>   - physics → conservation laws, photoelectric, thermodynamics
>   - biophysics → mitochondrial ATP, Becker electric body
>   - cosmology → dark energy, expansion
>   - mind → attention as energetic resource (James, Schopenhauer)"

This is the direct UX of "find cross-branch analogues."

### 6. Author pages on `/canon/author/[slug]` ⭐⭐

Render the knowledge-graph data: Penrose's claim count, central
concepts, coauthors, h-index, what cluster he anchors. The
`kg-centrality.md` is the data, but no user-facing page surfaces
it.

## Production-architecture note

Most of this needs **server-side embedding inference**. Three paths:

1. **Python sidecar** (FastAPI on `ai.bucket.foundation`) — best quality,
   needs separate host. Runs canon-bge-small on GPU. Vercel calls it.
2. **ONNX export + onnxruntime-node** — embeds in the Vercel function.
   Slower but co-located. ~3MB model, ~50ms inference per query.
3. **Pre-compute + static JSON** — for the 599 claim vectors, ship
   the float32 matrix to the client (~920KB), use Transformers.js for
   query embedding, compute cosine in browser. Works on edge, no
   Python.

Option 3 is the fastest to ship. Option 2 is the right production
answer. Option 1 unlocks the corpus search (67K vectors too large for
browser).

## Public-API tier model

| Tier | Auth | Rate | What you can do |
|---|---|---|---|
| Anonymous | None | 60/hr | Search canon claims, read bridges, fetch tier predictions |
| Verified | Email signup | 600/hr | Same + author pages + bridge graphs |
| Research | Application | 6000/hr | Bulk export + corpus passage retrieval |
| x402 paid | Wallet | unlimited | Real-time research via feed402 + canon-grounded |

This is the **revenue/grant ladder.**

## Concrete "what does this provide" pitch line

> bucket.foundation is the first open, tier-labeled, cross-branch
> canon of scientific foundations. Browse 599 curated claims, follow
> 18 algorithm-discovered primitive bridges across 9 branches, search
> via a canon-tuned embedding model, and consume the whole graph
> through a clean JSON API. Citable forever (Story Protocol IP NFTs),
> tier-graded for AI grounding strength, primary-source linked.

That's the elevator pitch when someone asks "what does this do."
