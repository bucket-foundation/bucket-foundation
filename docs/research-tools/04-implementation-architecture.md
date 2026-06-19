# Research Tools — Implementation Architecture

**Bead:** `biophysics-phd-review-tx6`
**Author:** Engineering pillar
**Date:** 2026-06-18
**Status:** design + first-slice scaffold (LabBrain)

Goal: move the 7 biophysics research tools **off `gianyrox.com/research`** and host
them **inside `bucket.foundation`** — Python backends on Hetzner/K3s, fronted by the
existing Next.js app, payment-metered via x402/Viatika at the seam, with a
"publish result to canon" hook that registers the artifact + its feed402/0.2
cite-forever block and (for datasets) a real DOI via Zenodo. **NO Story Protocol,
NO Walrus, NO IP-NFT, no blockchain** anywhere — org-wide rule; credentials, if
any, use Open Badges 3.0 / W3C VC.

This doc is the engineering contract. It does **not** build x402/Viatika or the
GPU compute plane — it defines the seams so those land cleanly later.

---

## 0. What exists today (the thing we are replacing)

| Layer | Today | Source |
|---|---|---|
| Backend | One FastAPI app (`tools_api/app.py`) running **all 7 tools** by shelling into each tool's CLI into a tempdir | `biophysics-phd-review/tools_api/app.py` |
| Process mgr | `tools-server.sh` supervisor → `uvicorn app:app 127.0.0.1:8731` + a **cloudflared quick tunnel** | `tools_api/tools-server.sh` |
| Systemd | `research-tools.service` (boot-start, restart-on-die) | host systemd |
| Discovery | Supervisor rewrites `gianyrox.com/research/api.json` with the tunnel URL and `git push`es it | `tools-server.sh:publish()` |
| Frontend | `gianyrox.com/research` pages read `api.json` for the backend URL; show "run locally" when down | gianyrox repo |
| Tools | `proteinscout`, `screenserver`, `stabilitydesigner`, `labbrain` (CPU/clean-JSON) + `trajmine`, `cryotriage`, `patchseqml` (heavy / report-HTML) | `biophysics-phd-review/<tool>/` |

Problems with today's setup, in priority order:

1. **Ephemeral discovery.** A `trycloudflare.com` URL rotates on every restart and is
   committed into a *different* repo (gianyrox). Fragile, not "always-on".
2. **Wrong home.** The tools belong to Bucket's research surface, not the personal site.
3. **No metering seam.** Every run is free; there is no place for x402/Viatika.
4. **Synchronous only.** `trajmine`/`cryotriage` run inline with 300–420 s timeouts —
   they will kill any request path the moment real MD / cryo-EM input shows up.
5. **No permanence hook.** A run's output evaporates with the tempdir; nothing can be
   published to canon.

The good news: the existing `tools_api/app.py` is a **clean, faithful wrapper** of every
tool's real CLI. We **keep its logic**, repackage it as a stable service, and put Bucket
in front. Nothing about the tools' science changes.

---

## 1. Target architecture (the picture)

