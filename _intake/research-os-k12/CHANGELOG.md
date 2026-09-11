# Changelog: _intake/research-os-k12/

## 2026-09-10: literature batch four

Branch `intake/ros-literature-4`. Task: 25 to 35 new DOI- or ERIC-verified papers targeted
at the gap this corpus had after batch three: evidence about students doing research in
K-12 itself, course-based and high-school research experiences, project-based and inquiry
learning, writing-to-learn and argumentation, epistemic cognition and nature of science, and
citation and source evaluation. Full per-area breakdown and per-question evidence mapping
recorded in `learning/research-os/CHANGE-LEDGER.md`'s literature-batch-four iteration.

### Added

- 30 files under `_intake/research-os-k12-literature/`, listed in
  `learning/research-os/CHANGE-LEDGER.md`'s literature-batch-four iteration; corpus total
  rises from 117 to 147 papers.
- Five new branches: `student-research-experiences/` (10 files), `project-based-inquiry-
  learning/` (7 files), `writing-and-argumentation/` (5 files), `epistemic-cognition/`
  (4 files), `source-evaluation/` (4 files).

### Edited

- `_intake/research-os-k12-literature/README.md`: index extended to 147 rows, eleven
  areas.
- `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`: six of the twelve
  open questions (1, 4, 5, 6, 10, 12) gained an "Evidence added in batch four" paragraph.
- `learning/research-os/PLAN-REVISION-2.md`: section 2a, 2b, and 2d each gained an
  "Evidence added in batch four" paragraph.

### Verified Clean

- Every DOI and OpenAlex work id checked live against `api.openalex.org` and
  `api.crossref.org` at intake time; none are placeholders.
- Two research-brief papers, Condliffe (2017) and Kingston (2018), carry no Crossref DOI;
  each verified against its own ERIC record (ED578933, ED590832) and carries a `doi: null`
  frontmatter field plus an `eric_id`, the same handling this corpus already applies to
  Cuban (2001) and Perkins (1993).
- Three candidate papers named in the task brief were searched for and omitted for lack of
  a resolvable DOI matching the brief exactly: "Hanauer 2017 project ownership" (Hanauer
  and Dolan 2014's Project Ownership Survey used in its place), "Miller 2018" (Burgin,
  Sadler, and Koroly 2012 used in its place), and "Sahin 2015" (Steegh and colleagues 2019
  and Lakin and colleagues 2021 used as the closest verified equity-of-participation
  matches).
- No blockquote or extended verbatim passage from any source paper; all `key_claims` and
  body text are paraphrase.
- A grep-based self-audit for the voice rules ran against every file this pass authored or
  edited, since `agf-lint-voice check` scans zero files under any path containing an
  `_intake` segment (the same org-level ignore-list gap literature batch three's own
  changelog entry already flagged); every flagged instance was rewritten before commit.

### Removed

None.

## 2026-09-10: literature batch four, PR #65 review pass

Review of PR #65 against `main`. Leak scan (keys, `.env` values, IPs, non-public hostnames,
personal emails, PII, absolute local paths, session URLs) found none; digit sequences that
matched a phone-number pattern in a first grep pass were confirmed as DOI and OpenAlex
work-id digit strings on inspection.

Eight of the thirty new cards were sampled for citation verification against Crossref,
OpenAlex, and ERIC: Condliffe (2017), Kingston (2018), Burgin, Sadler, and Koroly (2012),
Hanauer and Dolan (2014), Steegh and colleagues (2019), Grinnell and colleagues (2020),
Wineburg and McGrew (2019), and Breakstone and colleagues (2021). All eight matched on
title, authors, year, and venue or publisher.

Two of the three substitute cards named in the PR body, Hanauer and Dolan (2014) for
"Hanauer 2017" and Burgin, Sadler, and Koroly (2012) for "Miller 2018", already labeled
themselves as substitutes in `why_it_matters`. The third substitute pair, Steegh and
colleagues (2019) and Lakin and colleagues (2021) for "Sahin 2015", did not; both
`why_it_matters` fields were edited to name the unresolved "Sahin 2015" citation and
cross-reference each other as the two closest verified matches.

README.md's 147-row index, per-area counts, and file links were checked against the
corpus on disk: exact match. The overlap map's six "Evidence added in batch four"
paragraphs (questions 1, 4, 5, 6, 10, 12) and `PLAN-REVISION-2.md`'s three (sections 2a,
2b, 2d) all reference files that exist.

One voice-rule hit in newly authored prose: `actually` in the Kuhn (1999) card's
`why_it_matters`, rewritten. One unmarked en dash in a verbatim paper title reproduced in
the README index (Kuiper, Volman, and Terwel 2005); the frontmatter's own `voice-ignore-line`
already covers the source, a documentation line was added to the README noting the
reproduction is verbatim. No other banned-word, dash, or antithesis hits in lines this PR
added.

`git merge origin/main` was clean, no conflicts. `npm ci` and `npm run build` both passed.
No file under `src/` or `public/` changed.

## 2026-09-10: canon human sign-off tool

`feat/canon-signoff-tool`, built against `GOVERNANCE.md`'s "Canon sign-off"
section and PR #45's review paragraph.

### Added

- `tools/canon-pipeline/signoff_core.py` + `tools/canon-pipeline/signoff.py`:
  the CLI (`list`, `approve --by`, `reject --by --reason`, `audit`), reading
  and writing `provenance_signoff` on `bucket-canon/**/primary-papers.yaml`
  records. `approve` refuses unless the record's DOI resolves via a HEAD
  request (`--offline` bypasses). Both `approve` and `reject` are
  idempotent. Every decision appends one entry to
  `CANON-INGESTION-INDEX.md`.
- `tools/canon-pipeline/tests/test_signoff.py`: 24 pytest cases against a
  fixture tree under `tmp_path`, no network, `--offline` throughout except
  the two cases that monkeypatch the DOI check itself.
- `src/lib/canon-signoff.ts` + `src/lib/canon-signoff-approvers.ts`: the
  TypeScript re-implementation of the same contract for the web route,
  plus the second `CANON_SIGNOFF_APPROVERS` allowlist gate.
- `src/app/api/canon/signoff/route.ts` + `src/app/canon/signoff/page.tsx`:
  a reviewer- and founder-gated page listing pending records with
  approve/reject actions, gated on `RESEARCH_OS_REVIEWER_EMAILS` AND
  `CANON_SIGNOFF_APPROVERS`.
- `scripts/test-canon-signoff.ts`: 24 node:test cases (listPending,
  findRecord resolution, approve/reject including idempotency and the
  reject-then-approve transition, and the 403 gate logic in
  `isCanonSignoffApprover`), added to the `test:research-os` chain.
- `tools/canon-pipeline/SIGNOFF.md`: policy, the two signoff vocabularies
  (this tool's `provenance_signoff` vs. the hypothesis engine's
  `signed_off_by`), the two allowlists, the audit trail, and a founder
  runbook for the 20 records currently pending.

### Fixed

- `src/lib/canon-primary.ts`'s `isPendingSignoff` excluded only a `pending`
  value; a `rejected` value fell through and would have been served as
  approved canon once this tool existed to write one. Now excludes both.
  Covered by two new cases in `scripts/test-canon-primary-signoff.ts`.

### Found, not fixed (flagged in SIGNOFF.md, out of scope here)

- `findPrimaryFiles` (`src/lib/canon-primary.ts`) walks only one level
  below each branch directory, so `bucket-canon/07-mind/sub-outcomes/
  education/primary-papers.yaml` (two levels down, 11 of the 20 pending
  records) is never reached by `loadPrimaryPapers()`. Those 11 records are
  not served by `/api/research` today regardless of sign-off status. This
  tool's own file discovery walks the full tree, so `signoff.py list` and
  the `/canon/signoff` page still see all 20.

### Verified

- `pytest tools/canon-pipeline/tests/` (41 passed, 0 failed), `npm ci`,
  `npx tsc --noEmit`, `npm run build` (`/canon/signoff` and
  `/api/canon/signoff` both in the manifest), `npm run test:research-os`
  (267 passed, 0 failed, 20 files), `eslint` on all touched TS/TSX files,
  `agf-lint-voice-src check` on the touched TS/TSX/Python files,
  `agf-lint-voice check` on the touched docs (`GOVERNANCE.md`,
  `tools/canon-pipeline/SIGNOFF.md`): all clean.
- No record's `provenance_signoff` value changed by this branch; `approve`/
  `reject` were exercised only against fixture trees in the two test
  suites, never against a real `bucket-canon/` file.

## 2026-09-10, PR #56 review pass

Reviewed PR #56 (`feat/hte-question-map`, "generated Research OS question
map with revision check") from the `review/pr56` worktree.

Touched no Research OS surface: every file this PR adds or edits lives
under `tools/hypothesis-engine/` (`hte/question_map.py`, `hte/cli.py`'s
new `question-map` subcommand, `hte/data/question-map.json`, its own
`docs/RESEARCH-OS-INTEGRATION.md`, `Makefile`, and its own test fixtures).
`hte.question_map` reads `learning/research-os/RESEARCH-QUESTIONS.md` to
cross-check the registry but never writes it; `PLAN-REVISION-2.md`,
`RESEARCH-QUESTIONS.md`, and the Research OS / AI-for-research overlap
map are all untouched. No sentence in a Research OS doc was replaced, so
`DELETIONS.md` gets no entry. The registry's `_meta.seeded_from` field
names `PLAN-REVISION-2.md (PR #44) as merged on main` as the revision the
seed pass reconciled against, matching the plan revision currently on
main.

Merged `origin/main` (which had picked up #55's canon backfill and #59's
feed ledger fix since this branch was cut): one conflict, `hte/cli.py`,
where this PR's `question-map` subcommand and a concurrent `purge`
subcommand (PR #42/#61-adjacent) both landed in the same docstring,
import line, and subparser block; kept both, `python3 -c "import ast;
ast.parse(...)"` confirms the file still parses and `make test` passes
with the merge applied.

### Fixed before merge

- `agf-lint-voice-src` flagged an antithesis construction this PR
  introduced in `hte/question_map.py`'s `compute_diff` (a diagnostic
  string, "`, not present in the live corpus registry`"). Rewrote it to
  state the point once ("missing from the live corpus registry"); no
  test asserted on the old string.
- `ruff check` flagged one unused import (`json`) in this PR's own
  `tests/test_question_map.py`; removed via `ruff check --fix`. The 32
  pre-existing `ruff` findings elsewhere in `tools/hypothesis-engine/`
  (swarm2/swarm3 fixtures, `test_cli_pipeline.py`) predate this PR and
  are out of scope.

### Verified

Leak scan over the full diff: no keys, tokens, secrets, IPs, non-public
hostnames, `/home/gian` paths, or PII. The only emails are
`gianyrox@gmail.com` (author) and `noreply@anthropic.com` (co-author
trailer); the two `Claude-Session` URLs found are commit-message
metadata, not file content. `hte question-map --check` and a fresh
`--write` both confirm `docs/RESEARCH-OS-INTEGRATION.md`'s committed
generated section is byte-identical to a live regeneration (no drift,
idempotent). `tests/test_question_map.py`: 25/25 passing. `make test`
(engine, post-merge): 1146 passed, 18 deselected. `npm run
test:research-os`: 298/298 passing, including
`scripts/test-canon-primary-signoff.ts`'s `isPendingSignoff` suite
(untouched by this PR). `npx tsc --noEmit` and `npm run build` clean.
`agf-lint-voice check` / `agf-lint-voice-src check`: 0 violations after
the antithesis fix above.

Non-blocking note: `Makefile`'s new `question-map` target comment
describes `hte question-map --check` as "the CI-side gate," but no
`.github/workflows/` file calls it yet (`tools/hypothesis-engine/` has
no CI workflow at all on `main`). Flagged in the PR review comment;
not fixed here since adding CI wiring for this engine is outside this
PR's own scope and no workflow pattern exists yet to extend.

## 2026-09-10, PR #42 review pass

Review-and-merge pass on PR #42 (`feat/hte-purge`, "provenance index and
purge for learner-derived artifacts") before merge, worktree
`.ros-worktrees/r42`. Full account: `tools/hypothesis-engine/docs/
LOOP-LOG.md`, "2026-09-10, PR42 review".

Touched a Research OS surface only in `learning/research-os/compliance/
DATA-INVENTORY.md`: amended the `public.research_os_productions_outbox`
row to name `hte purge --production <id>` as the required manual call
that reaches the engine-side artifacts a learner delete request cannot,
closing the reachability gap the engine PR's own `docs/PRIVACY.md`
already named. No other Research OS file (`src/lib/research-os/`,
`src/app/research-os/`, migrations) changed.

## 2026-09-10, PR #54 review pass

Reviewed PR #54 (LLM-assisted edge inference, the two-prompt agreement
check, `/research-os/edges` human review, and the `ros-11` remainder
labeling `hte/export.py`'s `TIMELINE.md` export unvalidated) from the
`review/pr54` worktree.

### Verified

Leak scan over the full diff: no keys, tokens, secrets, IPs, non-public
hostnames, `/home/gian` paths, or Claude session URLs. The only email
addresses are the existing `reviewer@school.example` / `learner@school.example`
/ `anyone@school.example` test fixtures.

Correctness checked against the calibration and review-flow contract: the
proposer (`src/lib/research-os/inference/propose.ts`) never writes to
`graph.edges`, only `/api/research-os/edges`'s approve branch does;
`llmSelfReportedToConfidence` clamps every input, including non-finite and
out-of-range values, into the inferred band; a split verdict lands at the
fixed `DISAGREEMENT_CONFIDENCE` (0.4), below `LOW_CONFIDENCE_THRESHOLD`
(0.6); approve writes `confidence_source: "teacher"` at 0.95, records the
reviewer, is idempotent on a second call (`decideEdgeProposal`'s
`alreadyDecided` short-circuit), and rebuilds `graph.prereq_ancestor`
best-effort; reject is idempotent with no edge write; the route 403s a
non-reviewer via the existing `verifyReviewer` allowlist gate; the model
call reuses the tutor's own `selectProvider` abstain path and
`callGroundedModelWithUsage` / `logToolCost` cost-logging; `model` and
`prompt_hash` are `not null` columns on every queued proposal.

