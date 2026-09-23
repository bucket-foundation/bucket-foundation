# Bucket Foundation, Nucleus-Managed Venture

**build the past. build history. bucket is the new renaissance.**

Nonprofit reference implementation, primary research paid-for-once, citeable-forever. Live at bucket.foundation: free-to-read / paid-to-cite, a citation triggers a one-time author payment over x402 (HTTP-native micropayments on Base, EIP-3009); AI agents auto-discover and query the canon via the feed402 spec (/llms.txt). Built on Next.js/Vercel + Supabase + Dynamic auth. Legally held in founder's personal capacity pending formal nonprofit filing (see `GOVERNANCE.md`).

Canon thesis: AI + foundations + a small number of brilliant humans = the next layer of reality. Canon holds **only foundations**, axioms, real math, rules, laws, principles, primary derivations, across **seven branches**: mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind.

Part of AGFarms venture studio. Org dashboard: https://nucleus.agfarms.dev/admin

## Bucket critic

Use the repo-wide [Bucket critic](docs/agents/BUCKET-CRITIC.md) and the review loop in [AGENTS.md](AGENTS.md) for material architecture, implementation and research changes. The saved Claude agent is `bucket-critic`. Its role is review; the parent implements fixes and saves the report. Three review rounds at most per artifact. After round three it merges with its open findings filed as beads, or it closes. Save only the final report.

## Nucleus Connection

- **Instance ID**: `bucket-foundation`
- **Dashboard**: https://bucket-foundation.nucleus.agfarms.dev/admin
- **API**: https://bucket-foundation.nucleus.agfarms.dev *(host down since 2026-09-14, see Known Infra Gaps)*
- **Org fallback**: https://nucleus.agfarms.dev/api/portfolio/dispatch *(same host, also down)*
- **Auth**: export `NUCLEUS_ADMIN_USER` and `NUCLEUS_ADMIN_PASSWORD` in your shell
- **Bead Prefix**: `bkt-`
- **Tier**: 3 (experiment/idea), graduating to Tier 2 once instance is deployed + first paying customer signs

## Local First

Set by the founder on 2026-09-18: Bucket runs on this machine first, and hosted services are optional.

- **Database**: the local Supabase stack. `npm run db:local` starts it, `npm run db:local:status` prints the keys for `.env.local`, and `docs/AUTH.md` has the steps. Building and testing need no hosted Supabase project.
- **App**: `npm run dev` against the local stack.
- **Engine**: `hte-serve` runs as the `hte-serve.service` user unit on 127.0.0.1:8420 in live mode (`scripts/systemd/install-hte-serve.sh`). `.env.local` sets `HTE_SERVE_URL=http://127.0.0.1:8420` and `HTE_SERVE_TIMEOUT_S=600`, so `/api/research-os/hypothesize` and the MCP `hypothesize` tool answer locally.
- **Beads**: new beads go to `BEADS-PENDING.jsonl` while the Nucleus host is down, and drain when it returns through `npm run beads:dispatch -- --source <source>` (a dry run; add `--apply` to write). It files each row once, adds its dependency edges, and records the result in `BEADS-DISPATCHED.jsonl`.
- **Public site**: still ships. `dev` promotes to `main`, and Vercel builds `main` for bucket.foundation.

## Known Infra Gaps

1. **No `NSMotionUsageDescription`** on DerbyFish iOS (needed for Path B sensor capture, tracked as cross-venture `dbt-` bead).
2. **Nucleus host unreachable since at least 2026-09-14.** `5.161.236.151` answered no ping and no port on 2026-09-18, so `bd-remote` and every `*.nucleus.agfarms.dev` call time out. Beads queue in `BEADS-PENDING.jsonl`.

## Repo

This venture is a single repo (cloned from `gianyrox/bucket-foundation`, pending transfer to `AGFarms/bucket-foundation` on formal nonprofit filing or a proper nonprofit legal entity).

- **Next.js 14** app on Vercel (`src/app`, `src/components`, `src/context`, `src/lib`, `src/providers`)
- **Supabase Auth** for the one site session (`docs/AUTH.md`): email one-time code at `/sign-in`, cookies through `@supabase/ssr`, `bucket.identities` per person
- **Research OS** is the product (`docs/RESEARCH-OS-APP.md`, `learning/research-os/INTEGRATION-PLAN.md`); the app lives under `src/app/research-os/(app)`
- **Story Protocol** SDK for IP NFT minting and **Walrus** for content storage, on the bucket 1.0 publish path only
- **Dynamic** for wallet linking under `/knowledge`, `/library`, `/research`, `/assets`
- **Supabase** for off-chain metadata

