# Operations Notes

Moved out of CLAUDE.md on 2026-09-22 to cut per-session context. Read the section you need.

## Mirror Job Control

Manual control:
```bash
pursue-status                                    # one-line snapshot
pursue-run                                       # force run + tail logs
systemctl --user status pursue-mirror.timer      # check schedule
systemctl --user list-timers pursue-mirror.*     # next run time
journalctl --user -u pursue-mirror.service -n 50 # service log
tail -f _intake/war-gov-pursue-release-01/runner.log  # runner log
```

The timer **disables itself** once 0-fail run completes. Re-enable with
`systemctl --user enable --now pursue-mirror.timer` if a new release drops.

## Evolution Live Feeds

`evolution-live.timer` runs `scripts/evolution-live-runner.sh` once a day at 04:17 UTC. Each run fetches endoflife.date when 20 hours have passed since its last fetch, and the Wikidata software tree through QLever when 6 days 20 hours have passed. Changed files land under `_intake/evolution/endoflife/` and `_intake/evolution/wikidata/`, and the runner hands them to `scripts/research-os/evolution/import-live.ts` with `EVOLUTION_BATCH_PROMOTION=off`, so new releases wait in silver for review. Until that importer exists in the checkout, the files stay staged and the next run retries the import. Each run that fetches writes `_intake/evolution/live/runs/<UTC time>.json`; a run with nothing due writes nothing. The runner holds the data-root disk lock for the whole write and import.

A failed run exits non-zero; systemd retries after 45 minutes, at most 4 starts a day, and the journal holds one line per failure.

```bash
bash scripts/systemd/install-evolution-live.sh          # installs the units, leaves them disabled
bash scripts/evolution-live-runner.sh --dry-run --force # fetches, writes nothing, prints what would change
systemctl --user enable --now evolution-live.timer      # start the daily schedule
systemctl --user list-timers evolution-live.*           # next run
journalctl --user -u evolution-live.service -n 50       # run log
systemctl --user stop evolution-live.timer evolution-live.service
systemctl --user disable --now evolution-live.timer     # stop the schedule; staged files stay
```

## Grant Draft Review

**Retired 2026-09-23:** the founder's Hetzner box hosted both
`longtail.agfarms.dev` and the HMAC secret below. That box is gone for good,
so this queue is unreachable until a replacement host is chosen. The steps
below are kept as a record of the workflow.

Bucket grant drafts (LoIs, full applications, budget narratives, etc.) flow
through the Longtail chisel queue at https://longtail.agfarms.dev/chisel for
fast yes/no/unsure review on tier-1 gut axes (`gut.would_read`,
`gut.confused`, `gut.feels_ai`, …) and tier-2 quality axes
(`quality.specific`, `quality.clear_3s`, …). The selector is
Cost-Weighted Thompson Sampling, see
`~/agfarms/longtail/playbooks/algorithms/2026-05-05-chisel-selector-memo.md`.

**Submit a draft:**

```bash
cd ~/agfarms/bucket-foundation
LONGTAIL_HMAC_SECRET=<see below> \
node scripts/submit-to-longtail.mjs grants-targets/drafts/sloan-exploratory-loi.md \
  --title "Sloan Foundation — exploratory LoI" \
  --grant sloan-exploratory
```

**Pull verdicts (once reviewers have tapped):**

```bash
node scripts/pull-longtail-verdicts.mjs <draft_id>
node scripts/pull-longtail-verdicts.mjs --all
node scripts/pull-longtail-verdicts.mjs --grant sloan-exploratory
```

**Submission log:** `grants-targets/.longtail-submissions.jsonl` (gitignored).

**HMAC secret:** lives on prod-hetzner-1 at
`~/longtail-mono/longtail-hub/.env:LONGTAIL_HMAC_SECRET`. Pull with:
```bash
agfarms 'grep LONGTAIL_HMAC_SECRET ~/longtail-mono/longtail-hub/.env'
```
Note: `~/longtail/longtail-pipeline/.env` has a *different* (orphaned)
Secret, do not use it. Cleanup tracked in `bkt-*` bead.

## Polingual Infrastructure

**Retired 2026-09-23:** the founder's Hetzner box is gone for good. That
retires the "HETZNER (AUTHORITATIVE)" copy below, the "Architecture
decision" paragraph that assumed it, the interim `polingual.agfarms.dev`
service and its "Accessibility tiers" fallback chain, and the Nucleus 502
note under "Known infra issues." With `POLINGUAL_API_URL` and
`POLINGUAL_FALLBACK_API_URL` unset, `src/app/api/polingual/route.ts` makes
no network call and falls straight to the baked subset. The "LOCAL FULL
pgvector" and "FULL FINAL STATE" entries below are current: they describe
the local docker `bucket-pgvector` index CLAUDE.md names as the primary
index today.

