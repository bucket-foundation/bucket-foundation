# Truth Extraction & Cross-Branch Isomorphism Detection — Design

*Drafted 2026-05-11. Founder ask: "find similarities and truth across
branches, especially non-obvious ones." This is the most important
single piece of canon engineering — getting it right matters more
than going fast.*

## What we're actually trying to do

The canon has 9 branches, 599 claim cards, 25,692 FTS documents. Each
branch has its own vocabulary. The interesting question is not "what
does branch X say" — that's BM25. The interesting question is:

> **Where do two (or more) branches independently arrive at the same
> structural truth, expressed in different vocabularies?**

Examples we already suspect:
- **Information ↔ Physics**: Shannon entropy ↔ thermodynamic entropy (Jaynes 1957). Not just analogy — same equation.
- **Math ↔ Biophysics**: Fourier basis ↔ cochlear place-coding. Same decomposition, different substrate.
- **Cosmology ↔ Mind**: holographic principle (Bekenstein) ↔ "information at the boundary" theories of consciousness.
- **Deep-history ↔ Cosmology**: Younger Dryas (Carlson) ↔ Taurid meteor stream (cosmology) — same physical event, different framings.

These bridges are the **product**. They are what bucket.foundation is
actually for. Indexing alone produces a library. Bridge-detection
produces canon.

## Why keyword search fails

`gravity` (physics) and `attraction` (mind) share zero stems but describe
the same primitive. `entropy` and `disorder` and `decay` and `aging` all
ride the same gradient but only one is the canonical token. BM25 cannot
see this. We need a representation that captures **meaning**, not
**surface form**.

## Hardware budget (this machine)

| Resource | Spec | Bottleneck? |
|---|---|---|
| CPU | AMD Ryzen 7 7840HS, 16 threads, up to 5.1GHz | Primary compute |
| RAM | 60GB, ~32GB free | Plenty for any model that fits CPU inference |
| GPU | AMD Radeon RX 7600 (no CUDA) | Unusable for PyTorch (could use via ROCm but not configured) |
| Disk | 602GB free on `/home` | More than enough |
| Models on disk | nomic-embed-text (274MB), llama3.2:3b, qwen2.5-coder:7b, qwen3.5 (6.6GB) | Already pulled, ready |

**Bottom line**: 25K-doc semantic search on CPU is roughly 2-6 hours one
time. Cross-encoder rerank: ~30 min per 1000 candidate pairs. LLM-judge
of top candidates: ~10s per pair via local ollama, so 1000 pairs = 3 hr.
Everything fits in a single overnight run. Idempotent → can resume.

## Pipeline (six stages)

```
   ┌─ Stage 1: Embed everything ──────────────────┐
   │   nomic-embed-text via ollama                │
   │   • 599 claim cards (one vector each)        │
   │   • ~125K FTS chunks (paragraph-level)       │
   │   → vectors.npy (memmap) + meta.sqlite       │
   └──────────────┬───────────────────────────────┘
                  │
   ┌──────────────▼───────────────────────────────┐
   │ Stage 2: Cross-branch nearest neighbors      │
   │   For each claim, find top-50 NN that are    │
   │   in a DIFFERENT branch                      │
   │   → cross-branch-candidates.jsonl            │
   └──────────────┬───────────────────────────────┘
                  │
   ┌──────────────▼───────────────────────────────┐
   │ Stage 3: Topic clustering                    │
   │   BERTopic on claim embeddings →             │
   │   topics that span >1 branch = bridges       │
   │   → cross-branch-topics.md                   │
   └──────────────┬───────────────────────────────┘
                  │
   ┌──────────────▼───────────────────────────────┐
   │ Stage 4: Cross-encoder rerank                │
   │   Top-500 candidate pairs from #2 →          │
   │   ms-marco-MiniLM cross-encoder scores       │
   │   → reranked-pairs.jsonl                     │
   └──────────────┬───────────────────────────────┘
                  │
   ┌──────────────▼───────────────────────────────┐
   │ Stage 5: LLM-judge synthesis                 │
   │   Top-200 pairs → qwen2.5-coder:7b prompt:   │
   │   "is this a real cross-branch isomorphism?  │
   │    rate 0-5, name the underlying primitive"  │
   │   → bridge-cards/<branch1>--<branch2>/*.md   │
   └──────────────┬───────────────────────────────┘
                  │
   ┌──────────────▼───────────────────────────────┐
   │ Stage 6: Multi-branch isomorphism graph      │
   │   Build similarity graph, find subgraphs     │
   │   that span 3+ branches → MULTI-bridges      │
   │   → bucket-canon/_bridges/<primitive>.md     │
   └──────────────────────────────────────────────┘
```