```
 Browser / AI agent
        │  same-origin HTTPS
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  bucket.foundation  (Next.js on Vercel)                      │
 │                                                             │
 │  /research                 ← existing publish→cite page      │
 │  /research/tools           ← NEW directory of the 7 tools    │
 │  /research/tools/<tool>    ← NEW per-tool run page (island)  │
 │                                                             │
 │  /api/research/<tool>      ← NEW same-origin proxy           │
 │       • submit job  → backend                                │
 │       • poll status → backend                                │
 │       • fetch result → backend                               │
 │       • [SEAM] x402/Viatika meter per submit                 │
 │       • [HOOK] publish result → existing /api/research cite   │
 └──────────────────────────────┬──────────────────────────────┘
                                │  server→server HTTPS
                                │  TOOLS_GATEWAY_URL (env)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  tools-gateway  (FastAPI)  — Hetzner, ALWAYS-ON               │
 │  https://research-tools.agfarms.dev                          │
 │                                                             │
 │   GET  /health                                               │
 │   POST /v1/<tool>/submit      → { job_id }                   │
 │   GET  /v1/jobs/<job_id>      → { status, ... }              │
 │   GET  /v1/jobs/<job_id>/result → readable output            │
 │                                                             │
 │   ┌──────────────┐        ┌────────────────────────────┐    │
 │   │ CPU inline    │       │  job queue (Redis/RQ)        │    │
 │   │ (fast tools)  │       │  ↓                            │    │
 │   │ labbrain      │       │  CPU worker(s)  GPU worker(s) │    │
 │   │ stabilitydes. │       │  trajmine       cryotriage    │    │
 │   │ proteinscout  │       │  patchseqml     (MD/cryo-EM)  │    │
 │   │ screenserver  │       └────────────────────────────┘    │
 │   └──────────────┘                                           │
 │   result store: object store / Supabase (metadata + blobs)   │
 └─────────────────────────────────────────────────────────────┘
```

**Hosting decision (mirror the proven Polingual pattern, do not invent a new one):**
`bucket.foundation` already runs a Python service exactly like this — the Polingual
photon API: a **FastAPI app on the Hetzner box, behind host nginx + Let's Encrypt at a
stable subdomain (`polingual.agfarms.dev`), fronted by a same-origin Next proxy
(`/api/polingual`) with an env-configured upstream URL and graceful 503 fallback**
(see `bucket-foundation/services/photon-api/server.py` and
`src/app/api/polingual/route.ts`). We reuse that pattern verbatim for the tools gateway.

- **Stable subdomain:** `research-tools.agfarms.dev` (host nginx vhost + certbot),
  replacing the rotating `trycloudflare.com` URL. This is the single value of
  `TOOLS_GATEWAY_URL`.
- **Always-on:** `systemd --user` service + restart-on-failure + `linger=yes` (same
  mechanism the Polingual API and the Bucket mirror jobs already use). This *replaces*
  `research-tools.service` + the cloudflared tunnel + the `api.json` git-push dance.
- **K3s vs box:** the gateway can start as a `systemd --user` service on the box (lowest
  friction, matches Polingual) and **graduate to a K3s Deployment in namespace
  `inst-bucket-foundation`** once we want rolling deploys / multi-replica. The Next proxy
  doesn't care which — it only knows `TOOLS_GATEWAY_URL`. The doc specifies both; the
  first slice ships on the box.

### Why a single gateway, not 7 services
The existing `app.py` already multiplexes all 7 tools in one process and that is the
right call for v1: one image, one cert, one health check, one env. Inside the gateway,
fast tools run **inline** (sub-30 s) and heavy tools are **enqueued** (below). If a
single tool's deps get heavy enough to warrant isolation (e.g. cryo-EM CUDA stack), it
splits into its own worker image behind the **same** gateway API — the Next proxy and the
job contract never change.

---

## 2. Request / response contract (the API the proxy and gateway agree on)

One uniform job lifecycle for **every** tool, so the frontend and proxy are generic and
new tools are drop-in. Fast tools complete "instantly" by returning a terminal status on
the very first poll (or inline in the submit response); heavy tools go through the queue.