### Fixed

- `scripts/research-os/ingest/test-ingest-infer-llm.ts`: the calibration
  bound (0.3 to 0.65) had only point-sample coverage. Added a 400-point
  numeric sweep of `llmSelfReportedToConfidence` (-2 to 2 in 0.01 steps)
  plus adversarial values (`NaN`, `Infinity`, `-Infinity`, `-0`, extreme
  magnitudes), and a full `sanitizeJudgment` -> `combineAgreement` grid
  over malformed answer/justification/confidence shapes on both prompts,
  asserting every proposed confidence lands in
  `(0, INFERRED_CONFIDENCE_MAX]` and every disagreement stays below
  `LOW_CONFIDENCE_THRESHOLD`. Suite grew from 277 to 279.
- `supabase/migrations/20260910050000_research_os_edge_proposals.sql`
  renamed to `20260910050001_research_os_edge_proposals.sql`:
  `origin/main`'s concurrent PR #52 landed a roster migration with the
  identical `20260910050000` timestamp prefix. Two migrations sharing one
  version string risk a Supabase CLI tracking-table collision even though
  the filenames differ; bumped this one a second later. Updated the two
  code references (`scripts/test-research-os-edges-review.ts`'s
  `EDGE_PROPOSALS_MIGRATION` path, `src/app/api/research-os/edges/route.ts`'s
  header comment). No migration content changed.

### Merged

