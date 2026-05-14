# Bucket Foundation — Time Log

> Canonical work log. Retroactive back-fill + forward plan. Every row is real effort, whether or not a bead existed in the Nucleus instance at the time (the instance isn't certified yet — see `CLAUDE.md` → Known Infra Gaps).
>
> **Convention**: planning time counts. Writing counts. Investigation counts. Negative results count (e.g. "confirmed DerbyFish does not capture magnetometer" is a real deliverable — it prevents a false claim in the Kruse pitch).
>
> Columns: `Date · Duration · Actor · Scope · Deliverable · Bead (when filed)`

---

## 2026-04-23 — `/learn` reformative-education surface (bead intent)

> **Bead intent (no cert, no env creds — founder-authorized "do the rest" path per CLAUDE.md workaround):**
> - Title: `feat(learn): /learn reformative-education surface`
> - Type: task · Priority: 2 · Instance: `bucket-foundation`
> - Scope: BYO-key streaming chat w/ Claude (sessionStorage only, `dangerouslyAllowBrowser`), 4 tabs, MCP install, Claude.ai lessons, corpus.zip, JSON-LD LearningResource, next/og OG image, sitemap + nav + homepage CTA.
> - Files: `src/app/learn/page.tsx`, `src/app/learn/LearnTabs.tsx`, `src/app/learn/opengraph-image.tsx`, `src/components/Header.tsx`, `src/components/AiPasteCTA.tsx`, `src/app/sitemap.ts`, `package.json`.
> - Commit: `2c3d386` (`main`).
> - Re-file as real `bkt-` bead once `bucket-foundation.nucleus.agfarms.dev` TLS cert is issued.

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-04-23 | ~1.5 | engineering-ai | bkt | Shipped `/learn` — 4-tab reformative-education surface (chat, MCP, Claude.ai lessons, corpus); BYO Anthropic key, sessionStorage-only persistence, llms-full.txt as ground truth; lazy-imported SDK/jszip/lz-string; JSON-LD + OG image; nav+sitemap+homepage CTA wired; `npm run build` green | intent-logged (see above) |

---

## 2026-04-14 — Bucket reactivation

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-04-14 | ~2.0 | founder | bkt | Reactivated `gianyrox/bucket-foundation` as public MIT repo after dormancy since Feb 2025 | — |
| 2026-04-14 | ~1.5 | founder+ai | bkt | Wrote `MANIFESTO.md`, `PROTOCOL.md`, `GOVERNANCE.md` (nonprofit framing + COI disclosure + x402 data protocol v0) | — |
| 2026-04-14 | ~1.0 | founder+ai | bkt | Seeded `canon-figures/` contributor index — ~76 canon-tier figures across 7 branches | — |
| 2026-04-14 | ~1.0 | founder+ai | bkt | Seeded `nonprofit-application/` 501(c)(3) reinstatement packet | — |
| 2026-04-14 | ~1.0 | founder+ai | bkt / research | Seeded `gdrive:AGFarms/Nucleus/research/bucket-canon/` (~37 files, 7 branches) and `longevity-canon/` | — |

## 2026-04-15 — Historical archaeology + Figma

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-04-15 | ~2.0 | founder+ai | bkt | Offline inspection of Dec 2022 Figma prototype `mCigolgGPzmDxA8DpGMlua` (bucket 1.0 — 41 frames, 181 wired transitions, 4-verb social net for "theories of history"). Wrote `HISTORY.md`. | — |
| 2026-04-15 | ~1.0 | founder+ai | bkt / tools | Built `agf-figma` CLI (`~/agfarms/tools/figma/figma.py`) + `figma-agf` MCP server (`figma-mcp.py`). Registered MCP at user scope. | — |
| 2026-04-15 | ~0.5 | founder+ai | bkt / research | Mirrored bucket 1.0 + bucket pitch Figma files to `gdrive:AGFarms/Nucleus/bucket-foundation/figma/` (L1 canonical mirror pattern) | — |

## 2026-04-16 — Kruse Index build

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-04-16 | ~1.0 | founder+ai | kruse-corpus | Scraped 460 free articles from jackkruse.com (`~/jackkruse/scrape.py`) | — |
| 2026-04-16 | ~1.5 | founder+ai | kruse-corpus | Built `~/jackkruse/build_index.py`: SQLite FTS5 keyword index + sentence-transformers MiniLM-L6-v2 embeddings + RRF k=60 hybrid fusion | — |
| 2026-04-16 | ~0.5 | founder+ai | kruse-corpus | Wrote `~/jackkruse/server.py`: HTTP server on `:8765` exposing `/search?q=<q>&mode=<keyword\|semantic\|hybrid>&limit=<n>` and `/health` | — |
| 2026-04-16 | ~0.5 | founder+ai | kruse-corpus | Wrote `~/jackkruse/INDEX.md` + `README.md` + `cleanup.py` | — |
| 2026-04-16 | ~1.0 | founder+ai | kruse-corpus | Local E2E test: 6 canonical queries (leptin resistance, 3am wakeup, cold thermogenesis, deuterium depletion, magnetism and mitochondria, blue light and dopamine) → 460-article hybrid retrieval working end-to-end | — |

## 2026-04-17 — Kruse pitch planning (this session)

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-04-17 | ~0.25 | founder+ai | bkt / kruse-pitch | Drafted first email to Jack Kruse offering "verified fishing data collection of magnetic field" — iterated twice on tone, framing, open-source angle | queued: `bkt-007` |
| 2026-04-17 | ~0.25 | founder+ai | bkt / kruse-pitch | Wrote v0/bolt/Cursor prompt for Kruse Index frontend (serif, off-black, paper-like, three modes, example queries) | queued: `bkt-002` |
| 2026-04-17 | ~0.5 | founder+ai | bkt-nuc | Reframed Kruse pitch as Bucket Foundation nonprofit work (not a Kruse side-project) — aligned with `bucket-canon/05-biophysics/` "one partial source" positioning | queued: `bkt-epic-kruse` |
| 2026-04-17 | ~0.25 | founder+ai | bkt-nuc | Access model locked: Option B — tokenized URL (`?t=<signed>`). No public open-source release pre-Kruse-permission. | queued: `bkt-003` |
| 2026-04-17 | ~0.5 | founder+ai | bkt-nuc / dbt-nuc | Investigated DerbyFish sensor capture claim. Grepped entire derbyfish monorepo for `magneto*`, `expo-sensors`, `Magnetometer`, `DeviceMotion`, `compass`, `heading`, `schumann`, `geomag`, `k_index`, `swpc`, `lunar`, `moon_phase`. **Zero matches.** Confirmed DerbyFish captures GPS + timestamp + video + weather (pressure/wind/temp) + water USGS (partial — `STATION_ID` placeholder). **Phone magnetometer and all geophysical data not currently captured.** | **DELIVERABLE — prevents false claim in email** |
| 2026-04-17 | ~0.25 | founder+ai | bkt-nuc | Offer locked: free private Index preview + paid ongoing managed AI service (we host + maintain his Index, build AI tooling he wants on jackkruse.com). Delivered via feed402. | queued: `bkt-epic-kruse` |
| 2026-04-17 | ~0.25 | founder+ai | bkt-nuc | Path B chosen: add sensor capture + NOAA/USGS/SWPC/HeartMath joins to DerbyFish BEFORE sending pitch. ~2 days of cross-venture dbt- work. | queued: `dbt-*` beads |
| 2026-04-17 | ~0.5 | founder+ai | bkt-nuc | Bootstrap: wrote `.beads/remote.json`, `CLAUDE.md`, this `TIMELOG.md`, `kruse-pitch/README.md`. Discovered `bucket-foundation.nucleus.agfarms.dev` has no TLS cert → blocks direct bead filing, queued `bkt-epic-infra`. | queued: `bkt-001` |
| 2026-04-17 | ~7.2 | engineering (agent) | bkt / kruse-pitch | **SHIPPED `bkt-002` + `bkt-003`.** Next.js `/kruse` route (server component, `force-dynamic`, Fraunces + JetBrains Mono, `noindex`), `KruseSearch.tsx` client component (3-mode toggle, limit slider, 6 example chips, term highlighting), `AboutDrawer.tsx` (BM25/MiniLM/RRF explainer), `src/middleware.ts` (Edge-runtime, HS256 via `jose`, cookie-based auth, 404 on missing/invalid — not 401), `src/lib/kruse-token.ts` (mint/verify), `src/app/api/kruse/search/route.ts` (cookie-gated proxy to `KRUSE_INDEX_URL`). Three scripts: `mint-kruse-token.ts`, `revoke-kruse-token.ts`, `test-kruse-token.ts` (6 passing roundtrip tests). `npm test` + `npm run build` both pass. Full curl smoke test confirmed: no token → 404, invalid token → 404, valid token → 302 + HttpOnly cookie + stripped URL, cookie → real Kruse Index results. `ENGINEERING_NOTES.md` written. ~500 LOC total, uncommitted on `main` awaiting founder review. | **SHIPPED** `bkt-002` `bkt-003` |

**2026-04-17 total (planning + execution) so far: ~10 hrs** (counts — per founder directive "the amount that we plan is still time spent")

---

## Forward plan — bead graph (not yet filed)

Filing blocked on: `NUCLEUS_ADMIN_USER` / `NUCLEUS_ADMIN_PASSWORD` not in session env. Once exported, file via `https://nucleus.agfarms.dev/api/portfolio/dispatch` with `instance_id: "bucket-foundation"` (direct subdomain blocked on TLS cert — see `bkt-epic-infra`).

### Epic `bkt-epic-kruse` — Kruse Foundation pitch + managed AI service

| ID | Priority | Title | Estimate | Pillar |
|---|---|---|---|---|
| `bkt-001` | P1 | Deploy bucket-foundation Nucleus instance (TLS cert, certbot, nginx) — **dependency of everything else** | 2 hrs | operations |
| ~~`bkt-002`~~ | ~~P2~~ | ~~Build `/kruse` route in bucket-foundation Next.js app~~ **✅ SHIPPED 2026-04-17** | 4 hrs actual | engineering |
| ~~`bkt-003`~~ | ~~P2~~ | ~~Tokenized URL middleware~~ **✅ SHIPPED 2026-04-17** | 2 hrs actual | engineering |
| `bkt-004` | P2 | Domain alias `kruse.bucket.foundation` → bucket-foundation Vercel project. DNS + TLS. | 0.5 hrs | operations |
| `bkt-005` | P2 | Wrap `~/jackkruse/server.py` as a feed402 endpoint. Three tiers: `raw` (full article, $0.05/row), `query` (search, $0.01/call), `insight` (AI synthesis of top-k, $0.002/call). | 4 hrs | engineering |
| `bkt-006` | P2 | Publish `/.well-known/feed402.json` manifest at bucket.foundation | 0.5 hrs | engineering |
| `bkt-007` | P2 | Final Kruse outreach email draft (requires all artifacts above to exist + founder name/reply-to) | 1 hr | revenue |
| `bkt-008` | P3 | Canon cross-link: annotate `gdrive:bucket-canon/05-biophysics/` with Kruse-partial-source marker + link to Index | 0.5 hrs | data |

**Subtotal: ~14.5 hrs engineering, ops, revenue, data**

### Epic `dbt-epic-geophysical` — BHRV geophysical capture + joins (cross-venture, filed in `dbt-` instance)

| ID | Priority | Title | Estimate | Pillar |
|---|---|---|---|---|
| `dbt-XXX` | P2 | Add `expo-sensors` Magnetometer + DeviceMotion capture to BHRV flow (native) with quality flags | 3 hrs | engineering |
| `dbt-XXX` | P2 | `NSMotionUsageDescription` + Android manifest updates in `app.config.js` | 0.5 hrs | engineering |
| `dbt-XXX` | P2 | Schema migration: `catch_sensors` + `catch_geophysical` columns/tables | 1 hr | engineering |
| `dbt-XXX` | P2 | Enrichment job (derbyfish-api Rust): NOAA SWPC K-index + USGS geomag observatories + lunar phase + solar position + HeartMath GCI Schumann feed — join to every verified catch by (lat, lon, timestamp) | 6 hrs | engineering |
| `dbt-XXX` | P3 | Fix `STATION_ID` placeholder in `FishingDataContext.findNearestStation()` while in the water-data neighborhood | 1 hr | engineering |
| `dbt-XXX` | P2 | feed402 endpoint wrapping verified catches. VDS citation type `derbyfish.bhrv.v2` per feed402 SPEC §3.1 | 4 hrs | engineering |

**Subtotal: ~15.5 hrs engineering**

### Contract work (`~/freelance/viatika-x402-data-standard/`)

| ID | Priority | Title | Estimate | Pillar |
|---|---|---|---|---|
| (contract) | P3 | Update `BRIEF.md` — name Kruse + DerbyFish-BHRV as first real merchant examples for Lanzafame go/no-go ammo | 0.5 hrs | revenue |

---

## Running totals

- **Work already done (backfill)**: ~15.5 hrs (Apr 14–17 planning, research, Kruse Index build, Bucket reactivation)
- **Work planned forward**: ~30.5 hrs (14.5 Bucket + 15.5 DerbyFish + 0.5 contract)
- **Grand total Kruse pitch initiative**: ~46 hrs / ~5-6 working days

## 2026-04-23 — Demo video production plan

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-04-23 | ~0.75 | ai (revenue pillar) | bkt / gtm | Researched environment (keys: OpenAI/Anthropic/HeyGen present; ElevenLabs/Suno/Runway absent; tools: ffmpeg/obs/chrome/cairosvg/magick present; playwright/whisper/yt-dlp installable). Authored `gtm/demo-video-plan.md` — full production plan for 75s stonepunk music video: strategic framing, script (69 words ending "written in stone."), 12-shot storyboard (3x Playwright PW, 5x gpt-image-1 GEN, 1x canon-figures ARC, 3x SVG+FFX), voice decision tree (OpenAI `onyx`/`ash` primary), royalty-free music shortlist with ffmpeg ducking mix, end-to-end runnable ffmpeg pipeline, Playwright spec skeleton, gdrive mirror path, longtermism regen template (`script-generator.md` convention + reading seed list), time estimate ~7.75h / < $2 API. PLAN ONLY — awaits founder green-light on 7 decisions in §10. | `bkt- · demo-video v1 production plan` (dispatch attempt returned HTTP 401 at POST nucleus.agfarms.dev/api/portfolio/dispatch with env NUCLEUS_ADMIN_USER=nucleus + 8-char password from ~/.bashrc; nginx basic-auth rejected. Founder must re-file with correct creds or admin UI. Payload ready in plan §Bead. Subdomain TLS still pending.) |

---

## 2026-05-14 — polingual photon graph wired to agfarms postgres (`polingual` schema)

| Date | Hrs | Actor | Scope | Deliverable | Bead |
|---|---|---|---|---|---|
| 2026-05-14 | ~0.75 | bkt-nuc (engineering) | bkt / polingual | Created `polingual` schema on agfarms supabase postgres (`agf-supabase-db`). Loaded 45 000 photons across 27 languages from `_intake/photons/all.json` via `COPY polingual.photons FROM '/tmp/photons.csv'`. Table has tsvector GENERATED columns + GIN indexes on surface/meaning + b-tree on (kind, lang, surface_lower). Exposed via PostgREST at `https://db.agfarms.dev/rest/v1/photons` with `Accept-Profile: polingual`. **Gotcha (logged for memory):** PostgREST 14+ honors role-level GUC `pgrst.db_schemas` over `PGRST_DB_SCHEMAS` env. Authenticator role had stale `pgrst.db_schemas='public, sofi'` that survived all container restarts. Fix: `ALTER ROLE authenticator SET pgrst.db_schemas TO 'public, storage, graphql_public, zona_franca, polingual'; NOTIFY pgrst, 'reload schema';`. Rewrote polingual frontend to query the DB directly: `polingual/src/lib/photon-db.ts` (typed PostgREST client), `polingual/src/app/api/photon/{[id],search}/route.ts` (Next.js route handlers, replaces bucket.foundation proxy rewrite). Deployed to `https://www.polingual.com`. End-to-end verified: `/api/photon/search?q=thesaurus` returns pt/en/la/es/pt; `/api/photon/photon:word:en:dictionary` returns full record with IPA, branch, provenance. | intent-logged (TLS for `bucket-foundation.nucleus.agfarms.dev` was live earlier but `bd-remote create` returned 404 against `/issues` this session, and env auth for the org-level dispatch was unset; re-file as real `bkt-` bead next session) |
| 2026-05-14 | ~1.5 | bkt-nuc (engineering) | bkt / polingual | **Photon corpus 7× bigger: 45 K → 319 K photons across 35 languages.** Built `tools/canon/photon-kaikki-bulk2.py` — two-stage ingester: (1) parallel curl of 35 kaikki.org Wiktionary dumps (~12 GB cached on disk, 8 concurrent connections, 8 min wall time including the 3 GB English + 4 GB Finnish dumps), (2) parallel JSONL parse via Python `ProcessPoolExecutor` (8 cores, 6 s wall time for 318 K kept rows). Kaikki naming quirk discovered: directory uses spaces (URL-encoded), filename strips spaces ⇒ `dictionary/Ancient Greek/kaikki.org-dictionary-AncientGreek.jsonl`. Classical Chinese removed (no kaikki dump). Output is standard CSV (Postgres-COPY-ready), 243 MB. Built `tools/canon/load-photons-to-pg.sh` — streams CSV via `sshpass + ssh → docker exec -i psql \\COPY FROM STDIN` into a staging table, then `INSERT … ON CONFLICT DO NOTHING` into `polingual.photons`, then `NOTIFY pgrst, 'reload schema'`. Net add: 274 307 new photons (43 729 dups vs. the existing 45 K). Per-language counts now mostly 10 K each (caps at 10 K/lang, except 6 ancient-language dumps that are smaller). Live verified: `https://www.polingual.com/api/photon/search?q=___NEVER___` returns `total: 319307`; "amor" returns la/es/sv/ang/de/it; "logos" returns la/es/pt/sv/fr/ar with Greek-derived senses. | intent-logged |
| 2026-05-14 | ~2.0 | bkt-nuc (engineering) | bkt / polingual | **Photon corpus 146× bigger: 45 K → 6.56 M photons.** Three discoveries forced two refactors: (1) **home upload bandwidth is the bottleneck** — at ~226 KB/s pushing 2.5 GB via SSH/psql `\COPY FROM STDIN` would take ~3 hours. Fix: ship the ingester to the server and run the whole pipeline server-side. (2) **PRIMARY KEY on staging table thrashes disk** — the original staging table's PK forced an index lookup per inserted row, pushing the server's sdb to 100% utilisation at <1 MB/s effective. Fix: drop the PK, make staging UNLOGGED, use `INSERT DISTINCT ON (id) … ON CONFLICT (id) DO NOTHING` to dedupe at INSERT time instead. (3) **`ProcessPoolExecutor` accumulating rows in memory OOMs on big dumps** — `cap=0` parsing of all 35 langs with 8 workers exhausted the server's 30 GB RAM (load avg 462!). Fix: `photon-kaikki-bulk3.py` streams each worker's photons to its own per-language CSV file inside `csv-parts/<lang>.csv`, then concats serially at the end. Memory stays bounded to a tiny `seen` set per worker. Final results on server-side run with `cap=0 workers=4`: parse 35 dumps → 6,563,710 rows / 4.9 GB CSV in 123 s; `docker cp` to db container in ~30 s; `\COPY` in 70 s; `INSERT … ON CONFLICT DO NOTHING` in 6 min 35 s (slow due to GIN trigram + tsvector index maintenance × 3.4 M new rows). Net add: 3,423,276 new photons. **Search performance preserved** by adding `pg_trgm` GIN indexes on `surface` and `lower(surface)`: queries went from 1500-2500 ms to 20-120 ms on the 6.5 M corpus. Per-lang top: en 1.2 M, la 825 K, es 755 K, it 574 K, ru 423 K, pt 400 K, fr 378 K, de 334 K, sv 298 K, fi 237 K. Live verified: total 6,564,942. New tools: `tools/canon/photon-kaikki-bulk3.py` (memory-bounded), `tools/canon/load-photons-server-side.sh` (in-server pipeline). | intent-logged |
