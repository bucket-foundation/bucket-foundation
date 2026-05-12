# What is the canon corpus actually good for? — AI/ML value research

*Drafted 2026-05-11. Founder ask: "do research on what value the data
provides for training an LLM... what can this be good at? how can this
provide value?"*

## The corpus, by the numbers

- **25,692 FTS documents** across 12 source types (yt, archive, pubmed, arxiv, gutenberg, wikisource, openalex, blog, kruse, aaro, pursue, etc.)
- **67,286 paragraph-level chunks** with sentence-transformers embeddings (384-d, bge-small-en-v1.5)
- **599 curated claim cards** distributed across 9 canon branches
- **17 multi-branch primitive bridges** detected via clustering
- **422 OpenAlex author profiles** with publication graphs
- **~6,000 corpus-passage evidence links** attached to claim cards
- **~125 GB of embeddings + indices** locally on disk

This is a **specialized scientific-philosophical corpus weighted toward
foundational truth claims, not commercial knowledge**.

## What this corpus is uniquely good for

### 1. Cross-domain analogy & isomorphism detection

**Unique strength**: every other open corpus optimizes for retrieval
*within* a domain. This corpus has explicit cross-branch labels +
detected bridges. A model trained on this learns "the second law of
thermodynamics has analogues in information theory, cosmology, mind."

**Use case**: research-assistant agent that, given a claim in physics,
surfaces the structurally-equivalent claims in biology, math, and
philosophy. No other dataset trains this directly.

### 2. Foundation-tier vs. application-tier classification

**Unique strength**: explicit tier labels (nucleus / functional / edge)
that no public dataset has at scale.

**Use case**: a classifier that decides whether a claim is "core
axiom" or "applied finding" or "speculative." Useful for AI agents
needing grounding strength signals.

### 3. Steel-manned heterodox science indexing

**Unique strength**: includes Becker (bioelectric), Pollack (4th phase
water), Kruse (mitochondrial light), Sheldrake (morphic), Hancock
(deep-time anomalies) — fringe-adjacent material that's
under-represented in mainstream training but has real explanatory
substrate.

**Use case**: a model that can engage with non-consensus science
*seriously* — neither dismissive nor credulous. Steelman both sides.
Big commercial value because consumer AI models are over-trained on
consensus dismissal.

### 4. Genealogy/lineage tracking

**Unique strength**: OpenAlex author profiles + citation graphs +
coauthor matrices already built. Every claim is traceable to its
intellectual lineage.

**Use case**: a model that can produce "the genealogy of this idea"
on demand. From Schrödinger → Frohlich → Mae-Wan Ho → modern quantum
biology. This is a uniquely citation-grounded experience.

### 5. Bridge-aware RAG

**Unique strength**: bridge clusters are pre-computed. RAG can return
"here's the answer in physics AND here's the structurally-equivalent
answer in biology."

**Use case**: PhD-level literature search assistant. Answers are
multi-disciplinary by default, with explicit cross-domain mapping.

## What can we train overnight on this hardware?

### Hardware

- **GPU**: AMD Radeon RX 7700S (gfx1102, 32 CUs, ~8GB VRAM)
- **CPU**: AMD Ryzen 7 7840HS, 16 threads
- **RAM**: 60GB total, ~24GB free
- **ROCm**: installed (`rocminfo` works, hipcc present)
- **PyTorch**: currently CPU-only (`torch 2.9.0+cpu`); need
  `torch+rocm` for GPU
- **Local LLMs**: llama3.2:3b, qwen2.5-coder:7b, qwen3.5 (6.6GB) all
  pulled via ollama

### Tractable training tasks (overnight feasible)

| Rank | Task | Approach | Time | Value |
|---:|---|---|---|---|
| 1 | **Canon-tuned embedding model** | Contrastive fine-tune of bge-small-en-v1.5 on (positive=same-cluster, negative=cross-branch-distinct) claim pairs | 3-6 hours CPU, 1-2 hours GPU | ⭐⭐⭐⭐⭐ |
| 2 | **Tier classifier** | Logistic regression / small MLP on claim embeddings → nucleus/functional/edge confidence | 30 min | ⭐⭐⭐⭐ |
| 3 | **Knowledge graph + node embeddings** | networkx KG of (author, concept, claim, bridge) + node2vec | 1-2 hours | ⭐⭐⭐⭐ |
| 4 | **LoRA fine-tune of llama3.2:3b** | PEFT/LoRA on canon claim cards as instruction-tuning data | 6-12 hours CPU, 3-4 hours GPU | ⭐⭐⭐ |
| 5 | **Bridge-classifier head** | Train a 2-layer MLP to predict "is this pair a multi-branch primitive?" from embedding-pair input | 1 hour | ⭐⭐⭐ |

