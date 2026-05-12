# Reproduce the canon pipeline

*For collaborators who want to rebuild the canon-tuned embedding +
knowledge graph + bridge detection from a fresh clone.*

## What you get out of the box (no rebuild required)

If you `git clone` this repo, you immediately have:

| Artifact | Size | What it is |
|---|---:|---|
| `bucket-canon/**/sub-claims/*.md` | 599 cards | Curated claim cards across 9 branches |
| `bucket-canon/_bridges/detected/*/README.md` | 17 dirs | LLM-named multi-branch primitives (llama3.2:3b) |
| `bucket-canon/_bridges/detected-v2/*/README.md` | up to 18 dirs | qwen2.5-coder:7b higher-quality names |
| `_intake/embeddings-v2/claims-vectors.npy` | 920KB | 599 × 384-d canon-tuned claim embeddings |
| `_intake/embeddings/claim-evidence.jsonl` | 5.5MB | Top-10 corpus passages per claim |
| `_intake/embeddings/cross-branch-pairs.jsonl` | 1.5MB | 1,785 ranked cross-branch pairs |
| `_intake/embeddings/multi-branch-graph.json` | text | Cluster graph + per-cluster member lists |
| `_intake/embeddings/topics.json` + `topics.md` | text | UMAP+HDBSCAN cluster summary |
| `_intake/training/kg.gpickle` | 325KB | networkx knowledge graph (1,133 nodes, 2,001 edges) |
| `_intake/training/kg-embeddings.npy` | 580KB | node2vec embeddings (128-d per node) |
| `_intake/training/kg-nodes.jsonl` | 267KB | node metadata (kind, branch, h-index, etc.) |
| `_intake/training/kg-centrality.md` | text | PageRank rankings by node kind |
| `_intake/training/tier-classifier.pt` | 267KB | nucleus/functional/edge MLP (PyTorch state dict) |
| `_intake/training/tier-predictions.jsonl` | text | Predicted tier per claim |
| `_intake/training/canon-bge-small-v1/` | configs | Model config (without weights) + eval.json |

That's enough to **read the canon, run the search index, view the
knowledge graph, and predict tiers for new claims** — no GPU, no
re-training.

## What you have to download separately

The trained embedding model **weights** are too big for git:

| File | Size | Download |
|---|---:|---|
| `canon-bge-small-v1/model.safetensors` | 133MB | (planned) HuggingFace Hub: `bucket-foundation/canon-bge-small-v1` |
| `canon-bge-small-v1/tokenizer.json` | ~12MB | Same |

Until the HF release exists, the canon-tuned model is regeneratable
locally (see "Full rebuild" below) — every step is deterministic with
`--seed 42` baked in.

## Use what's already there (fast paths)

### Render the website locally

```bash
git clone https://github.com/bucket-foundation/bucket-foundation
cd bucket-foundation
npm install
npm run dev
# open http://localhost:3000/canon/search
```

The pre-computed embeddings, KG, and bridges all load from the
committed files. The web app reads them at build time.

### Use the MCP server in Claude Code / Claude Desktop

```bash
claude mcp add --scope user --transport stdio bucket-canon \
  -- python3 $(pwd)/mcp-server/bucket-canon-mcp.py
```

Then any Claude session can call `canon_search`, `canon_list_branches`,
`canon_list_bridges`, etc.

### Query the canon from Python

```python
import json, sqlite3
import numpy as np
from pathlib import Path
import pickle, networkx as nx

ROOT = Path('.')

# Claim cards
claims = []
for branch in sorted((ROOT/'bucket-canon').iterdir()):
    if not branch.name[0].isdigit(): continue
    sc = branch/'sub-claims'
    if not sc.exists(): continue
    for concept in sorted(sc.iterdir()):
        for card in sorted(concept.glob('*.md')):
            if card.name == 'INDEX.md': continue
            claims.append({'branch': branch.name, 'concept': concept.name, 'path': str(card)})
print(f'{len(claims)} claim cards')

# Pre-computed canon-tuned embeddings (no model needed for search!)
vecs = np.load(ROOT/'_intake/embeddings-v2/claims-vectors.npy')
print(f'vectors: {vecs.shape}')

# Knowledge graph
with open(ROOT/'_intake/training/kg.gpickle', 'rb') as f:
    G = pickle.load(f)
print(f'KG: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')

# Node2vec embeddings
kg_emb = np.load(ROOT/'_intake/training/kg-embeddings.npy')
print(f'node embeddings: {kg_emb.shape}')
```

