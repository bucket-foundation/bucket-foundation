# Bucket Foundation — Nucleus-Managed Venture

**build the past. build history. bucket is the new renaissance.**

Nonprofit reference implementation — primary research paid-for-once, citeable-forever. Story Protocol IP NFTs + Walrus on-chain storage + Dynamic web3 auth + Supabase + Next.js on Vercel. Legally held in founder's personal capacity pending formal nonprofit filing (see `GOVERNANCE.md`).

Canon thesis: AI + foundations + a small number of brilliant humans = the next layer of reality. Canon holds **only foundations** — axioms, real math, rules, laws, principles, primary derivations — across **seven branches**: mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind.

Part of AGFarms venture studio. Org dashboard: https://nucleus.agfarms.dev/admin

## Nucleus Connection

- **Instance ID**: `bucket-foundation`
- **Dashboard**: https://bucket-foundation.nucleus.agfarms.dev/admin
- **API**: https://bucket-foundation.nucleus.agfarms.dev *(TLS live as of 2026-05-03; verified 2026-05-04)*
- **Org fallback**: https://nucleus.agfarms.dev/api/portfolio/dispatch *(no longer required; kept as backup)*
- **Auth**: export `NUCLEUS_ADMIN_USER` and `NUCLEUS_ADMIN_PASSWORD` in your shell
- **Bead Prefix**: `bkt-`
- **Tier**: 3 (experiment/idea) — graduating to Tier 2 once instance is deployed + first paying customer signs

## Known Infra Gaps (as of 2026-04-17, last updated 2026-05-04)

1. ~~**No TLS cert** for `bucket-foundation.nucleus.agfarms.dev`.~~ **RESOLVED 2026-05-04** (bead `bkt-q0x`). Let's Encrypt cert issued 2026-05-03 (valid through 2026-08-01). K3s namespace `inst-bucket-foundation` healthy (`nucleus-0` Running, Traefik ingress + host-nginx vhost both wired). End-to-end verified: `/issues=200`, `/admin=401`, `/api/version=200`. Direct `bkt-` bead filing now live; org-level dispatch fallback kept as backup only.
2. **No `NSMotionUsageDescription`** on DerbyFish iOS (needed for Path B sensor capture — tracked as cross-venture `dbt-` bead).
3. **`.beads/remote.json` newly created 2026-04-17.** Prior work in this venture was tracked in conversation context only; backfilled into `TIMELOG.md`.

## Repo

This venture is a single repo (cloned from `gianyrox/bucket-foundation`, pending transfer to `AGFarms/bucket-foundation` on formal nonprofit filing or a proper nonprofit legal entity).

- **Next.js 14** app on Vercel (`src/app`, `src/components`, `src/context`, `src/lib`, `src/providers`)
- **Story Protocol** SDK for IP NFT minting
- **Walrus** for on-chain content storage
- **Dynamic** for web3 auth
- **Supabase** for off-chain metadata

## Strategic Docs (in this repo, read before any change to direction)

- `MANIFESTO.md` — thesis
- `PROTOCOL.md` — the x402 data protocol spec
- `GOVERNANCE.md` — nonprofit governance + COI disclosure
- `HISTORY.md` — archaeology of bucket 1.0 (Dec 2022 Figma) → bucket 2026
- `README.md` — project overview
- `canon-figures/` — contributor index (~76 canon-tier figures across 7 branches, seed pass-1)
- `nonprofit-application/` — 501(c)(3) reinstatement packet

## Canon Research Layers

Bucket Foundation canon lives on gdrive (not in this repo — too large, too many PDFs):

- **Master canon**: `gdrive:AGFarms/Nucleus/research/bucket-canon/`
  - 7 branches: `01-mathematics`, `02-physics`, `03-chemistry`, `04-information`, `05-biophysics`, `06-cosmology`, `07-mind`
  - Outcomes (longevity, disease, cognition) are downstream applications, NOT canon
