# Bucket Academy
Technical Architecture Specification.

**Bead:** bkt-6bt (child of bkt-xo0) · **Pillar:** Engineering · **Author:** Engineering pillar (Nucleus-dispatched) · 2026-06-11
**Status:** design spec · **Mandate:** *not fast, correct and amazing.* Build-vs-buy decisions backed by real research; legal/open sources only.

This is the engineering counterpart to `PRODUCT.md` (tiers/UX) and `KNOWLEDGE-ARCHITECTURE.md` (the Concept Atom + dependency-graph model). It answers: *what do we build, on what stack, in what order, with which open-source libraries, and where are the technical risks.*

> Reading order for an implementer: this file → `KNOWLEDGE-ARCHITECTURE.md` (data model) → `PRODUCT.md` (what surfaces consume the data) → `syllabus/05-biophysics.md` (the pilot content).

---

## 0. Constraints that pin the design

These are not negotiable; they come from the existing Bucket stack and the founder mandate, and they pre-decide much of the architecture.

1. **Bucket is already Next.js 14 (App Router) on Vercel + Supabase + Story Protocol SDK + Dynamic web3 auth + `@anthropic-ai/sdk` + react-three-fiber/three.js.** (Verified from `bucket-foundation/package.json`.) Bucket Academy is a *surface inside the existing app* rather than a new app. We inherit this stack and do not fork it.
2. **This computer is a real backend.** AMD RX 7600S dGPU (8 GB VRAM, ROCm), plus a 780M iGPU; `ollama` already installed with `qwen2.5-coder:7b`, `llama3.2:3b`, `qwen3.5`, and `nomic-embed-text`. `cloudflared` is installed. This matches the founder's existing pattern at gianyrox.com/research: local box does heavy/cheap AI work, exposed via a tunnel, with cloud LLM APIs (Anthropic) for quality-critical paths.
3. **Markdown is the source of truth.** Concept Atoms are `*.md` + front-matter, git-versioned, citeable, Story-Protocol-mintable. The database is a *projection* of the markdown, never the authoritative copy. This is the Obsidian/Notion-style "files-first" constraint and it shapes the whole ingestion/sync story.
4. **Legal corpus only.** arXiv, bioRxiv, PMC-OA, OpenAlex, LibreTexts, OpenStax, MIT OCW, NCBI Bookshelf, Gutenberg, Wikisource, Bucket's own x402 gateway, and Pro-tier user-supplied PDFs they legally own. No shadow libraries. Enforced at the ingester boundary (`branches/branches.json` already encodes `sources_allowed` / `sources_forbidden`).
5. **AI metering routes through Viatika** (org policy #6). We do not roll our own credit ledger. Coordinate with Operations on the metering integration.
6. **Anti-hallucination is a hard requirement.** The tutor teaches foundations for a *general exam*. A confidently wrong derivation is the worst possible failure mode. Grounding + citation is mandatory. Coordinate with People pillar on the safety eval.

---

## 1. Stack decision

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT                                                               │
│  • Web: Next.js 14 (App Router) on Vercel — Bucket's existing app.    │
│    Bucket Academy = a route group /academy/* + React components.      │
│  • Graph view: react-force-graph (WebGL/three.js — already in stack). │
│  • Offline cache: IndexedDB (Dexie) for the PWA; WatermelonDB later   │
│    if/when we ship Expo native (P3).                                  │
└───────────────┬──────────────────────────────────────────────────────┘
                │  HTTPS (RLS-protected) + Realtime
┌───────────────▼──────────────────────────────────────────────────────┐
│  SUPABASE (Postgres + Auth bridge + Realtime + pgvector + Storage)   │
│  • Tables: atoms, edges, cards, review_log, user_card_state,         │
│    mastery, decks, art_assets, corpus_docs, chunks(pgvector).        │
│  • RLS: user state is per-user; atom/graph content is public-read.   │
│  • Edge Functions: thin orchestration only (call the GPU box / API). │
└───────────────┬───────────────────────────────────┬──────────────────┘
                │  (quality path)                    │ (cheap/bulk path)
┌───────────────▼─────────────┐      ┌───────────────▼──────────────────┐
│  CLOUD LLM (Anthropic SDK)  │      │  THIS COMPUTER — "the GPU box"    │
│  • Tutor (grounded, cited)  │      │  exposed via `cloudflared`        │
│  • Card/quiz gen (quality)  │      │  named tunnel → academy-gpu.…     │
│  • Exam grading             │      │  • FastAPI service:               │
│  • Metered via Viatika      │      │    - embeddings (nomic-embed)     │
└─────────────────────────────┘      │    - bulk atom extraction (qwen)  │
                                     │    - ART gen (SDXL-Turbo, ROCm)   │
                                     │    - the corpus ingest pipeline   │
                                     │  • Postgres-side jobs write back  │
                                     │    to Supabase via service key.   │
                                     └───────────────────────────────────┘
        ▲
        │  git is the source of truth for atoms
┌───────┴──────────────────────────────────────────────────────────────┐
│  GIT REPO (learning/atoms/NN-branch/*.md)                            │
│  • CI job (or local watcher) parses front-matter → upserts to        │
│    Supabase. DB is a derived projection, never authoritative.        │
└──────────────────────────────────────────────────────────────────────┘
```

**Why this split and not "all cloud" or "all local":**

- **Quality-critical, low-volume, user-facing latency-sensitive** work (the Socratic tutor turn, exam grading, the final card-generation pass) → **Anthropic API**. It's the best model, it's already wired (`@anthropic-ai/sdk` is a dependency), and tutor correctness is the whole ballgame. Metered through Viatika so cost is governed.
- **Bulk, cheap, embarrassingly-parallel, non-latency-sensitive** work (embedding 10k corpus chunks, first-pass atom extraction over a nightly arXiv pull, generating art anchors for 60 atoms) → **the GPU box**. Marginal cost ≈ electricity. This is exactly the founder's research-tools pattern and it keeps the AI cost curve from killing the freemium model.
- **The web app stays on Vercel/Supabase** because that's where Bucket lives and where auth/billing/IP-minting already are. We do not stand up a parallel platform.

**Where the GPU box fits precisely:** it runs a small **FastAPI** (or `aiohttp`) service with these endpoints, all behind the cloudflared tunnel + a shared bearer token:
- `POST /embed`, `nomic-embed-text` via ollama (768-dim) for corpus chunks and atom bodies.
- `POST /extract`, first-pass atom extraction from a corpus doc (qwen2.5-coder/qwen3.5 local), later validated by Claude.
- `POST /art`, SDXL-Turbo on ROCm, returns a PNG; uploads to Supabase Storage; writes `art_assets` row.
- `POST /ingest/run`, kicks the nightly corpus pipeline (idempotent; same pattern as the existing `pursue-mirror`/`sacred-history` systemd timers in this repo).

The web app never calls ollama or the GPU box *directly from the browser* (the search results are explicit: never expose ollama's port to the internet). All GPU-box calls go **server-side** from a Supabase Edge Function or a Next.js route handler holding the bearer token, or are pre-baked into the DB by the nightly batch jobs.

---

## 2. Data model

### 2.1 The reconciliation problem: git markdown ↔ Postgres

The hard architectural question. Resolution: **git is the source of truth for *content* (atoms, edges, the syllabus); Postgres is the source of truth for *per-user state* (FSRS, mastery, XP) and a *read-optimized projection* of content.**

```
  AUTHORITATIVE                         DERIVED / RUNTIME
  ─────────────                         ─────────────────
  learning/atoms/**/*.md   ──parse──▶   atoms, edges, cards         (content projection)
  learning/syllabus/*.md   ──parse──▶   shells, ordering            (path projection)
                                        user_card_state, review_log (NOT in git — per user)
                                        mastery, decks, art_assets  (NOT in git — runtime)
```

**Sync direction is one-way for content:** markdown → DB. A change to an atom is a git commit; a CI step (GitHub Action) or a local `chokidar` watcher parses the front-matter and **upserts** by `id`. This means:
- Atoms are reviewable in PRs (canon quality gate), versioned, diffable, mintable.
- The DB can always be rebuilt from git (`learning/engine/sync.ts --rebuild`). No dual-write drift.
- User state is never in git (privacy + scale), only ever in Postgres, backed up normally.

**Idempotency contract:** the sync is keyed on the atom `id` (e.g. `bp.thermo.boltzmann-distribution`) and a content hash. Re-running the sync over an unchanged tree is a no-op (same discipline as the existing canon/mirror jobs). Deleted markdown → soft-tombstone the DB row (don't hard-delete; user FSRS state may reference it).

**Pro-tier user PDFs are the exception**, those atoms are *user-private*, never committed to the shared git repo. They live only in Postgres under that user's RLS scope, generated by the GPU box from the PDF the user uploaded. This is also the clean legal boundary: shared canon = git + public; "your textbook" = your row, your eyes only.

### 2.2 Postgres schema

```sql
-- ============ CONTENT (projection of git; public-read) ============

create table atoms (
  id            text primary key,              -- e.g. 'bp.thermo.boltzmann-distribution'
  branch        text not null,                 -- '05-biophysics'
  shell         text not null check (shell in ('prereq','nucleus','frontier')),
  type          text not null check (type in ('concept','equation','method','result','figure')),
  title         text not null,
  body_md       text not null,                 -- Feynman explanation → formal → worked example
  equation      text,                          -- LaTeX, nullable
  mastery_signal text not null check (mastery_signal in ('recall','apply','derive','teach')),
  art_prompt    text,
  canon_ref     text,                          -- 'bucket-canon/02-physics/statistical-mechanics'
  sources       jsonb not null default '[]',   -- ['openstax-physics','arxiv:cond-mat/...']
  content_hash  text not null,                 -- for idempotent sync
  centrality    real default 0,                -- nucleus score (Data pillar computes; see §2.4)
  updated_at    timestamptz not null default now()
);
create index on atoms (branch, shell);

create table edges (
  src       text not null references atoms(id),  -- the dependency
  dst       text not null references atoms(id),  -- the dependent
  kind      text not null check (kind in ('requires','unlocks','bridge')),
  primary key (src, dst, kind)
);
-- 'requires': dst requires src.  'unlocks': src unlocks dst (inverse, denormalized for traversal).
-- 'bridge': cross-branch polymathy edge.

create table cards (                            -- generated drill items for an atom
  id         uuid primary key default gen_random_uuid(),
  atom_id    text not null references atoms(id),
  kind       text not null check (kind in ('recall','cloze','apply','derive','teach')),
  front_md   text not null,
  back_md    text not null,
  gen_model  text,                              -- provenance: 'claude-…' | 'qwen…'
  gen_meta   jsonb default '{}',                -- grounding sources, validation status
  created_at timestamptz not null default now()
);
create index on cards (atom_id);

create table art_assets (
  atom_id    text primary key references atoms(id),
  storage_path text not null,                   -- Supabase Storage key
  prompt     text not null,
  model      text not null,                     -- 'sdxl-turbo' | 'flux-schnell' | …
  created_at timestamptz not null default now()
);

-- ============ CORPUS + RAG (for the tutor; public-read for shared, RLS for user PDFs) ============

create table corpus_docs (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,                     -- 'arxiv:2401.xxxxx' | 'pmc:PMC123' | 'user-pdf:<uid>'
  owner_id   uuid references auth.users(id),    -- null = shared/public; set = private user PDF
  title      text,
  license    text not null,                     -- enforced legal provenance
  url        text,
  branch     text
);

create table chunks (
  id         uuid primary key default gen_random_uuid(),
  doc_id     uuid not null references corpus_docs(id) on delete cascade,
  atom_id    text references atoms(id),         -- nullable link to the atom it supports
  text       text not null,
  embedding  vector(768),                       -- pgvector, nomic-embed-text dim
  tsv        tsvector generated always as (to_tsvector('english', text)) stored
);
create index on chunks using hnsw (embedding vector_cosine_ops);
create index on chunks using gin (tsv);          -- hybrid search (vector + BM25-ish)

-- ============ PER-USER STATE (RLS: owner only; never in git) ============

create table user_card_state (                  -- the FSRS memory state, one row per (user,card)
  user_id     uuid not null references auth.users(id),
  card_id     uuid not null references cards(id),
  -- FSRS card fields:
  due         timestamptz not null,
  stability   real not null,
  difficulty  real not null,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  reps        integer not null default 0,
  lapses      integer not null default 0,
  state       smallint not null default 0,       -- 0 New 1 Learning 2 Review 3 Relearning
  last_review timestamptz,
  primary key (user_id, card_id)
);
create index on user_card_state (user_id, due);   -- "what's due now" is the hot query

create table review_log (                          -- append-only; feeds FSRS optimizer + analytics
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id),
  card_id    uuid not null references cards(id),
  rating     smallint not null check (rating in (1,2,3,4)),  -- Again/Hard/Good/Easy
  state      smallint not null,
  due        timestamptz,
  stability  real, difficulty real,
  elapsed_days integer, last_elapsed_days integer, scheduled_days integer,
  reviewed_at timestamptz not null default now()
);
create index on review_log (user_id, reviewed_at);

create table mastery (                             -- per-atom rollup for the skill tree + gap report
  user_id    uuid not null references auth.users(id),
  atom_id    text not null references atoms(id),
  level      real not null default 0,             -- 0..1 derived from card stabilities
  signal_met text,                                 -- highest mastery_signal demonstrated
  unlocked   boolean not null default false,       -- prereqs satisfied?
  updated_at timestamptz not null default now(),
  primary key (user_id, atom_id)
);

create table decks (                               -- a user's chosen study set (a branch path, custom, etc.)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  branch text,
  card_ids uuid[] not null default '{}'
);
```

**RLS posture:** `atoms`, `edges`, `cards`, `art_assets`, shared `corpus_docs`/`chunks` → `select` for everyone (anon + authed). `user_card_state`, `review_log`, `mastery`, `decks`, and user-owned `corpus_docs`/`chunks` → `using (auth.uid() = user_id)`. Supabase RLS on pgvector is the documented pattern for per-user RAG scoping, which is exactly what the Pro-PDF feature needs.

### 2.3 Why this shape

- One `atoms` row ⇄ one markdown file ⇄ one graph node ⇄ N `cards` ⇄ 1 `art_asset` ⇄ M `chunks`. The "write once, reuse everywhere" promise of `KNOWLEDGE-ARCHITECTURE.md §2` becomes a literal star-schema around `atom_id`.
- FSRS state is normalized to `(user, card)` because FSRS schedules *cards*, while mastery is rolled up to `(user, atom)` because the skill tree and gap report reason about *concepts*. Both views are first-class.
- `review_log` is append-only and carries the full FSRS feature vector at review time → it is exactly the input the FSRS optimizer needs to fit per-user parameters later (Data pillar territory; see §3.3).

### 2.4 Nucleus centrality
Handoff to Data.

`atoms.centrality` is computed *offline* by the Data pillar over the `edges` graph (PageRank / betweenness, per `RESEARCH-PLAN.md`). Engineering's job is only to (a) expose the graph (`edges`), (b) store the score, (c) order the default learning path by it. The actual centrality math is a Data deliverable. We provide the substrate; they provide the ranking. This is a clean cross-pillar seam.

---

## 3. FSRS implementation

### 3.1 Library decision: **`ts-fsrs`** + **`py-fsrs`**
Both from Open Spaced Repetition.

| Need | Library | Why |
|------|---------|-----|
| Runtime scheduling (every review, in the app) | **`ts-fsrs`** (npm `ts-fsrs`, Node ≥20, ES/CJS/UMD) | Pure TypeScript, runs in the browser **and** in Edge Functions, zero heavy deps. It's the official OSR TS port and powers many production SRS apps. Lets us schedule client-side for instant feedback *and* re-validate server-side. |
| Parameter optimization (fit per-user weights from `review_log`) | **`py-fsrs`** (PyPI `fsrs`, Python 3.10+) with its lazy-loaded `Optimizer`, or `fsrs-optimizer` | Optimization needs ML deps (torch), perfect for the **GPU box**, wrong for the browser. Runs as a periodic batch job on the local machine over each user's review history. |

This is the **canonical OSR split** the research confirms: ts-fsrs is runtime-only by design; the optimizer lives separately (`@open-spaced-repetition/binding` in TS land, or `py-fsrs.Optimizer` in Python). We use the Python optimizer on the box because the box already has the GPU and the batch-job pattern.

**Algorithm version:** target **FSRS-6** (current as of Anki 25.07; adds `w20` to personalize the forgetting curve, plus same-day-review parameters). `ts-fsrs` and `py-fsrs` both track FSRS-6. We pin a version and record it in `gen_meta`/migration notes so a future algorithm bump is a deliberate, logged migration ahead of silent drift.

### 3.2 How scheduling integrates

```ts
// learning/engine/schedule.ts  (shared TS, runs client + Edge)
import { fsrs, generatorParameters, Rating, createEmptyCard } from 'ts-fsrs';

const params = generatorParameters({
  request_retention: 0.90,        // target retention; Pro can tune 0.80–0.95
  // w: <per-user weights from the optimizer, fetched from a `user_fsrs_params` row;
  //    falls back to FSRS-6 defaults for new users>
});
const f = fsrs(params);

// On showing a card we already hold its user_card_state as an FSRS `Card`.
// On the user's answer (Again/Hard/Good/Easy):
const scheduling = f.repeat(card, now);           // -> {Again,Hard,Good,Easy} previews
const next = scheduling[Rating.Good].card;        // chosen branch
const logItem = scheduling[Rating.Good].log;      // -> append to review_log

// Persist: upsert user_card_state(next), insert review_log(logItem).
```

**Flow:** client computes the four previews instantly (no round-trip → Apple-grade snappiness), shows the projected intervals on the answer buttons (Anki-style), and on tap writes back `user_card_state` + `review_log` to Supabase. A server-side check in the same Edge Function re-runs `ts-fsrs` on the submitted rating to prevent client tampering of intervals (cheap, deterministic).

**"What's due now"** is a single indexed query: `select … from user_card_state where user_id = auth.uid() and due <= now() order by due`. The daily-path screen joins that against `mastery`/`edges` to also surface the next *new* nucleus atom whose prerequisites are satisfied.

**Per-user optimization loop:** nightly (or on-demand at e.g. ≥1000 reviews) the GPU box pulls a user's `review_log`, runs `py-fsrs` Optimizer → writes optimized `w` weights to a `user_fsrs_params` row. The app reads those on next session. New users use FSRS-6 defaults until they have enough history. This is a Data + Engineering shared job.

### 3.3 FSRS math ownership

The *algorithm* (DSR memory model, the stability/difficulty update equations, optimizer loss) is **Data pillar's** analysis deliverable. Engineering's contract: use the library, store the state in the schema above, run the optimizer batch job on the box, and never hand-roll the math. (Rolling our own scheduler is the single most tempting and most wrong thing we could do here, FSRS is a fitted ML model with years of public-data tuning behind it.)

---

## 4. AI pipeline

Four distinct workloads, each with its own model/latency/cost profile and its own grounding requirement.

### 4.1 Card / quiz generation

**Pattern:** two-pass. (1) GPU box (`qwen2.5-coder:7b` / `qwen3.5`) does a cheap *first draft* of recall/cloze/apply/derive/teach cards from an atom's `body_md` + `equation`. (2) Claude (Anthropic SDK, metered via Viatika) does a *quality + grounding* pass: rewrites for pedagogy, verifies the answer against the atom's cited sources, flags anything it can't ground. Output → `cards` rows with `gen_model` + `gen_meta.validation`.

- **Free tier:** cards are pre-generated in batch (box first-draft + nightly Claude validation pass), so a free user reads pre-made cards (zero per-user AI cost).
- **Pro tier:** on-demand generation (user asks for more cards on an atom, or generates from their own PDF) → Claude path, metered.

Grounding rule: a generated card whose answer cannot be traced to the atom body or a cited chunk is **quarantined** (`gen_meta.validation = 'ungrounded'`) and not shown until reviewed. This is the People-pillar safety seam.

### 4.2 Socratic tutor
RAG over the corpus.

This is the highest-stakes AI surface. Architecture:

```
user question
  └─▶ context assembly (server-side, in an Edge Function / route handler):
        1. identify the current atom (the screen the user is on) → its body + equation + sources
        2. pull its graph neighborhood: requires[] (what it depends on) + unlocks[]
           — so the tutor knows the prerequisite vocabulary it may use
        3. hybrid retrieval over `chunks`: vector (pgvector cosine, nomic-embed query)
           + full-text (tsv / BM25-ish), reciprocal-rank-fused (RRF) — same hybrid
           pattern as the existing Kruse Index in this repo
        4. assemble a grounded prompt: [atom canon] + [neighbor atoms] + [top-k cited chunks]
  └─▶ Claude (Anthropic), system prompt: "Socratic. You may ONLY assert what is supported
        by the provided canon/chunks. Cite atom ids / source ids inline. If the answer
        is not in context, say so and ask a guiding question instead of inventing."
  └─▶ response post-check: every factual claim must carry a citation token that resolves
        to a provided source; uncited assertions are flagged/stripped before display.
```

**Why hybrid retrieval over pure vector:** the 2025 RAG research is consistent, hybrid (vector + keyword) beats pure vector by ~10-15% on accuracy, and equations/symbols/proper nouns (which dominate this corpus: "Poisson, Boltzmann", "Φ-value", "Levinthal") are exactly where keyword search rescues vector search. We already run this exact RRF hybrid pattern in the Kruse Index (`FTS5 + MiniLM + RRF`), so the team has the pattern in muscle memory. In Supabase it's pgvector HNSW + a `gin(tsv)` index fused in SQL.

**Grounding is enforced in three places** (defense in depth, per the founder's anti-hallucination mandate + People pillar coordination):
1. **Retrieval:** the model only sees canon + cited chunks (no open-web).
2. **Prompt:** explicit "only assert what's supported; cite inline; admit ignorance."
3. **Post-check:** a deterministic pass that verifies citation tokens resolve and (optionally) a cheap box-model "does this claim appear in the cited chunk?" entailment check. Ungrounded claims are stripped or the turn is re-asked.

The **eval suite** for this (does the tutor hallucinate? Does it cite? Does it teach Socratically vs lecture?) is a **People pillar** deliverable; Engineering builds the suite *hooks* (a logged, replayable tutor-turn record with the assembled context + response + citations) so People can score it offline.

### 4.3 Three-depth explanations

Not three separate generations, one atom, three renderings. The atom `body_md` is authored "Feynman first → formal → worked example." ELI5 / undergrad / grad are produced by Claude conditioned on the same grounded context with a depth parameter, cached per `(atom_id, depth)` in a small table so the common depths are free to serve. Pro gets arbitrary re-explanations; Free gets the three cached depths.

### 4.4 ART generation
**on-GPU, SDXL-Turbo, batch**

The research is decisive for our hardware:

- **RX 7600S has 8 GB VRAM.** SDXL (and **SDXL-Turbo**) is the right fit at 8 GB; SD3.5-Large and FLUX want 12 GB+ and need aggressive quantization that degrades quality on already-slower-than-NVIDIA ROCm. So: **SDXL-Turbo locally for the bulk/free art**, with an optional **API path (e.g. A hosted FLUX/SD3.5) for Pro "custom high-res" art** where quality justifies the spend.
- **SDXL-Turbo is few-step** (1-4 steps), which on ROCm makes per-image latency tolerable for *batch* generation. ROCm is ~30-50% slower than NVIDIA at equivalent VRAM, so this is **not** an interactive "generate while you wait" surface, it's a **nightly batch** that pre-bakes the art anchor for every nucleus atom into `art_assets` + Supabase Storage. Free users see pre-generated public art (zero per-user cost, instant load).
- **Pro custom art** is on-demand. If local latency is acceptable it runs on the box; if a user wants high-res/fast it routes to a metered API (Viatika-governed). Either way it writes an `art_assets`-style row scoped to the user.

**Cost model** (hand off the dollar figures to Operations): local SDXL-Turbo marginal cost ≈ electricity (~free); the only real AI cost on the free tier is the nightly Claude *validation* pass on cards and the cached explanations, both bounded and batchable. The variable cost that scales with users is the **Pro tutor** (Claude turns) and **Pro custom art** (API), which is exactly what the Pro price is meant to cover. Operations owns the unit-economics model; Engineering's contribution is that the *architecture* pushes all the cheap/bulk work onto the box so the cost curve is gentle.

### 4.5 Embeddings

`nomic-embed-text` (768-dim) via ollama on the box for *all* embeddings (corpus chunks + atom bodies + Pro-PDF chunks). One model, one dimension, one HNSW index. Free, local, batchable. (We deliberately avoid an embeddings API to keep RAG cost at zero.)

---

## 5. Knowledge-graph rendering

**Decision: `react-force-graph` (the `react-force-graph-2d` / `-3d` family) as the primary renderer, with `sigma.js` held in reserve only if a branch graph ever exceeds ~5-10k visible nodes.**

Reasoning, matched to our actual constraints:

| Library | Verdict for Bucket | Why |
|---------|--------------------|-----|
| **`react-force-graph`** (vasturiano) | **CHOSEN** | WebGL/Canvas, three.js-based (the **3d** variant renders with ThreeJS), and **Bucket already ships `three`, `@react-three/fiber`, `@react-three/drei`**. So the 3D "nucleus map" reuses the existing 3D stack and visual language. Clean React API, force-directed physics (d3-force-3d), node/link hover/click/drag, zoom/pan out of the box. A branch nucleus is 30-60 atoms; a whole branch with frontier maybe a few hundred, comfortably inside its performance envelope, and the 3D mode is exactly the "beautiful, navigable nucleus" the product wants. |
| `sigma.js` + graphology | reserve | The WebGL performance king (100k+ nodes, off-main-thread ForceAtlas2). We don't need 100k nodes per *view* (a learner navigates one nucleus at a time). Keep it as the escape hatch if we ever render the *entire cross-branch polymath graph* at once. |
| `cytoscape.js` | no (for the hero map) | Canvas/SVG degrades ~3-10k nodes; great for analysis, heavier React story, some way from the prettiest. Possible for a static "analysis" admin view, away from the learner-facing hero. |
| `react-flow` | no (for the map) | Built for node-based *editors/workflows* rather than force-directed knowledge graphs. **But** it's the right tool for an **atom-authoring / dependency-editing admin UI** (drag to draw `requires` edges). So: react-flow for *editing the graph*, react-force-graph for *exploring* it. |

**Rendering contract:** the graph view reads `atoms` (nodes, sized/colored by `centrality` and `shell`, lit-up by the user's `mastery.level`) + `edges` (links, styled by `kind`: requires/unlocks/bridge). Mastered atoms glow; the current frontier (unlocked-but-unmastered) pulses; locked atoms are dim. Clicking a node opens its atom + cards. This is the Duolingo skill-tree reimagined as a real dependency graph, the stated differentiator.

---

## 6. Corpus ingestion pipeline

Bucket already has `arxiv|pubmed|openalex|gutenberg|wikisource` ingesters live (`KNOWLEDGE-ARCHITECTURE.md §3`) and the repo already runs autonomous idempotent mirror jobs as **systemd --user timers** (`pursue-mirror`, `sacred-history-mirror`). We reuse both the ingesters and that exact job pattern.

```
nightly per branch (priority-ordered; biophysics hourly during exam prep — branches.json):

  [1] PULL   existing ingester → raw doc (arxiv/biorxiv/pmc-oa/openalex/libretexts/…)
             license recorded; forbidden sources rejected at this boundary.
  [2] NORMALIZE  → markdown + provenance (source id, license, url) → corpus_docs row
  [3] CHUNK + EMBED  (GPU box: nomic-embed) → chunks rows (vector + tsv)
  [4] EXTRACT ATOMS  (GPU box first-draft qwen → Claude validate) → candidate atoms
        • dedup against existing atoms by id + embedding similarity (don't duplicate canon)
        • new/changed candidates become *proposed* markdown files in a branch PR
  [5] LINK GRAPH  infer requires/unlocks edges (Data pillar's extraction logic) → edges
  [6] REGEN DECK  (re)generate cards for new/changed atoms → cards
  [7] FEED GAPS   push "what's weak / what's new" to Nucleus brain (the existing /api/feed)
```

**Key discipline:** steps [4], [5] produce **proposed markdown in a PR** ahead of silent DB writes, because **git is the source of truth (§2.1)** and atoms are canon (they get a human/quality gate). The DB-side sync (§2.1) then projects the merged markdown. This keeps the "AI grows the corpus continuously" promise without letting AI silently mutate canon.

**Run location:** all of this is **GPU-box** work (idempotent systemd timer, same as the two existing mirror jobs), writing to Supabase via the service-role key. It is explicitly *not* Vercel work (Vercel functions are too short-lived and too expensive for batch ingestion). The box is on, lingering, and already runs exactly these kinds of jobs.

**Legal enforcement** lives at step [1]: the ingester checks the source against `branches.json:sources_allowed`. Pro-PDF import is a *separate* path (user-triggered, user-scoped, never enters the shared corpus/git). This is the architecture-level expression of the "no piracy, user supplies what they own" rule and is a compliance seam to coordinate with Operations.

---

## 7. Offline / sync
PWA vs native, mobile path.

**P0, P2: PWA over native.** Justification:
- Bucket is a Next.js web app; a PWA is zero new platform and ships everywhere (including installable on iOS/Android home screens).
- The offline need at P1/P2 is modest: cache today's due cards + their atoms/art so a session survives a subway ride. That's **IndexedDB via Dexie** holding `user_card_state` for due cards + the relevant `cards`/`atoms`/art blobs, with FSRS computed locally by `ts-fsrs` (already client-capable) and a **deferred write queue** that flushes `review_log`/`user_card_state` to Supabase on reconnect.
- Conflict policy is trivial because FSRS state is per-(user,card) and reviews are an append-only log: last-write-wins on `user_card_state`, and `review_log` just appends (a replayed/duplicated review is deduped by a client-generated idempotency key). No CRDT needed.

**P3: Expo native** (only when mobile retention/notifications justify it). The research points at the canonical offline-first RN stack: **Expo + WatermelonDB (SQLite) + Supabase sync**, where WatermelonDB tracks created/updated/deleted since last sync and drives bidirectional sync, a natural fit for SRS where the due-card set is the working set. Native buys real push notifications (the Duolingo streak-reminder engine) and a better daily-habit surface, which is the actual reason to go native. Until then, PWA + Web Push covers most of it.

**Realistic mobile path:** PWA (installable, Web Push) through P2 → Expo native at P3 if and only if the data says notifications/retention need it. Don't build native early; it doubles the surface for a habit feature we can approximate with a PWA first.

---

## 8. Hosting & metering

**P0/P1: this computer as backend, via `cloudflared` named tunnel** (already installed). The box runs the FastAPI GPU service + the ingestion/optimizer timers; the tunnel exposes only the FastAPI service (bearer-token auth, never ollama's raw port, the research is explicit about not exposing ollama). The Vercel app calls the tunnel **server-side** with the bearer token. This mirrors gianyrox.com/research and Bucket's own systemd-mirror pattern, and costs ~$0 beyond electricity. Stream-friendly tunnel config (no buffering of `text/event-stream`) for tutor streaming.

**P2+ scale path:** if/when concurrent load outgrows one box, the GPU service is stateless behind the tunnel, so it lifts cleanly to a rented GPU (Hetzner/Runpod) by repointing the tunnel, no app changes. The quality LLM path is already on Anthropic's API, which scales independently. Supabase scales as the managed Postgres it is. So "this computer" is a P0/P1 cost optimization rather than an architectural dependency we'd have to unwind.

**Metering (Viatika, org policy #6):** every *cloud* AI call (Claude tutor/grading/validation, any API art) goes through the **Viatika vendor API** for budget enforcement + x402 settlement, we do **not** build a credit ledger. The free-tier daily cap (`PRODUCT.md §4`) is enforced as a Viatika budget per user. Local box AI (embeddings, SDXL-Turbo, qwen drafts) is $0 and doesn't meter, but we still *log* its usage for analytics. **Owner: Operations** (cost model + Viatika wiring); Engineering integrates the SDK at the cloud-call boundary.

---

## 9. The P0 build

**Goal:** prove the engine + pedagogy with **zero UI**, a terminal FSRS quiz loop over the biophysics nucleus atoms. This is also immediately useful: it's Gian's actual general-exam prep.

### 9.1 Scope
- ~40 biophysics nucleus atoms authored as markdown (`learning/atoms/05-biophysics/*.md`), front-matter per `KNOWLEDGE-ARCHITECTURE.md §2`. (Content is the gating input; the loop below works against however many exist.)
- A local CLI in `learning/engine/` that: parses atoms → generates/loads cards → schedules with **FSRS** → quizzes in the terminal → persists state to a local **SQLite** file (not Supabase yet, keep P0 dependency-free).

### 9.2 Stack for P0
- **Language:** TypeScript + `ts-fsrs` (so the scheduling code is *the same code* P1 will reuse in the browser, no rewrite). Run via `tsx`/`ts-node` (`ts-node` is already a repo dep).
- **Store:** local SQLite (`better-sqlite3`) with the §2.2 schema minus the cloud/RLS bits, `atoms`, `cards`, `user_card_state`, `review_log`. A direct precursor of the Supabase schema, so P1 migration is a connection-string swap + RLS with no redesign.
- **Card gen:** GPU box (`ollama` qwen) for first-draft cards from atom bodies, optional Claude validation. (P0 can even hand-author a few cards to start the loop before wiring gen.)
- **No network required to run the loop** once cards exist, proves the offline-capable design.

### 9.3 The loop
```
$ bucket-academy review --branch 05-biophysics
Due today: 12 cards (3 new nucleus atoms unlocked)

[1/12]  bp.thermo.boltzmann-distribution  (derive)
  Q: Derive p_i for a system in contact with a heat bath at temperature T.
  (press enter to reveal)
  ─────────────────────────────────────────────
  A: p_i = e^{-E_i/kT} / Z,  Z = Σ_j e^{-E_j/kT}   [grounded: openstax-physics, libretexts-pchem]
  How did you do?  [1] Again  [2] Hard  [3] Good  [4] Easy
> 3
  next review in 4d  (stability 6.1 ↑)

… (loop) …

Session: 12 reviewed · retention 83% · streak 4🔥
Weak atoms → fed to gap report:  bp.folding.levinthal, bp.binding.partition-function
```
Each answer runs `ts-fsrs` `repeat()`, writes `user_card_state` + `review_log`, and rolls up `mastery`. The "weak atoms" report is the seed of the §2.4 gap-feedback to the Nucleus brain.

### 9.4 P0 acceptance
- Re-running the CLI on consecutive days surfaces the correct due set (FSRS intervals visibly grow with Good/Easy, shrink with Again).
- The same `schedule.ts` module is importable unchanged into a Next.js client component (proves the P0→P1 no-rewrite claim).
- Atom markdown ⇄ SQLite sync is idempotent (re-parsing an unchanged tree changes nothing).

---

## 10. P0 → P1 → P2 sequencing & technical risks

### P1
The web app.

- Lift the P0 SQLite schema to **Supabase** (add RLS, Realtime, pgvector). The §3.2 `schedule.ts` runs unchanged client-side.
- Build the `/academy/*` route group in the existing Next app: daily-loop screen, atom reader (3-depth), card drill, and the **react-force-graph** nucleus map.
- Pre-bake art (SDXL-Turbo batch on the box) + pre-generate cards (box→Claude validate batch). Free tier = pre-made content, $0 per-user AI.
- Socratic tutor v1: grounded RAG (pgvector hybrid) + Claude, with the 3-place grounding enforcement (§4.2). Capped per `PRODUCT.md §4` via Viatika.
- **Key risks:** (a) **tutor hallucination**, mitigated by §4.2 + People-pillar eval suite; this is the #1 product risk. (b) **graph beauty vs legibility** at 60+ nodes, mitigated by shell-based filtering and react-force-graph's 3D layout, plus Product-pillar IA. (c) **markdown↔DB sync drift**, mitigated by one-way content sync + content-hash idempotency (§2.1).

### P2, Pro tier
- PDF import (user-owned) → GPU box extraction → user-scoped private atoms/chunks (the legal boundary, §6). **Risk:** extraction quality on messy PDFs; mitigate with a review step before cards are scheduled.
- Exam-Simulator (timed, mixed-topic, AI-graded, gap report), Claude grading, metered.
- Custom art (on-demand, box or API), advanced analytics (forgetting curves from `review_log`), Stripe billing **with metering through Viatika** (Operations owns).
- Per-user FSRS optimization (py-fsrs on the box) once users have ≥~1000 reviews.
- **Key risks:** (a) **AI unit economics**, the Pro tutor + custom art are the variable cost; the architecture already pushes everything cheap onto the box, but Operations must validate price > cost. (b) **billing/metering correctness**, Viatika integration must be exact (don't double-charge, don't under-meter). (c) **privacy/compliance** on user PDFs (COPPA/FERPA/GDPR), Operations seam.

### P3
Social + Scholar + mobile.

- Leagues/streaks/co-op, challenge-a-friend, public knowledge portfolios.
- Scholar tier: author atoms → **mint to Story Protocol** (the SDK is already in the app) → citation fees. Closes Bucket's learn→contribute→earn loop.
- Expo native (WatermelonDB sync) **only if** retention data justifies push-notification-driven habit.

### Cross-cutting technical risks
1. **Tutor grounding** (correctness mandate), the dominant risk; defense-in-depth in §4.2 + People eval. A wrong derivation on a general-exam prep tool is unacceptable.
2. **ROCm fragility**, AMD/ROCm image-gen is slower and occasionally finicky vs NVIDIA. Mitigation: batch (not interactive) art, SDXL-Turbo (8 GB-safe), and an API fallback for Pro. Keep art off the hot path.
3. **Single-box availability**, P0/P1 lean on one machine. Mitigation: the GPU service is stateless behind the tunnel and lifts to rented GPU without app changes; nothing user-facing-critical (the quality LLM path) depends on the box.
4. **Canon integrity under AI growth**, AI proposes atoms via PR, humans/quality-gate merge, DB projects from git. AI never silently mutates canon (§6).

---

## Appendix A
Concrete library/version picks.

| Concern | Pick | Notes |
|---------|------|-------|
| Web framework | **Next.js 14 App Router** | existing |
| Hosting (app) | **Vercel** | existing |
| DB / auth / storage / realtime | **Supabase** (Postgres + pgvector + RLS) | existing |
| FSRS runtime | **`ts-fsrs`** (npm) | client + Edge; same code P0→P1 |
| FSRS optimizer | **`py-fsrs`** (`fsrs` on PyPI) or `fsrs-optimizer` | GPU-box batch |
| FSRS version | **FSRS-6** | pin + log migrations |
| Graph explore | **`react-force-graph`** (2d/3d) | reuses existing three.js/r3f |
| Graph edit (admin) | **`react-flow`** | authoring dependency edges |
| Graph escape hatch | **`sigma.js` + graphology** | only if >5-10k nodes/view |
| Embeddings | **`nomic-embed-text`** via ollama (768-dim) | box, $0 |
| RAG | **pgvector HNSW + `gin(tsv)` hybrid + RRF** | mirrors Kruse Index |
| Quality LLM | **Anthropic via `@anthropic-ai/sdk`** | existing dep; metered via Viatika |
| Bulk LLM | **qwen2.5-coder / qwen3.5** via ollama | box, $0 |
| Art | **SDXL-Turbo on ROCm** (batch) + optional API for Pro | 8 GB-safe |
| Offline (web) | **Dexie/IndexedDB** + deferred write queue | P1/P2 |
| Offline (native) | **Expo + WatermelonDB + Supabase sync** | P3 only |
| Tunnel | **`cloudflared`** named tunnel | installed; bearer-auth; never expose ollama |
| Metering | **Viatika vendor API** | org policy #6; Operations owns |
| IP minting | **Story Protocol SDK** | existing dep; Scholar tier |

## Appendix B, cross-pillar seams

| Seam | Engineering provides | Other pillar owns |
|------|----------------------|-------------------|
| Nucleus centrality | `edges` graph + a `centrality` column + path ordering | **Data**: PageRank/betweenness math |
| FSRS math | library integration + schema + optimizer job | **Data**: algorithm analysis, param tuning |
| Tutor safety | replayable logged tutor-turn (context+response+citations) | **People**: hallucination eval suite + scoring |
| AI cost / metering | the cloud-call boundary + Viatika SDK integration | **Operations**: unit-economics model, Viatika wiring, compliance |
| UX / IA of graph + loop | the renderer + data contracts | **Product**: IA, micro-interactions, Apple-grade flows |
| Pricing / freemium caps | the cap-enforcement hook | **Revenue**: tier prices; **Operations**: cap values |

---

## Sources

- ts-fsrs (Open Spaced Repetition): https://github.com/open-spaced-repetition/ts-fsrs · https://www.npmjs.com/package/ts-fsrs
- py-fsrs (Open Spaced Repetition): https://github.com/open-spaced-repetition/py-fsrs · https://pypi.org/project/fsrs/
- FSRS optimizer: https://github.com/open-spaced-repetition/fsrs-optimizer
- FSRS algorithm explanation (Expertium): https://expertium.github.io/Algorithm.html
- FSRS-5/6 in Anki (StudyCardsAI): https://studycardsai.com/blog/anki-fsrs-algorithm · Anki manual deck options: https://docs.ankiweb.net/deck-options.html
- Graph viz comparison (Cambridge Intelligence): https://cambridge-intelligence.com/blog/react-graph-visualization-library/ · Memgraph: https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool · PkgPulse: https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-javascript-2026
- react-force-graph (vasturiano): https://github.com/vasturiano/react-force-graph · 3d-force-graph: https://github.com/vasturiano/3d-force-graph
- sigma.js: https://www.sigmajs.org/ (via react-sigma guides) · cytoscape.js: https://js.cytoscape.org/
- Local image-gen on AMD/ROCm + model VRAM (Hardwarepedia): https://hardwarepedia.com/blog/local-ai-image-video-generation-guide-2026 · Tom's Hardware SD benchmarks: https://www.tomshardware.com/pc-components/gpus/stable-diffusion-benchmarks · Flux vs SDXL vs SD3.5: https://willitrunai.com/blog/flux-vs-sdxl-vs-sd35-comparison · SDXL requirements: https://stablediffusionxl.com/sdxl-system-requirements/
- RAG with Supabase pgvector + hybrid search + RLS: https://supabase.com/docs/guides/ai/rag-with-permissions · https://www.echoalgoridata.com/en/blog/rag-systems-supabase-guide · https://www.freecodecamp.org/news/how-to-build-an-ai-powered-rag-search-application-with-nextjs-supabase-and-openai/
- Local LLM via Cloudflare Tunnel pattern: https://medium.com/@mcraddock/seamless-ai-development-in-the-cloud-access-your-local-llm-via-cloudflare-tunnels-65dd287f461e · https://dev.to/instatunnel/the-evolution-of-developer-tunnels-bridging-local-ai-experiments-to-the-cloud-2iai
- Offline-first Expo + WatermelonDB + Supabase: https://supabase.com/blog/react-native-offline-first-watermelon-db · https://github.com/nozbe/watermelondb