### 2.1 Submit
```
POST /v1/<tool>/submit
Content-Type: application/json   (or multipart/form-data for file uploads)

body (per-tool typed payload; examples):
  labbrain          { "author": "Gerhard Hummer", "question": "..." }
  stabilitydesigner { "sequence": "MKT...", "mutation": "A23V" }
  proteinscout      { "input": "P0DTC2" | "MKT..." }
  screenserver      { "smiles": "CCO\nc1ccccc1" }
  trajmine          { "demo": "md" }                      (heavy)
  patchseqml        multipart: file=<rec.abf>, mode="sim" (heavy)
  cryotriage        multipart: file=<mic.png>            (heavy, GPU)

200 → { "job_id": "j_<ulid>", "tool": "labbrain", "status": "queued"|"running"|"succeeded",
        "mode": "inline"|"async", "submitted_at": "<iso8601>",
        "price": { "tier": "...", "usd": 0.0, "metered": false } }
400 → { "error": { "code": "bad_request", "message": "..." } }   (validation, mirrors app.py)
402 → { "error": { "code": "payment_required", ... } }            (RESERVED — metering seam, off in v1)
429 → { "error": { "code": "rate_limited" | "queue_full", ... } }
```
- For **inline** tools the gateway MAY return `status:"succeeded"` immediately with the
  result already attached under `result` (so the UI can skip polling). It MUST still issue
  a `job_id` so the same code path works and the result is fetchable/permalinkable.

### 2.2 Status (poll)
```
GET /v1/jobs/<job_id>
200 → {
  "job_id": "...", "tool": "...", "status": "queued"|"running"|"succeeded"|"failed",
  "progress": 0..1 | null,          // best-effort; null when unknown
  "queue_position": int | null,     // heavy tools only
  "submitted_at": "...", "started_at": "..."|null, "finished_at": "..."|null,
  "log_tail": "...",                // last ~500 chars of tool stdout (already in app.py)
  "error": { "code", "message" } | null
}
404 → unknown job_id
```
Poll cadence from the client: 1 s for the first 10 s, then back off to 3 s, cap 5 s.

### 2.3 Result
```
GET /v1/jobs/<job_id>/result
200 (succeeded) → {
  "job_id": "...", "tool": "...",
  "render": "html" | "json",        // how the UI should display `output`
  "output": <see below>,
  "artifacts": [ { "name": "report.html", "media_type": "...", "url": "<gateway blob url>" } ],
  "provenance": [ { "action": "run", "tool": "...", "at": "...", "by": "tools-gateway/v1" } ],
  "canon_candidate": true|false     // whether this output is publishable to canon
}
409 (not finished) → { "error": { "code": "not_ready", "status": "running" } }
```

**Two output shapes (already split this way in `app.py`):**
- `render:"json"` — clean structured data. `output` is the tool's JSON.
  - `labbrain` → `{ author, question, answer }`
  - `stabilitydesigner` → `{ predicted_ddG_kcal_mol, call, ... }` (or scan rows)
- `render:"html"` — a **self-contained** HTML report (images base64-inlined, css inlined —
  `app.py:_inline_assets()` already does this). `output` is the HTML string.
  - `proteinscout`, `screenserver`, `trajmine`, `patchseqml`, `cryotriage`

### 2.4 How readable outputs render in Bucket
- `render:"json"` → the per-tool run page renders a typed React view (e.g. LabBrain shows
  the answer with citation chips; StabilityDesigner shows a ΔΔG verdict card / scan table).
- `render:"html"` → rendered in a **sandboxed `<iframe srcDoc={output} sandbox="allow-popups">`**.
  The report is already self-contained and asset-inlined, so no network, no script-host
  trust issue. (The gateway must continue to inline assets; the iframe sandbox is the
  belt-and-suspenders.)
- Every result page exposes a **"Publish to canon"** button (§5) and a **permalink**
  (`/research/tools/<tool>/r/<job_id>`) that re-fetches the stored result.

