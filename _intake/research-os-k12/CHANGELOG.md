# Changelog: _intake/research-os-k12/

## 2026-09-10, canon and Academy corpus ingestion

Branch `feat/ros-canon-ingest`. Two ingestion importers that grow the Research
OS graph past the Phase 0 seed's 22 nodes, no model in the loop. Full account:
`learning/research-os/INGESTION.md`.

Shipped: `src/lib/research-os/ingest/academy.ts` (`buildAcademyImport`), which
maps all 487 atoms across `learning/app/corpus/*.json`'s eight importable
branch files to `graph.nodes` drafts (kind `concept` or `law` from the atom's
own `type`; tier `13 + requires-depth`, monotonic by construction) and every
`requires` edge to a `prerequisite` edge, idempotent on `(source file, atom
id)`. `src/lib/research-os/ingest/canon.ts` (`buildCanonImport`), which maps
`bucket-canon/02-physics/`'s six dossiers to a `law` or `primary_source` node
(tier 90, the seed's own canon-bridge sentinel) with a `cites` edge to its own
bibliographic source (law-kind dossiers only) and a `derives_from` edge to a
matched Academy atom, by exact slug or `canon-atom-map.json` override; four of
the six dossiers have no match and land on the review list rather than being
guessed. `src/lib/research-os/ingest/validate.ts` (orphan-edge and
tier-monotonicity checks, shared by both importers and their tests) and
`.../review.ts` (the merge helper behind `scripts/research-os/ingest/out/
review-list.json`). Two CLI scripts (`academy-import.ts`, `canon-import.ts`,
dry-run default, `--apply` upserts through the graph-schema service-role
client). 42 unit tests across three files, run via `npm run test:research-os`,
including two run against the real corpus and the real bucket-canon dossiers
on disk.

Dry run against the current repo: 487 nodes / 820 edges from the Academy
corpus, 8 nodes / 4 edges from the canon dossiers, 4 review items (all
`unmatched_derives_from`), zero tier violations, zero orphan edges.

## 2026-09-10 (hypothesis engine bridge)

Branch `feat/ros-engine-bridge`, worktree review of a WIP commit against PR #10
(`feat/hte-k12-research-os`), which merged the `hte.api.hypothesize` HTTP surface,
the literature corpus adapter, and a Research-OS-row auto-normalizer in
`tools/hypothesis-engine` concurrently with this work. Full account:
`learning/research-os/ENGINE-BRIDGE.md`.

Shipped: an engine hypothesis to `graph.nodes`/`graph.edges` adapter (idempotent on
engine/run id/hypothesis id); an engine node as a learner "frontier" target,
surfaced on `/api/research-os/route` and the workspace page; `public.research_os_
productions_outbox`, one row per accepted production, in the raw shape PR #10's own
normalizer already reads with no engine-side code change.

Dropped from the WIP: a hand-built copy of PR #10's own `PRODUCTION-SCHEMA.md`
envelope conversion (`buildProductionEnvelope` and its supporting types in
`src/lib/research-os/engine-bridge.ts`), superseded by PR #10's server-side
normalizer. Preserved verbatim, with the full reasoning, in `DELETIONS.md`.

## 2026-09-10, site alignment pass

Branch `feat/ros-site-alignment`. Aligned the public site with the Research OS
for K-12 direction without removing any existing direction. Per the
authoritative paragraph carried in the task brief (also recorded in
`learning/research-os/CHANGE-LEDGER.md`).

### Edited (outside this folder, logged here per the task's ledger requirement)

- `src/components/Header.tsx`: added a "Research OS" primary-nav item linking
  to `/research-os`, between Academy and Access; every existing item kept.
- `src/components/Presentation.tsx` (home page): added a "Research OS for
  K-12" section after the hero and before the AI-native and thesis sections,
  with the five stages (Access, Awareness, Understanding, Internalization,
  Production), two sentences from the authoritative paragraph, and links to
  `/research-os` and `/research-os/workspace`.
- `src/app/research-os/page.tsx`: prototype link label changed to "Try the
  prototype →"; added a "Read the plan ↗" link to
  `learning/research-os/PLAN.md` on GitHub. Five stage names were already
  Access, Awareness, Understanding, Internalization, Production; no change
  needed there. See `DELETIONS.md` for the replaced link text.
- `MANIFESTO.md`, section 5 ("Who bucket is for"): appended one sentence at
  the end of the section, "Bucket is where a person learns to produce
  knowledge, starting on day one." No other text in the section changed.
- `public/llms.txt`: added a line for `/research-os` to the "Pages you can
  read for free" list.

### Removed

None.

## 2026-09-10: PR #5 post-merge review followup

PR #5 merged (`397066318`) before this review pass completed, so its two residual issues land
here as a direct commit against `main` instead of a PR update. Leak scan of the full PR #5 diff
found no secrets, PII, non-public hostnames, or local paths. Citation check on 8 of the 45 files
against Crossref and DataCite matched frontmatter DOI, title, authors, and year in every case. No
file reproduces more than a paraphrase of its source, so no deletions were needed. Fixed the
parenthetical heading below and the paper-count error (46 to 45) in
`learning/research-os/CHANGE-LEDGER.md`; added a `voice-ignore-line` marker to the one corpus line
carrying a real em dash, a journal's own name. `npm ci` and `npm run build` both pass. Full detail
in `learning/research-os/CHANGE-LEDGER.md`, Iteration 3.

## 2026-09-10: literature corpus and overlap map

Added `_intake/research-os-k12-literature/` (45 verified papers across four areas, see its own
README for the index) and `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` (the shared-substrate map
between Research OS and the hypothesis engine, closing with twelve open questions extending
`learning/research-os/RESEARCH-QUESTIONS.md`). Logged in full in
`learning/research-os/CHANGE-LEDGER.md`, Iteration 2. No existing file in this folder was edited
or removed.

## 2026-09-10, system review fold-in

Folded in the system review pass from the main working tree (`RESEARCH-OS-K12-SYSTEM-REVIEW.md`
plus its four source reports) on top of what PR #3 already carried in this folder (`README.md`,
`funding-log.md`, `.status.json`, `03-data-services.md`, `04-funding-and-people.md`, `raw/*.md`).
No existing file was overwritten or deleted.