## Strategic Docs

- `MANIFESTO.md`, thesis
- `PROTOCOL.md`, the x402 data protocol spec
- `GOVERNANCE.md`, nonprofit governance + COI disclosure
- `HISTORY.md`, archaeology of bucket 1.0 (Dec 2022 Figma) → bucket 2026
- `README.md`, project overview
- `canon-figures/`, contributor index (~76 canon-tier figures across 7 branches, seed pass-1)
- `nonprofit-application/`, 501(c)(3) reinstatement packet

## Canon Research Layers

Bucket Foundation canon lives on gdrive (not in this repo, too large, too many PDFs):

- **Master canon**: `gdrive:AGFarms/Nucleus/research/bucket-canon/`
 - 7 branches: `01-mathematics`, `02-physics`, `03-chemistry`, `04-information`, `05-biophysics`, `06-cosmology`, `07-mind`
 - Outcomes (longevity, disease, cognition) are downstream applications. Canon holds foundations only
- **Outcome canon (longevity)**: `gdrive:AGFarms/Nucleus/research/longevity-canon/`, cross-referenced to `bucket-canon/05-biophysics/sub-outcomes/longevity/`
- **Kruse corpus**: `~/jackkruse/`, 460 scraped articles, FTS5 + MiniLM-L6-v2 + RRF hybrid search, one partial source for the 05-biophysics branch. **This is the Kruse Index.** Not open-source as of 2026-04-17.

## Research Papers