## Why nomic-embed-text (not OpenAI, not E5, not BGE)

| Model | Dim | Local? | Quality | Cost |
|---|---|---|---|---|
| **nomic-embed-text** (already pulled) | 768 | ✅ via ollama | 0.66 MTEB avg, **best open at 274MB**, 8K ctx | Free, fast on CPU |
| OpenAI text-embedding-3-large | 3072 | ❌ | 0.65 MTEB | $0.13 per 1M tokens, network dep |
| BGE-large-en-v1.5 | 1024 | ✅ HF | 0.64 MTEB | Free, slower on CPU |
| sentence-transformers/all-MiniLM-L6-v2 | 384 | ✅ HF | 0.56 MTEB | Free, fastest, lower quality |
| E5-large-v2 | 1024 | ✅ HF | 0.63 MTEB | Free |

nomic-embed-text wins on: already-pulled (no download), Matryoshka (we can
truncate to 256/512 dim for speed if needed), 8K context (paragraph-level
embeddings work), best-open MTEB score.

## Indexing ML/AI methods into the corpus (founder's other ask)

A canon that knows about embeddings should *itself contain* the
embeddings literature. Adding a new sub-branch:

```
bucket-canon/04-information/sub-methods/
  representation-learning/
  contrastive-learning/
  knowledge-graphs/
  topic-modeling/
  retrieval/
  cross-domain-transfer/
```

Canonical seed papers to ingest:
- **Salton 1975**: vector space model
- **Manning IR textbook** (2009) — chapters on retrieval
- **Mikolov 2013**: word2vec, king-man+woman=queen analogy
- **Devlin 2018**: BERT
- **Reimers & Gurevych 2019**: Sentence-BERT
- **Karpukhin 2020**: DPR (dense passage retrieval)
- **Gao 2021**: SimCSE
- **Wang 2022**: E5
- **Xiao 2023**: BGE
- **Nussbaum 2024**: nomic-embed-text-v1
- **Grootendorst 2022**: BERTopic
- **Cer 2018**: Universal Sentence Encoder
- **Radford 2021**: CLIP (cross-modal)
- **Lan 2019**: ALBERT
- **Pennington 2014**: GloVe
- **McInnes 2018**: UMAP
- **Campello 2013**: HDBSCAN
- **Salton 1988**: TF-IDF
- **Robertson 1994**: BM25
- **Lewis 2020**: RAG
- **Khattab 2020**: ColBERT
- **Joulin 2017**: fastText
- **Conneau 2017**: InferSent
- **Reimers 2020**: cross-lingual SBERT
- **Hofmann 1999**: PLSA
- **Blei 2003**: LDA
- **Le & Mikolov 2014**: doc2vec
- **Bojanowski 2017**: subword
- **Cohan 2020**: SPECTER (scientific embeddings)
- **Khattab 2022**: ColBERTv2
- **Lewis 2019**: BART

Pulled via `agf-arxiv` + `agf-openalex` for each → ~30 new corpus
entries. These become canon for **how to think about meaning**.

## Storage layout

