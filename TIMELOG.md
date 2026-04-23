# Bucket Foundation — Time Log

> Canonical work log. Retroactive back-fill + forward plan. Every row is real effort, whether or not a bead existed in the Nucleus instance at the time (the instance isn't certified yet — see `CLAUDE.md` → Known Infra Gaps).
>
> **Convention**: planning time counts. Writing counts. Investigation counts. Negative results count (e.g. "confirmed DerbyFish does not capture magnetometer" is a real deliverable — it prevents a false claim in the Kruse pitch).
>
> Columns: `Date · Duration · Actor · Scope · Deliverable · Bead (when filed)`

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