That's enough to **search, traverse, and analyze the entire canon
without any GPU or training**.

## Full rebuild (~12 hours on a workstation with AMD/NVIDIA GPU)

Only needed if you want to:
- Re-extract claim cards from new YouTube transcripts
- Re-train the canon-tuned embedding with different hyperparameters
- Add new branches to the canon

### Hardware required

- GPU with ≥8GB VRAM (CUDA or ROCm-supported AMD)
- 16+ GB RAM
- ~10GB free disk for caches/checkpoints

### Step-by-step

```bash
# 0. environment
pip install --user sentence-transformers peft accelerate datasets \
                   faiss-cpu bertopic umap-learn hdbscan gensim networkx
# for AMD GPU:
pip install torch==2.9.1+rocm6.4 --index-url https://download.pytorch.org/whl/rocm6.4
# for NVIDIA GPU: install the CUDA torch wheel for your CUDA version

# 1. (optional) re-extract claims from yt/
agf-claim-extract bucket-foundation --out _intake/claims-extract --min-score 4
agf-claim-curate bucket-foundation --raw _intake/claims-extract/raw-claims.jsonl \
    --out _intake/claims-extract/curated --per-concept 30 --min-score 6
# manually distribute curated/<concept>/ folders into bucket-canon/<branch>/sub-claims/<concept>/

# 2. embed all claim cards via nomic-embed-text (ollama)
ollama pull nomic-embed-text
agf-embed-claims bucket-foundation

# 3. cross-branch nearest neighbors + topic clustering
agf-cross-branch-nn bucket-foundation
agf-topic-cluster bucket-foundation
agf-multi-branch-graph bucket-foundation

# 4. LLM-name each multi-branch primitive (slow; ~3h for 17 with qwen2.5-coder:7b)
ollama pull qwen2.5-coder:7b
agf-bridge-name bucket-foundation --top 18 --model qwen2.5-coder:7b \
    --out bucket-canon/_bridges/detected

# 5. embed the full corpus (~67K paragraph chunks)
agf-embed-corpus bucket-foundation --batch 32   # ~2.5h on CPU, faster on GPU

# 6. attach top-K corpus evidence to each claim + bridge
agf-claim-evidence bucket-foundation
agf-bridge-evidence bucket-foundation

# 7. build training triplets, train the canon-tuned embedding
agf-build-training-pairs bucket-foundation
CUDA_VISIBLE_DEVICES=0 agf-train-canon-embedding bucket-foundation --device cuda
# → _intake/training/canon-bge-small-v1/

# 8. train tier classifier + build knowledge graph
agf-train-tier-classifier bucket-foundation --device cuda
agf-build-knowledge-graph bucket-foundation

# 9. re-cluster using canon-tuned embedding (the v2 results)
agf-reembed-with-canon bucket-foundation

# 10. generate the master synthesis doc
agf-synth-truth-patterns bucket-foundation
```

Each step is idempotent and resumable. State is checkpointed in
sqlite databases and `_state.json` files.

## Determinism

All training scripts use `random.seed(42)` and `torch.manual_seed(42)`.
UMAP/HDBSCAN are deterministic with `random_state=42`. So a fresh
rebuild on identical inputs produces identical outputs (modulo
floating-point non-determinism on GPU, which is small).

## How to contribute

1. **Add a new claim card**: drop a markdown file into
   `bucket-canon/<branch>/sub-claims/<concept>/<NNN-slug>.md`. Run
   `agf-embed-claims bucket-foundation`. Open a PR.
2. **Add a new branch**: create `bucket-canon/NN-<branch>/` with at
   least one claim card. Update `src/lib/canon.ts` BRANCHES list.
3. **Improve a bridge name**: edit
   `bucket-canon/_bridges/detected/<NN-slug>/README.md`. The web page
   re-renders from that markdown.
4. **Add a new source**: extend `agf-*` tool list in
   `~/agfarms/tools/`.

PRs welcome. Branch protection on `main`; squash merges only.

## Open-source artifacts (planned releases)

| Artifact | License | Where |
|---|---|---|
| Canon corpus (claims + bridges) | CC-BY 4.0 | This repo |
| `canon-bge-small-v1` embedding | MIT | HuggingFace Hub (after first official release) |
| `bucket-canon-mcp` server | MIT | This repo (`mcp-server/`) |
| `canon-tier-classifier` | MIT | HuggingFace Hub |
| Training code (`agf-*`) | MIT | `~/agfarms/tools/` (org-wide) |

## Questions

Open an issue. Or use the MCP server in your AI agent and ask it.