- **Outcome canon (longevity)**: `gdrive:AGFarms/Nucleus/research/longevity-canon/` — cross-referenced to `bucket-canon/05-biophysics/sub-outcomes/longevity/`
- **Kruse corpus**: `~/jackkruse/` — 460 scraped articles, FTS5 + MiniLM-L6-v2 + RRF hybrid search, one partial source for the 05-biophysics branch. **This is the Kruse Index.** Not open-source as of 2026-04-17.

## Autonomous Mirror Jobs (run without operator attention)

Long-running ingestion tasks live as systemd --user services + timers, with
idempotent runner scripts in `scripts/`. They auto-start on boot (linger=yes
already set), auto-retry on failure, and self-disable when complete. Every
new shell prints a one-line status (see `~/.bashrc`); `bkt-nuc` sessions
should run `bash scripts/pursue-status.sh` as part of session-start checks.

Active jobs:

| Job | Runner | Service | Status command |
|---|---|---|---|
| **war.gov PURSUE Release 01 mirror** (162 records → `_intake/war-gov-pursue-release-01/`) | `scripts/pursue-mirror-runner.sh` | `pursue-mirror.timer` (hourly) | `pursue-status` (alias) |
| **Sacred-History Corpus mirror** (rights-aware; PD/open LIVE, Tier-B gated → `_intake/sacred-history-corpus/work/`) | `_intake/sacred-history-corpus/runners/sacred-history-runner.sh` | `sacred-history-mirror.timer` (**daily, RECURRING — does NOT self-disable**) | `sacred-history-status` (alias) |

The Sacred-History timer is **recurring forever** (re-checks for new
editions/manuscripts/events) — unlike `pursue-mirror.timer` it never
self-disables. Phase 1 is LIVE for PD/open sources only (Sefaria index,
SuttaCentral CC0, Tanzil verbatim Arabic, ctext PD structure ToS-safe,
bounded CC0 Wikidata SPARQL); copyrighted/NC/unclear stay metadata-only
and gated (`TIER_B_GUARD=1`). Network AI / Viatika x402 = $0 (local model
only). See `_intake/sacred-history-corpus/DECISIONS.md`.

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

## Bead Tracking

```bash
# Preferred: direct instance (TLS live since 2026-05-03)
curl -s -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
  https://bucket-foundation.nucleus.agfarms.dev/issues | python3 -m json.tool

# Backup fallback: org-level dispatch
curl -s -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
  -X POST https://nucleus.agfarms.dev/api/portfolio/dispatch \
  -H "Content-Type: application/json" \
  -d '{"instance_id":"bucket-foundation","title":"...","description":"...","priority":2,"issue_type":"task"}'
```

## Code Conventions

- TypeScript strict mode
- Conventional commits: `type(scope): description`
- Next.js App Router conventions (`src/app/<route>/page.tsx`)
- Use existing context providers in `src/context/` before creating new ones
- No secrets in repo — `.env` is gitignored, `.env.example` documents required vars
- All public-facing copy should honor the slogans in order: **build the past. build history. bucket is the new renaissance.**

## Active Epics

See `TIMELOG.md` for the canonical work log. Headline epics as of 2026-04-17:

| Epic | Status | Scope |
|---|---|---|
| `bkt-epic-kruse` | Active | Private Kruse Index preview + email pitch + feed402 wrappers + ongoing managed AI service offer |
| `bkt-epic-infra` | Active | Deploy bucket-foundation Nucleus instance (TLS cert, certbot, nginx config) |
| `bkt-epic-canon-intake` | Backlog | Wire Viatika x402 research pipeline into `gdrive:bucket-canon/` |
| `bkt-epic-nonprofit-filing` | Blocked on founder | 501(c)(3) reinstatement packet → IRS submission |

## Rules

- Every code change needs a bead FIRST (file via fallback dispatch until cert issued)
- Do NOT modify `~/agfarms/viatika/` (read-only vendor reference)
- Do NOT modify `~/jackkruse/` without re-scrape integrity check
- Cross-venture work (`dbt-`, `eai-`, etc.) gets filed in the HOME instance, not `bkt-`, with a link back
- Kruse corpus is private until author permission is given (see `TIMELOG.md` entry for Kruse pitch)