```
_intake/embeddings/
  vectors.f32.bin            ← float32 memmap, shape (N, 768)
  meta.sqlite                ← id, source_path, branch, concept, text_hash, token_count
  build.json                 ← model_name, dim, normalize, dtype, built_at
  cross-branch-cand.jsonl    ← stage 2 output
  cross-branch-topics.md     ← stage 3 output
  reranked-pairs.jsonl       ← stage 4 output
  bridge-cards/              ← stage 5 output
  multi-branch-graph.json    ← stage 6 output
```

## Idempotency rules

Every stage:
1. Hashes input → output. If hash unchanged → skip.
2. Resumes from last completed batch (sqlite checkpoint).
3. Can be run via systemd timer for unattended hours.
4. Emits one-line status to `~/.bucket-canon-status` for `canon-status`.

## Cost & time budgets

| Stage | One-time time | Resumable? |
|---|---|---|
| 1 Embed 599 claims | <2 min | trivially |
| 1 Embed 125K paragraph chunks | ~4-6 hours CPU | yes, batch ckpt |
| 2 Cross-branch NN | 30 sec | trivial |
| 3 BERTopic clustering | 10 min | yes |
| 4 Cross-encoder rerank top-500 | 20 min | yes |
| 5 LLM-judge top-200 | 3 hours via qwen2.5-coder:7b | yes |
| 6 Multi-branch graph | 5 min | trivial |
| **Total** | **~10 hours** | All resumable |

Most of that is stage 1 (embedding) and stage 5 (LLM-judge). Both run
overnight, unattended, with checkpoints.

## What "non-obvious" means operationally

A bridge is **non-obvious** when:
1. The two claim cards share NO surface tokens (Jaccard < 0.1 on words)
2. AND they live in branches that are >1 step apart in the seven-branch
   ontology (e.g. mathematics ↔ deep-history, not physics ↔ chemistry)
3. AND cross-encoder score > 0.7
4. AND LLM-judge confirms the structural mapping

We rank candidates by *non-obviousness × confidence*, not by raw
similarity. The interesting bridges are the ones where two domains
that look distant accidentally describe the same primitive.

## What gets shipped at the end

1. `bucket-canon/_bridges/<primitive>/` — one folder per discovered
   primitive, with claim-card-pair citations from each branch it touches
2. `_intake/connections/CROSS-BRANCH-ISOMORPHISMS.md` — ranked list
3. Web route `/canon/bridges/<primitive>` — server-rendered, citations
4. Updated `centrality.json` — claim cards as nodes, bridges as edges
5. New section in `CANON-MASTER.md` summarizing the top-20 bridges found

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Embedding 125K chunks takes too long on CPU | Truncate nomic to 256-dim via Matryoshka. ~2x speedup. |
| LLM-judge hallucinates "deep" bridges where none exist | Require structural mapping (subject/predicate alignment) in the prompt + flag low-confidence outputs |
| BERTopic gives messy topics | Tune min_topic_size + use seed topics from existing branch labels |
| Same-author bias (Kruse, Hancock, etc. show up in every cross-branch topic because they personally span domains) | Down-weight by source-author entropy; require ≥2 distinct authors per bridge candidate |
| FTS chunks not paragraph-aligned | Use the existing `.fts.sqlite` chunking, then re-chunk by paragraph for embedding |

## Open questions for the founder (non-blocking)

1. Should LLM-judge use qwen2.5-coder:7b (better reasoning, slower) or llama3.2:3b (3x faster, weaker)? Default: qwen2.5-coder. Can A/B later.
2. Threshold for "real bridge" — confidence 0.7? 0.8? Default: 0.7 with manual review of top-50.
3. Should bridges be public on the web app immediately or staged via `_intake/` for review first? Default: stage in `_intake/` for one cycle, then promote.

---

**Status**: design complete 2026-05-11. Execution begins immediately
with Stage 0 (install missing deps + index ML/AI seed corpus) and
Stage 1 (embed everything).
