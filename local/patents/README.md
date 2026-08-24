# Local Patent Index, bkt-ibj

Local-first variant of the Bucket Foundation patent corpus, mirroring the
**Kruse Index pattern** (`~/jackkruse/`: FTS5 + dense embeddings + RRF fusion)
but for global patents and accelerated by a local AMD dGPU.

Same envelope contract as the public `bucket.foundation` deployment, drop-in
publishable when you decide to ship.

## Detected hardware on `charizard`

| Component | Spec |
|---|---|
| dGPU | AMD Radeon RX 7600M XT (Navi 33), **8 GB VRAM**, ROCm + Vulkan 1.4 |
| iGPU | Radeon 780M (Phoenix), 2 GB |
| CPU | AMD Ryzen 7 7840HS, 8 cores / 16 threads |
| RAM | 60 GB |
| Disk | 628 GB free on 930 GB NVMe (`nvme0n1p3`) |
| OS | Fedora 42, kernel 6.19 |

## Stack

| Layer | Choice | Why |
|---|---|---|
| Storage | **DuckDB 1.x + vss extension** | Single binary, OLAP-fast over patent claims, native vector search, no Postgres required for local |
| Sparse | **DuckDB FTS extension** | Same engine as the rest of the stack; mirrors Kruse Index FTS5 layer |
| Dense | **bge-small-en-v1.5 (384-dim)** via **llama.cpp Vulkan** | 384d fits 8 GB VRAM at batch 64 + 4096 token ctx; Vulkan backend skips ROCm-on-Fedora packaging pain |
| Fusion | **RRF (Reciprocal Rank Fusion), k=60** | Same fusion params as `~/jackkruse/`; battle-tested |
| Server | **Hono on Bun**, mounts `/home/gian/agfarms/feed402/routes/patents.ts` | Identical envelope contract as public deployment; `BUCKET_LOCAL_MODE=true` skips x402 auth |

## Why not ROCm + PyTorch + sentence-transformers

Tried-and-true on NVIDIA, painful on AMD Fedora as of 2026-05. ROCm wheels
exist (`torch==2.5+rocm6.2`) but PyTorch ROCm on Navi 33 + kernel 6.19 is a
support coin-flip. **llama.cpp Vulkan is supported on every AMD GPU made in the
last 8 years**, runs identically on the iGPU as a fallback, and the GGUF
embeddings are ~2× faster than ONNX runtime on this class of card.

If you later swap to a CUDA box, change one env var (`LLAMA_BACKEND=cuda`) and
rebuild llama.cpp, nothing else changes.

## File layout

```
local/patents/
  README.md                    ← this file
  scripts/
    00-bootstrap.sh            ← installs llama.cpp (Vulkan), DuckDB CLI, bge-small GGUF
    01-fetch-uspto.sh          ← pulls PatentsView parquet snapshots (resumable)
    02-ingest.py               ← parquet → DuckDB; mirrors data/patents/uspto/schema/uspto.sql
    03-embed.py                ← claim 1 + abstract → llama.cpp embedding server → DuckDB vss table
    04-search.py               ← FTS + vss → RRF → ranked claims; CLI + Python lib
    05-serve.ts                ← local feed402 server on :8402 mounting /patents/* against DuckDB
  data/                        ← .gitignored. ~80 GB after ingest, ~12 GB embeddings
  models/                      ← .gitignored. bge-small-en-v1.5-q8_0.gguf (~150 MB)
```

## One-time bootstrap

```bash
cd /home/gian/agfarms/bucket-foundation/local/patents
./scripts/00-bootstrap.sh
```

Installs:
- `llama.cpp` built with `GGML_VULKAN=1` to `/home/gian/agfarms/bucket-foundation/local/patents/.bin/`
- `bge-small-en-v1.5-q8_0.gguf` to `models/` (~150 MB)
- `duckdb` CLI to `.bin/`
- Python deps via `uv pip install` to a local `.venv/`: `duckdb`, `pyarrow`, `requests`

No system-wide installs.

## Run order

```bash
# 1. Pull USPTO snapshot (~80 GB, resumable; first run = ~6 hr on home gigabit)
./scripts/01-fetch-uspto.sh

# 2. Ingest into DuckDB (~30 min on Ryzen 7840HS)
./scripts/02-ingest.py

# 3. Start the local llama.cpp embedding server in another terminal
./.bin/llama-server -m models/bge-small-en-v1.5-q8_0.gguf --embedding -ngl 99 --port 8081

# 4. Embed claims (~4–8 hr for 8M USPTO grants on 7600M XT @ batch 64)
./scripts/03-embed.py --batch 64 --resume

# 5. Test
./scripts/04-search.py "memristor neuromorphic computing"
./scripts/04-search.py --geo "39.96,-83.00,radius=50km" --from 1900 --to 1910

# 6. Serve as feed402 (drop-in compatible with bucket.foundation chat)
BUCKET_LOCAL_MODE=true bun run scripts/05-serve.ts  # listens on :8402
```

## Wiring the public Bucket chat to your local index

In `bucket-foundation/.env.local`:

```env
FEED402_BASE_URL=http://localhost:8402
NEXT_PUBLIC_CHAT_ENABLED=true
```

Run `npm run dev` and visit `http://localhost:3000/chat`. The chat is now
querying *your* dGPU-backed corpus, no x402 payments, no network round-trips
To `bucket.foundation`. Same envelope, same citations, free.

When you're ready to publish: bump the corpus to the public DuckDB on the
Hetzner box, mount the same `routes/patents.ts` against it, agents start paying
$0.002, $0.010 per call. Zero code rewrite.

## Sizing notes

- **bge-small @ 384d × 8M USPTO grants × fp16** = ~12 GB embeddings (fits on disk; not in VRAM, that's fine, vss reads from disk)
- **Throughput on 7600M XT**: ~800-1200 claims/sec at batch 64 (Vulkan), so ~4 hr for 8M grants of just claim-1+abstract
- **Full claims set** (all claims, not just claim 1) ≈ 80M chunks → ~32 hr first-pass; resumable
- **iGPU fallback**: 780M shows up as Vulkan device 1; switch with `LLAMA_VK_DEVICE=1` if you want to keep dGPU free for chat inference

## When to graduate to ROCm + PyTorch

If/when you decide to fine-tune a domain-adapted patent embedder, switch to a
ROCm + PyTorch + `sentence-transformers` stack, embedding inference can stay
On llama.cpp Vulkan, but training needs the PyTorch path. Tracked as future
bead `bkt-patent-embedder-finetune`.