## Grant draft review — Longtail integration (live since 2026-05-06)

Bucket grant drafts (LoIs, full applications, budget narratives, etc.) flow
through the Longtail chisel queue at https://longtail.agfarms.dev/chisel for
fast yes/no/unsure review on tier-1 gut axes (`gut.would_read`,
`gut.confused`, `gut.feels_ai`, …) and tier-2 quality axes
(`quality.specific`, `quality.clear_3s`, …). The selector is
Cost-Weighted Thompson Sampling — see
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
secret — do not use it. Cleanup tracked in `bkt-*` bead.

## Bucket Academy + Polingual — the learning system (epic `bkt-jh0` / `bkt-2ea`)

**Bucket Academy** is a learning app shipped 2026-06-12..15. Lives in `learning/app/`
(vanilla-JS PWA: `js/{fsrs,engine,adaptive,diagnostic,assess,auth,auth-ui,tutor,
onboarding,library,haptic,polingual,lang-audio,app}.js` + `art/art-gen.js` +
`corpus/*.json`), mirrored to `public/academy-app/` by `scripts/sync-academy.mjs`
(predev/prebuild hooks), framed at Next route `src/app/academy/page.tsx` → live at
**bucket.foundation/academy**. Validate: `learning/app/validate.sh`. Design+research:
`learning/EPIC.md` + `learning/research/` (now on main).

- **Content:** 358 science atoms across the 7 canon branches, each with a full markdown
  `lesson` + 3-depth + quiz + `resources` (Wikipedia/open, link) + deterministic
  procedural-SVG art. Branch manifest = `learning/app/corpus/index.json`.
- **Engine:** FSRS-5 + two-layer graph + FIRe + honest mastery (`M=proficiency^α·retention^β`).
  ALEKS-style diagnostic placement. "Test yourself" assessment w/ deterministic grader.
- **Auth + profile:** email-OTP via the self-hosted Supabase at **db.agfarms.dev**
  (`agf-supabase-*` on Hetzner). Tables `bucket.academy_progress` + `bucket.academy_profiles`
  (in the **private `bucket` schema** — NOT PostgREST-exposed; reached via service-role Next
  API routes `src/app/api/academy/{progress,profile}/route.ts`). Public Mastery Profile at
  `/m/<handle>` (honest signal; NO certified rating until `bkt-4at` validates vs real exams).
- **AI features (dark until founder sets `ANTHROPIC_API_KEY` in Vercel):** grounded Socratic
  tutor (`src/app/api/academy/tutor`, S1–S7 safety: closed-set citations, abstain, fail-safe).

**Product decisions (final):**
- **NO Story Protocol** anywhere. Credentials = Open Badges 3.0 / W3C VC (issuer-signed, no blockchain). (2026-06-14)
- **Any-topic AI generation REMOVED** — not the product. (2026-06-15)
- **AI tutor = FREE, no paywall** — focus on getting users. (2026-06-15)
- **Languages honest status:** working *pieces*, NOT a finished course (small deck, TTS-not-recorded audio, residual sense-noise). Don't oversell.

### Polingual — language surface on the photon substrate (`bkt-2ea` / `bkt-nhy`)
`PHOTON-SPEC.md` + `POLINGUAL.md` are the contract/vision. Comparison axes:
semantic / phonetic / spelling / etymology / translation.

**Two photon copies — RECONCILE; the Hetzner one is authoritative:**
- **LOCAL** `_intake/photons/`: `index.sqlite` (**209k** photons, 27 langs — grown from 45k 2026-06-15) + LaBSE-768 semantic
  + 64-d phonetic vectors (`*.f32.bin`, gitignored, ~150MB). Builders + query engine in
  `scripts/photon/` (`common,semantic_build,phonetic_build,query,build_subset,proof`).