### Not feasible overnight on this hardware

- Full LLM training from scratch (needs cluster of A100s)
- Fine-tuning a 7B+ model (VRAM-bound; 7B at fp16 = 14GB, > our 8GB)
- Training a 1B+ transformer from scratch

## Overnight training plan (committed)

**Phase 1 (next 2 hours, CPU is fine):**
1. Install peft, accelerate, datasets (HuggingFace LoRA toolkit)
2. Try to install torch+rocm; if it works → GPU train; if not → CPU
3. Build training-pair JSONL from existing cluster data
4. Run **canon-tuned embedding** contrastive training (Task #1)
5. Train **tier classifier** (Task #2) — very fast, can do alongside

**Phase 2 (overnight, can run unattended):**
6. Build knowledge graph + node2vec embeddings (Task #3)
7. LoRA fine-tune llama3.2:3b on canon claim cards (Task #4) — if GPU available

**Phase 3 (morning):**
8. Evaluate: take canon-tuned embedding vs. base bge-small on a hold-out set of cross-branch pairs. Measure recall@10 improvement.
9. Compare tier classifier to manual baseline.

## What the trained artifacts can be used for

### `canon-bge-small-v1.bin` (Task #1 output)
- Drop-in replacement for bge-small-en-v1.5 in the existing pipeline
- Better cross-branch retrieval (more canon-tier hits in top-K)
- Could be released open-source as the **first canon-tuned embedding model**
- Sister to nomic-embed-text but specialized for foundational science

### `canon-tier-classifier.pt` (Task #2 output)
- Predicts confidence tier for any new claim
- Used to auto-tier claim cards during ingestion
- Used to power the web app's confidence-layer slider

### `canon-kg.pt` + node embeddings (Task #3 output)
- networkx graph: ~5,000 nodes (authors + concepts + claims + bridges)
- node2vec embeddings: 128-dim representations of each node
- Enables "find authors most central to bridge X" queries
- Powers the `/canon/graph` page upgrade

### `canon-llm-lora.safetensors` (Task #4 output, if GPU works)
- LoRA adapter for llama3.2:3b
- ~50MB
- When loaded onto base llama3.2, produces "canon-voiced" outputs
- "Speak about this topic in the canon style: structured claim, primary source, branch, falsifiability test"
- Could be released as a Hugging Face adapter

## Value-add ladder (revenue/grant relevance)

| Tier | What | Audience |
|---|---|---|
| **Free / public** | Open canon corpus, claim cards, bridges, web reader | Anyone, including AI training |
| **Open-source models** | canon-bge-small embedding + tier classifier on HuggingFace | ML practitioners, grant case |
| **API layer** | x402-paid endpoint: "give me canon-tier answers with citations" | AI agents, research tools |
| **Reference implementation** | bucket.foundation site itself | Donors, grant reviewers |
| **Research substrate** | The corpus + models, citable by name in papers | Academics |

## Concrete grant-case sentences this enables

> "We have built the first open, cross-domain canon of scientific
> foundations — 67,000 indexed paragraph chunks, 17 detected multi-
> branch primitives, and a tier-classified knowledge graph. Our
> canon-tuned embedding model outperforms bge-small-en-v1.5 by
> X% recall@10 on cross-branch retrieval. The corpus is open and
> tier-labeled, making it the first foundation for AI agents that
> need confidence-graded scientific grounding."

That's a Sloan / NSF / Templeton-grade pitch.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| GPU/ROCm doesn't work on this kernel | Fall back to CPU; everything works on CPU at ~3-5x slower |
| Canon-tuned embeddings overfit to cluster labels | Hold out 20% of clusters; eval on held-out cross-branch pairs |
| Tier classifier just memorizes branch labels | Audit: predictions for held-out concepts not seen in training |
| LoRA fine-tune produces incoherent canon-voice | Eval qualitatively before publishing the adapter |
| Knowledge graph too dense to be useful | Filter edges by weight; cluster nodes first |

## Open questions

1. Do we want to publish a `bucket.foundation/research` page showing
   evaluation results once training completes?
2. The canon-tuned embedding is the most natural first open-source
   release — release as MIT, name it `canon-bge-small-v1`?
3. Should the LLM-trained LoRA adapter be permissioned (research-only)
   or fully open? Lean open.