Language surface on the photon substrate.

`PHOTON-SPEC.md` + `POLINGUAL.md` are the contract/vision. Comparison axes:
Semantic / phonetic / spelling / etymology / translation.

**Two photon copies, RECONCILE; the Hetzner one is authoritative:**
- **LOCAL** `_intake/photons/`: `index.sqlite` (**209k** photons, 27 langs, grown from 45k 2026-06-15) + LaBSE-768 semantic
 + 64-d phonetic vectors (`*.f32.bin`, gitignored, ~150MB). Builders + query engine in
 `scripts/photon/` (`common,semantic_build,phonetic_build,query,build_subset,proof`).
- **HETZNER (AUTHORITATIVE)**, `polingual` schema on `agf-supabase-db` →
 **`polingual.photons` = 6.5M rows, 35 langs**. Cols: id, kind, lang, surface, meaning_en,
 tier, branch[], pos, ipa, provenance jsonb, **`relations` jsonb** (translation/etymology
 edges, populated, local copy's were empty), payload jsonb, **`surface_tsv`/`meaning_tsv`**
 (full-text search). **Exposed via PostgREST** (`polingual` in `PGRST_DB_SCHEMAS`). **No
 pgvector yet. No k3s namespace.** Reach the DB via `agfarms 'docker exec agf-supabase-db psql -U postgres ...'`.

**Architecture decision (use existing infra, don't duplicate):** the full Polingual index
Should run on the EXISTING `polingual` schema, `create extension if not exists vector`,
Add semantic/phonetic vector columns, expose query via a Postgres RPC through the existing
PostgREST, with a Next proxy `src/app/api/polingual/route.ts`. Do NOT transfer/duplicate the
local 45k copy or stand up a parallel service unless pgvector can't be enabled.

**Academy "Languages" branch:** polyglot deck `corpus/lang-core.json` (kind:`language`, **448 entries** across 7 langs, IPA from the live API) +
typed accent-tolerant drill + on-device TTS (`lang-audio.js`) + a client word-explorer
(`polingual.js`) over a ~6,500-word baked starter subset (`learning/app/polingual/`). All
Polingual data = **Wiktionary via Kaikki, CC-BY-SA, must attribute.**


**Polingual API, LIVE (interim, 2026-06-15):** `https://polingual.agfarms.dev` serves the
Full **local 209k photons / 27 langs / all 5 axes** (~0-105ms). **Verified public 2026-06-15:**
`/healthz` → `photons:209000, semantic_dim:768`; `gold`/`entropy`/`energy` now resolve (the old
45k slice missed everyday words, root cause: the commonness proxy in `scripts/photon/ingest_cache.py`
Read only top-level translations, blind to per-sense ones, and had no frequency signal; fixed by
counting per-sense translations + **wordfreq Zipf** weighting). It's a FastAPI service
(`services/photon-api/server.py`, memmaps the LaBSE-768 + 64-d phonetic `.f32.bin`) running
As a **systemd --user service on the box (127.0.0.1:8088)** behind host nginx + Let's Encrypt
NOT in K3s, touches no tenant. Web app reaches it via the same-origin Next proxy
`src/app/api/polingual/route.ts` (env `POLINGUAL_API_URL`; graceful 503 fallback to the baked
subset). **Migration to the authoritative 6.5M `polingual` schema = just repoint
`POLINGUAL_API_URL`** once pgvector + embeddings land there (needs a GPU/compute plan, the
Hetzner box has none; future bead). Client (`learning/app/js/polingual.js`) is WIRED to `/api/polingual` (hybrid: live full
index first, offline 6,500-word subset fallback) as of `ed819c9e7`.

**LOCAL FULL pgvector (2026-06-15), the complete 6.5M version, on Gian's box.**
Rather than risk the shared prod DB (7.5GB free, 15 tenants), the full corpus runs
locally in docker `bucket-pgvector` (PostgreSQL 16 + **pgvector 0.8.2**, `127.0.0.1:5433`,
Data on the 288GB `/home` disk). Table `photons_full` = **6,564,942 rows / 35 langs**.
Pipeline (all in `scripts/photon/`, reproducible + resumable): `pull_full_prod.sh` (COPY the
6.5M metadata from prod → 154MB csv.gz) → `load_full.sh` (COPY + trgm/FTS indexes; 4 axes
Work immediately) → `embed_full.py` (LaBSE-768 on the **AMD Radeon GPU via ROCm, ~309/s,
Full embed ~6-7h**; 164k pre-filled from the existing `.f32.bin`) → `finalize_full.sh`
(phonetic 64-d vectors via `phonetic_full.py` + **HNSW** indexes on both vector cols).
Query API = `services/photon-api/server_pg.py` (FastAPI, **pgvector backend**, identical
routes/shapes to `server.py`, all 5 axes via `<=>`/`pg_trgm`/jsonb) on `:8090`. App wired
locally via `.env.local` `POLINGUAL_API_URL=http://127.0.0.1:8090`. Empirical sizing:
209k = 1.7GB, **full 6.5M ≈ 54GB** (fits local 288GB; prod has only 7.5GB free, measured, not
Guessed). Verified: `gold→es:oro` 0.81, `money→fr:monnaie` 0.70, `light` cross-lingual
→ he:אור/it:luce/fi:valo. **pgvector is also installed on prod** (`vector` ext enabled) but
the vectors are NOT loaded there (disk), prod stays on the file-memmap 209k service until a
volume expansion. The Next `POLINGUAL_API_URL` proxy is the one-line cutover seam.

**FULL FINAL STATE reached (2026-06-16):** all **6,564,942 embedded** (LaBSE-768) +
**1,979,896 phonetic** (every row with IPA) + **HNSW** on both (`ix_pf_emb_hnsw` 23GB,
`ix_pf_pho_hnsw` 993MB); table+indexes = **56GB** (the measured full footprint). Per-axis
latency through `server_pg.py`: lookup **1ms**, semantic **3ms**, phonetic **1.5ms**,
Translate **3ms**, spelling ~160ms (trgm). Gotchas fixed along the way, all in
`scripts/photon/`: (1) **missing plain `surface` btree**, the API queries `WHERE surface=%s`
(not `lower(surface)`), so without `ix_pf_surface_lang` every lookup/_qvec seq-scanned 6.5M
(~550ms); added in `load_full.sh`. (2) **HNSW build spills**, a 16GB `maintenance_work_mem`
Spilled at 69% and crawled on disk 1.6h+; rebuild with **30GB** (graph needs ~19GB resident)
Finished in 55min, see `rebuild_hnsw_hi.sh`. (3) **parallel HNSW needs shm**, the container's
1GB `/dev/shm` is too small for parallel maintenance workers; build single-threaded
(`max_parallel_maintenance_workers=0`). Speedup: 4 parallel CPU `embed_worker.py` ran
alongside the GPU job (no pause), ~7h→~4h. **quality note:** semantic is strong for
words that have neighbors (gold→silver/golden, king→monarch, money→currency, cross-lingual
light→אור/luce/valo); *isolated* scientific concepts (e.g. `entropy`, nearest at 0.52 cosine
dist) get weak neighbors, and the corpus has gaps (`water/en` absent), these are dictionary-
Corpus characteristics. Translate (lang-filtered) is excellent.

**Accessibility tiers (2026-06-16):** the full 6.5M is reachable three ways via the
`/api/polingual` proxy's upstream chain (`src/app/api/polingual/route.ts`): **(1) primary**
`POLINGUAL_API_URL` (the local box's 6.5M, exposed over a Cloudflare quick tunnel,
`scripts/photon/tunnel.sh`, ephemeral `*.trycloudflare.com` URL; for a stable hostname use a
named tunnel), **(2) fallback** `POLINGUAL_FALLBACK_API_URL` (default `polingual.agfarms.dev`,
The always-on 209k service), **(3) offline** the client's baked ~6,500-word subset on a 503.
Fail-over is on network-error/timeout/5xx only (4s default); a valid not-found passes straight through; the
served tier is in the `x-polingual-upstream` response header. Verified: dead primary → fallback
served `gold` transparently; tunnel serves the full 6.56M publicly. So: **deployed site uses
whatever `POLINGUAL_API_URL` is set to in Vercel** (unset → 209k prod); local `npm run dev`
Hits `127.0.0.1:8090` (full 6.5M) via `.env.local`. To put the 6.5M behind the live site, set
Vercel `POLINGUAL_API_URL` to the tunnel URL, it auto-degrades when the box is offline.

**Known infra issues (2026-06-15):** (1) the Nucleus issues API (`*.nucleus.agfarms.dev`) is
Returning **502**, K3s Traefik at `172.19.0.2:30080` down, affects ALL tenants; bead filing
via the API is broken until it's fixed. (2) `scripts/photon/common.py` says MiniLM-384 but the
live vectors are **LaBSE-768** (stale config; the server auto-detects dims from file size).
(3) **Box disk at 97%** (7.5GB free); `~/polingual-photon` is **19GB**, needs a cleanup pass
(stale venv/old artifacts) before the next big sync. (4) `services/photon-api/deploy.sh` `sudo_e()`
Used `bash -c $(printf %q)` which broke on the box's dash login shell ("Unterminated quoted string")
**FIXED** 2026-06-15: now ships the privileged script to a remote temp file + `sudo -S bash <file>`
(verified). Deploy is idempotent + `--partial --inplace` so a dropped rsync (code 255) just resumes.