Added:
- `01-inventory.md`
- `02-architecture.md`
- `04-compliance-distribution.md`
- `RESEARCH-OS-K12-SYSTEM-REVIEW.md`

Collision: `03-data-services.md` already existed in this folder from PR #3. A byte-for-byte diff
against the incoming file found zero differences (both are the vendor and data-source map, verified
2026-09-09). Filed the incoming copy as `03-data-services-system-review.md` per the fold-in rule for
name collisions, and added a one-line pointer at the top of the existing `03-data-services.md`
back to this entry. `RESEARCH-OS-K12-SYSTEM-REVIEW.md`'s own file list was updated to cite the
`-system-review` filename so its cross-references resolve inside this folder.

Redactions made to the incoming files during the PR #3 review pass (see PR comment for the full
list): one local absolute path in `01-inventory.md` rewritten to a repo-relative description; ten
banned-word hits (`genuinely`, `actually`, `notably`, `deeply`) removed; ten em-dash or en-dash
characters replaced with a colon, a comma, or an ASCII hyphen across `01-inventory.md`. No secret
values, PII, or non-public server addresses were found in the incoming files.

## 2026-09-10, Phase 0 prototype

Scope: graph schema, the sky-is-blue seed path, frontier-backward routing, a minimal student
workspace, stage advancement. Per `RESEARCH-OS-K12-SYSTEM-REVIEW.md` sections 2-4 and 8. Companion
to `DELETIONS.md` (replaced copy) and `learning/research-os/CHANGE-LEDGER.md` (PR #3's own ledger
for the plan and site page).

### Added

- `supabase/migrations/20260910000000_research_os_graph.sql`: the `graph`
  schema, `graph.nodes`, `graph.edges`, `graph.learner_node_state`,
  `graph.productions`, RLS (public read on nodes/edges, own-row on state and
  productions), reusing `bucket.touch_updated_at()`.
- `supabase/seed/research-os-sky-blue.json`: 22 nodes (19 path nodes, grades
  3-5 through Rayleigh scattering and the lambda^-4 law, plus 3 canon-bridge
  nodes mirroring existing `02-physics` academy atoms) and their prerequisite,
  derives_from, cites, generalizes, and example_of edges. Every node's
  provenance is a verified real source (NASA Space Place, Wikipedia,
  Tyndall 1869, Rayleigh 1871 x3, DOIs confirmed by resolving to the
  publisher record).
- `scripts/seed-research-os.mjs`: idempotent loader (validates the seed's
  integrity, then upserts nodes and edges) plus `--check` for validation
  without a database.
- `src/lib/research-os/types.ts`: shared node/edge/stage types.
- `src/lib/research-os/frontier.ts`: `computeFrontier`, the pure
  frontier-backward routing function.
- `src/lib/research-os/stages.ts`: the five stage-advancement rules
  (`onNodeOpened`, `onCheckResult`, `onTransferItemAnswered` stubbed to
  auto-hold, `onProductionSubmitted`).
- `src/lib/research-os/db.ts`: server-only DB access (service-role client
  bound to the `graph` schema, token verification), mirroring
  `/api/academy/progress`'s pattern.
- `src/lib/research-os/llm.ts`: shared grounded-model call, reusing
  `/api/academy/tutor`'s provider seam (local LLM default, Anthropic
  fallback).
- `src/app/api/research-os/route/route.ts`: `GET /api/research-os/route`,
  frontier-backward routing over the seeded subgraph.
- `src/app/api/research-os/state/route.ts`: learner state reads plus the
  `open` and `transfer_item` stage events.
- `src/app/api/research-os/workspace/route.ts`: `POST
  /api/research-os/workspace`, the four tools Locate, Quote, Check, Organize.
- `src/app/api/research-os/production/route.ts`: the Production form's
  backing route (draft save, submit).