- **HETZNER (AUTHORITATIVE)** — `polingual` schema on `agf-supabase-db` →
  **`polingual.photons` = 6.5M rows, 35 langs**. Cols: id, kind, lang, surface, meaning_en,
  tier, branch[], pos, ipa, provenance jsonb, **`relations` jsonb** (translation/etymology
  edges, populated — local copy's were empty), payload jsonb, **`surface_tsv`/`meaning_tsv`**
  (full-text search). **Exposed via PostgREST** (`polingual` in `PGRST_DB_SCHEMAS`). **No
  pgvector yet. No k3s namespace.** Reach the DB via `agfarms 'docker exec agf-supabase-db psql -U postgres ...'`.

**Architecture decision (use existing infra, don't duplicate):** the full Polingual index
should run on the EXISTING `polingual` schema — `create extension if not exists vector`,
add semantic/phonetic vector columns, expose query via a Postgres RPC through the existing
PostgREST, with a Next proxy `src/app/api/polingual/route.ts`. Do NOT transfer/duplicate the
local 45k copy or stand up a parallel service unless pgvector truly can't be enabled.

**Academy "Languages" branch:** polyglot deck `corpus/lang-core.json` (kind:`language`, **448 entries** across 7 langs, IPA from the live API) +
typed accent-tolerant drill + on-device TTS (`lang-audio.js`) + a client word-explorer
(`polingual.js`) over a ~6,500-word baked starter subset (`learning/app/polingual/`). All
Polingual data = **Wiktionary via Kaikki, CC-BY-SA — must attribute.**


**Polingual API — LIVE (interim, 2026-06-15):** `https://polingual.agfarms.dev` serves the
full **local 209k photons / 27 langs / all 5 axes** (~0-105ms). **Verified public 2026-06-15:**
`/healthz` → `photons:209000, semantic_dim:768`; `gold`/`entropy`/`energy` now resolve (the old
45k slice missed everyday words — root cause: the commonness proxy in `scripts/photon/ingest_cache.py`
read only top-level translations, blind to per-sense ones, and had no frequency signal; fixed by
counting per-sense translations + **wordfreq Zipf** weighting). It's a FastAPI service
(`services/photon-api/server.py`, memmaps the LaBSE-768 + 64-d phonetic `.f32.bin`) running
as a **systemd --user service on the box (127.0.0.1:8088)** behind host nginx + Let's Encrypt
— NOT in K3s, touches no tenant. Web app reaches it via the same-origin Next proxy
`src/app/api/polingual/route.ts` (env `POLINGUAL_API_URL`; graceful 503 fallback to the baked
subset). **Migration to the authoritative 6.5M `polingual` schema = just repoint
`POLINGUAL_API_URL`** once pgvector + embeddings land there (needs a GPU/compute plan — the
Hetzner box has none; future bead). Client (`learning/app/js/polingual.js`) is WIRED to `/api/polingual` (hybrid: live full
index first, offline 6,500-word subset fallback) as of `ed819c9e7`.

**Known infra issues (2026-06-15):** (1) the Nucleus issues API (`*.nucleus.agfarms.dev`) is
returning **502** — K3s Traefik at `172.19.0.2:30080` down, affects ALL tenants; bead filing
via the API is broken until it's fixed. (2) `scripts/photon/common.py` says MiniLM-384 but the
live vectors are **LaBSE-768** (stale config; the server auto-detects dims from file size).
(3) **Box disk at 97%** (7.5GB free); `~/polingual-photon` is **19GB** — needs a cleanup pass
(stale venv/old artifacts) before the next big sync. (4) `services/photon-api/deploy.sh` `sudo_e()`
used `bash -c $(printf %q)` which broke on the box's dash login shell ("Unterminated quoted string")
— **FIXED** 2026-06-15: now ships the privileged script to a remote temp file + `sudo -S bash <file>`
(verified). Deploy is idempotent + `--partial --inplace` so a dropped rsync (code 255) just resumes.