### 2.5 The Next proxy contract (`/api/research/<tool>`)
The browser only ever talks to Bucket, same-origin. The proxy is a thin, generic pass-through
that adds the metering seam and the canon hook:
```
POST /api/research/<tool>            → forwards to gateway POST /v1/<tool>/submit
GET  /api/research/<tool>?job=<id>   → forwards to gateway GET  /v1/jobs/<id>
GET  /api/research/<tool>?job=<id>&result=1 → gateway GET /v1/jobs/<id>/result
POST /api/research/<tool>/publish    → result → existing /api/research publish-cite flow (§5)
```
`<tool>` is validated against a server-side allow-list (the 7 names) before any forward.
`TOOLS_GATEWAY_URL` is server-only env; the gateway URL is **never** sent to the client
(unlike today's `api.json`).

---

## 3. Hosting / migration plan (off gianyrox → Bucket infra)

### 3.1 Containerize the gateway
- One Dockerfile at `biophysics-phd-review/tools_api/Dockerfile` building a Python image with:
  `fastapi`, `uvicorn`, the shared sci deps (`sentence-transformers`, `rank_bm25`, `pypdf`,
  `rdkit`/ADMET deps for screenserver, `mdanalysis`/etc. for trajmine), and the tool dirs
  copied/mounted in. CPU base image for the gateway + CPU workers.
- A **second** Dockerfile (`tools_api/Dockerfile.gpu`, CUDA/ROCm base) for the GPU worker
  image used only by `cryotriage` and real-MD `trajmine`. The README already documents the
  ROCm-hang footgun (`labbrain.py: CPU is default`); the GPU image is opt-in and isolated
  so a GPU hang never takes down the CPU tools.

### 3.2 Stand up the always-on gateway (replaces `research-tools.service`)
Phase A — **box, systemd --user** (matches Polingual, ship the first slice here):
```
# unit: ~/.config/systemd/user/research-tools-gateway.service
ExecStart=<venv>/bin/uvicorn app:app --host 127.0.0.1 --port 8732
Restart=always
WorkingDirectory=/home/gian/agfarms/biophysics-phd-review/tools_api
# linger already on; auto-start at boot
```
- Host nginx vhost `research-tools.agfarms.dev` → `127.0.0.1:8732`, Let's Encrypt via
  certbot (same as `polingual.agfarms.dev` and the Bucket instance cert).
- **Decommission** `research-tools.service`, the cloudflared tunnel, and the
  `gianyrox.com/research/api.json` git-push. Leave a `301`/notice on `gianyrox.com/research`
  pointing at `bucket.foundation/research/tools`.

Phase B — **K3s** (graduate when we want rolling deploys / replicas):
- `Deployment` + `Service` + `Ingress` in namespace `inst-bucket-foundation`, image
  `farmera/research-tools-gateway:vX.Y.Z`. CPU `Deployment` + a separate GPU
  `Deployment` (nodeSelector/taint for a GPU node — **future**, the Hetzner CPX42 has no
  GPU; see §4). Traefik ingress for `research-tools.agfarms.dev`.

### 3.3 Discovery: env var, not a committed file
- Bucket reads `TOOLS_GATEWAY_URL` (Vercel env + K3s secret `bucket/tools-gateway`).
  Default `https://research-tools.agfarms.dev`.
- Health surfaced at `/api/research/health` (proxy → gateway `/health`); the tools
  directory shows per-tool live/offline from it. **No `api.json`, no tunnel, no rotation.**

### 3.4 GPU vs CPU tools — where each runs
| Tool | Class | Where it runs | Mode |
|---|---|---|---|
| labbrain | CPU (literature RAG, MiniLM on CPU) | gateway inline (cap ~30 s once corpus cached) | inline* |
| stabilitydesigner | CPU (ΔΔG predict) | gateway inline | inline |
| proteinscout | CPU (ML features, no-llm) | gateway inline (≤180 s today → move heavy path to queue) | inline/async |
| screenserver | CPU (13 ADMET models) | gateway inline (≤240 s; >50 mols → queue) | inline/async |
| trajmine | CPU demo / **GPU real MD** | CPU worker (demo) · GPU worker (real) | async |
| patchseqml | CPU (ephys ML) | CPU worker | async |
| cryotriage | **GPU** (cryo-EM micrograph triage) | GPU worker | async |

\* LabBrain's *first* `build` for a new author fetches+embeds and can exceed 30 s; the
gateway treats build-on-cache-miss as async and the cached path as inline. This is why
LabBrain is the first slice — the contract handles both without special-casing.

**Today the Hetzner CPX42 has no GPU.** Until a GPU plan lands (future bead), the GPU
tools run in **`demo`/synthetic mode** (which `app.py` already supports:
`cryotriage synth`, `trajmine demo-md`) and the UI labels them clearly as demo. The async
contract is built now so that flipping on a GPU worker is a deploy, not a redesign.

---

## 4. Async / long-running jobs (MD, cryo-EM)

**Pattern: queue + worker + result store**, only for the heavy tools. Fast tools never
touch the queue.

- **Queue:** Redis + RQ (or Celery). Each heavy `submit` enqueues a job and returns
  `{ job_id, status:"queued", mode:"async" }`. The Bucket instance already has Redis
  available in-namespace; reuse it.
- **Workers:** one CPU worker pool (trajmine-demo, patchseqml) and one GPU worker pool
  (cryotriage, real-MD trajmine). GPU pool is `replicas: 0` until a GPU node exists.
- **Job record:** `{ job_id, tool, status, progress, queue_position, submitted_at,
  started_at, finished_at, log_tail, error, result_ref }` — lives in Redis (hot) and is
  mirrored to **Supabase** `bucket.research_jobs` (durable; reuse the self-hosted Supabase
  at `db.agfarms.dev`, `bucket` schema, service-role via a Next API route exactly like
  `academy_progress`).
- **Result storage:**
  - **Small JSON / self-contained HTML** (most tools) → store the result blob in the job
    record / Supabase row (HTML reports are already self-contained, typically < a few MB).
  - **Large artifacts** (MD trajectories, cryo-EM stacks) → **object store** (S3-compatible
    bucket) keyed by `job_id`; the result references them by URL. **No blockchain blob layer.**
  - **DOI deposit (Zenodo)** is reserved for the *permanent* path: when a result is
    **published to canon** (§5), its canonical artifact is deposited to **Zenodo** and gets a
    **real DOI**. There is **no on-chain minting, no Story Protocol, no Walrus.** The object
    store is **not** the hot scratch store.
- **Retention:** unpublished job results expire (e.g. 7 days) from the hot store; published
  ones are permanent via their Zenodo DOI + the durable Supabase row. TTL is a gateway
  config, not in the contract.

---

## 5. "Publish result to canon" hook (register + cite-forever + DOI; NO blockchain)

Founder decision (matches the org-wide "NO Story Protocol anywhere" rule): the tools surface
**does NOT mint IP-NFTs and does NOT pin to Walrus.** Publishing a tool result to canon means
**registering the artifact + its feed402/0.2 cite-forever block** (free-to-read, paid-to-cite
over feed402/x402) and, for dataset-shaped artifacts, depositing it to **Zenodo for a real
DOI**. Credentials, if any, use **Open Badges 3.0 / W3C VC** (issuer-signed, no chain). This
is a separate, self-contained permanence path — it does not invoke any blockchain flow.

Seam:
1. A succeeded result with `canon_candidate:true` shows a **"Publish to canon"** button on
   the result page.
2. Clicking it calls `POST /api/research/<tool>/publish` with `{ job_id }`.
3. The proxy fetches the stored result, renders the **canonical artifact** (the
   self-contained HTML report, or a generated PDF for JSON tools — a small server-side
   render step), attaches **provenance** (`tool`, inputs, `job_id`, timestamps) + the
   **feed402/0.2 cite-forever block**, and (for datasets) **deposits the artifact to Zenodo
   for a real DOI**.
4. Result: a canon entry whose `citation`/`canonical_url` point at the hosted artifact (and
   its Zenodo DOI where applicable), with `feed402` cite-forever metadata, identical to a
   published paper. The tool run becomes a citeable, paid-once artifact — **no wallet, no
   chain.**

> Canon-thesis guardrail (per Bucket `CLAUDE.md`): tool *outputs* are **downstream
> applications/derived analyses**, not foundations. They publish as `canon_tier:"derived"`
> /candidate, never as an axiom, mirroring the `route.ts` precedence rules. The publish
> hook tags them accordingly; canon-tier promotion stays a human/curation decision.

---

## 6. Auth + metering seam (x402 / Viatika) — seam only, not built

Per org `CLAUDE.md` Strategic Priority #6: **all metered AI/data pricing routes through the
Viatika vendor API**; do not roll a ledger. And per the `/api/research` trust model: the
**caller never signs or pays** — any settlement is server-side and invisible.

Where the seam lives (one place, the proxy `submit`):
```ts
// src/app/api/research/<tool>/route.ts — POST handler, BEFORE forwarding to the gateway
// [METERING SEAM — TODO, off in v1]
// 1. Resolve caller identity (Dynamic session if present; else anonymous quota bucket).
// 2. const decision = await viatikaMeter({ tool, tier, caller });   // vendor API call
//    - returns { allow, price_usd, receipt } ; enforces budget/policy (Cedar) server-side.
// 3. if (!decision.allow) return 402 payment_required  (RESERVED status; never in v1)
// 4. Forward to gateway; on success attach decision.receipt to the result `price` block.
// In v1 this is a no-op shim returning { allow:true, price_usd:0, metered:false } so the
// flow is wired end-to-end and turning metering ON is config + the vendor call, not a
// refactor.
```
- The **gateway** stays payment-agnostic: it runs tools and returns results. Metering is a
  Bucket-side concern (it owns identity + the Viatika relationship), exactly like the
  `/api/research` proxy owns the server-side x402 wallet seam today.
- `price` travels in submit/result responses from day one (zeroed) so the UI can show
  "free in beta" now and a real price later with no contract change.

---

## 7. FIRST SLICE — LabBrain (CPU literature-RAG, simplest)

LabBrain is the right first tool: pure CPU, clean-JSON output (no iframe sandboxing needed
to prove the path), already wrapped in `app.py:/labbrain/ask`, and it exercises **both**
the inline path (cached corpus) and the async path (cold build) — so shipping it validates
the whole job contract.

### 7.1 Files (created / specified)

**Created in this slice (non-breaking, marked TODO where backend wiring is needed):**

1. `bucket-foundation/src/app/research/tools/page.tsx`
   — the tools **directory**: a card grid of all 7 tools (live/offline from
   `/api/research/health`), each linking to its run page. LabBrain card is "live", the
   other 6 are marked "coming soon" (they exist in the gateway but aren't wired in the UI
   yet).

2. `bucket-foundation/src/app/research/tools/labbrain/page.tsx`
   — server-component shell (stone-bone styling, matches `/research/page.tsx`) that frames
   the client island.

3. `bucket-foundation/src/app/research/tools/labbrain/LabBrainClient.tsx`
   — client island: author + question form → `POST /api/research/labbrain` → poll
   `GET ?job=<id>` → `GET ?job=<id>&result=1` → render the `{answer}` (json render) with a
   "Publish to canon" button (registers the artifact + feed402 cite-forever block; TODO backend).

4. `bucket-foundation/src/app/api/research/labbrain/route.ts`
   — the generic proxy specialized to LabBrain: `POST` (submit, with metering-seam shim),
   `GET ?job=` (status), `GET ?job=&result=1` (result). Forwards to `TOOLS_GATEWAY_URL`.
   Graceful `503` with a "run offline / try later" envelope when the gateway is down
   (mirrors the Polingual proxy fallback ethos).

5. `bucket-foundation/services/research-tools/labbrain_gateway.py`
   — a **FastAPI wrapper** implementing the v1 job contract for LabBrain
   (`/health`, `POST /v1/labbrain/submit`, `GET /v1/jobs/<id>`, `GET /v1/jobs/<id>/result`).
   It reuses the **exact** validation + subprocess logic from `tools_api/app.py:/labbrain/ask`
   (CPU device, `build` then `ask`), wrapped in an in-process job table so the inline vs
   async lifecycle is real. Clearly marked TODO: swap the in-memory job table for
   Redis/RQ + Supabase mirror when the full gateway lands; this slice proves the contract.

**Specified (not created — land with the full gateway):**
- `tools_api/Dockerfile` (+ `Dockerfile.gpu`) and the `research-tools-gateway.service`
  systemd unit + nginx vhost (§3).
- The other 6 tools' proxy routes + run pages (drop-in copies of the LabBrain four).
- `viatikaMeter()` lib + `bucket.research_jobs` Supabase table.

### 7.2 Key signatures (what the slice exposes)

```ts
// src/app/api/research/labbrain/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest): Promise<Response>   // submit
export async function GET(req: NextRequest): Promise<Response>    // status / result (?job, ?result=1)
// env: TOOLS_GATEWAY_URL (default https://research-tools.agfarms.dev), server-only
```

```python
# services/research-tools/labbrain_gateway.py
@app.get("/health")            -> {"ok": bool, "tools": ["labbrain"]}
@app.post("/v1/labbrain/submit")  # body: {author, question} -> {job_id, status, mode, ...}
@app.get("/v1/jobs/{job_id}")     # -> status envelope
@app.get("/v1/jobs/{job_id}/result")  # -> {render:"json", output:{author,question,answer}, ...}
# run: uvicorn labbrain_gateway:app --host 127.0.0.1 --port 8732
```

### 7.3 Non-breaking guarantees
- New routes only; nothing under `/research`, `/api/research`, `/api/kruse` is modified.
- The existing `/api/research` GET (canon proxy) and the existing `/research` publish page are untouched.
- The gateway wrapper is a **new file** in `services/research-tools/`; the old
  `tools_api/app.py` keeps working until the gateway is cut over.
- With `TOOLS_GATEWAY_URL` unset/unreachable, the LabBrain proxy returns a clean `503`
  "tool offline" envelope — the page degrades gracefully, nothing throws.

---

## 8. Migration steps off gianyrox (ordered checklist)

1. **Ship the gateway service** (`services/research-tools/`, full 7-tool version porting
   `tools_api/app.py` into the job contract) on the box as `research-tools-gateway.service`,
   nginx vhost + certbot for `research-tools.agfarms.dev`.
2. **Set `TOOLS_GATEWAY_URL`** in Vercel (prod/preview) + K3s secret `bucket/tools-gateway`.
3. **Wire the Bucket UI**: `/research/tools` directory + the 7 run pages + 7 proxy routes
   (LabBrain four shipped this slice; others are copies).
4. **Verify** each tool end-to-end through Bucket (health, submit, poll, result, sandboxed
   HTML render, publish-to-canon for at least one tool).
5. **Cut over discovery**: stop `tools-server.sh` writing `api.json`; disable
   `research-tools.service` + cloudflared tunnel. Put a redirect/notice on
   `gianyrox.com/research` → `bucket.foundation/research/tools`.
6. **Wire the metering seam** (`viatikaMeter()` shim → real Viatika call) and the
   Supabase `research_jobs` durability mirror.
7. **(Later)** stand up Redis/RQ workers for heavy tools; graduate the gateway to K3s;
   add a GPU worker pool when a GPU node exists (flip cryotriage/real-MD off demo mode).

---

## 9. Open questions (flag to Product / Operations)
- **GPU compute plan** — Hetzner CPX42 has no GPU; cryotriage + real MD stay demo-only
  until this is funded/sourced. Cross-pillar bead.
- **Pricing tiers per tool** — Revenue/Product to set the `price.tier` map (LabBrain ask vs
  a full cryo-EM triage are not the same cost). The contract carries `price` from day one.
- **Canon-tier of tool outputs** — confirm `derived`/candidate framing with curation; tool
  outputs are downstream applications, never axioms.