- `src/app/research-os/workspace/page.tsx`: the student workspace page,
  vertical map with stage indicators, the four tools, the Production form,
  email-OTP sign-in reusing the existing Supabase project.
- `scripts/test-research-os-routing.ts`: `node:test` unit tests for the seed
  path's integrity and `computeFrontier` against three synthetic learner
  states.
- `_intake/research-os-k12/DELETIONS.md`: this build's one replaced-copy
  entry.

### Edited

- `src/app/research-os/page.tsx`: added a "open the Phase 0 prototype" link
  to `/research-os/workspace`; updated the "§ status" paragraph to describe
  the sky-is-blue path this PR ships (see `DELETIONS.md` for the replaced
  text and why).
- `package.json`: added `test:research-os` script
  (`npx ts-node ... scripts/test-research-os-routing.ts`), matching the
  existing `test` script's invocation style.
- `_intake/research-os-k12/CHANGELOG.md`: this file, merged with the system
  review fold-in entry above rather than overwritten (both entries describe
  real, separate work in this folder).

### Deliberately not built (Phase 1, per the review's gap analysis)

- `graph.prereq_ancestor` (precomputed backward closure); Phase 0 walks
  `graph.edges` at request time, fast enough at 22 nodes.
- Diagnostic-probe generalization for cold-start learners (the task's item 3
  calls this "hardcoded scope").
- A teacher layer, roster sync, payout ledger, or minors consent flow (task
  item 6).
- Real full-text source ingestion for Quote; Phase 0's Quote tool returns the
  seeded node summary plus its real citation, not a passage pulled from a
  larger source document.

## 2026-09-10, PR #6 review pass

Strict review of PR #6 before merge. Leak scan on the full diff against
`origin/main` found no API keys, no `.env` contents, no server IPs, no
`/home/gian` paths, and no Claude session URLs in file content; the only
email match was the existing placeholder `you@school.example`. No redactions
were needed.

### Fixed

- `src/app/api/research-os/production/route.ts`: the POST handler upserted a
  production row by client-supplied `id` with `onConflict: "id"` and always
  set `learner_id` to the caller's own verified id, without first checking
  that an existing row at that `id` belonged to the caller. A learner who
  knew or guessed another learner's production id could overwrite that row
  and reassign it to themselves, since the service-role client bypasses the
  migration's RLS `own_update` policy by design (see `db.ts`'s header
  comment). Added an ownership check before the upsert: fetch the existing
  row's `learner_id` and return 403 on a mismatch, 404 if the id does not
  exist.
- `_intake/research-os-k12/DELETIONS.md`: removed a banned adverb
  ("actually").
- `src/app/api/research-os/workspace/route.ts`: removed a banned adverb
  ("actually") from the Check tool's system prompt.
- `src/app/research-os/workspace/page.tsx`: replaced two em dashes in JSX
  citation strings with a colon and a comma; rewrote the sunset transfer-item
  prompt to drop an antithesis construction ("looks red, not blue").
- `scripts/seed-research-os.mjs`: rewrote a header-comment sentence to drop
  an antithesis construction ("Postgres, not a static file mirror ...
  server-queried, not shipped to the browser").
- `scripts/test-research-os-routing.ts`: rewrote one assertion message to
  drop an antithesis construction ("real stage, not silently upgrade it").

### Verified, no change needed

- RLS: `graph.nodes` / `graph.edges` are public-select only (no write
  policy for any role but service-role); `graph.learner_node_state` and
  `graph.productions` scope select/insert/update to `auth.uid() =
  learner_id`. Every application-code query in `db.ts` and the route
  handlers (aside from the bug above) filters by the token-verified learner
  id, never a client-supplied one.
- `frontier.ts`: `computeFrontier` guards against cycles with a `visited`
  set (a prerequisite cycle cannot loop the BFS) and every non-mastered node
  with no prerequisites is itself a frontier stop, so every reachable node
  resolves to a frontier or chain member; an unreachable target throws
  before the route ever calls it, and the route validates the target slug
  first.
- Workspace API: the four actions (locate, quote, check, organize) are a
  closed switch with a 400 default; locate and quote never call a model;
  Organize's system prompt forbids adding any fact not in the learner's own
  notes and its output lands in an editable, unsubmitted textarea
  (`production.claim`) on the client, never auto-submitted.
- Citations: spot-checked 5 of the seed's sources with WebFetch (Tyndall
  1869 `doi:10.1098/rspl.1868.0033`, Rayleigh 1871
  `doi:10.1080/14786447108640452` and `...640507`, the NASA Space Place
  page, and the pinned Wikipedia Rayleigh-scattering revision). All five
  resolve live and match the seeded title/author/year. No fabricated
  citation found.
- Voice lint (`agf-lint-voice check`, `agf-lint-voice-src check`) on every
  file this PR touches: 0 violations after the fixes above.
- Gates: `npm ci`, `npx tsc --noEmit`, `npm run build`,
  `npm run test:research-os` (8/8 pass), `next lint` on every touched file:
  all clean.