Rules for writing a Bucket paper to journal standard, LaTeX + Lean 4 +
citations, every term hyperlinked to its glossary entry: `papers/PAPER-STANDARDS.md`.
Copy `papers/template/` for a new paper. Its `Makefile` targets: `pdf`
(pdflatex/biber/pdflatex/pdflatex, latexmk is not installed here),
`figures` (rebuild every figure from its script), `lean` (`lake build`),
`lint` (org voice rules on the paper's prose), `clean`. Shared, verified
citations live in `papers/bib/common.bib`.

## Autonomous Mirror Jobs

Long-running ingestion tasks live as systemd --user services + timers, with
idempotent runner scripts in `scripts/`. They auto-start on boot (linger=yes
already set), auto-retry on failure, and self-disable when complete. Every
new shell prints a one-line status (see `~/.bashrc`); `bkt-nuc` sessions
should run `bash scripts/pursue-status.sh` as part of session-start checks.

Active jobs:

| Job | Runner | Service | Status command |
|---|---|---|---|
| **war.gov PURSUE Release 01 mirror** (162 records → `_intake/war-gov-pursue-release-01/`) | `scripts/pursue-mirror-runner.sh` | `pursue-mirror.timer` (hourly) | `pursue-status` (alias) |
| **Sacred-History Corpus mirror** (rights-aware; PD/open LIVE, Tier-B gated → `_intake/sacred-history-corpus/work/`) | `_intake/sacred-history-corpus/runners/sacred-history-runner.sh` | `sacred-history-mirror.timer` (**daily, RECURRING, does NOT self-disable**) | `sacred-history-status` (alias) |

The Sacred-History timer is **recurring forever** (re-checks for new
editions/manuscripts/events), unlike `pursue-mirror.timer` it never
self-disables. Phase 1 is LIVE for PD/open sources only (Sefaria index,
SuttaCentral CC0, Tanzil verbatim Arabic, ctext PD structure ToS-safe,
Bounded CC0 Wikidata SPARQL); copyrighted/NC/unclear stay metadata-only
and gated (`TIER_B_GUARD=1`). Network AI / Viatika x402 = $0 (local model
only). See `_intake/sacred-history-corpus/DECISIONS.md`.

Manual control commands: `docs/internal/OPERATIONS.md`.

## Bead Tracking

`bd-remote` against the instance above when the host is up; `BEADS-PENDING.jsonl` otherwise (Local First).

## Code Conventions

- TypeScript strict mode
- Conventional commits: `type(scope): description`
- Next.js App Router conventions (`src/app/<route>/page.tsx`)
- Use existing context providers in `src/context/` before creating new ones
- No secrets in repo, `.env` is gitignored, `.env.example` documents required vars
- All public-facing copy should honor the slogans in order: **build the past. Build history. Bucket is the new renaissance.**
- No code comments and no docstrings. Names and tests carry the meaning. Keep only tool directives: `eslint-disable*`, `@ts-expect-error`, `@ts-ignore`, `/// <reference`, `voice-ignore*`, `# noqa`, `# type: ignore`, `# pragma`, shebangs, SPDX lines, and `/*#__PURE__*/`. A comment on any other line fails review.

## Rules

- Every code change needs a bead FIRST (file via fallback dispatch until cert issued)
- Do NOT modify `~/agfarms/viatika/` (read-only vendor reference)
- Do NOT modify `~/jackkruse/` without re-scrape integrity check
- Cross-venture work (`dbt-`, `eai-`, etc.) gets filed in the HOME instance, not `bkt-`, with a link back
- Kruse corpus is private until author permission is given (see `TIMELOG.md` entry for Kruse pitch)

## Agent Work Rules

Set by the founder on 2026-09-22 after a week where 17% of added lines reached a user.

- **Launch gate.** Until the launch list opens, a bead is ready only when it names a screen or API a user touches at launch. Everything else carries the label `post-launch` and gets no agent time.
- **Founder-sourced queue.** A bead or roadmap row an agent writes stays in `BEADS-PENDING.jsonl` with `"source": "agent ..."` and is not worked until the founder approves it. Rows the founder asked for carry `"source": "founder YYYY-MM-DD"`.
- **Ops work stays off dev.** Gates, load measurements, runbooks, watch ledgers, build scripts and bead tooling go on `ops/*` branches into `ops/integration` (Branch Policy).
- **No per-change logs.** `learning/research-os/CHANGE-LEDGER.md` and `TIMELOG.md` are frozen. The PR is the record.
- **Memos need a question.** A memo over 200 lines needs a founder question named in its bead. Agent process docs go in `docs/internal/`, and no page renders them.
- **CLAUDE.md budget.** This file stays under 300 lines. A new rule replaces an old one.
- **Output budget.** Commit bodies three lines at most. PR bodies ten lines at most: what changed, how it was tested. No recap in replies.

## Grant Draft Review

Grant drafts go through the Longtail chisel queue. Commands and the secret location: `docs/internal/OPERATIONS.md`.

## Bucket Academy + Polingual

The learning system.

**Bucket Academy** is the Learn module of Research OS as of 2026-09-16 (`docs/RESEARCH-OS-APP.md`; engine port in `src/lib/academy/{fsrs,engine}.ts`, surfaces under `src/app/research-os/(app)/learn`, `/academy` redirects there). The original app, still the corpus source and a standalone build, shipped 2026-06-12..15 and lives in `learning/app/`
(vanilla-JS PWA: `js/{fsrs,engine,adaptive,diagnostic,assess,auth,auth-ui,tutor,
onboarding,library,haptic,polingual,lang-audio,app}.js` + `art/art-gen.js` +
`corpus/*.json`), mirrored to `public/academy-app/` by `scripts/sync-academy.mjs`
(predev/prebuild hooks), framed at Next route `src/app/academy/page.tsx` → live at
**bucket.foundation/academy**. Validate: `learning/app/validate.sh`. Design+research:
`learning/EPIC.md` + `learning/research/` (now on main).

- **Content:** 358 science atoms across the 7 canon branches, each with a full markdown
 `lesson` + 3-depth + quiz + `resources` (Wikipedia/open, link) + deterministic
 procedural-SVG art. Branch manifest = `learning/app/corpus/index.json`.
- **Engine:** FSRS-5 + two-layer graph + FIRe + mastery (`M=proficiency^α·retention^β`).
 ALEKS-style diagnostic placement. "Test yourself" assessment w/ deterministic grader.
- **Auth + profile:** email-OTP via the self-hosted Supabase at **db.agfarms.dev**
 (`agf-supabase-*` on Hetzner). Tables `bucket.academy_progress` + `bucket.academy_profiles`
 (in the **private `bucket` schema**, sealed off from PostgREST; reached via service-role Next
 API routes `src/app/api/academy/{progress,profile}/route.ts`). Public Mastery Profile at
 `/m/<handle>` (signal; NO certified rating until `bkt-4at` validates vs real exams).
- **AI features (dark until founder sets `ANTHROPIC_API_KEY` in Vercel):** grounded Socratic
 tutor (`src/app/api/academy/tutor`, S1, S7 safety: closed-set citations, abstain, fail-safe).

**Product decisions (final):**
- **NO Story Protocol** anywhere. Credentials = Open Badges 3.0 / W3C VC (issuer-signed, no blockchain). (2026-06-14)
- **Any-topic AI generation REMOVED**; the rest of the product stays. (2026-06-15)
- **AI tutor = FREE, no paywall**, focus on getting users. (2026-06-15)
- **Languages status:** working *pieces* short of a finished course (small deck, TTS-not-recorded audio, residual sense-noise). Don't oversell.

### Polingual

Language surface on the photon substrate. Contract and vision: `PHOTON-SPEC.md`, `POLINGUAL.md`. Axes: semantic, phonetic, spelling, etymology, translation.

- Full index: 6,564,942 photons, 35 languages, LaBSE-768 plus 64-d phonetic vectors with HNSW, in local docker `bucket-pgvector` on 127.0.0.1:5433, table `photons_full`. API `services/photon-api/server_pg.py` on :8090.
- Fallback: `polingual.agfarms.dev`, 209k photons. The app reaches either through `src/app/api/polingual/route.ts` (`POLINGUAL_API_URL`, then `POLINGUAL_FALLBACK_API_URL`, then the baked subset).
- Authoritative metadata with `relations` jsonb (translation and etymology edges): `polingual.photons` on the Hetzner Supabase.
- Data is Wiktionary via Kaikki, CC-BY-SA, and must be attributed.
- Build pipeline, sizing, gotchas and infra history: `docs/internal/OPERATIONS.md`.


<!-- AGF-VOICE-RULES:BEGIN -->
## Writing voice

These apply to every artifact AGFarms produces: code comments, commit messages,
docs, READMEs, CLAUDE.md files, agent definitions, specs, decks, marketing copy,
UI strings, emails, captions, bead titles and descriptions, and chat replies.

**1. Banned words. Never use any of these.**
genuinely, genuine, honest, honestly, truly, really, actually, basically,
essentially, literally, obviously, clearly, certainly, absolutely, definitely,
arguably, undeniably, undoubtedly, simply, merely, very, quite, extremely,
incredibly, remarkably, fundamentally, ultimately, notably, importantly.

**2. No filler or intensifier adverbs.** Cut the adverb and let the verb carry
the sentence. If the adverb is load-bearing, replace it with a concrete number
or fact. Banned: significantly, substantially, dramatically, seamlessly,
robustly, effectively, efficiently, carefully, properly, quickly, easily,
highly, deeply, widely, greatly, particularly, especially, specifically,
generally, typically, usually, surprisingly, successfully, reliably,
consistently, and the rest of the class.

**3. No AI-tell vocabulary.** Banned: delve, leverage, seamless, robust, boost,
tapestry, testament, landscape, realm, underscore, pivotal, crucial, harness,
unlock, elevate, navigate, foster, myriad, plethora, cutting-edge,
game-changer, streamline, empower, intricate, nuanced, holistic, paradigm,
resonate, spearhead, bespoke. Banned phrases: "it's worth noting", "that said",
"in today's world", "at the end of the day", "when it comes to", "a testament
to", "plays a pivotal role", "it's important to note", "dive deeper into".

**4. No antithesis or comparative framing.** Never define a thing by what it is
not. Banned constructions: `X, not Y` , `X, not Y` , `it's this, not that` ,
`not just X but Y` , `not only X but also Y` , `isn't about X, it's about Y` ,
`less about X, more about Y` , a positive clause followed by a comma and a
contradicting clause. State the point positively and once.
Write "Bone responds to mechanical load." Never "Bone responds to load, not cardio."

**5. No em dashes or en dashes.** Use a comma, a colon, or a period. The
characters U+2014 and U+2013 are banned in prose. Hyphens in compound words are fine.

**6. No rule-of-three padding.** Two items or four. Three reads as filler.

**7. Headings name the thing and stop.** No parentheses in any title, subtitle,
or header. No clause tacked on after a comma or a semicolon. If the extra detail
matters, put it in the first line of the body. A colon is fine when it introduces
the subject.
Write `## Bead Management`. Never `## Bead Management (venture-scoped)`.
Write `## Autonomy`. Never `## Autonomy, finish the work; never stop to ask`.

**8. No meta commentary. Ever.** Never write about the writing. Cut every phrase
that tells the reader what they are about to read, what they just read, or how to
read it. Delete it and start with the content.
Banned: "this document explains", "in this section", "the purpose of this doc",
"as mentioned above", "the following section", "we'll cover", "let's dive in",
"before we begin", "now let's", "in summary", "to recap", "in conclusion",
"read on", "moving on", "next up", "last but not least", "without further ado",
"I hope this", "please note", "note that", "as you can see", "you might be
wondering", "below you'll find", "what follows is", "with that said", "in other
words", "to be clear", "to be fair", "TL;DR".
Write "The API returns 429 above 100 requests a minute."
Never "Note that the API returns 429 above 100 requests a minute."

Plain, direct sentences. Short where short works. Write the way you would say it
to a colleague.

**Enforcement.** `agf-lint-voice` checks prose files. `agf-lint-voice-src` checks
the prose inside source files: comments, docstrings, and UI text nodes. Both take
`check` and `fix`. A pre-commit hook runs each over the staged files and blocks
the commit on any hit.

**Escape hatches**, for the cases where the rule would do damage:
- Verbatim material (quoted emails, reproduced sources, evidence, transcripts):
  put a `voice-ignore-file` comment near the top. Never reword a quotation.
- A single line: `voice-ignore-line` on it, or `voice-ignore-next N` above it.
- A word that names a real thing in this repo (a directory, a metric, a research
  field, a product): add it to that repo's `.voiceallow`, one term per line.
- A whole tree of ingested or vendor material: add the path to `.voiceignore`.

Reach for an escape hatch when the word is load-bearing. Rewrite otherwise.
<!-- AGF-VOICE-RULES:END -->

## Hypothesis Engine Loop

The history hypothesis engine lives in `tools/hypothesis-engine/` (`hte`), with its design paper in `papers/history-hypothesis-engine/` and specs in `_intake/hypothesis-engine/`. Two loops keep it optimal.

- **Cloud routine `bkt-hte-optimize-loop`** (hourly at :07 UTC, Sonnet, fake-mode only): `make test`, synthetic and real-corpus sweeps, one test swarm per tick, a two-table review (Secrets, QA) on every open non-draft PR in the org, Research OS schema alignment when `src/lib/research-os/types.ts` or the `graph.productions` migration changes, and squash-merge of its own `fix/hte-` and `test/hte-` PRs under the conditions in its prompt. Log at `tools/hypothesis-engine/docs/LOOP-LOG.md`.
- **Local session loop** (`bkt-nuc`): live Sonnet campaigns through `claude -p`, the paper pipeline with Drive publish, merges of larger engine PRs after review, Nucleus beads.

### PR review standard

Every PR gets a review before merge with two tables, Secrets and QA, each row severity, file, line, issue, fix. Secrets: keys, tokens, wallet keys, Supabase or Vercel values, internal hosts or IPs, private emails, real-person data in fixtures, absolute home paths. QA: the diff matches its own docstrings and docs, every behavior change has a test, the suite passes on the branch, silent failures (broad excepts, defaulted errors, swallowed exceptions, logging that reaches no artifact), and coverage gaps named as exact scenarios. Engine PRs also get the silent-failure hunter and the test-coverage analyzer. Findings above Medium are fixed on the branch before merge. Self-approval is blocked on the founder's account, so the verdict goes in the review body.

### Working tree rules

The main checkout stays on `dev` and takes fast-forward pulls only (moved there on 2026-09-18). The mirror timers write into it, so never reset it or stash in it. Engine sessions work in git worktrees on the home disk (`~/agfarms/.wt-*`), one branch per worktree, removed when the PR merges. `/tmp` is a 31 GB tmpfs shared by every session; keep worktrees and clones off it. One branch and one PR per distinct change; claim a branch by opening a draft PR before writing to it.

### Research OS seam

The engine exposes `hte.api.hypothesize`, `hte-serve` (`POST /hypothesize`, `GET /health`, localhost), and the `hypothesize` MCP tool definition in `hte/mcp_tool.py`. The app side applies `tools/hypothesis-engine/docs/research-os-hypothesize-route.patch`. Field mapping lives in `tools/hypothesis-engine/docs/PRODUCTION-SCHEMA-ALIGNMENT.md`; contract tests fail when the production schema drifts.

## Branch Policy

Four long-lived branches, set on 2026-09-14 to stop Vercel building on every push.

- `main`: production. Vercel builds it. Receives merges from `dev` only, on the founder's cadence.
- `dev`: integration and the default PR target. Vercel builds it only when a site path changes (`vercel.json` `ignoreCommand`). Site work (`feat/site-*`, `feat/ros-*`, `intake/*` that the site renders) opens PRs into `dev`.
- `hte/integration`: engine work. Vercel never builds it (`git.deploymentEnabled` blocks `hte/*`, and `scripts/vercel-ignore-build.sh` skips the same prefix). Every engine PR (`feat/hte-*`, `fix/hte-*`, `test/hte-*`, `run/*`, `docs/hte-*`) targets `hte/integration`; the cloud loop merges its own there. One batch PR carries `hte/integration` into `dev` when the batch is reviewed.
- `ops/integration`: ops and process work (`ops/*`, `gate/*`, `measure/*`). Vercel never builds it. One batch PR a week carries it into `dev`, on the founder's word.

Rules: never push to `main`; a PR into `main` comes from `dev` alone; engine PRs never target `dev` or `main` directly; a branch that needs a preview build must avoid the blocked prefixes. Same rule applies to every Claude session working this repo.

