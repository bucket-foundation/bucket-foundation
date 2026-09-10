# Changelog: _intake/research-os-k12/

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
