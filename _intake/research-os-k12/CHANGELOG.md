# Changelog: _intake/research-os-k12/

## 2026-09-10: PR #19 review pass

Review of PR #19 (`docs/ros-plan-revision-1`) before merge. Leak scan on the full diff against
`origin/main` found no API keys, no `.env` contents, no server IPs, no non-public hostnames, no
personal emails other than `gianyrox@gmail.com`, no PII, no `/home/gian` paths, and no Claude
session URLs in any line this PR adds. No redactions were needed.

### Fixed

- `learning/research-os/PLAN-REVISION-1.md`: the PR #15 row in section 1's shipped-work table and
  the batch-two references in sections 4 and 5 said PR #15 was still open; PR #15 merged to main
  (`e51b1db6e`) partway through this review, so the entries now read it as shipped. Rewrote two
  antithesis constructions ("real at the code level ... not just an analogy"; "the process trail
  ... not only the final submitted claim").
- `learning/research-os/PLAN.md`: the "Revision 1" pointer paragraph said PR #15 was open; updated
  to reflect the merge.
- `_intake/research-os-k12/CHANGELOG.md` (this file, the plan-revision-1 entry above): same PR #15
  status fix.
- `learning/research-os/CHANGE-LEDGER.md`: merging `origin/main` produced a conflict between this
  PR's own Iteration 6 entry and main's already-merged Iteration 6 (PR #15, literature batch two).
  Kept both: main's entry stays Iteration 6, this PR's entry is renumbered Iteration 7 and notes
  the PR #15 merge.

### Verified, no change needed

- Every "what shipped" line in section 1's table against `gh pr list --state merged`: PRs #3, #5,
  #6, #7, #8, #10, #12, #14, #15 merged; #9 open; #11 draft, matching the table's own state column.
- All five cited paper files (Gneezy and Rustichini 2000, Mekler and colleagues 2017, Gasparetti
  and colleagues 2017, Doshi and Hauser 2024, Binz and Schulz 2023) exist under
  `_intake/research-os-k12-literature/` with frontmatter matching the claims made about them.
- Three ETH AI Center section claims spot-checked against code on `main`: `computeFrontier` in
  `src/lib/research-os/frontier.ts`, `hypothesize()` in `tools/hypothesis-engine/hte/api.py`, and
  `research_os_productions_outbox` in `supabase/migrations/20260910010000_research_os_engine_
  bridge.sql` plus `src/lib/research-os/db.ts`. All three exist as described.
- The four design revisions in section 2 each carry one of STABLE, STRONG LEAN, or OPEN.
- `agf-lint-voice check` / `agf-lint-voice-src check` on every file this PR touches: 0 violations
  after the fixes above.
- Gates: nothing under `src/` or `public/` is touched by this PR; no build needed.

## 2026-09-10 (plan revision 1)

Branch `docs/ros-plan-revision-1`. Read PLAN.md, RESEARCH-QUESTIONS.md,
`RESEARCH-OS-K12-SYSTEM-REVIEW.md` sections 4, 8, 9, 10, 11,
`OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`, `ENGINE-BRIDGE.md`, this file,
`BEADS-PENDING.jsonl`, PR #15 (branch `intake/ros-literature-2-batch2`, open
when this pass began and merged to main partway through it), and PR #11
(draft). Wrote
`learning/research-os/PLAN-REVISION-1.md`: a PR-by-PR account of what shipped
since PLAN.md (#3, #5, #6, #7, #8, #9, #10, #12, #14, #15); four
evidence-driven design revisions (payout under Gneezy and Rustichini 2000 and
Mekler 2017, frontier routing under Gasparetti 2017, a class-level diversity
outcome for the three-arm testbed under Doshi and Hauser 2024, Check-tool
phrasing robustness under Binz and Schulz 2023), each labeled STABLE, STRONG
LEAN, or OPEN; a dependency-ordered Phase 1 scope naming five blocking
founder decisions; a table mapping the overlap map's twelve open questions
onto Phase 1 pilot versus Phase 2 district-scale answerability; and the ETH
AI Center fellowship fit (portal opens 2026-09-15). Appended a pointer
paragraph to `PLAN.md` under a new "Revision 1" heading; no existing text in
`PLAN.md` was changed or removed. No file in this folder was edited or
removed.

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

## 2026-09-10: PR #10 review pass

Review of PR #10 (`feat/hte-k12-research-os`) before merge. Leak scan on the
full diff against `origin/main` found no API keys, no `.env` contents, no
server IPs, no non-public hostnames, no personal emails other than
`gianyrox@gmail.com`, no PII, no `/home/gian` paths, and no Claude session
URLs in file content. No redactions were needed.

### Fixed

- `tools/hypothesis-engine/hte/api.py`: `_build_response()` ran outside
  `hypothesize()`'s `try`/`except`, so a bug there (a manifest shape edge
  case) escaped as a bare `TypeError` instead of the documented
  `CampaignError` contract; moved the call inside. `_sanitize()`'s
  path-redaction regex covered `/home`, `/tmp`, `/Users`, `/var`; extended
  to `/srv`, `/opt`, `/root`, `/app`, `/mnt`, `/data`, `/etc`. Rewrote a
  docstring sentence that used an antithesis construction ("not a blanket
  guarantee").
- `tools/hypothesis-engine/hte/serve.py`: the unexpected-500 branch now
  logs the exception and a traceback to stderr for an operator debugging a
  repeat failure; the client-facing body stays a bare class name.
- `tools/hypothesis-engine/hte/api.py`, `hte/mcp_tool.py`,
  `docs/research-os-hypothesize-route.patch`: `hypothesize()`'s response
  carried `run_id` but not which model backed the run; `manifest["models"]`
  (`model-policy.json`'s role map) was already in `MANIFEST.json` but never
  reached the HTTP/MCP response. Added it to `_build_response()`, the MCP
  tool's `outputSchema`, and the not-yet-applied route patch's TS types,
  plus `tests/test_api.py::test_response_carries_which_model_backed_each_
  role_alongside_run_id`.

### Verified, no change needed

- The `hypothesize` surface reads `graph.productions` rows (via
  `normalize_research_os_record`) but writes nothing back to any PR #6
  graph table; no code path in the engine, `hte-serve`, or the MCP tool
  definition ever writes a claim or synthesis on a learner's behalf.
  `docs/research-os-hypothesize-route.patch`'s own route (not yet applied;
  becomes its own PR once PR #6 lands) adds the ownership check
  (`.eq("learner_id", learnerId)` after `verifyLearner(req)`) that closes
  PR #6's own review-flagged IDOR gap before forwarding a production to
  `hte-serve`.
- `tools/hypothesis-engine/docs/PRODUCTION-SCHEMA-ALIGNMENT.md` documents,
  field by field, why `graph.productions` rows do not map onto
  `PRODUCTION-SCHEMA.md` one to one, and names every gap by hand
  (`learner_id` dropped, `transfer_proof` dropped, `status` mapped
  conservatively) rather than silently coercing the shape.
- Gates: `make test` in `tools/hypothesis-engine` (882 passed), `ruff check`
  on every touched Python file, `npm ci`, `npx tsc --noEmit`, `npm run
  build`, `npm run test:research-os` (8/8 pass): all clean.

### Note

This worktree (`.wt-fix10`) had a second, unrelated process actively
writing to `hte/llm.py`, `hte/parallel.py`, `hte/runner.py`,
`hte/timeline.py`, `hte/generate.py`, and several `tests/*.py` files
throughout this review, on top of a legitimate `wip(feat/hte-k12-
research-os): partial work preserved` commit already on this branch. None
of that in-progress content is part of this review pass's commit; only the
five files listed under "Fixed" above were staged and committed, isolated
by hunk where a touched file also carried unrelated unstaged content.

## 2026-09-10, literature batch two

Branch `intake/ros-literature-2`. Task: 31 new DOI-verified papers bearing on the twelve open
questions in `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`, emphasis on 2023-2026 empirical work,
across six areas: LLM assistance and learning outcomes, cognitive offloading and metacognition,
prerequisite and knowledge-graph learning, AI for research evaluation, understanding as a
scientific goal, and motivation and payment. Full per-area breakdown and per-question evidence
mapping recorded in `learning/research-os/CHANGE-LEDGER.md` Iteration 6.

### Added

- 31 files under `_intake/research-os-k12-literature/`, listed in
  `learning/research-os/CHANGE-LEDGER.md` Iteration 6; corpus total rises from 45 to 77 papers.
- `_intake/research-os-k12-literature/prerequisite-knowledge-graphs/`: new fifth branch, five
  files on automatic prerequisite-edge inference and learning-path routing.

### Edited

- `_intake/research-os-k12-literature/README.md`: index extended to 77 rows, five areas.
- `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`: each of the twelve open
  questions gained an "Evidence added in batch two" paragraph.

### Verified Clean

- Every DOI and OpenAlex work id checked live via WebFetch at intake time.
- Three candidate papers named in the task brief were searched for and omitted for lack of a
  resolvable DOI or a findable published record: Talukdar and Cohen (2012, no DOI on OpenAlex or
  Crossref), a distinct World Bank Nigeria follow-up beyond the de Simone (2025) paper already in
  the corpus, and a Si, Yang, and Hashimoto (2025) ideation-execution-gap follow-up.
- No blockquote or extended verbatim passage from any source paper; all `key_claims` and body
  text are paraphrase.

### Removed

None.