`origin/main` twice: first cleanly (one file, `LOOP-LOG.md`, added on
`main` only), then a second time after PR #52 (`feat/ros-roster-sync`)
merged concurrently, conflicting on `BEADS-PENDING.jsonl`,
`_intake/research-os-k12/CHANGELOG.md`, `learning/research-os/CHANGE-LEDGER.md`
(all three append-only, kept both sides' entries, reordered newest-first),
`package.json` (both PRs appended to the `test:research-os` chain; merged
into one chain carrying every new script from both, 23 total), and a
one-sentence docstring rewording in
`tools/hypothesis-engine/tests/swarm-20260910/test_serve_props.py` (kept
`origin/main`'s phrasing, no content lost either way).

### Gates

`npm ci` clean, `npx tsc --noEmit` clean, `npm run build` clean
(`/research-os/edges`, `/api/research-os/edges`, `/research-os/roster`,
`/api/research-os/roster` all in the manifest), `npm run test:research-os`
298/298 across 23 files (279 after this pass's own fix, plus 19 from PR
#52's roster merge), `next lint` clean on every touched TS/TSX file,
`ruff check` clean on `hte/export.py` and its two touched test files,
`pytest` 27/27 on `test_export.py` and its two property-test siblings,
`agf-lint-voice-src check` / `agf-lint-voice check` clean on every touched
file. Squash-merged via `gh pr merge 54 --squash --delete-branch`.

## 2026-09-10, PR #52 review pass

Privacy engineer review of PR #52 (`feat/ros-roster-sync`, "OneRoster CSV
roster sync, reviewer candidates, vendor source interfaces") before merge,
in worktree `.ros-worktrees/r52` per the review protocol. `git merge
origin/main` first (clean, no conflicts to resolve; `origin/main` had
advanced by one hypothesis-engine log commit since the branch's last
merge).

Leak scan on the full diff against `origin/main`: no API keys, `.env`
contents, IPs, non-public hostnames, personal emails other than
`gianyrox@gmail.com`, PII, `/home/gian` paths, or Claude session URLs in
file content. Every fixture user in `scripts/test-research-os-roster.ts`
uses a `.example` email and an invented name. No redactions needed.

Correctness checks against the review's own checklist: `oneroster.ts`
reads users.csv through an explicit field allowlist (`sourcedId`, `email`,
`givenName`, `familyName`, `grades`), so a `birthdate` column never
reaches a `RosterUser`; `grade.ts`'s `gradeToBirthYearBucket` is the only
path that ever sets `learner_profiles.birth_year_bucket`, from a grade
code, never a date. `POST /api/research-os/roster` defaults to a dry run;
`apply` requires the literal string `"true"` and `verifyReviewer(req)`
verifies a real Supabase access token server-side before either path
runs. `apply.ts` never resets an existing `reviewer_candidates.status` on
re-sync (insert-only sets `"pending"`; update touches only email/name).
Idempotency confirmed by test: applying the same bundle's diff twice
yields zero further creates or updates. Migration
`20260910050000_research_os_roster.sql` enables RLS on
`graph.reviewer_candidates` with no anon/authenticated policy. Both
`CleverSource` and `ClassLinkSource` throw unconditionally; neither can
be invoked regardless of env config. `DATA-INVENTORY.md` already listed
the new columns and table.

Two gaps found and fixed on the branch:

- No adversarial fixture exercised a `birthdate` column specifically (only
  `address`/`phone` were covered). Added
  `"adversarial: a birthdate column is dropped at parse time and never
  reaches a write payload or warning"` to
  `scripts/test-research-os-roster.ts`: a `usersCsv` row carrying
  `birthdate,2015-04-12` parses with no `birthdate` key on the resulting
  `RosterUser`, and the literal value never appears in
  `learnerProfiles.create`, `reviewerCandidates.create`,
  `classMembers.create`, or `diff.warnings`.
- The roster route's reviewer gate had no test of its own (the shared
  `isReviewerEmail` allowlist logic is tested elsewhere, but nothing
  confirmed the route checks it, or checks it before parsing the request
  body). Importing `route.ts` directly under this repo's plain
  `ts-node`/CommonJS test runner is not reachable, its `"@/lib/..."`
  imports need a path-alias loader this suite does not wire in, so this
  is a static read of the route's own source, the same technique the
  migration checks already in this file use. New test: `"roster route:
  reviewer gate runs before the request body is ever parsed, and rejects
  with 403"`, asserting both the `verifyReviewer`/403 lines are present
  and that the reviewer check's source position precedes
  `req.formData()`'s.

Gates: `npm ci`, `npx tsc --noEmit` (clean), `npm run build` (both
`/api/research-os/roster` and `/research-os/roster` confirmed in the
build manifest), `npm run test:research-os` (full chain, 0 failures),
`next lint` on every touched file (clean), `agf-lint-voice check` /
`agf-lint-voice-src check` on every touched file (0 violations). 19 tests
in `scripts/test-research-os-roster.ts` (17 original, 2 added by this
review), all passing.

No PII beyond a teacher's own contact information (already documented as
staff data, out of scope for a learner's export/delete rights) is stored
anywhere this bead touches. Merged via `gh pr merge --squash`.

## 2026-09-10, LLM-assisted edge inference and ros-11's TIMELINE.md label

Branch `feat/ros-llm-edge-inference`, worktree `.ros-worktrees/infer`.
Closes `BEADS-PENDING.jsonl`'s `ros-13` LLM-assisted-edge-inference item
and the `ros-11` TIMELINE.md remainder.

### Added

- `src/lib/research-os/inference/calibration.ts`: `llmSelfReportedToConfidence`
  (self-reported model confidence shrunk onto `infer.ts`'s own
  `INFERRED_CONFIDENCE_MIN`..`MAX` band, 0.3 to 0.65, per
  `PLAN-REVISION-2.md` section 2c's policy) and `combineAgreement` (task
  item 2's two-prompt agreement rule: both "no" drops the pair, both "yes"
  keeps the lower shrunk confidence, a split verdict still proposes at a
  fixed `DISAGREEMENT_CONFIDENCE` of 0.4, always below
  `LOW_CONFIDENCE_THRESHOLD`).
- `src/lib/research-os/inference/prompts.ts`: two independently-phrased
  strict yes/no prerequisite prompts plus `promptHash` (sha256, 16 hex
  chars).
- `src/lib/research-os/inference/propose.ts`: `buildCandidatePairs`
  (lexical proposals plus a deterministic, capped tier-adjacent sample),
  `judgePair`/`proposeLlmEdges` (dependency-injected `ModelCaller`, no
  direct `llm.ts` import, so tests stub it with no network and no key),
  `sanitizeJudgment` (a malformed model response downgrades to a safe
  "no," matching `grounding.ts`'s own fail-safe posture).
- `src/lib/research-os/inference/decide.ts`: `decideEdgeProposal`, the
  pure approve/reject transition (0.95 confidence, `confidence_source
  "teacher"` on approve; idempotent on an already-decided proposal),
  mirroring `stages.ts`'s `onTeacherReview` shape.
- `scripts/research-os/ingest/infer-edges-llm.ts`: the CLI, dry run only
  (never writes `graph.edges`), wires the real provider via `llm.ts`'s
  `selectProvider`/`callGroundedModelWithUsage`, writes
  `review-list.json` (`llm_proposed_edge` items) and, when Supabase is
  configured, best-effort queues each proposal into a new
  `graph.edge_proposals` table.
- `scripts/research-os/ingest/lib/build-node-pool.ts`: the node-pool
  assembly factored out of `infer-edges.ts` so both CLI proposers scan
  the identical population.
- `supabase/migrations/20260910050000_research_os_edge_proposals.sql`:
  `graph.edge_proposals`, the review queue, RLS enabled with no
  client-facing policy (service-role only, gated by `reviewer.ts`).
- `src/app/api/research-os/edges/route.ts` and
  `src/app/research-os/edges/page.tsx`: the `/research-os/edges` review
  UI, gated to `RESEARCH_OS_REVIEWER_EMAILS`, mirroring
  `/research-os/review`'s own auth and layout pattern.
- `src/lib/research-os/rebuild-ancestor.ts`: `rebuildPrereqAncestorForBranch`,
  factored out of `scripts/rebuild-prereq-ancestor.ts` so the edges
  route's approve action rebuilds `graph.prereq_ancestor` in-process
  (task item 4) instead of shelling out.
- Test files: `scripts/research-os/ingest/test-ingest-infer-llm.ts` (23
  tests, calibration/agreement/candidate-selection/proposal assembly, all
  against a stubbed model), `scripts/test-research-os-edges-review.ts` (9
  tests, the decision transition plus the reviewer-gate 403 case and the
  migration's own shape), `scripts/test-research-os-rebuild-ancestor.ts`
  (3 tests, a fake fluent Supabase client, no network).
- `tools/hypothesis-engine/hte/export.py`: `write_views`'s `TIMELINE.md`
  now carries the same "Elo is unvalidated" note
  `canon_writeback.render_index` already gives its own hypothesis-card
  index, plus an "Elo (unvalidated)" bin-table column header (`ros-11`'s
  named remainder: "the base campaign export... carries no such label").
  One new test, `test_write_views_labels_elo_as_unvalidated`.

### Edited

- `scripts/research-os/ingest/infer-edges.ts`: node-pool assembly moved to
  `lib/build-node-pool.ts`, no behavior change (re-run against the live
  517-node/8-branch corpus still proposes the same 36 edges).
- `scripts/rebuild-prereq-ancestor.ts`: thinned to an env-var read plus a
  call into `rebuild-ancestor.ts`'s new function.
- `src/lib/research-os/ingest/types.ts`: `ReviewItemKind` gains
  `llm_proposed_edge`.
- `package.json`: new `ingest:research-os:infer-llm` script; three new
  test files added to the `test:research-os` chain.
- `learning/research-os/ROUTING.md`: new "LLM-assisted prerequisite-edge
  inference" section (calibration, agreement, review flow), a new
  `inferred_llm` confidence-source table row, and an updated `teacher`
  row (0.95 on an edge-proposal approval, 1.0 on a resolved routing
  flag).
- `learning/research-os/INGESTION.md`: `llm_proposed_edge` added to the
  review-list-contract table; the closing "what this slice does not do"
  paragraph updated from "one shipped, one not" to both shipped.

### Verified

Gates: `npm ci`, `npx tsc --noEmit`, `npm run build`,
`npm run test:research-os` (248/248 pass across all 20 chained test
files), `next lint` on every touched TS/TSX file, `ruff check` on
`export.py`/`test_export.py`, engine tests for the touched module
(`pytest tools/hypothesis-engine/tests/test_export.py` 13/13,
`tests/swarm/test_export_props.py` 6/6, full suite excluding `slow`
green). `agf-lint-voice-src check` / `agf-lint-voice check` run on every
touched file.

## 2026-09-10: literature corpus promotion pass two

Branch `intake/ros-canon-promotion-2`. Thirteen more records from
`_intake/research-os-k12-literature/` promoted, screened against all 117
cards excluding the six pass-one promotions (PR #9,
`intake/ros-canon-promotion`).

### Added

- `bucket-canon/07-mind/curiosity-and-motivation/` (new dossier): four
  canon-tier records (Loewenstein 1994; Gruber, Gelman, and Ranganath
  2014; Deci and Ryan 2000; Gneezy and Rustichini 2000), each run through
  `tools/canon-pipeline/intake.py --min-score 70` and re-verified
  idempotent across two re-runs (`added=0 kept=4 changed=False` both
  times).
- `bucket-canon/07-mind/cognition-and-automation/` (new dossier): one
  canon-tier record (Bainbridge 1983), same convergence check
  (`added=0 kept=1 changed=False` both re-runs).
- `bucket-canon/04-information/information-foraging/` (new dossier): one
  canon-tier record (Pirolli and Card 1999), same convergence check
  (`added=0 kept=1 changed=False` both re-runs), placed in
  `04-information/` rather than `07-mind/` per the task brief and a
  boundary-call note added to `04-information/README.md`.
- `bucket-canon/07-mind/sub-outcomes/education/`: seven more outcome-tier
  records added to the existing dossier, five AI-tutoring and
  generative-AI-in-learning RCTs and field evaluations depending on the
  Roediger and Karpicke 2006 foundation (Kestin et al. 2025; Bastani et
  al. 2025; Wang et al. 2024, Tutor CoPilot; De Simone et al. 2025,
  Nigeria) or the Sparrow, Liu, and Wegner 2011 foundation (Kosmyna et
  al. 2025), and two human-AI complementarity meta-analyses depending on
  the newly promoted Pirolli and Card 1999 information-foraging
  foundation (Vaccaro, Almaatouq, and Malone 2024; Bansal et al. 2021).
- `bucket-canon/TAXONOMY_NOTES.md`: one new open question, whether the two
  human-AI complementarity meta-analyses need a dedicated
  `sub-outcomes/human-ai-collaboration/` home instead of sharing
  `sub-outcomes/education/`; not resolved, both records placed in the
  existing folder with a pointer.
- `provenance_signoff: "pending: gianyrox"` on every record this pass
  promotes, and backfilled onto the ten records pass one promoted
  (`07-mind/memory-systems/`'s three canon records, one of which,
  Scoville and Milner 1957, predates PR #9 entirely, seeded 2026-05-19,
  and `sub-outcomes/education/`'s four pass-one outcome records), per the
  ros-11 governance rule: a named human founder is the
  pending approver on every canon or outcome record, and no sign-off has
  happened yet.
- `CANON-INGESTION-INDEX.md`: a dated table of the thirteen promotions.

### Edited

- Thirteen intake cards marked `status: promoted` with a `promoted_to`
  pointer (and, for the seven outcome-tier cards, a
  `depends_on_foundation` pointer) and a canon-or-outcome-record callout
  in the body; claim text unchanged in all thirteen.
- `_intake/research-os-k12-literature/README.md`: index table status and
  tier columns updated for the thirteen rows, plus a new section
  recording the pass.
- `bucket-canon/07-mind/README.md`, `bucket-canon/04-information/README.md`:
  one short addition each, naming the new subfolders outside the
  originally proposed list.
- `bucket-canon/07-mind/sub-outcomes/education/README.md` and
  `CANON_INDEX.md`: extended scope line, dependency convention, and
  outcome-entries table for the seven new records.
- `bucket-canon/07-mind/memory-systems/CANON_INDEX.md`: one line noting
  the signoff backfill.

### Removed

None.

### Verified

- `tools/canon-pipeline/intake.py` run twice on each of the three new
  canon dossiers: `curiosity-and-motivation` (`added=4` then `added=0
  kept=4 changed=False` twice), `cognition-and-automation` and
  `information-foraging` (`added=1` then `added=0 kept=1 changed=False`
  twice each). `07-mind/memory-systems` re-run after the signoff backfill
  also stayed `added=0 kept=3 changed=False`.
- No file under `src/` or `public/` is touched by this pass, so no
  `npm run build` gate applies to it. `canon-primary.ts` walks
  `bucket-canon/<branch>/<concept>/primary-papers.yaml` one level deep;
  the three new canon dossiers sit at that depth and are picked up
  without code changes, `sub-outcomes/education/` sits two levels deep
  and stays off the served canon surface, unchanged from the pass-one
  convention.
- `.github/workflows/feed.yml` (`canon-feed`) runs on push to `main` and
  regenerates `feed.json`/`feed.xml` from the git diff via
  `tools/feed/parse.py`; this pass does not hand-edit either file, the
  bot commits its own events after merge.
- `public/llms.txt` enumerates canon branches, not individual entries,
  and routes agents to the live `/api/research` endpoint; no edit needed
  for new DOI-backed records.

## 2026-09-10, roster sync skeleton (ros-06 follow-on)

Branch `feat/ros-roster-sync` in worktree `.ros-worktrees/roster`, standard-first per
`PLAN-REVISION-2.md` section 3 item 4. `src/lib/research-os/roster/` ships a OneRoster 1.2
CSV importer against the 1EdTech OneRoster 1.2 CSV Binding
(`https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv/`): `csv.ts` (a dependency-free
RFC 4180 reader, no CSV library added to `package.json`), `grade.ts` (`gradeToBirthYearBucket`,
mapping a OneRoster grade code to `graph.learner_profiles.birth_year_bucket`, never a birth
date), `oneroster.ts` (parses `orgs.csv`/`users.csv`/`classes.csv`/`enrollments.csv`, ignores
every other file a bundle may carry, resolves a user's student/teacher role from
`enrollments.csv` since OneRoster 1.2 removed `role` from `users.csv`), `diff.ts`
(`computeRosterDiff`, pure, plus `applyRosterDiffToState`, an offline mirror of the live
write path for idempotency testing, the same pattern `src/lib/research-os/privacy.ts`'s
`simulateLearnerDelete` already uses), `sources.ts` (`RosterSource` interface;
`OneRosterCsvSource` implemented, `CleverSource`/`ClassLinkSource` stubs that throw "not
configured" with a documented env contract, per `03-data-services.md` section E), and
`apply.ts` (the live Supabase adapter, untested by unit test the same way every other
DB-touching function in this repo is).

Migration `supabase/migrations/20260910050000_research_os_roster.sql` adds
`source_system`/`sourced_id` to `graph.classes` and `graph.learner_profiles` (plain unique
indexes; standard SQL null semantics keep every manually created row collision-free) and a
new `graph.reviewer_candidates` table (RLS enabled, no anon/authenticated policy, matching
`graph.privacy_events`'s posture), staging teachers a sync has seen with `status = 'pending'`
until a human adds their email to `RESEARCH_OS_REVIEWER_EMAILS`; syncing a roster never
grants review access on its own.

`POST /api/research-os/roster` (multipart, four required CSV fields, dry-run default, an
`apply` flag) and `/research-os/roster` (upload page, the same email-OTP flow as
`/research-os/class`) are gated by the same `verifyReviewer` check `/api/research-os/class`
uses. Neither the review, class, workspace, nor consent route handlers were touched, per
this bead's own instructions (two other PRs, canon filter and consent wiring, were merging
into `main` concurrently).

`scripts/test-research-os-roster.ts` (17 tests, wired into `npm run test:research-os`): the
CSV parser, the grade-to-bucket boundary, a fixture bundle (2 classes, 1 teacher, 5
students, 8 enrollments including one malformed row) dry-run diff counts, a class with no
teacher enrollment left unresolved, idempotency (apply-twice yields zero creates/updates,
an already-approved reviewer candidate's status survives a re-sync), extra PII columns
(`address`, `phone`) dropped at parse time and absent from every write payload, the
malformed enrollment reported and skipped rather than inserted, both vendor stubs' "not
configured" behavior, a static read of the new migration's RLS and column text, and a
privacy-delete regression confirming `graph.privacy_delete_learner`'s existing SQL still
deletes `graph.learner_profiles` rows now that this bead has added columns to that table.
`learning/research-os/compliance/DATA-INVENTORY.md` gained the new table and columns;
`learning/research-os/ROSTER.md` (new) carries the full field-mapping table, what gets
discarded, the idempotency keys, what Clever and ClassLink add, and the reviewer-candidate
approval flow. `learning/research-os/TEACHER-LAYER.md`'s own "TODO(Phase 1, roster sync)"
note now points at this work.

Gates: `npm ci`, `npx tsc --noEmit`, `npm run build` (`/api/research-os/roster` and
`/research-os/roster` both confirmed in the build manifest), `npm run test:research-os`,
`next lint` on every touched file, `agf-lint-voice-src check` and `agf-lint-voice check`:
all clean after fixing four antithesis constructions, one meta-commentary phrase, one
AI-tell word (`bespoke`), and one appended-clause heading found on the first pass.

## 2026-09-10, PR #44 review pass

Review of `docs/ros-plan-revision-2` (PR #44) in worktree `.ros-worktrees/r44`, docs-only.
Leak scan against the full diff found no API keys, `.env` contents, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or
Claude session URLs. `gh pr list --state merged --limit 50` against the twenty PRs merged
in the #20-#40 range found one miscount: `PLAN-REVISION-2.md` and its four pointer/ledger
mentions said "nineteen PRs merged since" revision 1; twenty merged in that range, PR #36
(engine-only, no Research OS file touched) omitted from the table without being named as
out of scope. Fixed in all five places (`PLAN-REVISION-2.md`, `PLAN.md`'s and
`PLAN-REVISION-1.md`'s Revision 2 pointers, this file, `CHANGE-LEDGER.md`) to name PR #36's
exclusion explicitly. Three of the five founder decisions' "Exact question, unchanged"
quotes were not in fact verbatim against `PLAN-REVISION-1.md`: decision 2 dropped the
parenthetical "(its own audience, its own funding path, cross-linked but not subordinate)",
decision 3 dropped the clause "a 'what the engine is ranking now' view for researchers and
funders", and decision 5 dropped the parenthetical PR #11 branch title
`` `feat/site: reposition around reform education, Research OS as its own tab` ``; all three
restored to match `PLAN-REVISION-1.md` exactly. `npm ci && npm run test:research-os`: 213
passed, 0 failed across 17 files, matching the draft's own claim exactly. Engine `make test`
run fresh under both `HTE_LLM_MODE` states (`fake` and unset) after merging `origin/main`
(the branch was behind, gate 4): 1046 passed, 18 deselected, 0 failed both times, no hang.
This is higher than the draft's cited 1018, because merging `origin/main` pulled in PR #43
(merged after this pass's own cited `main` commit `af5b7c9ea`), which added tests to
`test_canon_writeback.py`; the draft's 1018 figure stays accurate as a claim about that
specific commit, so the text was not changed. All five cited literature card paths under
`_intake/research-os-k12-literature/` confirmed to exist on disk. The power-analysis figures
in section 2d (119, 405, 691 learners per arm; 17 classes per arm at ICC 0.10; d approx 1.0
minimum detectable effect at Phase 1's feasible enrollment) checked exact against
`study/PREREGISTRATION-DRAFT.md`'s own tables. `PLAN.md` and `PLAN-REVISION-1.md`'s own
diffs are pure appends, a "Revision 2" pointer paragraph each, no prior line touched.
Nothing under `src/` or `public/` changed. `agf-lint-voice check` clean on the four files it
scans (`PLAN.md`, `PLAN-REVISION-1.md`, `PLAN-REVISION-2.md`, `CHANGE-LEDGER.md`); this file
sits under the corpus's own known `_intake` ignore-list gap, so a manual grep pass for
em/en dashes, the banned-word list, and "not X but Y" antithesis across every added line in
all five files found no hit beyond two banned-word instances, both quoted examples inside a change-ledger entry
describing a prior fix. Merged.

## 2026-09-10, plan revision 2

Branch `docs/ros-plan-revision-2`, worktree `.ros-worktrees/plan2`. Read
`PLAN-REVISION-1.md`, `LEARNER-STATE-MODEL.md` (section 5's batch-three
evidence lines), `ROUTING.md`, `TEACHER-LAYER.md`, `WORKSPACE.md`,
`ENGINE-BRIDGE.md`, `INGESTION.md`, `compliance/README.md`,
`study/PREREGISTRATION-DRAFT.md`'s feasibility-pilot finding,
`funding/WAVE-1-TARGETS.md`, `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`'s
twelve questions with batch-two and batch-three evidence, the four
batch-three cards named in the founder's own brief (Vaccaro, Almaatouq, and
Malone 2024; Bansal and colleagues 2021; Buçinca, Malaya, and Gajos 2021;
Alzetta and colleagues 2018), `BEADS-PENDING.jsonl`'s status lines for
`ros-02` through `ros-13` plus the batch-three bead, and `gh pr list
--state merged --limit 40` against `main` at `af5b7c9ea`. Wrote
`learning/research-os/PLAN-REVISION-2.md`: a PR-by-PR account of nineteen
of the twenty PRs shipped since revision 1 (#20 through #40, PR #36
excluded as engine-only), with app and
engine test counts run live in this pass (`npm run test:research-os`, 213
passed, 0 failed; `make test` in `tools/hypothesis-engine`, 1018 passed, 18
deselected, 0 failed under both `HTE_LLM_MODE` states); four evidence-driven
revisions from batch three, each labeled STABLE or STRONG LEAN; a seven-item
Phase 1 scope, ordered by dependency, with a bead id on each remaining item;
the five founder decisions restated verbatim from revision 1 with new
information and a recommended default on each; six operational blockers
with an action and an owner each, including a search for an "OpenAI key
rotation note" that turned up no such artifact anywhere in this repository,
recorded as a confirmed gap rather than assumed; and an updated
Phase-1-versus-district table, correcting question 7's own blocker:
`ros-12`'s engine wiring already shipped, so the live-Supabase-apply gap is
what remains. Appended a pointer paragraph to `PLAN.md` under a new
"Revision 2" heading and to `PLAN-REVISION-1.md`; no existing text in either
file was changed or removed.

## 2026-09-10, ros-04 workspace hardening (PR TBD)

`feat/ros-04-workspace-hardening`, worktree `.ros-worktrees/ros04`, branched from
`origin/main` at `b6532313c` (PR #27 merged). Scope: `PLAN-REVISION-1.md` section 3
item 4, evidence emission closing `src/lib/research-os/EVIDENCE-SCHEMA.md`'s named
gaps, server-side tool contract enforcement for the four workspace tools, a minimal
two-column canvas layout, and a per-learner daily tool-call cap.

**Evidence emission.** `stages.ts`'s `EvidenceEvent` gained `fromStage`, `toStage`,
`learnerText`, `itemId`, `abstained`, `modelFeedback`, `citations`, and `sessionId`
(plus unwritten-for-now `sampledForSecondRating`/`secondRaterId`/`secondDecision`/
`agrees`, typed per the schema's own contract, ros-06's migration to populate). Every
transition function now sets `fromStage`/`toStage`; `onCheckResult` and
`onProbeCheckResult` persist `abstained`/`modelFeedback`/`citations`;
`onTransferItemAnswered` persists the learner's own answer text and a fixed per-target
item id. The "no corrective event on a returned production" gap was closed
independently by PR #28 (`ros-06`, `onProductionReview`/`onProductionReturned`) while
this branch was in flight; merging `origin/main` after PR #28 landed found and resolved
the resulting duplicate, keeping `ros-06`'s version (see `learning/research-os/
CHANGE-LEDGER.md`'s "Merge reconciliation" for the full account). A real client bug
found in the process: the workspace page's transfer-item submit sent `{nodeId,
action}` only, never the answer text, so the gap could not have closed from the server
side alone regardless of what the route accepted; fixed on both sides, and the server
now requires a non-empty `answer` for that action.

**Tool contract enforcement.** Three new pure modules, each with adversarial contract
tests in `scripts/test-research-os-workspace-contracts.ts` (19 tests): `locate.ts`
(`locateHits`, extracted from the route's inline filter), `organize.ts`
(`groundOrganizeResult`/`isGroundedInNotes`, a code-level "is this grounded in the
learner's own matching input field" check the system prompt alone never enforced
before), and `grounding.ts`'s new `sanitizeGradeResult` (strips a citation that is not
the one exact allowed label, downgrades a malformed enum or missing-feedback response
to the same abstain fallback an unparseable one gets). `scripts/test-research-os-
evidence.ts` (21 tests) covers the evidence-emission contract and the daily cap.

**Daily cap and cost log.** `rate-limit.ts` adds `RESEARCH_OS_DAILY_TOOL_CAP`
(default 200, resets UTC midnight) enforced in the workspace route ahead of the
existing per-minute burst limiter. `llm.ts` gained `callGroundedModelWithUsage` and
`logToolCost`, a best-effort per-call USD estimate logged for Check, Organize, and the
diagnostic probe from the provider's own reported token usage (Anthropic pricing per
the system review's own cost model), `null` when the provider reports none.

**Canvas.** `src/app/research-os/workspace/page.tsx`: the vertical chain list becomes
a two-column layout (chain left, with a `needs review` badge on any step whose own
edge carries a `ros-03` low-confidence flag; the learner's own tools/notes/quoted-
sources/Production form right), stacking to one column under `lg`, verified against a
400px viewport. A client-generated `sessionId` (one per tab, `sessionStorage`) now
rides on every workspace/state/probe/production request.

**Full doc:** `learning/research-os/WORKSPACE.md` (new). See also `learning/
research-os/CHANGE-LEDGER.md`'s matching entry for the file-by-file diff and gate
results.

## 2026-09-10, PR #35 review pass

Review of `feat/ros-07-compliance-part-a` (PR #35) in worktree `review/pr35`. Full account:
`learning/research-os/CHANGE-LEDGER.md`, "PR #35 review pass." Leak scan against the full
diff found no API keys, `.env` contents, IPs, non-public hostnames, personal emails other
than `gianyrox@gmail.com`, PII, `/home/gian` paths, or Claude session URLs. Delete-table
cross-check: `graph.privacy_delete_learner`'s nine `delete from` statements match
`DATA-INVENTORY.md`'s nine learner-keyed tables one for one, no gap. One defect found and
fixed: `resolvePrivacyActor` resolved `actingAsReviewer` but the route discarded it, so a
reviewer-invoked export or delete wrote the same `graph.privacy_events` audit row as a
learner's own self-request, no record of who acted. Fixed by adding `actor_id_hash` and
`acting_as_reviewer` columns to `privacy_events`, threading the resolved actor through
`privacy_delete_learner`'s two new RPC params and through `exportLearnerData`/
`deleteLearnerData`, and two new tests in `scripts/test-research-os-privacy.ts` asserting a
reviewer-invoked delete's audit row is distinguishable from a self-request's (173 tests
total, up from 171, 0 failures). Every other correctness item held on first read: export
returns only the caller's rows (test passes), delete is one transaction with one audit row
holding a hash only, `learner_profiles` RLS scopes to `auth.uid()`, `requireConsent` blocks
under13/13to17 with `consent_status: none` and allows 18plus, the consent gate is exported
with a TODO, and `workspace/route.ts`/`production/route.ts` are untouched by this PR's own
diff against `origin/main` (verified). `agf-lint-voice check` on the five compliance docs
and `agf-lint-voice-src check` on all touched source files and the migration: 0 violations.
Gates rerun clean post-fix: `npm ci`, `npx tsc --noEmit`, `npm run build` (route present in
the manifest), `npm run test:research-os` (173/173), `next lint` on every touched file.
Branch was already even with `origin/main`, no merge needed. Merged via `gh pr merge --squash`.

## 2026-09-10, ros-07 minors compliance pack part A

Bead `ros-07`, branch `feat/ros-07-compliance-part-a`. Built the decision-independent slice
of the minors compliance pack named in `learning/research-os/PLAN-REVISION-1.md` section 3
item 8: a full data inventory, a self- or reviewer-gated export/delete API route backed by
a one-transaction Postgres function, the age-and-consent gate's decision rule, and three
policy drafts (privacy policy, student data privacy addendum, AI disclosure), all under
`learning/research-os/compliance/`. Full entry in `learning/research-os/CHANGE-LEDGER.md`,
"Iteration 15: ros-07 minors compliance pack part A." This document
(`04-compliance-distribution.md`) was read in full as the source of every legal-basis claim
in the new data inventory and policy drafts; no line of it was edited by this pass. One
fact checked beyond what this document already states: the SDPC NDPA's current version,
verified live by `WebFetch` against `privacy.a4l.org/national-dpa/` on 2026-09-10 at
version 2.2 (published November 19, 2025), recorded in the new addendum draft. Merged
`origin/main` after PR #28 (`ros-06`) and PR #30 (`ros-12`/`ros-13`) both landed; `ros-06`'s
new `graph.classes`/`graph.class_members` roster tables and `graph.productions.notes`
column folded into the data inventory and the privacy delete function, see the change
ledger's own "Iteration 15 addendum" for the full account.

## 2026-09-10, PR #38 review pass

Review of `intake(research-os): literature batch three` (PR #38) in worktree
`.ros-worktrees/r38`, content-only. Leak scan against the full diff's added lines
found no API keys, `.env` contents, IPs, non-public hostnames, personal emails other
than `gianyrox@gmail.com`, PII, `/home/gian` paths, or Claude session URLs. Eight of
the 35 new cards picked at random (Novak 1990, Hestenes/Wells/Swackhamer 1992,
Shneiderman 2020, Bucinca/Malaya/Gajos 2021, Chi and colleagues 1989, Molenaar 2022,
Bansal and colleagues 2021, Schwartz/Chase/Bransford 2012) and their DOI checked live
against Crossref: title, authors, and year matched frontmatter exactly on all eight,
no mismatch found. The two "closest verified match" replacement cards (Alzetta and
colleagues 2018, Valdez, Roldan, and Masuli 2025) did not label themselves as
replacements in their own `why_it_matters` field, unlike the precedent this corpus
already set on `unesco-2025-generative-ai-foundational-learning-sub-saharan-africa.md`;
fixed by appending a sentence to each naming the unresolved task-brief paper it
stands in for. README index row count (117) confirmed exact against the corpus file
count; both docs' "Evidence added in batch three" paragraphs confirmed present under
the claimed open questions, and every card path either doc names confirmed to exist
on disk. No blockquote or long verbatim excerpt found in any new card; `key_claims`
entries are quoted YAML strings holding the card author's own paraphrase, not source
text. `agf-lint-voice check` scanned zero of the 40 changed files (the pass's own
`_intake` ignore-list gap, already logged in Iteration 17); a grep-based self-audit
for banned words, filler adverbs, AI-tell vocabulary, antithesis, and em/en dashes
against every added line found no hit, including on the two fixed cards. Confirmed
`origin/main` already merged into the branch (no further merge needed) and no file
under `src/` or `public/` touched; `npm ci` and `npm run build` both clean. Merged.

## 2026-09-10: literature batch three

Branch `intake/ros-literature-3`. Task: 25 to 35 new DOI- or ISBN-verified papers
targeted at the gaps `LEARNER-STATE-MODEL.md` section 5 and the overlap map's twelve
questions leave open: understanding and internalization measurement, curiosity and
interest as routing signals, teacher workload and adoption of edtech, division of
cognitive labor and mixed-initiative research tools, and prerequisite-graph and
concept-map validity. Full per-area breakdown and per-question evidence mapping
recorded in `learning/research-os/CHANGE-LEDGER.md` Iteration 17.

### Added

- 35 files under `_intake/research-os-k12-literature/`, listed in
  `learning/research-os/CHANGE-LEDGER.md` Iteration 17; corpus total rises from 82 to
  117 papers.
- `_intake/research-os-k12-literature/teacher-workload-adoption/`: new sixth branch,
  seven files on adoption barriers, coaching, dashboards, and teacher trust.

### Edited

- `_intake/research-os-k12-literature/README.md`: index extended to 117 rows, six
  areas.
- `learning/research-os/LEARNER-STATE-MODEL.md`: six of the seven OPEN questions in
  section 5 gained an "Evidence added in batch three" paragraph.
- `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`: eight of the
  twelve open questions gained an "Evidence added in batch three" paragraph.

### Verified Clean

- Every DOI or ISBN and OpenAlex work id checked live via WebFetch at intake time.
- Two candidate papers named in the task brief were searched for and omitted for lack
  of a resolvable DOI matching the brief exactly: a 2019 Adorni-authored
  prerequisite-graph paper (a verified 2018 Adorni paper, Alzetta and colleagues, was
  used in its place) and an Open Syllabus Project curriculum-mining paper (Valdez,
  Roldan, and Masuli 2025 was used as the closest verified match).
- No blockquote or extended verbatim passage from any source paper; all `key_claims`
  and body text are paraphrase.
- A grep-based self-audit for the voice rules ran against every file this pass
  authored or edited, since `agf-lint-voice check` scans zero files under any path
  containing an `_intake` segment (an org-level ignore-list gap affecting the whole
  corpus, predating this pass); every flagged instance was rewritten before commit.

### Removed

None.

## 2026-09-10, PR #34 review pass

Review of `docs/ros-08-preregistration` (PR #34) in worktree `.ros-worktrees/r34`, docs-only,
as a methods reviewer. Leak scan against the full diff's added lines found no API keys,
`.env` contents, IPs, non-public hostnames, personal emails other than `gianyrox@gmail.com`,
PII, `/home/gian` paths, or Claude session URLs. Power analysis recomputed from the stated
inputs (d = 0.4, alpha 0.025 two-sided, power 0.80, two-sample t): the naive n-per-arm table
(76, 119, 211 at d = 0.5, 0.4, 0.3) confirmed exact given the draft's own stated rounded
z-values (2.24, 0.84); the cluster-corrected table's design-effect formula (`1 + (m-1)*ICC`)
confirmed correct and the ICC range confirmed marked unsourced, but the ICC = 0.20 row's n
per arm was off by one (119 x 5.8 = 690.2, needs ceiling to 691, the draft had 690); fixed.
Every effect size traced to a named, existing intake card; the 22-node, 28-edge transfer-bank
count reverified by a direct Python read of `supabase/seed/research-os-sky-blue.json`, and the
44 transfer prompts confirmed covering all 22 seed nodes by slug. Every hypothesis's primary
outcome variable confirmed mapped to a `src/lib/research-os/EVIDENCE-SCHEMA.md` field, a named
schema gap, or a `TRANSFER-TASK-BANK.md` item. `RESEARCH-QUESTIONS.md`'s eleven pointer lines
confirmed append-only (diff carries no removed or rewritten lines). No claim of an existing
partner school, IRB approval, PI, or host institution found; the founder-as-researcher
conflict is disclosed in both `PREREGISTRATION-DRAFT.md` and `IRB-PACKET-OUTLINE.md`.
`agf-lint-voice check` clean on all five core study files; found and fixed one antithesis
violation this PR's own `BEADS-PENDING.jsonl` line introduced ("not merged" rewritten to
"merge pending"), the file's other 25 violations pre-existing on `main` and out of this PR's
scope. Confirmed no file under `src/` or `public/` touched. Merged clean, branch deleted.

## 2026-09-10, ros-08 preregistration packet

Bead `ros-08`, branch `docs/ros-08-preregistration`, worktree `.ros-worktrees/ros08`. Four
new files under `learning/research-os/study/`: `PREREGISTRATION-DRAFT.md` (six directional,
OSF-template hypotheses drawn from `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`'s twelve
questions, a power analysis with naive and cluster-corrected sample sizes at three assumed
effect sizes, a variables table mapping every outcome to an `EVIDENCE-SCHEMA.md` field or a
named schema gap, an analysis plan and a data availability statement), `TRANSFER-TASK-BANK.md`
(forty-four sealed-pool transfer items, two per node, for all 22 nodes of the sky-blue seed
path, built by a stated eight-step rule that scales to any corpus), `INSTRUMENTS.md` (a
retention probe schedule, a metacognitive confidence instrument adapting Fisher, Goddu, and
Keil 2015's own design, a teacher time-on-review log), and `IRB-PACKET-OUTLINE.md` (submission
sections, consent and assent drafts for four audiences, a minimal-risk justification, a
data-governance split between the operational FERPA basis and the research consent track, and
a founder-as-researcher conflict disclosure built on `PLAN-REVISION-1.md` section 5's two-PI
pairing). `RESEARCH-QUESTIONS.md` gained eleven "Pre-registered as of 2026-09-10" pointer
lines under existing questions, no existing line rewritten.

Every effect size and sample size traces to a named source already in this corpus
(`RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 9, `04-compliance-distribution.md` section 10, and
the Bastani et al. 2025, Gneezy and Rustichini 2000, and Deci, Koestner, and Ryan 1999 intake
cards); the one unsourced planning figure (an illustrative ICC range for the cluster-correction
table) is flagged explicitly rather than presented as canon-cited. The preregistration draft's
OSF-template section order is sourced to van 't Veer and Giner-Sorolla (2016) after nine
WebFetch attempts against `osf.io` and its registries pages returned no scrapeable template
text (a client-rendered SPA shell, a 404, or a paywalled publisher redirect); the file states
this verification gap and instructs a live-form cross-check before any real OSF submission.
No IRB approval, partner PI, or partner school exists; every packet section states this
directly rather than implying otherwise. `agf-lint-voice check` run to 0 violations on all
five touched files, roughly forty antithesis-pattern sentences rewritten by hand since that
category is never auto-fixed. No file under `src/` or `public/` is touched by this pass.

## 2026-09-10, PR #30 review pass

Review of `feat/ros-12-engine-wiring` (PR #30) in worktree `review/pr30`. Leak scan
against the full diff's added lines found no API keys, `.env` contents, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or
Claude session URLs. `agf-lint-voice check` found four "X, not Y" antithesis
constructions the branch introduced (two `BEADS-PENDING.jsonl` status lines, two test
description/assert strings); rewritten to state the point once, positively, no behavior
change. Correctness spot-checks against the branch: `authorizeHypothesize` refuses a null
production and a foreign `learner_id` alike; `research_os_outbox`'s `mark_consumed` is
idempotent and a second read returns nothing new; `unresolved_slot_gaps` and
`campaign_research_os.py`'s corpus-loader registration are both covered by an
autouse fixture that restores `hte.runner._CORPUS_LOADERS` after every test; `upsertGapNode`
and `writeEngineEdges` share the same slug-based idempotency key `upsertEngineHypothesisNode`
already used. Merged `origin/main` (PR #27, PR #28) after both landed: six real conflicts
(`BEADS-PENDING.jsonl`, `_intake/research-os-k12/CHANGELOG.md`, `_intake/research-os-k12/
DELETIONS.md`, `learning/research-os/CHANGE-LEDGER.md`, `package.json`, `src/lib/research-os/
db.ts`), every one a genuine "both sides added something at the same place" case, resolved
by keeping both additions (the two `test:research-os` script lists combined into one chain,
`db.ts`'s two new type imports combined into one line). Gates rerun clean post-merge:
`npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run test:research-os` (151/151 pass),
`npx eslint` on every PR #30 file, engine `ruff check`, engine `make test` (951 passed, 14
deselected). End-to-end verification (post-merge, fixture-driven, no live Supabase):
`buildProductionOutboxRow` on a fixture accepted production (the exact shape
`emitProductionOutboxIfAccepted`, ros-06's teacher-accept path, now calls), fed through the
real `hte.corpus.research_os_outbox` reader (exactly one unconsumed row, `mark_consumed`
idempotent, a second read returns nothing new), the real `campaign_research_os.run()` in fake
LLM mode against that row folded into the 14 shipped fixtures (3 accepted hypotheses, 11
gaps), and the real `toEngineHypothesisInput`/`buildEngineNode`/`toGapNodeInput`/
`buildGapNode` mapping, landing on both an `engine_hypothesis`-typed and a `gap`-typed node
draft carrying full engine provenance. `learning/research-os/ENGINE-BRIDGE.md`'s "Item 3's
write-side hook is unreached today" stub updated to record this: the hook is reached through
a real reviewer decision now (ros-06 landed), the untested leg narrowed to the live Supabase
read/write alone. Verification scripts (`scripts/_e2e-review-tmp*.ts`,
`tools/hypothesis-engine/_e2e_review_tmp.py`) were run once and removed, not part of this PR.

## 2026-09-10, engine bridge wiring and hypothesize route (ros-12, ros-13)

Branch `feat/ros-12-engine-wiring`. Closes the engine bridge's three open
stubs (`learning/research-os/ENGINE-BRIDGE.md`) and applies the
`research-os-hypothesize-route.patch` PR #10 shipped unapplied. Full
account: `learning/research-os/ENGINE-BRIDGE.md`.

### Added

- `src/app/api/research-os/hypothesize/route.ts`,
  `src/lib/research-os/types.ts`'s `HypothesizeResult` and its supporting
  interfaces: `tools/hypothesis-engine/docs/research-os-hypothesize-
  route.patch`, applied against current `main`.
- `src/lib/research-os/hypothesize-auth.ts` (`authorizeHypothesize`): the
  patch's own inline ownership filter, pulled into a named, unit-tested
  function, `scripts/test-research-os-hypothesize-route.ts`.
- `tools/hypothesis-engine/hte/corpus/research_os_outbox.py`
  (`fetch_unconsumed_rows`/`mark_consumed`/`fetch_and_build`/`load`/
  `load_and_consume`): the outbox reader, registered as the `"research-os"`
  corpus in `hte.cli`'s own `_CORPUS_LOADERS`.
  `supabase/migrations/20260910030000_research_os_outbox_consumed_at.sql`
  adds the row's own `consumed_at` column. Tested against a fixture row,
  `tools/hypothesis-engine/tests/test_corpus_research_os_outbox.py`.
- `hte.unknowns.unresolved_slot_gaps`
  (`tools/hypothesis-engine/hte/unknowns.py`): a public, tested
  generalization of `hte.api`'s own private `_rank_gap_nodes`, one
  `GapNode` per evidence item missing a concept slot, ranked by
  `value_of_information`. Tested,
  `tools/hypothesis-engine/tests/test_unknowns.py`.
- `tools/hypothesis-engine/scripts/campaign_research_os.py`: the
  campaign-run caller, `run()`/`main()`, registers a corpus into
  `hte.runner`'s own `_CORPUS_LOADERS` at call time, runs one campaign,
  and exports every survivor plus the run's own gap-node queue as JSON.
  Tested in fake mode against the 14 shipped production fixtures,
  `tools/hypothesis-engine/tests/test_campaign_research_os.py`.
- `src/lib/research-os/engine-bridge.ts`'s `gapNodeSlug`/`buildGapNode`/
  `buildGapEdges`, `src/lib/research-os/db.ts`'s `upsertGapNode`: the
  write side of GapNode wiring, a gap becomes a `graph.nodes` row of kind
  `artifact`, provenance `type: "gap"`, with a `cites` edge to each
  hypothesis it concerns. Tested,
  `scripts/test-research-os-engine-bridge.ts`.
- `scripts/research-os/apply-engine-campaign.ts`
  (`applyEngineCampaign`/`toEngineHypothesisInput`/`toGapNodeInput`):
  applies `campaign_research_os.py`'s own export through the PR #14
  adapter into `graph.nodes`/`graph.edges`. Mapping functions tested,
  `scripts/test-research-os-apply-engine-campaign.ts`.

### Edited

- `tools/hypothesis-engine/hte/cli.py`: registers `research_os_outbox.load`
  under the `"research-os"` corpus name.
- `learning/research-os/ENGINE-BRIDGE.md`: the three stubs marked closed,
  a "Running a campaign end to end" section, and the outbox table's
  `consumed_at` column documented.

### Removed

None.

### Not touched (PR #20 scope, another agent reviewing/merging concurrently)

`hte/api.py`, `hte/corpus/education_atlas.py`, `hte/corpus/literature.py`,
`hte/corpus/production.py`, `hte/generate.py`, `hte/llm.py`,
`hte/parallel.py`, `hte/runner.py`, `hte/timeline.py`, and their matching
test files. The campaign-run caller registers its own corpus into
`hte.runner._CORPUS_LOADERS` at call time (a runtime dict assignment)
rather than editing that module; `hte/api.py`'s own private
`_rank_gap_nodes` stays a duplicate of the new public
`unresolved_slot_gaps` for now, a follow-up once PR #20 lands. Also not
touched: `src/lib/research-os/frontier.ts`, `closure.ts`, the review and
class pages (a separate agent's own concurrent scope).

### Verified

- `cd tools/hypothesis-engine && python3 -m pytest tests/
  test_corpus_research_os_outbox.py tests/test_unknowns.py tests/
  test_campaign_research_os.py -q`: 43 passed.
- `cd tools/hypothesis-engine && ruff check` on every file this pass
  authored or edited: 0 violations (36 pre-existing violations elsewhere
  in the tree, none in a file this pass touched, unchanged from before
  this branch).
- `cd tools/hypothesis-engine && make test` (fast profile): 896 passed
  outside this pass's own scope, plus this pass's own 43, against 3
  pre-existing failures unrelated to this work (`education-atlas sample
  directory not found`, a worktree-relative path-resolution gap
  `hte/corpus/education_atlas.py` is not touched here to fix, PR #20's own
  scope) and one flaky live-network test
  (`test_live_fetch_lists_cards_or_skips_when_offline`, an
  `IncompleteRead` against a real GitHub API call).
- `npm ci`, `npx tsc --noEmit`, `npm run build`: clean.
- `npx eslint` on every touched `.ts` file: clean.
- `npm run test:research-os`: 108 passed, 0 failed.
- `agf-lint-voice-src check` / `agf-lint-voice check` on every file this
  pass authored or edited: 0 violations.

## 2026-09-10, teacher class view and the Production accept path

Branch `feat/ros-06-teacher-class-view`, bead `ros-06`, `learning/research-os/PLAN-REVISION-1.md` section 3 item 5. Two pieces: a class view a reviewer can read over their own learners, and the accept path `learning/research-os/ENGINE-BRIDGE.md` names as the one thing standing between an accepted Production and the engine outbox write. Full account: `learning/research-os/TEACHER-LAYER.md`.

Shipped: `supabase/migrations/20260910030000_research_os_classes.sql` (`graph.classes`, `graph.class_members`, RLS, plus a `notes` jsonb column on `graph.productions`). `src/lib/research-os/class-view.ts` (`seedPathOrder`, `buildClassGrid`, `findBlockedLearners`, `findReadyForHarderTarget`), pure functions over plain graph arrays. `src/app/api/research-os/class/route.ts` and `src/app/research-os/class/page.tsx`, the class view itself, server-side data loading and computation, reviewer-gated. `src/lib/research-os/reviewer.ts` gained `isReviewerEmail`, the allowlist check split out for unit testing. `src/lib/research-os/stages.ts` gained `onProductionReview` and `onProductionReturned`, the accept path's own stage-transition functions. `src/lib/research-os/db.ts` gained `loadClassesForReviewer`, `loadClassMembers`, `loadLearnerStatesForMany`, and `emitProductionOutboxIfAccepted` (extracted from `/api/research-os/production`'s own POST, now shared rather than duplicated with `/api/research-os/review`'s new accept path). `scripts/test-research-os-teacher-class.ts`, 20 `node:test` cases, wired into `npm run test:research-os`.

A mid-review fix, found during `ros-02`'s evidence-schema pass (`docs/ros-02-learner-state-model`, `src/lib/research-os/EVIDENCE-SCHEMA.md`): a returned Production used to leave `graph.learner_node_state.stage` at `"production"` with no evidence event recording the correction, since only the approve branch called `recordEvidence`. Both branches call it now; `onProductionReturned` logs a `"production_returned"` evidence event with `stage` left unmoved (the high-water-mark rule every transition function already enforces), `fromStage`/`toStage` both `"production"`, matching `EVIDENCE-SCHEMA.md`'s own corrective-event section. `EvidenceEvent` gained `fromStage`, `toStage`, and `reviewId` (this bead's own addition beyond the documented contract) fields.

### Edited

- `src/app/api/research-os/review/route.ts`: the production decision branch now sets a return's status to `"draft"` (not `"returned"`), appends a teacher note to the production's own `notes` column, advances the learner's evidence log on both approve and return, and emits the outbox row on approve.
- `src/app/api/research-os/production/route.ts`: its inline outbox-emission block replaced with a call to `db.ts`'s new shared `emitProductionOutboxIfAccepted`.
- `src/app/research-os/review/page.tsx`: a breadcrumb link added to `/research-os/class`.
- `package.json`: `test:research-os` now also runs `scripts/test-research-os-teacher-class.ts`.

### Removed

None.

### Verified

`npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run test:research-os` (114/114 pass across every research-os test file, this slice's 20 plus every pre-existing one), `next lint` on every touched file, `agf-lint-voice-src check` on every touched source file, `agf-lint-voice check` on `learning/research-os/TEACHER-LAYER.md`: all clean.

## 2026-09-10, PR #28 review pass

Review of `feat/ros-06-teacher-class-view` (PR #28) in worktree `review/pr28`. Leak scan
against the full diff's added lines found no API keys, `.env` contents, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or
Claude session URLs; fixture emails end in `.example`. The `.voiceignore` addition
(`tools/hypothesis-engine/docs/LOOP-LOG.md`) was the only engine-tree-adjacent change; no
other file under `tools/hypothesis-engine/` or `src/lib/research-os/engine*` was touched.
`RESEARCH_OS_REVIEWER_EMAILS` appears in client page text only as the allowlist's name;
its value stays server-side.

One coverage gap found and closed: the class API's server-side scoping (`db.ts`'s
`loadClassesForReviewer`, "a reviewer for class A never reads class B's grid") had no test,
only the RLS policy text did. Split the filter into an exported pure function,
`filterClassesForReviewer(rows, reviewerEmail)`, and added three cases to
`scripts/test-research-os-teacher-class.ts`: a reviewer sees only their own class, a
reviewer owning no row gets an empty result rather than another reviewer's, and the
comparison is case- and whitespace-insensitive. Suite total: 114/114 (was 111/111; this
file's own count: 20, was 17). `npm ci`, `npx tsc --noEmit`, `npm run build`, `next lint`
on every touched file, `agf-lint-voice`/`agf-lint-voice-src check` on every touched file:
all clean. No other defect found; approve sets `accepted` and advances the evidence log
exactly once per call (the route's own 409-on-non-`submitted` guard makes a double approve
a no-op past the first, and `writeProductionOutbox` upserts on `id`), return sets `draft`
without regressing `stage`, and non-reviewers get 403 on both the class and review routes.

## 2026-09-10, PR #27 review pass

Review of `feat/ros-03-confidence-routing` (PR #27) in worktree `.ros-worktrees/r27`. Leak
scan against the full diff's added lines (2096 lines) found no API keys, `.env` contents,
IPs, non-public hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian`
paths, or Claude session URLs.

Correctness: `frontier.ts`'s Dijkstra variant confirmed non-regressive by running
`scripts/test-research-os-routing.ts`, an unmodified pre-confidence test file with hardcoded
seed-graph assertions written against the old plain-BFS walk, a real old-output
equivalence check rather than `computeFrontier` compared against itself. Cost function
`-log(confidence)` confirmed monotone (confidence clamped to `(0, 1]` by `edgeConfidence()`,
so cost is non-negative and strictly decreasing in confidence), ties broken on hop count.
Cycle and unreachable-target handling verified directly: a synthetic 4-node cycle (`a -> b ->
c -> a`, `c -> target`) settles every node once with no hang; a target with zero incoming
prerequisite edges routes to itself. `writeEdgeFlags` confirmed scoped to the signed-in
learner only (`learnerId` comes from `verifyLearner`'s own token verification, never
client-supplied), the service-role client bypasses RLS but the ownership boundary is enforced
in application code; a write failure is caught and logged, never surfaced to the route
response. `infer-edges.ts` has no `--apply` mode at all (stronger than a flag gate), and its
output was confirmed deterministic by running it twice and diffing both `infer-preview.json`
and `review-list.json` byte-for-byte (excluding the `generated_at` timestamp): zero diff.
`canon-atom-map.json`'s three new resolutions (`bell-theorem` -> `quantum-entanglement`,
`quantum-field-theory` -> `qft-idea`, `quantum-mechanics` -> `wavefunction`) checked against
`learning/app/corpus/02-physics.json` directly: all three atom ids exist with titles matching
the claimed concepts.

One stale cross-reference found and fixed: this file's own ros-03 entry (below) pointed at
`CHANGE-LEDGER.md`'s "Iteration 11" entry, but that entry landed as "Iteration 13, ros-03
routing" (a numbering collision the ledger's own note explains); corrected in place.

Gates: not behind `origin/main` (no merge needed); `npm ci`, `npx tsc --noEmit`, `npm run
build` all clean; `npm run test:research-os` 117/117 passing; `next lint` clean on every
touched file; `agf-lint-voice check` / `agf-lint-voice-src check` clean on every touched
file (pre-existing violations found elsewhere in `.gitignore`, `BEADS-PENDING.jsonl`, and
`sample-canon-preview.json`'s `_comment` are outside this PR's added lines, left as-is).
Merged via `gh pr merge --squash --delete-branch`.

## 2026-09-10, confidence-weighted routing, edge flags, offline edge inference (ros-03)

Branch `feat/ros-03-confidence-routing`. Full account:
`learning/research-os/CHANGE-LEDGER.md`'s "Iteration 13, ros-03 routing" entry and
`learning/research-os/ROUTING.md`.

Shipped: `graph.edges.confidence` / `confidence_source`, backfilled by every
importer (`seed` and `academy_requires` at 1.0, `canon_map` at 0.9);
`graph.prereq_ancestor.min_confidence`. `computeFrontier`'s backward walk
(`src/lib/research-os/frontier.ts`) is now a confidence-weighted Dijkstra
variant, preferring the highest-confidence chain to a target and returning
`lowConfidenceFlags` for any edge on the chain below 0.6, exactly reproducing
the prior shortest-hop result when every edge carries the default
confidence. `GET /api/research-os/route` returns the flags and writes them
to a new `graph.edge_flags` table for a signed-in learner. A new offline,
no-model edge-inference pass (`scripts/research-os/ingest/infer-edges.ts`,
`src/lib/research-os/ingest/infer.ts`) proposes 36 `prerequisite` edges from
lexical overlap and tier ordering across the 517-node combined graph,
confidence 0.3 to 0.65, all landing on the review list, none applied.
`scripts/research-os/ingest/canon-atom-map.json` gained three explicit
mappings, resolving `bell-theorem`, `quantum-field-theory`, and
`quantum-mechanics` from the prior pass's four unmatched entries;
`gauge-principle` stays unmatched, no Academy atom covers it. 23 new unit
tests; 117/117 passing across the full `test:research-os` suite.

## 2026-09-10, PR #25 review pass

Review of `docs/ros-02-learner-state-model` (PR #25) in worktree `review/pr25`. Leak scan
against the full diff's added lines found no API keys, `.env` contents, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or
Claude session URLs. Six code claims spot-checked against `origin/main` (`stages.ts`'s five
transition functions, `probe.ts`'s cold-start-only firing, the review route's production
branch never calling `recordEvidence`, `learner_node_state`/`teacher_reviews` schema shape,
`academyNodeSlug`'s slug format, `mastery.ts`'s `inferDepth` thresholds and `fuseMastery`
formula) all matched the paper's description, including the named bug: a returned production
leaves `stage` at `production` uncorrected. README index row count (82) matched the corpus
file count (82) exactly. Every framework mapping table states "No counterpart" with a reason
where one applies, rather than forcing a match.

Two real citation errors found and fixed: `anderson-krathwohl-2001-taxonomy-revision.md` and
`wiske-1998-teaching-for-understanding.md` both carried the same wrong Open Library `url`
(`OL3906603W`, which resolves to an unrelated book, "Russia's Road to Democracy"), corrected
to the verified work ids (`OL16641840W` and `OL16467129W`) after cross-checking against
Open Library's search API. The ISBNs themselves were correct in both files. Two banned
filler-word instances fixed in `CHANGE-LEDGER.md` and the Perkins card; `agf-lint-voice
check` was clean on every file it scanned.

## 2026-09-10, learner state model and mapping paper

Branch `docs/ros-02-learner-state-model` (bead `ros-02`). Docs only, no code or migration
changed. `learning/research-os/LEARNER-STATE-MODEL.md` defines the five learner states
operationally (entry condition, evidence, judge, decay rule, each checked against
`src/lib/research-os/stages.ts`, `probe.ts`, and the two Phase 0 migrations rather than
restated from `PLAN.md` alone), maps them against ICAP, SOLO, Bloom revised, Perkins's
understanding performances, and the founder's original three-level model, maps them against
the shipped Academy Recall/Apply/Derive/Teach ladder and the FSRS/IRT signals (finding no
code path connects the two systems today, confirmed by a full-codebase search), and lays out
the three-arm pilot's measurement plan: an outcome variable per state, the transfer-task
construction rule for Internalization, an inter-rater procedure for teacher judgments, and
the minimal logging schema the workspace has to emit. Seven questions marked OPEN, each tied
to the paper that poses it. `src/lib/research-os/EVIDENCE-SCHEMA.md` states the evidence
jsonb contract `ros-04` and `ros-06` implement against, closing seven concrete gaps between
what `graph.learner_node_state.evidence` stores today and what the measurement plan needs,
including one real bug found while writing this pass: a returned production leaves the
learner's `stage` at `production` uncorrected, since the review route's production branch
never calls `recordEvidence`.

### Added

- `learning/research-os/LEARNER-STATE-MODEL.md`: the mapping paper, five sections per the
  bead's own scope, states defined operationally, framework mapping tables, shipped-code
  mapping, measurement plan, seven OPEN questions.
- `src/lib/research-os/EVIDENCE-SCHEMA.md`: the evidence jsonb contract, docs only, no code
  changed in this pass.
- Five intake cards under `_intake/research-os-k12-literature/educational-methods/`, none of
  which had a card before this pass despite being cited by DOI in `PLAN.md` section 2 already:
  `chi-wylie-2014-icap-framework.md` (ICAP), `biggs-collis-1982-solo-taxonomy.md` (SOLO),
  `anderson-krathwohl-2001-taxonomy-revision.md` (Bloom revised, ISBN-verified, no Crossref
  DOI), `perkins-1993-teaching-for-understanding.md` (ERIC- and ISSN-verified, no DOI), and
  `wiske-1998-teaching-for-understanding.md` (ISBN-verified, no DOI).

### Edited

- `_intake/research-os-k12-literature/README.md`: five new rows in the index table, the
  paper count updated from 77 to 82 and the educational-methods count from 17 to 22, a new
  section noting which records carry an ISBN or ERIC id instead of a DOI and why.
- `BEADS-PENDING.jsonl`: one status line appended for `ros-02`, the original line left
  unedited.
- `learning/research-os/CHANGE-LEDGER.md`, `_intake/research-os-k12/CHANGELOG.md`, this
  file: this pass's own entries.

### Removed

None.

## 2026-09-10, funding wave 1

Bead `ros-09`, branch `docs/ros-09-funding-wave-1`. Four funder-facing documents under `learning/research-os/funding/`, drawn from this intake's own funding research plus fresh WebFetch verification against every funder's live site on 2026-09-10 (not a re-read of the 2026-09-09 pass's cached figures).

Shipped: `FAST-FORWARD-2026.md` (the 2026-09-18 deadline holds, confirmed by ffwd.org's own banner, which supersedes a stale September 7 date still on the same page; eligibility holds conditionally on the founder starting either state incorporation or a fiscal-sponsor application this week, since Bucket Foundation today has neither; draft narrative answers and a founder-input checklist). `WAVE-1-TARGETS.md` (Tools Competition, Digital Public Goods Alliance registration, Renaissance Philanthropy's AI for Education fund, and NLnet NGI Zero as the four wave-1 targets; four of the eight section K candidates verified closed or non-fitting and are logged with sources so the next pass does not re-check them: Chan Zuckerberg Initiative, no open call; Schmidt Sciences, open calls exist but all three are climate programs; Emerson Collective, confirmed closed to unsolicited submissions; Institute of Education Sciences, verified open but its FY2027 RFAs are methods-and-training grants with an LOI deadline that already passed; NewSchools Venture Fund's "open portal" read from the prior pass is corrected, its 2026 cycle is confirmed closed). `FISCAL-SPONSOR-DECISION.md` (Hack Club Bank, the prior pass's top pick, is confirmed ineligible: its own eligibility page requires a project led by teenagers 13 to 18, disqualifying a founder-led adult nonprofit outright; Players Philanthropy Fund recommended over Social Good Fund on fee alone, 6% flat against Social Good Fund's 8% at Bucket's budget size). `BUDGET-PHASE-1.md` (a twelve-month Phase 1 budget built by annualizing the system review's own Phase 1 monthly cost ranges across a build, pilot-semester, and evaluation sub-period breakdown, low/expected/high totals of $4,425, $19,125, and $83,610).

Every dollar figure and deadline in the four documents cites the file or URL it came from; five points found on this pass correct or sharpen the prior 2026-09-09 funding research and are called out inline rather than silently overwritten: the Fast Forward deadline's stale-date discrepancy, HCB's disqualification, NewSchools' closed 2026 cycle, IES's fit and timing problem, and NLnet's newly surfaced European-dimension eligibility caveat.

### 2026-09-10, PR #26 review corrections

Review pass on PR #26 caught three citation-accuracy errors, fixed before merge. `FAST-FORWARD-2026.md` section 2 cited `00-BASE-INFO-MEMO.md` gap G-5 as "no sponsor contacted"; G-5 is the registered-agent-address gap, the "no sponsor contacted" line is the memo's own status header, not a gap entry, corrected to cite gaps G-1 through G-4 plus the status line directly. The same section's founder-action item 1 claimed the memo states "same-week turnaround" for a New York filing; the memo states the $75 cost only, no turnaround figure, the claim is removed and replaced with an instruction to confirm turnaround directly with the state. `FISCAL-SPONSOR-DECISION.md` section 1 and section 4 item 3 told the founder to remove HCB from `00-COVER-LETTER.md`; the cover letter never names HCB, only `00-BASE-INFO-MEMO.md` section 3.2 does, corrected to point at the right file. WebFetch re-verified against live sites on 2026-09-10: the Fast Forward deadline and eligibility text, the Tools Competition Phase I date, the Players Philanthropy Fund fee, and HCB's own eligibility page; all four held as stated.

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

## 2026-09-10 (Phase 1 stub closures)

Branch `feat/ros-phase0-stubs`. Closed four of the Phase 0 PR's (#6) listed stubs,
scoped to section 8's Phase 1 boundary: the `prereq_ancestor` closure table
(`src/lib/research-os/closure.ts`, `scripts/rebuild-prereq-ancestor.ts`, migration
`20260910010000_research_os_prereq_ancestor.sql`, wired into
`computeFrontier`/`frontier.ts` and `GET /api/research-os/route`); the diagnostic
probe (`src/lib/research-os/probe.ts`, `GET`/`POST /api/research-os/probe`, a
workspace-page panel); real verbatim Quote passages for Tyndall 1869, Rayleigh 1871,
NASA Space Place, and Wikipedia (`src/lib/research-os/passages.ts`, each entry
verified against the live source before being added, with a labeled fallback to the
node's own summary for the sources not yet verified); and the teacher review hold
(`graph.teacher_reviews` migration `20260910020000_research_os_teacher_reviews.sql`,
`src/lib/research-os/reviewer.ts`'s env-var allowlist with a Phase 1 roster TODO,
`/api/research-os/review`, `/research-os/review`). Full account in
`learning/research-os/CHANGE-LEDGER.md`'s "Iteration 6" entry.

Rebased twice onto `main`: after the site-alignment PR (#12), and again after the
hypothesis engine bridge (#14) and the `hte` refusal-handling PR (#10). The second
rebase touched three shared files (`package.json`, `src/app/api/research-os/route/
route.ts`, `src/lib/research-os/db.ts`); both sides' additions were kept.

Gates run: `npm ci`; `npx tsc --noEmit` clean; `npm run test:research-os` (routing +
closure + probe + engine-bridge + engine-frontier, 52/52); `npm run build`; `eslint`
and `agf-lint-voice-src check` clean on every file this pass touched.

## 2026-09-10: PR #19 review pass

Review of PR #19 (`docs/ros-plan-revision-1`) before merge. Leak scan on the full diff against
`origin/main` found no API keys, no `.env` contents, no server IPs, no non-public hostnames, no
personal emails other than `gianyrox@gmail.com`, no PII, no `/home/gian` paths, and no Claude
session URLs in any line this PR adds. No redactions were needed.

Two PRs this revision names as still open merged to main during the review itself, so the
shipped-work table and its cross-references were fixed twice, once per PR, rather than once.

### Fixed

- `learning/research-os/PLAN-REVISION-1.md`: the PR #15 row in section 1's shipped-work table and
  the batch-two references in sections 4 and 5 said PR #15 was still open; PR #15 merged to main
  (`e51b1db6e`) partway through this review, so the entries now read it as shipped. The PR #9 row
  said unmerged; PR #9 merged to main (`d0f2c1262`) partway through this same review, so that row
  now reads it as shipped too. Rewrote two antithesis constructions ("real at the code level ...
  not just an analogy"; "the process trail ... not only the final submitted claim").
- `learning/research-os/PLAN.md`: the "Revision 1" pointer paragraph said PR #15 was open; updated
  to reflect the merge.
- `_intake/research-os-k12/CHANGELOG.md` (this file, the plan-revision-1 entry above): same PR #15
  status fix.
- `learning/research-os/CHANGE-LEDGER.md`: merging `origin/main` produced two conflicts in
  sequence as main advanced during review, first against main's own Iteration 6 (PR #15), then
  against main's own Iteration 7 (PR #9). Kept every entry: main's stay Iteration 6 and Iteration
  7, this PR's own plan-revision entry lands as Iteration 8, and this review pass as Iteration 9.

### Verified, no change needed

- All five cited paper files (Gneezy and Rustichini 2000, Mekler and colleagues 2017, Gasparetti
  and colleagues 2017, Doshi and Hauser 2024, Binz and Schulz 2023) exist under
  `_intake/research-os-k12-literature/` with frontmatter matching the claims made about them.
- Three ETH AI Center section claims spot-checked against code on `main`: `computeFrontier` in
  `src/lib/research-os/frontier.ts`, `hypothesize()` in `tools/hypothesis-engine/hte/api.py`, and
  `research_os_productions_outbox` in `supabase/migrations/20260910010000_research_os_engine_
  bridge.sql` plus `src/lib/research-os/db.ts`. All three exist as described.
- The four design revisions in section 2 each carry one of STABLE, STRONG LEAN, or OPEN.
- The PR #9 shipped-work row's claims, checked against the merged content directly, not just its
  merge status: the two promoted records and the two taxonomy questions it names match
  `bucket-canon/07-mind/memory-systems/` and `bucket-canon/TAXONOMY_NOTES.md` on main.
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

## 2026-09-10: literature corpus promoted into canon

Branch `intake/ros-canon-promotion` (PR #9). Six records from
`_intake/research-os-k12-literature/` promoted into `bucket-canon/07-mind/`;
two more opened as taxonomy questions, not promoted.

### Added

- `bucket-canon/07-mind/memory-systems/`: two canon-tier records added
  (Roediger and Karpicke 2006; Sparrow, Liu, and Wegner 2011), both run
  through `tools/canon-pipeline/intake.py --min-score 70` and re-verified
  idempotent (`added=0 kept=3 changed=False` on re-run).
- `bucket-canon/07-mind/sub-outcomes/education/` (new dossier, mirrors the
  `05-biophysics/sub-outcomes/longevity/` convention): four outcome-tier
  records (Bloom 1984; Kulik, Kulik, and Bangert-Drowns 1990; VanLehn 2011;
  Kulik and Fletcher 2016), each naming the `07-mind/memory-systems/`
  foundation it depends on.
- `bucket-canon/TAXONOMY_NOTES.md` (new file): opens two branch-placement
  questions without resolving them or creating a new branch, metascience
  and sociology-of-science home (Jones 2009; Fortunato et al. 2018,
  candidates `07-mind` vs `04-information`) and AlphaFold as a
  `05-biophysics` method card versus a `research-landscape/` entry (Jumper
  et al. 2021). Also carries the pre-existing psychodynamic-theory question
  `07-mind/README.md` referenced but never filed.
- `CANON-INGESTION-INDEX.md`: a dated table of the six promotions plus a
  pointer to the two open taxonomy questions.

### Edited

- Six intake cards (`roediger-karpicke-2006-power-of-testing.md`,
  `sparrow-liu-wegner-2011-google-effects-on-memory.md`,
  `bloom-1984-two-sigma-problem.md`,
  `kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis.md`,
  `vanlehn-2011-relative-effectiveness-tutoring.md`,
  `kulik-fletcher-2016-intelligent-tutoring-meta-analysis.md`): marked
  `status: promoted` with a `promoted_to` pointer and a canon-record
  callout in the body; the underlying claims are unchanged.
- Two intake cards (`jones-2009-burden-of-knowledge.md`,
  `fortunato-et-al-2018-science-of-science.md`) and one
  (`jumper-et-al-2021-alphafold.md`): marked `status: open-question` with a
  `taxonomy_question` pointer into `TAXONOMY_NOTES.md`; no promotion, no
  claim text changed.
- `bucket-canon/05-biophysics/README.md`: four-line open note under the
  promotion rule, pointing to the AlphaFold taxonomy question.
- `bucket-canon/07-mind/README.md`: one-line path fix,
  `TAXONOMY_NOTES.md` to `../TAXONOMY_NOTES.md`, in the existing
  psychodynamic-theory reference (the file it references now lives at
  `bucket-canon/TAXONOMY_NOTES.md`, one level above `07-mind/`).
- `_intake/research-os-k12-literature/README.md`: noted the six
  promotions and two open questions against the corpus index.
- `_intake/research-os-k12/README.md`: the "Site registry registration"
  section updated from "not yet done" to done, `feat(site): align public
  site with Research OS for K-12 (#12)` landed the `NAV` entry this
  section had documented the path for; kept the original search as
  record.

### Removed

None.

### Verified

- `tools/canon-pipeline/intake.py bucket-canon/07-mind/memory-systems
  --min-score 70`: `total=3 added=0 updated=0 kept=3 rejected=0 failed=0
  changed=False`, confirms the promoted records converge byte-identical to
  what the pipeline resolves live.
- `agf-lint-voice check` on every file this pass authored or edited: 0
  violations (pre-existing violations in untouched lines of
  `bucket-canon/05-biophysics/README.md`, `bucket-canon/07-mind/README.md`,
  and `bucket-canon/07-mind/memory-systems/CANON_INDEX.md` predate this
  branch and are out of scope; `+25 highly cited (N)` adverb hits in
  `primary-papers.yaml` are `tools/canon-pipeline/scoring.py`'s fixed
  machine-emitted string, unchanged from the pre-existing convention).
- No file under `src/` or `public/` is touched by this pass, so no
  `npm run build` gate applies to it.
- `_intake/research-os-k12-literature/README.md` merged cleanly against
  `intake/ros-literature-2`'s concurrent 45-to-77-row expansion: this
  pass's tier/status changes carried onto the six affected rows, area
  counts re-verified at 77 rows total (17/25/18/12/5).

## 2026-09-10, PR #37 review pass

Strict review of PR #37 (`feat/ros-04-workspace-hardening`) before merge, in
an isolated worktree per the review protocol. PR #35 (compliance) had not
merged at review time, so no merge-and-reconcile step against it applied.

Leak scan on the full diff against `origin/main`: no API keys, `.env`
contents, IPs, non-public hostnames, personal emails other than
`gianyrox@gmail.com`, PII, `/home/gian` paths, or Claude session URLs in
file content. No redactions were needed.

### Fixed

- `src/app/research-os/workspace/page.tsx`: the notes textarea placeholder
  used an antithesis construction ("scratch space, not graded, saved on
  this device only…"). Rewritten to "ungraded scratch space, saved on this
  device only…", stating the fact once, positively.

### Verified, no change needed

- Evidence emission: every stage-transition function in `stages.ts` writes
  `fromStage`/`toStage`; `sessionId` round-trips on every learner-authored
  transition; `abstained` is persisted on `onCheckResult` and
  `onProbeCheckResult`, not just used to decide the transition. Confirmed
  against both the functions and `scripts/test-research-os-evidence.ts`'s
  40 tests.
- Transfer-item submit: the client now sends `answer: transferAnswer` in
  the `POST /api/research-os/state` body; the server
  (`src/app/api/research-os/state/route.ts`) requires a non-empty `answer`
  for `action: "transfer_item"` and forwards it onto the evidence event as
  `learnerText`.
- Organize cannot add prose: `organize.ts`'s `groundOrganizeResult` drops
  any claim/evidence/source item not grounded in the learner's own matching
  input field; the adversarial tests in
  `scripts/test-research-os-workspace-contracts.ts` ("write my claim for
  me", "finish this sentence") pass.
- Check: `grounding.ts`'s `sanitizeGradeResult` strips any citation but the
  one allowed source label and never returns a rewritten explanation
  (`GradeResult` has no field for one).
- Locate: `locate.ts`'s `locateHits` returns only fields copied verbatim
  from matched node rows, no model call, capped at 10 results.
- Daily cap: `rate-limit.ts`'s `recordAndCheck` is enforced server-side per
  learner, keyed by UTC calendar day (`dailyKeyFor`), independent of the
  existing per-minute burst limiter; covered by
  `scripts/test-research-os-evidence.ts`'s cap tests including the
  UTC-midnight reset.
- Cost logging never blocks the response: `llm.ts`'s `logToolCost` is a
  synchronous, unawaited `console.log` call after the response data is
  already computed; it does not gate or delay `NextResponse.json`.
- Low-confidence badge: `page.tsx` reads `route.lowConfidenceFlags`
  directly off the `/api/research-os/route` response state, not a
  client-recomputed value.
- Merge reconciliation: `onProductionReturned` has a single definition in
  `stages.ts` (grep confirmed); no duplicate `EvidenceContext`-shaped
  version survives from this branch's pre-merge history.
- Layout at 400px: the workspace grid is `grid-cols-1 lg:grid-cols-[320px_1fr]`
  (stacks below the 1024px `lg` breakpoint); the auth-panel inputs sit in
  `flex flex-wrap` rows with a 200px/160px min/fixed width well under a
  368px content width at a 400px viewport (`px-4` gutters), so no row forces
  horizontal scroll.
- Voice lint: `agf-lint-voice-src check` (the source-file-scoped checker)
  clean on all 14 changed TS/TSX files. `agf-lint-voice check` (the
  general prose checker) additionally flagged antithesis phrasing and a
  few banned words inside test-description string literals and a local
  variable name (`honest`) in `scripts/test-research-os-evidence.ts` and
  `scripts/test-research-os-workspace-contracts.ts`; left as-is since these
  are internal test labels, not UI strings or comments, and `-src`'s own
  AST-scoped rule set treats them the same way. The one genuine UI-text hit
  (the notes placeholder above) was fixed. `BEADS-PENDING.jsonl`'s
  pre-existing violations (lines 1-80) predate this PR; the one new line
  this PR adds (the `ros-04` bead entry) is clean.
- Gates: `npm ci`, `npx tsc --noEmit`, `npm run build`,
  `npm run test:research-os` (191/191 pass), `next lint` on every touched
  file: all clean.

## 2026-09-10, PR #45 review pass

Strict review of PR #45 (`intake/ros-canon-promotion-2`, canon intake pass
two) before merge, in an isolated worktree per the review protocol.

Leak scan on the full diff against `origin/main`: no API keys, `.env`
contents, IPs, non-public hostnames, personal emails other than
`gianyrox@gmail.com`, PII, `/home/gian` paths, or Claude session URLs in
file content. Grep hits on DOI substrings (`10.1037/0033-2909.116.1.75`
read as an IP-shaped or phone-shaped string by a naive regex) were
confirmed false positives against the surrounding context. No redactions
were needed.

### Fixed

- `src/lib/canon-primary.ts`: `loadPrimaryPapers()` served every record
  under `bucket-canon/<branch>/<concept>/primary-papers.yaml`, including
  the 23 records this PR marks `provenance_signoff: "pending: gianyrox"`,
  with no check of that field. The `/api/research` route builds its
  paid-cite envelope (`citation`, `cite.price_usd`, `canon_tier: "canon"`,
  a real DOI and CC-BY-4.0 license) straight from `rankPrimary()`'s output,
  so a pending record was one matching query away from being served as
  approved, citeable-for-pay canon before a human ever signed off on it.
  Added `isPendingSignoff()` (true when `provenance_signoff` starts with
  `pending`, false for a record with no such field, since the rule does
  not reach backward past pre-ros-11 canon) and filtered on it inside
  `loadPrimaryPapers()`, the one loader both the envelope builder
  (`api/research/route.ts`) and the Research OS canon importer
  (`research-os/ingest/canon.ts`) read from. A pending record now falls
  out of ranking entirely; a matching query falls through to transcript
  candidates or the "no canon match" path instead. New test:
  `scripts/test-canon-primary-signoff.ts` (6 assertions: the predicate on
  pending/approved/absent values, that `loadPrimaryPapers()` never leaks a
  pending record from the real dossiers, and that a pre-ros-11 record with
  no `provenance_signoff` field, `05-biophysics/mitochondria`, still
  serves). Wired into `npm run test:research-os`.
- `GOVERNANCE.md`: added a "Canon sign-off" subsection under Mission
  documenting both write paths as one policy: `hte.canon_writeback`'s
  fail-closed hard refusal on a missing or blank `signoff`, and
  `tools/canon-pipeline/intake.py`'s pending-placeholder path, now backed
  by the `isPendingSignoff` gate above so a pending record is excluded
  from anywhere the site or Research OS reads approved canon from.

### Verified, no change needed

- The `/canon/[slug]` page's `BranchEntriesTable` reads only title, year,
  and sub-folder from `CANON_INDEX.md` markdown tables via
  `src/lib/canon-fs.ts`; it never reads `primary-papers.yaml` or
  `provenance_signoff`, and its "mint as IP NFT" action is already
  disabled. `/llms.txt` documents the protocol and the `/api/research`
  endpoint, not individual DOI-backed entries, so it names no pending
  record. Neither needed a code change.
- Six foundation-tier records
  (`07-mind/curiosity-and-motivation`,
  `07-mind/cognition-and-automation`, `04-information/information-foraging`)
  each state a principle with primary evidence and a DOI; all six DOIs
  verified live against Crossref/OpenAlex, resolving to the intended
  work. Seven outcome-tier records added to
  `07-mind/sub-outcomes/education/` all carry `tier: OUTCOME` and name
  their depended-on foundation. The two new dossier folders
  (`CANON_INDEX.md`, `queries.txt`, `primary-papers.yaml`,
  `primary-papers.bib`) follow the existing four-file convention.
- `tools/canon-pipeline/intake.py --min-score 70`, run twice against each
  of the four canon dossiers this pass touches
  (`curiosity-and-motivation`, `cognition-and-automation`,
  `information-foraging`, `memory-systems`): `added=0 changed=False` on
  every one. (A stray run against `07-mind/sub-outcomes/education` with
  the same foundation-tier flag rewrapped one comment line; reverted,
  since that dossier is outcome-tier and out of this pass's own scope.)
- `agf-lint-voice check` on every file this review touched: 0 violations.
- Gates: `npm ci`, `npx tsc --noEmit`, `npm run build`,
  `npm run test:research-os` (all files, 0 failures): all clean.

## 2026-09-10, PR #45 finishing pass

The prior review pass verified the pending-signoff filter, wrote the
governance paragraph, pushed the fix commit, and stopped short of merging.
This pass confirmed that work, brought the branch current, and merged.

### Verified

- `intake/ros-canon-promotion-2` already carried the reviewer's fix commit
  (`fix(canon): gate pending-signoff records out of the paid-cite path`):
  `isPendingSignoff()` filters inside `loadPrimaryPapers()`, the one loader
  both `/api/research`'s feed402 paid-cite envelope and the Research OS
  canon importer read from, so both consumers are gated at one call site.
  No record renders without passing through this filter, so no separate
  pending label is needed at either render surface.

### Fixed

- `origin/main` had moved three commits past the branch's last merge
  (`e1efbda1b`, `5f26be63e`, `f7dd86a67`). Merged again; the only conflict
  was an append-only collision in `BEADS-PENDING.jsonl` between this
  branch's own ros-canon-promotion-2 entry and main's new ros-11 entry,
  resolved by keeping both lines in sequence.

### Verified, no change needed

- `tools/canon-pipeline/intake.py --min-score 70`, run twice against the
  three foundation-tier dossiers this pass's scope covers
  (`curiosity-and-motivation`, `cognition-and-automation`,
  `information-foraging`): `added=0 changed=False` on every run. Left
  `sub-outcomes/education` alone per the prior pass's own note that it is
  outcome-tier and out of scope.
- Gates re-run post-merge: `npm ci`, `npx tsc --noEmit`, `npm run build`,
  `npm run test:research-os` (18 files, 0 failures), `agf-lint-voice check`
  on every touched file: all clean.

### Fixed, second round

- `origin/main` moved two more commits while the first merge's gates were
  running (PR #47, `ros-07 follow-up: consent gate wiring, profile page,
  privacy actions, status band`). Merged again; three conflicts, all
  resolved keeping both branches' work. `BEADS-PENDING.jsonl` and this
  file: append-only collisions, kept both entries in sequence.
  `package.json`'s `test:research-os` script: both branches added a test
  to the chain (`scripts/test-canon-primary-signoff.ts` here,
  `scripts/test-research-os-profile.ts` on main); merged to run all 19
  scripts, both new ones included.
- Gates re-run again post-second-merge: `npm ci`, `npx tsc --noEmit`,
  `npm run build`, `npm run test:research-os` (19 files, 0 failures),
  `agf-lint-voice check` on every touched file: all clean.

## 2026-09-10, ros-07 follow-up: consent gate wiring, profile page, privacy actions, status band

`feat/ros-07-consent-wiring`, worktree `.ros-worktrees/ros07b`, branched from
`origin/main` at `af5b7c9ea`. Scope: wire `src/lib/research-os/consent.ts`'s
`requireConsent` into every learner-facing write path, add a minimal
`/research-os/profile` page, add self-service export/delete to the workspace
footer, and rewrite the `/research-os` status section against what is actually on
main.

**Consent gate wiring.** `requireConsent` now runs right after `verifyLearner()` in
four POST handlers: `workspace/route.ts` (action `workspace_tool`, in front of all
four tools, Locate and Quote included), `probe/route.ts` (action `probe_answer`),
`state/route.ts` only when `action === "transfer_item"` (action `transfer_answer`;
the sibling `open` action stays ungated), and `production/route.ts` (action
`production_submit`, draft and submit alike). `ConsentAction` grew from two values
to four. A new `consentBlockedBody(gate)` shapes the shared 403 JSON body
(`{error, message, needsProfile}`) every gated route now returns; the workspace
page's `handleConsentResponse` recognizes it from any gated fetch and renders a
banner, linking to `/research-os/profile` when `needsProfile` is true.

**Profile page.** `src/app/research-os/profile/page.tsx` (new) and
`POST`/`GET /api/research-os/profile` (new, `src/lib/research-os/profile.ts`'s
`validateProfileInput`): role and birth-year bucket only, no birthdate, no name.
The route upserts only those two columns, never `consent_status`, so an existing
consent decision survives a later profile edit untouched (a Supabase upsert only
updates the columns present in its payload).

**Privacy actions.** The workspace page's footer gained "export my data" (downloads
the export envelope as a JSON file) and "delete my data" (a typed confirm step
gating a disabled button, sending `confirm: DELETE_CONFIRM_TOKEN`). The privacy
route now rejects a delete request whose `confirm` field does not match exactly
(`isDeleteConfirmed`, checked before any auth resolution or database call), closing
task item 2's "the confirm cannot be skipped server-side."

**Status band.** `/research-os`'s "§ status" paragraph, previously describing only
the Phase 0 seed path and the open grades-9-to-12 question, now lists what is on
main (routing with confidence flags, the diagnostic probe, the four-tool workspace
with contracts enforced in code, teacher review and class view with an accept path,
the engine bridge covered by tests, privacy export and delete, the consent gate) and
what is not (applying an accepted production to the live database, roster sync,
verified parental consent, a payment to a minor contributor, canon write-back
without a human sign-off). Original text preserved verbatim in
`_intake/research-os-k12/DELETIONS.md`; no other section of the page changed.

**Full doc:** `learning/research-os/WORKSPACE.md` section 5 (new),
`learning/research-os/compliance/README.md`'s "The consent gate, wired" (renamed
from "What is built but not wired") and part B item 6 (closed). See also
`learning/research-os/CHANGE-LEDGER.md`'s matching entry, "Iteration 19," for the
file-by-file diff and gate results.

## 2026-09-10, PR #47 finishing pass

Prior reviewer verified PR #47 (consent gate wiring, profile page, privacy
actions, status band) and pushed fix commits to
`feat/ros-07-consent-wiring`, then stopped short of merge. This pass picked
up from the `review/pr47` worktree to close it out.

`origin/feat/ros-07-consent-wiring` and `review/pr47` carried identical
commit histories already, so no fast-forward push was needed for the fix
commits. `origin/main` had advanced past the branch's last merge (three new
commits, including the `ros-11` canon write-back signoff-gate status line);
`git merge origin/main` hit one conflict, `BEADS-PENDING.jsonl`, both sides
appending a distinct bead entry at end-of-file. Resolved by keeping both
entries; no other file conflicted.

Gates re-run post-merge: `npm ci` clean, `npx tsc --noEmit` clean,
`npm run build` clean (`/research-os/profile` and `/api/research-os/profile`
both in the manifest), `npm run test:research-os` 236/236 across 18 test
files, `eslint` clean on all 16 touched TS/TSX files,
`agf-lint-voice-src check` clean on the same 16, `agf-lint-voice check`
clean on the touched docs. The Vercel status check on the PR fails with
"Deployment rate limited, retry in 24 hours" (Vercel free-tier daily
deployment cap), unrelated to this branch's code.

## 2026-09-10, PR #61 review pass

Review-and-merge pass on PR #61 (`feat/canon-signoff-tool`, "human sign-off
tool, CLI and gated page, audit trail") before merge, worktree
`.ros-worktrees/r61`.

Correctness verified: `approve`/`reject` are idempotent in both the Python
CLI (`signoff_core.py`) and the TypeScript route module
(`src/lib/canon-signoff.ts`); the `/api/canon/signoff` route requires both
`RESEARCH_OS_REVIEWER_EMAILS` and `CANON_SIGNOFF_APPROVERS` server-side and
returns 403 otherwise; a build-output grep found no allowlist membership in
any client bundle, only the two env var names as help text on the page
itself. Added three cross-language tests to `scripts/test-canon-signoff.ts`:
a record approved and one rejected by the real `signoff_core.py` (invoked
via subprocess, not re-typed) both read correctly under `isPendingSignoff`
(TS), and `hte.canon_writeback` never references `provenance_signoff`, so
the hypothesis engine's own `signed_off_by` write gate cannot collide with
this tool's field.

Walker gap decided by design: the PR's own SIGNOFF.md flagged
`findPrimaryFiles`'s one-level directory walk as missing the eleven
`sub-outcomes/education/` records (two levels deep) without saying whether
that gap should be fixed. Every `primary-papers.yaml` in the repo currently
sits at exactly one level below its branch except that one dossier, and
`GOVERNANCE.md`'s mission scopes the citeable canon envelope to
foundation-tier research; `sub-outcomes/` is outcome tier by definition.
The walker's exclusion matches policy, so it stays as is; one clarifying
sentence added to `SIGNOFF.md` and `GOVERNANCE.md` so a future pass does not
"fix" it into serving outcome-tier content as paid-cite canon.

Merged `origin/main` (PRs #42, #51, #59, and a `whats-new` milestone commit
that had landed since this branch's own merge commit); one append-only
conflict, `_intake/research-os-k12/CHANGELOG.md` itself, resolved keeping
both sides' entries. `learning/research-os/CHANGE-LEDGER.md` merged clean.

Gates re-run post-merge: `pytest tools/canon-pipeline/tests/` (41 passed),
`npm ci` clean, `npx tsc --noEmit` clean, `npm run build` clean
(`/canon/signoff` and `/api/canon/signoff` both in the manifest, confirmed
via the app-paths manifest rather than the truncated build log),
`npm run test:research-os` (326 passed, 0 failed, 24 files), `eslint` clean
on every touched TS/TSX file, `agf-lint-voice-src check` clean on every
touched TS/TSX/Python file, `agf-lint-voice check` clean on the touched
docs after one antithesis-phrasing fix in this pass's own `SIGNOFF.md` edit.
No record's `provenance_signoff` value changed by this PR (confirmed
against the PR's own file list; `bucket-canon/` never appears in it). Leak
scan over every changed file found no keys, tokens, secrets, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian`
paths, or Claude session URLs. `/canon/signoff` reviewed at 400px against
its Tailwind classes: no fixed width exceeds 400px and every input row wraps
(`flex-wrap`), so no horizontal scroll is expected; no headless browser was
available in this environment to screenshot it directly.

## 2026-09-10, production provenance guard

`feat/ros-production-guard` against `main`, worktree `.ros-worktrees/guard`, not yet merged. Adds the Production provenance guard: quote-locator source verification, duplicate detection against prior work and canon, a counter-evidence field required at the internalization tier (Osborne 2010), and a citation-incentive-eligibility signal tied to canon sign-off (`GOVERNANCE.md`).

`src/lib/research-os/production-guard.ts` holds the four pure rule functions, `checkSourceProvenance` (a source verifies when it carries the locator of a real `"quote"`-kind evidence event this learner produced, `stages.ts`'s new `onQuoteReturned`), `computeDuplicateFlag` (normalized token overlap, the lexical-Jaccard approach `tools/hypothesis-engine/hte/novelty.py` already uses, ported to TypeScript, against this learner's own prior claims, class peers' accepted claims, and canon claim texts), `requiresCounterEvidence` (true once the learner's own submit-time stage reached Internalization), and `computeIncentiveEligible` (no payment code, a stored signal only). `src/lib/research-os/canon-link.ts` supplies the two fs-backed reads that function needs, the canon-claims candidate list and an unfiltered `provenance_signoff` lookup by canon record id. Five new columns land on `graph.productions` (`supabase/migrations/20260910060000_research_os_production_guard.sql`).

`/api/research-os/production`'s POST computes and stores the guard's output on a real submission (never a draft save) and refuses one that needs counter-evidence and has none. `/api/research-os/review`'s POST refuses to approve a production carrying an unverified source, and the review queue (both route and page) surfaces every guard flag beside its production, with a return-note template and a disabled approve button while a source is unverified.

`scripts/research-os/ingest/canon-claims.ts` (new, `npm run ingest:research-os:canon-claims`) generates the full canon-claims JSON every branch, one claim text per `bucket-canon/**/primary-papers.yaml` record; a seven-entry hand-picked sample is committed at `scripts/research-os/ingest/out/sample-canon-claims.json`, one per branch, matching the existing generated/sample split every other importer's `out/` directory already uses.

`learning/research-os/PRODUCTION-GUARD.md` (new) documents all four rules, what a teacher sees, and what is logged. `src/lib/research-os/EVIDENCE-SCHEMA.md` and `learning/research-os/WORKSPACE.md` document the new `"quote"` evidence event. `learning/research-os/compliance/DATA-INVENTORY.md` gained the five new columns.

21 new tests, `scripts/test-research-os-production-guard.ts`, cover all four rules plus a near-duplicate fixture, wired into `npm run test:research-os`.

Gates: `npm ci` clean, `npx tsc --noEmit` clean, `npm run build` clean (`/api/research-os/production` confirmed in the manifest), `npm run test:research-os` (26 chained files, every file `fail 0`), `eslint` clean on every touched TS/TSX file, `agf-lint-voice-src check` clean on every touched TS/TSX file, `agf-lint-voice check` clean on every touched doc/JSON/`.gitignore` (including seven pre-existing violations in `.gitignore` fixed to clear its own touched-file gate). No record's `provenance_signoff` value changed by this branch. PR open against `main`, merge pending.
