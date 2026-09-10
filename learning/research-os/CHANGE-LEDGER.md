# Research OS for K-12: Change Ledger

Every file this work adds, edits, or would remove is listed here with the reason, so nothing is lost. Policy: no deletions; when text is replaced, the old text is recorded below before the change lands.

## PR #35 review pass

Date 2026-09-10. Review of `feat/ros-07-compliance-part-a` (PR #35), worktree `review/pr35`.
Full account: `_intake/research-os-k12/CHANGELOG.md`, "2026-09-10, PR #35 review pass".

### Edited

- `supabase/migrations/20260910040000_research_os_privacy_consent.sql`: added
  `actor_id_hash text` and `acting_as_reviewer boolean not null default false` to
  `graph.privacy_events` (via `alter table ... add column if not exists`, matching the
  migration's own idempotent convention); `graph.privacy_delete_learner` gained two new
  default-valued params (`p_actor_id uuid default null`, `p_acting_as_reviewer boolean
  default false`) and now writes both into its own audit-row insert. Header comments for
  both objects updated to describe the addition.
- `src/lib/research-os/privacy.ts`: `exportLearnerData` and `deleteLearnerData` now take
  the full `PrivacyRequestActor` (not just the target learner id) and pass `callerId`/
  `actingAsReviewer` through to the audit row and the RPC call. `simulateLearnerDelete`
  gained an optional third `actor` param mirroring the RPC's new params (omitted, it
  defaults to a self-request: `actorIdHash` equals `learner_id_hash`); `FixtureStore`'s
  `privacy_events` type gained the two matching optional fields. Doc comments updated to
  name the accountability guarantee.
- `src/app/api/research-os/privacy/route.ts`: both call sites now pass the resolved `actor`
  object instead of `actor.targetLearnerId`; header comment records the accountability
  guarantee this closes.
- `scripts/test-research-os-privacy.ts`: two new tests, "a self-request's audit row hashes
  the same id into actor and learner" and "a reviewer-invoked delete is distinguishable in
  the audit row from a self-request" (173 tests total in `test:research-os`, up from 171).
- `_intake/research-os-k12/CHANGELOG.md`, `learning/research-os/CHANGE-LEDGER.md` (this
  file): this review pass's own entry.

### Removed

None.

### Defect found and fixed

`resolvePrivacyActor` resolves and returns `actingAsReviewer`, but the route discarded it
after the auth check: `exportLearnerData`/`deleteLearnerData` took only the target learner
id, and `graph.privacy_events`'s three original columns (`learner_id_hash`, `action`,
`created_at`) recorded nothing about who acted. A reviewer invoking export or delete on a
learner's behalf therefore wrote the exact same audit row a learner's own self-request
would, no way to tell the two apart after the fact. The migration, `privacy.ts`, and
`route.ts` changes above close the gap; a reviewer-invoked delete or export now writes
`actor_id_hash` (a hash of the reviewer's own id,
distinct from `learner_id_hash`) and `acting_as_reviewer: true`, closing the review task's
"a reviewer cannot act on a learner's behalf without that being logged" requirement.

### Verified

Leak scan against the full diff clean: no keys, `.env` values, IPs, non-public hostnames,
personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or Claude session
URLs. Delete-table cross-check: `graph.privacy_delete_learner`'s nine `delete from`
statements (`learner_node_state`, `productions`, `teacher_reviews`, `edge_flags`,
`class_members`, `learner_profiles`, `academy_progress`, `academy_profiles`,
`academy_credentials`) match `DATA-INVENTORY.md`'s nine learner-keyed table rows one for
one. Export scoping test exists and passes. `learner_profiles` RLS policies (`own_select`,
`own_insert`, `own_update`) all scope to `auth.uid() = learner_id`. `decideConsent` blocks
`under13`/`13to17` with `consent_status: none` (and the stricter no-profile-row case),
allows `18plus` regardless of consent status. `consent.ts` exports `requireConsent` with a
TODO naming the two call sites; `git diff origin/main...HEAD -- src/app/api/research-os/
workspace/route.ts src/app/api/research-os/production/route.ts` is empty, confirming
neither route changed in this PR's own diff. `agf-lint-voice check` on the five compliance
docs and `agf-lint-voice-src check` on every touched source file plus the migration: 0
violations (the plain `agf-lint-voice check`'s hits on pre-existing lines in
`BEADS-PENDING.jsonl` and test-description strings in `scripts/test-research-os-privacy.ts`
predate this pass or belong to the original PR author's own content, out of scope for a
source file the correct tool for which is `agf-lint-voice-src`, which is clean). Gates
rerun clean: `npm ci`, `npx tsc --noEmit`, `npm run build` (`/api/research-os/privacy`
present in the route manifest), `npm run test:research-os` (173/173, 0 failures), `next
lint` on every touched file (0 warnings). Branch was already even with `origin/main` at
review start, no merge needed.

## PR #30 review pass

Date 2026-09-10. Review of `feat/ros-12-engine-wiring` (PR #30), worktree `review/pr30`.
Full account: `_intake/research-os-k12/CHANGELOG.md`, "2026-09-10, PR #30 review pass".

### Edited

- `BEADS-PENDING.jsonl`, `scripts/test-research-os-apply-engine-campaign.ts`,
  `scripts/test-research-os-engine-bridge.ts`: four antithesis constructions rewritten,
  no behavior change.
- `learning/research-os/ENGINE-BRIDGE.md`: "Item 3's write-side hook is unreached today"
  updated to record that ros-06's teacher-accept path (PR #28, merged) reaches it through a
  real reviewer decision now, narrowed to the live-Supabase leg still untested.
- Merged `origin/main` (PR #27, PR #28): six conflicts resolved keeping both sides'
  additions (`BEADS-PENDING.jsonl`, `_intake/research-os-k12/CHANGELOG.md`,
  `_intake/research-os-k12/DELETIONS.md`, `learning/research-os/CHANGE-LEDGER.md`,
  `package.json`'s `test:research-os` script chain, `src/lib/research-os/db.ts`'s two
  new type imports).

### Removed

None.

### Verified

Leak scan clean. Gates rerun post-merge: `npm ci`, `npx tsc --noEmit`, `npm run build`,
`npm run test:research-os` (151/151), `npx eslint`, engine `ruff check`, engine `make test`
(951 passed, 14 deselected). End-to-end path run once (fixture-driven, no live Supabase):
an approved production's outbox row (`buildProductionOutboxRow`) through the real outbox
reader (exactly one row, idempotent consumption), the real stubbed campaign (3 accepted
hypotheses, 11 gaps), and the real TS mapping, landing on an `engine_hypothesis` node draft
and a `gap` node draft, both with full engine provenance.

## Engine Bridge Wiring and Hypothesize Route: ros-12 and ros-13

Date 2026-09-10. Branch `feat/ros-12-engine-wiring`, closing PR #14's own
three engine bridge stubs and applying PR #10's own unapplied hypothesize
route patch. Worked in a dedicated worktree alongside two other
concurrent efforts on this repo: PR #20 (`fix(hte): PR #10 review
findings...`, open, reviewing/merging `hte/api.py`, `hte/corpus/
education_atlas.py`, `hte/corpus/literature.py`, `hte/corpus/
production.py`, `hte/generate.py`, `hte/llm.py`, `hte/parallel.py`,
`hte/runner.py`, `hte/timeline.py`, and their test files, none of which
this branch edits) and a separate agent's own work on `src/lib/research-
os/frontier.ts`, `closure.ts`, and the review and class pages (also not
touched here). Full account: `learning/research-os/ENGINE-BRIDGE.md`.

### Added

- `src/app/api/research-os/hypothesize/route.ts`,
  `src/lib/research-os/types.ts`'s `HypothesizeResult` (ros-13): `tools/
  hypothesis-engine/docs/research-os-hypothesize-route.patch`, applied
  cleanly against current `main` with no conflicts.
- `src/lib/research-os/hypothesize-auth.ts` (`authorizeHypothesize`,
  ros-13): the patch's own inline `.eq("learner_id", learnerId)` ownership
  filter pulled into a named, pure, unit-tested function (the review item
  that produced this branch's own ros-13 bead: "add a route test that a
  learner can only hypothesize over their own productions").
  `scripts/test-research-os-hypothesize-route.ts`.
- `tools/hypothesis-engine/hte/corpus/research_os_outbox.py` (ros-12 item
  2): `fetch_unconsumed_rows`, `mark_consumed`, `fetch_and_build`, `load`,
  `load_and_consume`. Reads `public.research_os_productions_outbox`
  filtered to `consumed_at is null`, through `hte.corpus.production`'s
  existing normalizer (`Production.from_dict`). Registered as the
  `"research-os"` corpus in `hte.cli`'s own `_CORPUS_LOADERS`.
- `supabase/migrations/20260910030000_research_os_outbox_consumed_at.sql`
  (ros-12 item 2): adds `consumed_at` to the outbox table, additive,
  idempotent.
- `tools/hypothesis-engine/tests/test_corpus_research_os_outbox.py`
  (ros-12 item 2): 8 tests, monkeypatched `urllib.request.urlopen`, one
  fixture row shaped like a real outbox row.
- `hte.unknowns.unresolved_slot_gaps` (ros-12 item 4, `tools/
  hypothesis-engine/hte/unknowns.py`): a public generalization of `hte.
  api`'s own private `_rank_gap_nodes`, one `GapNode` per evidence item
  missing a concept slot, ranked by `value_of_information`. 6 new tests
  in `tools/hypothesis-engine/tests/test_unknowns.py`.
- `tools/hypothesis-engine/scripts/campaign_research_os.py` (ros-12 item
  3, the campaign-run caller): `run()`/`main()`, `_register_corpus`
  (registers a corpus into `hte.runner._CORPUS_LOADERS` at call time, a
  runtime dict assignment rather than a `hte/runner.py` edit),
  `export_accepted_hypotheses`, `export_gap_nodes`. 7 tests in fake mode
  against the 14 shipped production fixtures, `tools/hypothesis-engine/
  tests/test_campaign_research_os.py`.
- `src/lib/research-os/engine-bridge.ts`'s `gapNodeSlug`, `buildGapNode`,
  `buildGapEdges`, `GapNodeInput`, `GapNodeDraft`, `GapNodeProvenance`
  (ros-12 item 4, write side): a gap becomes a `graph.nodes` row of kind
  `artifact`, provenance `type: "gap"`, with a `cites` edge (not
  `prerequisite`, `frontier.ts`/`closure.ts` walk only that edge kind for
  real routing) to every hypothesis node it concerns. 6 new tests in
  `scripts/test-research-os-engine-bridge.ts`.
- `src/lib/research-os/db.ts`'s `upsertGapNode` (ros-12 item 4): the same
  upsert shape as `upsertEngineHypothesisNode`, kept as its own function.
- `scripts/research-os/apply-engine-campaign.ts` (ros-12 item 3, write
  side): `applyEngineCampaign`, `toEngineHypothesisInput`,
  `toGapNodeInput`. Applies `campaign_research_os.py`'s own JSON export
  through the PR #14 adapter into `graph.nodes`/`graph.edges`. 4 tests for
  the mapping functions, `scripts/test-research-os-apply-engine-
  campaign.ts`.

### Edited

- `tools/hypothesis-engine/hte/cli.py`: `_CORPUS_LOADERS` gained the
  `"research-os"` entry.
- `package.json`'s `test:research-os` script: chained in
  `scripts/test-research-os-hypothesize-route.ts` and
  `scripts/test-research-os-apply-engine-campaign.ts`.
- `learning/research-os/ENGINE-BRIDGE.md`: the "Stubs, open items"
  section split into "Stubs Closed: ros-12 and ros-13" (what shipped) and
  a narrower "Stubs, open items" (what remains); a "Running a campaign
  end to end" section added. Original text preserved verbatim in
  `_intake/research-os-k12/DELETIONS.md`.

### Removed

None.

## ros-06: teacher class view and the Production accept path

Date 2026-09-10. Branch `feat/ros-06-teacher-class-view`, `learning/research-os/PLAN-REVISION-1.md` section 3 item 5. Concurrent with a frontier/closure-edges pass and an engine-side pass; this work touched neither `src/lib/research-os/frontier.ts`, `closure.ts`, the graph-edges migration, `scripts/research-os/ingest/`, nor `src/lib/research-os/engine*`/`tools/hypothesis-engine`.

### Added

- `supabase/migrations/20260910030000_research_os_classes.sql`: `graph.classes`, `graph.class_members`, RLS on both, plus `graph.productions.notes` (jsonb, append-only).
- `src/lib/research-os/class-view.ts`: `seedPathOrder`, `buildClassGrid`, `findBlockedLearners`, `findReadyForHarderTarget`, pure functions over plain graph arrays.
- `src/app/api/research-os/class/route.ts` and `src/app/research-os/class/page.tsx`: the class view, `GET /api/research-os/class`, server-side data loading and computation, reviewer-gated, scoped to the caller's own classes.
- `scripts/test-research-os-teacher-class.ts`: 20 `node:test` cases (fixture class on the real seed path, blocked/ready computations, the reviewer gate, the accept path's evidence shape against the real `buildProductionOutboxRow`, a static RLS-policy check on the new migration). Wired into `npm run test:research-os`.
- `learning/research-os/TEACHER-LAYER.md`: the data model, the two-layer gate (RLS plus a server check), the accept path's approve/return semantics, and what Phase 1 roster sync (OneRoster/Clever/ClassLink) replaces.

### Edited

- `src/lib/research-os/reviewer.ts`: split `isReviewerEmail` out of `verifyReviewer` for unit testing with no network call.
- `src/lib/research-os/stages.ts`: added `onProductionReview` (approve) and `onProductionReturned` (return); added `fromStage`, `toStage`, `reviewId` to `EvidenceEvent`; added `"production_returned"` to `EvidenceKind`.
- `src/lib/research-os/db.ts`: added `loadClassesForReviewer`, `loadClassMembers`, `loadLearnerStatesForMany`, and `emitProductionOutboxIfAccepted` (extracted from `/api/research-os/production`'s own inline outbox block, now shared).
- `src/app/api/research-os/production/route.ts`: its outbox-emission block replaced with a call to the new shared `emitProductionOutboxIfAccepted`; original text preserved in `_intake/research-os-k12/DELETIONS.md`.
- `src/app/api/research-os/review/route.ts`: the production decision branch now sets a return's status to `"draft"` (was `"returned"`), appends a teacher note to the production's own `notes` column, and calls `recordEvidence` on both approve and return (a mid-review fix, see below); header comment updated to match, original text in `DELETIONS.md`.
- `src/app/research-os/review/page.tsx`: a breadcrumb link to `/research-os/class`.
- `package.json`: `test:research-os` now also runs `scripts/test-research-os-teacher-class.ts`.

**Mid-review fix.** `ros-02`'s evidence-schema pass (`docs/ros-02-learner-state-model`, `src/lib/research-os/EVIDENCE-SCHEMA.md`) found that a returned Production left `graph.learner_node_state.stage` at `"production"` with no evidence event recording the correction, since only the approve branch called `recordEvidence`. `onProductionReturned` closes this per `EVIDENCE-SCHEMA.md`'s own "corrective event" section: `stage` stays at `"production"` (the high-water-mark rule every transition function already enforces never runs backward), and a `"production_returned"` evidence event, `fromStage`/`toStage` both `"production"`, records the correction instead.

### Removed

None.

### Verified

`npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run test:research-os` (114/114 pass), `next lint` on every touched file, `agf-lint-voice-src check` on every touched source file, `agf-lint-voice check` on `learning/research-os/TEACHER-LAYER.md`: all clean.

## Iteration 13

PR #28 review pass. Date 2026-09-10. Review pass on PR #28 (`feat/ros-06-teacher-class-view`), worktree
`review/pr28`. Full account in `_intake/research-os-k12/CHANGELOG.md`,
"2026-09-10, PR #28 review pass".

### Edited

- `src/lib/research-os/db.ts`: `loadClassesForReviewer`'s scoping filter split into an
  exported pure function, `filterClassesForReviewer(rows, reviewerEmail)`, so the "a
  reviewer for class A never reads class B" guarantee is unit-testable with no network call.
  `loadClassesForReviewer` now calls it; behavior unchanged.
- `scripts/test-research-os-teacher-class.ts`: three cases added for
  `filterClassesForReviewer` (own class only, no class owned yields an empty result,
  case/whitespace insensitivity); header comment and the file's own test count
  updated (17 to 20).
- `learning/research-os/TEACHER-LAYER.md`, `_intake/research-os-k12/CHANGELOG.md`, this
  file: test-count references updated to match (111/111 to 114/114 suite-wide, 17 to 20 for
  this file).

### Removed

None.

### Verified

Leak scan on the full diff's added lines: no keys, `.env` contents, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or
Claude session URLs; fixture emails end in `.example`. `.voiceignore`'s
`tools/hypothesis-engine/docs/LOOP-LOG.md` line was the only engine-tree-adjacent change.
`npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run test:research-os` (114/114 pass),
`next lint` on every touched file, `agf-lint-voice`/`agf-lint-voice-src check`: all clean.

## Iteration 11: funding wave 1

Date 2026-09-10. Bead `ros-09`, branch `docs/ros-09-funding-wave-1`, worktree `.ros-worktrees/ros09`. Four funder-facing documents under a new `learning/research-os/funding/` directory, each verified against a funder's own live site by direct WebFetch on 2026-09-10 rather than carried forward unchecked from the 2026-09-09 intake pass.

### Added

- `learning/research-os/funding/FAST-FORWARD-2026.md`: confirms the 2026-09-18 accelerator deadline against ffwd.org's own banner (which supersedes a stale September 7 date elsewhere on the same page), confirms the $25K+ funding figure and three-month program length, states the founder-only eligibility gap (no fiscal sponsor and no state incorporation exist yet) as the single blocking action, and drafts logistics answers plus five narrative blocks against likely application prompts, each sourced to an existing file.
- `learning/research-os/funding/WAVE-1-TARGETS.md`: verifies all eight section K funder candidates by direct fetch; four clear as wave-1 targets (Tools Competition, Digital Public Goods Alliance registration, Renaissance Philanthropy's AI for Education fund, NLnet NGI Zero), four are recorded as checked and excluded with sources (Chan Zuckerberg Initiative, Schmidt Sciences, Emerson Collective, Institute of Education Sciences), and one correction to the prior pass is logged (NewSchools Venture Fund's 2026 cycle is confirmed closed, correcting the "open portal" read from the 2026-09-09 pass).
- `learning/research-os/funding/FISCAL-SPONSOR-DECISION.md`: corrects the nonprofit-application packet's 2026-05-03 top pick, Hack Club Bank, confirmed ineligible on this pass (its own eligibility page requires a project led by teenagers 13 to 18); recommends Players Philanthropy Fund (6% flat fee, 3-to-5-business-day initial response, both confirmed on this pass) over Social Good Fund (8% fee at Bucket's budget size) as the primary contact, run in parallel rather than sequentially.
- `learning/research-os/funding/BUDGET-PHASE-1.md`: a twelve-month Phase 1 budget (pilot school, 500 learners) built by annualizing the system review's section 6 Phase 1 monthly cost ranges across a three-period build, pilot-semester, evaluation breakdown; every cell shows its own month-count-times-rate arithmetic so the total is checkable against the source table directly. Low, expected, and high twelve-month totals: $4,425, $19,125, $83,610.

### Edited

- `_intake/research-os-k12/CHANGELOG.md`: this iteration's own entry.
- `learning/research-os/CHANGE-LEDGER.md`, this file: this iteration's own entry.
- `BEADS-PENDING.jsonl`: appended a `ros-09` status line recording this iteration's outcome.

### Removed

None.

### Verified

`agf-lint-voice check` on all four new files under `learning/research-os/funding/`: 0 violations after one auto-fix pass (`agf-lint-voice fix`, cleared banned words, filler adverbs, and one meta-commentary hit) and a manual rewrite pass on every antithesis-pattern flag (antithesis is never auto-fixed) and every appended-clause heading. Every dollar figure, deadline, and eligibility claim across the four files carries its source file or fetched URL inline; no figure is asserted without one. No pilot, learner, user, or revenue is claimed as existing; `BUDGET-PHASE-1.md` section 4 states this explicitly. No PII beyond the founder's already-public name and email (`gianyrox@gmail.com`, already the public contact on `nonprofit-application/README.md`); no bank or wallet detail appears in any of the four files.

### Iteration 11 addendum: PR #26 review corrections

Date 2026-09-10, same iteration, review pass before merge. Three citation-accuracy errors found and fixed. `FAST-FORWARD-2026.md` section 2 cited gap G-5 for a "no sponsor contacted" fact; that fact lives in the memo's own status header, and G-5 covers the registered-agent address instead, so the citation is corrected to gaps G-1 through G-4 plus the status line. The same section's item 1 claimed a "same-week turnaround" for New York filing; `00-BASE-INFO-MEMO.md` section 4 states the $75 cost alone, so the turnaround claim is removed. `FISCAL-SPONSOR-DECISION.md` twice instructed fixing HCB out of `00-COVER-LETTER.md`; the cover letter never names HCB, so the fix now points at `00-BASE-INFO-MEMO.md` section 3.2, the file that ranks it. WebFetch re-verified live on 2026-09-10: ffwd.org's deadline and eligibility text, tools-competition.org's Phase I date, ppf.org's fee, and HCB's own eligibility page; all four held as the packet states them.

## Iteration 6: Phase 1 stub closures

Closure table, diagnostic probe, real quotes, review hold. Date 2026-09-10. Branch `feat/ros-phase0-stubs`, closing four of the Phase 0 PR's (#6)
listed stubs, scoped to the review's own Phase 1 boundary (section 8). Rebased twice
onto `main`: once after the site-alignment PR (#12) merged, once after the hypothesis
engine bridge (#14) and the `hte` refusal-handling PR (#10) both merged; both rebases
carried forward the concurrent work unchanged, resolving only the files this work and
the engine bridge both touched (`package.json`'s `test:research-os` script,
`src/app/api/research-os/route/route.ts`, `src/lib/research-os/db.ts`).

### Added

- `src/lib/research-os/closure.ts` (from the preserved wip commits; item 1):
  `ancestorsOf` and `computeAncestorClosure`, the in-memory counterpart to
  `graph.prereq_ancestor`.
- `supabase/migrations/20260910010000_research_os_prereq_ancestor.sql` (from the
  preserved wip commits; item 1): the closure table itself, public-read RLS.
- `scripts/rebuild-prereq-ancestor.ts` (item 1): rebuilds `graph.prereq_ancestor` for
  one branch from `graph.edges`, delete-and-reinsert, matching
  `scripts/seed-research-os.mjs`'s idempotent pattern. Wired to
  `npm run rebuild:research-os-ancestors`.
- `scripts/test-research-os-closure.ts` (item 1): unit tests for `ancestorsOf` /
  `computeAncestorClosure`, plus equivalence tests asserting `computeFrontier`'s
  full-graph walk and its closure-pruned walk agree on every synthetic learner state
  the routing test file already covers.
- `src/lib/research-os/probe.ts` (item 2): `probeDue`, `selectProbeNodes`,
  `probeQuestion`, `buildProbe` -- pure functions deciding whether a diagnostic probe
  is due (no learner state on any ancestor of the target) and which 3-5 ancestor
  nodes, at rising tiers, to ask about.
- `src/lib/research-os/grounding.ts` (item 2): `gradeExplanation`, extracted from the
  Check tool's original inline grading call in `workspace/route.ts` so the probe route
  reuses the identical grading logic instead of a second copy of the prompt.
- `src/app/api/research-os/probe/route.ts` (item 2): `GET` (is a probe due, and its
  questions) and `POST` (grade one answer via `gradeExplanation`, apply
  `onProbeCheckResult`).
- `scripts/test-research-os-probe.ts` (item 2): unit tests for every function in
  `probe.ts` plus `stages.ts`'s new `onProbeCheckResult`.
- `src/lib/research-os/passages.ts` (item 3): a curated table of verbatim, under-90-
  word passages with a locator and URL, verified character-for-character against the
  live source (raw HTML/wikitext fetch, never a paraphrase) for Tyndall 1869, Rayleigh
  1871, NASA Space Place, and the cited Wikipedia revisions. Carries a
  `voice-ignore-file` marker (the passages are verbatim quotations).
- `src/lib/research-os/reviewer.ts` (item 4): `verifyReviewer`, an
  `RESEARCH_OS_REVIEWER_EMAILS` env-var allowlist gate, with a TODO pointing at the
  real roster-backed role the review's gap analysis calls for (Phase 1+).
- `src/app/api/research-os/review/route.ts` (item 4): `GET` (pending transfer-item
  holds and submitted Productions) and `POST` (approve/return, gated by
  `verifyReviewer`; an approval logs evidence on the learner's own state and, for a
  transfer item, advances it to Internalization).
- `src/app/research-os/review/page.tsx` (item 4): the reviewer queue UI.
- `stages.ts`'s `onProbeCheckResult` and `onTeacherReview` (items 2 and 4): new stage
  transitions; `EvidenceKind` gained `"teacher_review"`.

### Edited

- `src/lib/research-os/frontier.ts`: `computeFrontier` gained the optional fifth
  `ancestorRows` argument the Phase 0 PR's header comment had already documented but
  never implemented; pruning logic split into `pruneToClosure`. Every existing caller
  and test keeps working unchanged (the argument defaults to the original full-graph
  walk).
- `src/lib/research-os/db.ts`: added `loadAncestorRows` (item 1) and refactored
  `verifyLearner` into a shared `verifyToken` plus the new `verifyLearnerIdentity`
  (item 4, so `reviewer.ts` can read the caller's email).
- `src/app/api/research-os/route/route.ts`: reads `graph.prereq_ancestor` via
  `loadAncestorRows` and passes the rows to `computeFrontier` (item 1).
- `src/app/api/research-os/workspace/route.ts`: the `check` case now calls
  `grounding.ts`'s `gradeExplanation` instead of an inline prompt (item 2); the
  `quote` case now returns a curated verbatim passage when one exists, or the node's
  own summary labeled `"summary"` when it does not (item 3).
- `src/app/research-os/workspace/page.tsx`: renders the diagnostic probe panel when
  due (item 2) and the quote tool's new `kind`/`locator` fields (item 3).

### Removed

None.

## Iteration 1

Date 2026-09-09. Branch `feat/research-os-k12`.

### Added

- `_intake/research-os-k12/03-data-services.md`: vendor and data-source map, verified 2026-09-09.
- `_intake/research-os-k12/04-funding-and-people.md`: funding flows and ranked people map.
- `_intake/research-os-k12/README.md`, `.status.json`: intake index and status.
- `_intake/research-os-k12/raw/*.md`: sixteen verbatim research-agent reports plus `lit-ai-for-science.md` (42 resolved papers) and `lit-educational-methods.md` (49 resolved sources) and `lit-hci-human-ai.md` (56 checked sources), kept as evidence with a voice-ignore marker.
- `learning/research-os/PLAN.md`: architecture, states, routing, workspace, production schema, vendor decisions, compliance, phases.
- `learning/research-os/RESEARCH-QUESTIONS.md`: twenty testable questions.
- `learning/research-os/CHANGE-LEDGER.md`: this file.
- `src/app/research-os/page.tsx`: public page describing Research OS for K-12, linked from the research hub.
- `_intake/research-os-k12/funding-log.md`: wave 1 funding log.

### Edited

- `BEADS-PENDING.jsonl`: appended eleven `ros-` bead payloads (ros-01 to ros-11); no existing lines changed.
- `CHANGELOG.md`: added an Unreleased entry; no existing lines changed.
- `src/app/research/page.tsx`: one hub card added for `/research-os`; no existing card changed. Old state: six cards (Agent, Tools, Datasets, Atlas, Papers, Education).
- `src/app/sitemap.ts`: `/research-os` entry added after `/research/papers`; no existing entry changed.
- `learning/research-os/PLAN.md` (second commit): check tool may return a guiding question or hint; backward path must resolve to a resource; engagement rate named a primary metric; scripted peer step at frontier nodes planned for Phase 1; states mapped onto SOLO and ICAP with a unidimensionality study and KLI knowledge types; payments launch beside a no-payment control; teacher view names process signals. Old text for each replaced sentence is in the git history of this branch.
- `learning/research-os/PLAN.md` (third commit): interface patterns paragraph, overlap map paragraph, and a co-design sentence added from the HCI review; no existing sentence removed.

### Removed

None.

## Iteration 3, site alignment

Date 2026-09-10. Branch `feat/ros-site-alignment`.

Task: align the public site with the Research OS for K-12 direction where it
fits, without removing any existing direction. Authoritative paragraph:
"Bucket becomes the operating system a student runs inside from the first
year of school to the research frontier. Everything humans know sits on one
map, in layers, from the first fact a child can hold to the deepest laws we
have, across every subject from physics to history. A twelve-year-old who
asks why the sky is blue gets walked backward to what they already know and
forward, one source at a time, to the physics that answers it. Every idea on
the map has the same five stages: you can reach it, you know it exists, you
can explain it, you can use it on a problem you have never seen, and you can
add something new to it. The student's work is the same thing a scientist
makes: a claim, the evidence, the sources, and proof they can use the idea
somewhere new. The map is the game. The AI finds, quotes, checks, and
organizes. The student asks the question, sketches the idea, works through
the hard part, and writes the answer, because the point is that the kid is
smarter next year than this year. Teachers see their whole class on the same
map. When a student adds something the map accepts, they get paid for it the
same way any researcher on Bucket does. Bucket is a nonprofit, so the OS is
free to any learner anywhere in the world. Bucket is where a person learns to
produce knowledge, starting on day one."

### Edited

- `src/components/Header.tsx`: added a "Research OS" primary-nav item
  (`/research-os`) between Academy and Access; every existing nav item kept,
  none reordered otherwise.
- `src/components/Presentation.tsx`: added a "Research OS for K-12" section
  on the home page, placed after the hero section and before the AI-native
  and thesis sections. Carries the five stages (Access, Awareness,
  Understanding, Internalization, Production), two sentences quoted from the
  authoritative paragraph above, and links to `/research-os` and
  `/research-os/workspace`. No existing home-page section changed.
- `src/app/research-os/page.tsx`: prototype link label changed from "open the
  Phase 0 prototype →" to "Try the prototype →" (same href, same styling);
  added a "Read the plan ↗" link to `learning/research-os/PLAN.md` on
  GitHub. The five stage names on this page already matched the authoritative
  five (Access, Awareness, Understanding, Internalization, Production); no
  further copy changed, since no other sentence on the page conflicted with
  the authoritative paragraph. Old link text recorded verbatim in
  `_intake/research-os-k12/DELETIONS.md`.
- `MANIFESTO.md`, section 5 ("Who bucket is for"): appended one sentence at
  the end of the section: "Bucket is where a person learns to produce
  knowledge, starting on day one." No other sentence in the manifesto
  changed.
- `public/llms.txt`: added a line for `/research-os` under "Pages you can
  read for free".
- `_intake/research-os-k12/DELETIONS.md`, `_intake/research-os-k12/CHANGELOG.md`:
  this pass's own ledger entries.

### Removed

None.

## Iteration 2

Date 2026-09-10. Branch `intake/research-os-k12-literature`, rebased onto `main` after PR #3
merged (squash `391fe1bf9`).

### Added

- `_intake/research-os-k12-literature/`: 45 canon-intake files, one per verified paper (DOI
  checked against OpenAlex, Crossref, Semantic Scholar, or DataCite), across four areas:
  educational methods (13), HCI and human-AI collaboration (12), scientific discovery and
  metascience (11), AI and researchers (9). Each carries frontmatter (title, authors, year,
  venue, doi, url, openalex_id, branch, tier) plus why_it_matters, key_claims,
  research_questions_it_leaves_open, and how_it_bears_on_research_os.
- `_intake/research-os-k12-literature/README.md`: the intake index and a note on this corpus's
  relationship to the existing `_intake/research-os-k12/raw/lit-*.md` passes.
- `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`: a file-path-level map of
  where Research OS for K-12 and the hypothesis engine share substrate (graph schema, production
  envelope, citation and payment rail, the constrained tool surface versus the generation loop),
  closing with twelve open questions extending `RESEARCH-QUESTIONS.md`'s own 49.

### Edited

- A paper whose DOI already appears in `_intake/research-os-k12/raw/lit-educational-methods.md`,
  `lit-hci-human-ai.md`, or `lit-ai-for-science.md` carries a closing line in this pass naming
  which raw file it is cross-indexed against; no line in any raw file was changed.

### Removed

None.

## Iteration 3

Date 2026-09-10. Post-merge review-followup pass on PR #5 (`intake/research-os-k12-literature`,
merged as `397066318` before this review completed; the fixes below land as a separate commit
against `main` since the PR's head branch was already deleted).

### Edited

- `_intake/research-os-k12-literature/ai-and-researchers/auchincloss-et-al-2014-cure-assessment.md`:
  appended a `# voice-ignore-line` comment to the `venue:` frontmatter line. Old line:
  `venue: "CBE—Life Sciences Education"`. The em dash is part of the journal's own name, not
  authored prose, and rewriting it would misstate the title.
- `_intake/research-os-k12/CHANGELOG.md`: fixed the `## 2026-09-10 (literature corpus and overlap
  map)` heading to `## 2026-09-10: literature corpus and overlap map` (a parenthetical heading
  clause is a voice-rule violation).
- `learning/research-os/CHANGE-LEDGER.md` (this file, Iteration 2 entry): corrected the per-area
  breakdown from `educational methods (12), HCI and human-AI collaboration (12), scientific
  discovery and metascience (9), AI and researchers (13)` (summing to 46) to `educational methods
  (13), HCI and human-AI collaboration (12), scientific discovery and metascience (11), AI and
  researchers (9)` (summing to 45), matching the corpus README's index and the actual file count
  per directory.

### Verified Clean

- Leak scan across the full PR #5 diff: no API keys, `.env` contents, server IPs, non-public
  hostnames, personal emails other than gianyrox@gmail.com, PII, local absolute paths, or Claude
  session URLs found in any file content.
- Citation integrity: 8 of the 45 intake files sampled at random (Deci and Ryan 2000,
  Romera-Paredes and others 2024, Lu and others 2024, Kang and others 2009, Wu and others 2019,
  Swanson 1986, Jumper and others 2021, Wang and others 2023) checked against Crossref (7) and
  DataCite (1, the arXiv-DOI record for Lu and others 2024, which Crossref does not carry). DOI,
  title, authors, and year matched frontmatter exactly in all 8.
- Fair use: no file reproduces a blockquote or an extended verbatim passage from its source paper;
  every file's `key_claims` and body are paraphrase. No trims required, so no
  `_intake/research-os-k12-literature/DELETIONS.md` was created.
- Structure: `_intake/research-os-k12-literature/README.md`'s index table lists all 45 files.
  `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` cites `learning/research-os/RESEARCH-QUESTIONS.md`
  and eleven other repo-relative file paths; all twelve resolve on `main`, including
  `mcp-server/bucket-mcp.py:246`, which is the `TOOLS = [` line the map describes.
- Gates: `npm ci` and `npm run build` both pass on `main` plus this pass's three-file diff; no
  file under `src/` or `public/` is touched by it.

### Removed

None.

## Iteration 4

Date 2026-09-10. Branch `feat/ros-engine-bridge`, worktree
`bucket-foundation-ros-bridge`. Reviewed a WIP commit ("wip(feat/ros-engine-bridge):
partial work preserved after 429 spend-limit stop") against PR #10
(`feat/hte-k12-research-os`, merging concurrently), which lands `hte.api.hypothesize`,
`hte/serve.py`, `hte/mcp_tool.py`, the literature corpus adapter, and
`hte.corpus.production.is_research_os_record`/`normalize_research_os_record` in
`tools/hypothesis-engine`.

### Added

- `learning/research-os/ENGINE-BRIDGE.md`: data flow, tables, idempotency keys, what
  PR #10 covers versus this PR, and open stubs.
- `supabase/migrations/20260910010000_research_os_engine_bridge.sql`: a
  `graph.edges (from_id, to_id, kind)` unique index (item 1's own edge idempotency),
  and `public.research_os_productions_outbox` (item 3).
- `scripts/test-research-os-engine-bridge.ts`: unit tests for the engine node/edge
  builder (item 1) and the production outbox row builder (item 3), against fixtures.
- `scripts/test-research-os-engine-frontier.ts`: unit tests for `findFrontierEngineTargets`
  (item 2), against the sky-blue seed plus a synthetic engine fixture node.

### Edited

- `src/lib/research-os/engine-bridge.ts`: item 1's section (`buildEngineNode`,
  `buildEngineEdges`, `engineNodeSlug`, `engineTierToGraphTier`) kept as the WIP wrote
  it. Item 3's section rebuilt: dropped the hand-built `PRODUCTION-SCHEMA.md` envelope
  conversion (`buildProductionEnvelope` and its supporting types), superseded by PR
  #10's own server-side normalizer; added `buildProductionOutboxRow`, which writes the
  raw `graph.productions` row (plus an optional `_target_node` join) that normalizer
  already reads directly. Full reasoning and the dropped code, verbatim:
  `_intake/research-os-k12/DELETIONS.md`.
- `src/lib/research-os/db.ts`: `writeProductionOutbox`'s signature simplified to match
  the raw-row outbox contract (one argument, no separate `graphProductionId`, since the
  outbox row's own `id` now is the production's real id).
- `src/app/api/research-os/production/route.ts`: updated to call
  `buildProductionOutboxRow`/the new `writeProductionOutbox` signature; the emit now
  runs even when the target node join fails to resolve (the engine's own normalizer
  already tolerates a missing `_target_node`, per its own docstring); the header
  comment's reference to a `scripts/sync-productions-outbox.mjs` file that was never
  built was removed.
- `src/app/research-os/workspace/page.tsx`: added the "from the engine" panel that
  renders `route.engineFrontier` (item 2's data was already plumbed by the WIP; this
  iteration adds the render, the WIP's own +10 lines were the type definitions only).
- `package.json`: `test:research-os` now runs all three research-os test files in
  sequence (`test-research-os-routing.ts`, `test-research-os-engine-bridge.ts`,
  `test-research-os-engine-frontier.ts`).
- `_intake/research-os-k12/DELETIONS.md`, `_intake/research-os-k12/CHANGELOG.md`: this
  iteration's own entries.

### Removed

None (the superseded envelope-conversion code is preserved verbatim in
`_intake/research-os-k12/DELETIONS.md`, per this repo's own no-deletions policy).

## Iteration 5

Date 2026-09-10. Branch `feat/hte-k12-research-os`, PR #10 review pass.

### Edited

- `tools/hypothesis-engine/hte/api.py`: moved the `_build_response()` call inside
  `hypothesize()`'s `try`/`except` so a response-assembly bug reaches the documented
  `CampaignError` contract instead of escaping as a bare exception; widened
  `_sanitize()`'s path-redaction regex to `/srv`, `/opt`, `/root`, `/app`, `/mnt`, `/data`,
  `/etc`; added `manifest["models"]` to the response so a caller gets which model backed
  a run alongside `run_id`.
- `tools/hypothesis-engine/hte/serve.py`: unexpected-500 branch logs the exception and a
  traceback to stderr.
- `tools/hypothesis-engine/hte/mcp_tool.py`: added `models` to the `hypothesize` tool's
  `outputSchema`.
- `tools/hypothesis-engine/docs/research-os-hypothesize-route.patch`: threaded `models`
  through the not-yet-applied TS route's types and response mapping; corrected the two
  unified-diff hunk headers' line counts to match.
- `tools/hypothesis-engine/tests/test_api.py`: added
  `test_response_carries_which_model_backed_each_role_alongside_run_id`.

Full detail in `_intake/research-os-k12/CHANGELOG.md`'s "2026-09-10: PR #10 review pass"
entry, including the leak scan, the graph-table overlap verification, and a note on an
unrelated concurrent process sharing this review's worktree.

### Removed

None.

## Iteration 6

Date 2026-09-10. Branch `intake/ros-literature-2`. Literature batch two: 31 new papers plus one
already-committed paper (Bastani and colleagues 2025) folded into the index, for a corpus total
of 77.

### Added

- 31 new files under `_intake/research-os-k12-literature/`, one per paper, DOI-checked against
  OpenAlex or Crossref at intake time: 12 in `hci-human-ai-collaboration/` (6 on LLM assistance
  and learning outcomes, 6 on cognitive offloading and metacognition), 4 in `educational-methods/`
  on motivation and payment, 5 in a new `prerequisite-knowledge-graphs/` branch on automatic
  prerequisite-edge inference and learning-path routing, 7 in `scientific-discovery-metascience/`
  on AI systems that generate or evaluate research hypotheses, and 3 in `ai-and-researchers/` on
  scientific understanding as a goal distinct from predictive accuracy.
- `_intake/research-os-k12-literature/prerequisite-knowledge-graphs/`: new branch folder, five
  files (Pan and colleagues 2017, Liang and colleagues 2018, Roy and colleagues 2019, Gasparetti
  and colleagues 2017, Gligorea and colleagues 2023).

### Edited

- `_intake/research-os-k12-literature/README.md`: index table extended from 45 to 77 rows across
  five areas (the fifth, prerequisite and knowledge-graph learning, new this pass); intro
  paragraph and final per-area count line updated to match.
- `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`: each of the twelve open
  questions gained an "Evidence added in batch two" paragraph naming the new papers relevant to
  it and whether they support, complicate, or partially contradict the design bet the question
  poses. No existing sentence in the twelve-question list was removed or reworded.
- `_intake/research-os-k12/CHANGELOG.md`: dated entry for this pass appended, logged below in
  this same iteration for cross-reference.

### Verified Clean

- Every new paper's DOI and OpenAlex work id were checked live via WebFetch against
  `api.openalex.org` or `api.crossref.org` at intake time; none are placeholders.
- No file reproduces a blockquote or extended verbatim passage from its source paper; every
  file's `key_claims` and body are paraphrase, matching this corpus's existing convention.
- A paper searched for but not found with a resolvable DOI (Talukdar and Cohen 2012's Wikipedia
  prerequisite-structure paper; a distinct World Bank Nigeria follow-up beyond the de Simone 2025
  paper already in the corpus; a Si, Yang, and Hashimoto 2025 ideation-execution-gap follow-up)
  was omitted rather than included without a checkable citation.

### Removed

None.

## Iteration 8

Date 2026-09-10. Branch `docs/ros-plan-revision-1`, worktree `.wt-plan-revision-1`.
Reviewed shipped work (PRs #3, #5, #6, #7, #8, #10, #12, #14, #15) against
PLAN.md, plus PR #11 (draft, site repositioning) against the open founder
decisions this iteration names. PR #15 (literature batch two, Iteration 6
above) merged to main partway through this review; this entry cites it as
shipped rather than open. PR #9 (canon promotion, Iteration 7 below) was
still open when this iteration was drafted.

### Added

- `learning/research-os/PLAN-REVISION-1.md`: PR-by-PR account of what shipped;
  four evidence-driven design revisions (payout, frontier routing, the
  three-arm testbed's diversity outcome, Check-tool phrasing robustness),
  each citing its paper file in `_intake/research-os-k12-literature/` and
  labeled STABLE, STRONG LEAN, or OPEN; a dependency-ordered Phase 1 scope
  naming five blocking founder decisions with their exact questions; a table
  mapping the overlap map's twelve open questions onto Phase 1 pilot versus
  Phase 2 district-scale answerability; and a one-page ETH AI Center
  fellowship fit (research-question paragraph, two-PI pairing rationale).

### Edited

- `learning/research-os/PLAN.md`: appended a "Revision 1" section pointing to
  `PLAN-REVISION-1.md`. No existing section was rewritten, reordered, or
  removed.
- `_intake/research-os-k12/CHANGELOG.md`: this iteration's own entry.
- `tools/hypothesis-engine/tests/swarm-20260910/test_runner_props.py`,
  `tools/hypothesis-engine/docs/LOOP-LOG.md`: rewrote one antithesis
  construction in each, voice-lint fixes only, no logic changed.

### Removed

None.

## Iteration 7

Date 2026-09-10. Branch `intake/ros-canon-promotion` (PR #9). Promotes six
records from `_intake/research-os-k12-literature/` into `bucket-canon/`,
opens two taxonomy questions without resolving them, and closes the
site-registry-registration question `README.md` had left open. Full detail
in `_intake/research-os-k12/CHANGELOG.md`'s matching entry; this ledger
carries the summary.

### Added

- Two canon-tier records in `bucket-canon/07-mind/memory-systems/`
  (Roediger and Karpicke 2006; Sparrow, Liu, and Wegner 2011).
- `bucket-canon/07-mind/sub-outcomes/education/`, a new outcome-tier
  dossier: four records (Bloom 1984; Kulik, Kulik, and Bangert-Drowns
  1990; VanLehn 2011; Kulik and Fletcher 2016), each naming its
  `07-mind/memory-systems/` foundation.
- `bucket-canon/TAXONOMY_NOTES.md`, opening two branch-placement questions
  (metascience/sociology-of-science home; AlphaFold method-card-versus-
  landscape) and carrying forward the pre-existing psychodynamic-theory
  question.

### Edited

- Six intake cards marked `status: promoted` with pointers; two marked
  `status: open-question` with a `TAXONOMY_NOTES.md` pointer; claim text
  unchanged in all eight.
- `bucket-canon/05-biophysics/README.md`, `bucket-canon/07-mind/README.md`:
  short pointer additions/fixes, no scope-note text removed.
- `_intake/research-os-k12/README.md`: "Site registry registration"
  section updated from "not yet done" to done, since `feat(site): align
  public site with Research OS for K-12 (#12)` (merged into this branch
  2026-09-10) added the `NAV` entry the section had scoped and documented.
- `_intake/research-os-k12-literature/README.md`: merged against
  `intake/ros-literature-2`'s concurrent batch-two expansion (45 to 77
  rows); this pass's tier/status changes carried onto the six affected
  rows in the merged 77-row table, the "other files unchanged" count
  updated from 39 to 68 to account for batch two's 32 additions.

### Removed

None.

## Iteration 9

Date 2026-09-10. PR #19 review pass, worktree `.ros-worktrees/r19`. Full account in
`_intake/research-os-k12/CHANGELOG.md`, "2026-09-10: PR #19 review pass".

### Edited

- `learning/research-os/PLAN-REVISION-1.md`: PR #15 and PR #9 status corrected from open to
  merged in section 1's table, and the batch-two references in sections 4 and 5 updated to match
  PR #15's landing; two antithesis constructions rewritten.
- `learning/research-os/PLAN.md`: Revision 1 pointer paragraph's PR #15 status corrected.
- `_intake/research-os-k12/CHANGELOG.md`: same PR #15 and PR #9 status fixes in the
  plan-revision-1 entry.
- `learning/research-os/CHANGE-LEDGER.md` (this file): resolved two merge conflicts against
  `origin/main` as it advanced during review, first PR #15 (kept as Iteration 6), then PR #9
  (kept as Iteration 7); this PR's own entry landed as Iteration 8.

### Removed

None.

## Iteration 13, ros-03 routing

Date 2026-09-10. Branch `feat/ros-03-confidence-routing`, worktree `ros03`.
Confidence-weighted routing, edge flags, and offline edge inference, PLAN-
REVISION-1.md section 2b ("Frontier routing under Gasparetti 2017") and
section 3 items 2 and 3. Numbered past the file's existing Iteration 12
(the highest number already in this file) rather than reusing 11, which
`docs/ros-09-funding-wave-1` and a bare `## Iteration 11` heading both
already claim.

### Added

- `supabase/migrations/20260910030000_research_os_edge_confidence.sql`: `confidence`
  (real, default 1.0) and `confidence_source` (text, checked against `seed`,
  `academy_requires`, `canon_map`, `inferred`, `teacher`) on `graph.edges`;
  `min_confidence` (real, default 1.0) on `graph.prereq_ancestor`.
- `supabase/migrations/20260910030100_research_os_edge_flags.sql`: `graph.edge_flags`
  (`edge_id`, `learner_id`, `target_node_id`, `created_at`), unique on
  `(edge_id, learner_id)` so a repeat route call never grows a duplicate row. No
  `resolved` column; a teacher resolves a flag by editing the edge's own confidence
  (`learning/research-os/ROUTING.md`).
- `src/lib/research-os/ingest/infer.ts`: `tokenize`, `jaccardOverlap`,
  `inferredConfidence`, `inferEdges` (item 4). Pure, no filesystem access, no model
  call.
- `scripts/research-os/ingest/infer-edges.ts`: the CLI wrapper. Rebuilds the Academy,
  canon, and seed node populations in memory and proposes `prerequisite` edges from
  lexical overlap and tier ordering. No `--apply` mode, every proposal lands on the
  review list.
- `scripts/research-os/ingest/test-ingest-infer.ts`, `scripts/test-research-os-
  confidence.ts`: 15 and 8 `node:test` cases.
- `scripts/research-os/ingest/out/sample-infer-preview.json`: a committed sample of
  the real 36-proposal output (`.gitignore` gains a matching exception).
- `learning/research-os/ROUTING.md`: the routing rule, the confidence-source table,
  the threshold, the teacher-flag path, and the offline inference contract.

### Edited

- `src/lib/research-os/types.ts`: `GraphEdge` gained `id`, `confidence`,
  `confidenceSource`; new `DEFAULT_EDGE_CONFIDENCE`, `LOW_CONFIDENCE_THRESHOLD`,
  `edgeConfidence()`.
- `src/lib/research-os/closure.ts`: `ancestorsOf` now returns `Map<string,
  AncestorInfo>` (`hops` plus `minConfidence`) instead of `Map<string, number>`;
  `PrereqAncestorRow` gained `minConfidence`. Every caller (`computeAncestorClosure`,
  `scripts/rebuild-prereq-ancestor.ts`, `scripts/test-research-os-closure.ts`)
  updated; `probe.ts` and its route/test only ever read `.keys()`, unaffected.
- `src/lib/research-os/frontier.ts`: `computeFrontier`'s backward walk is now a
  Dijkstra variant over edge cost `-log(confidence)` instead of a plain BFS, ties
  broken by fewer hops (item 2); reduces to the exact prior shortest-hop result when
  every edge defaults to full confidence, so every routing test that predates
  confidence keeps passing unchanged. `FrontierStep` gained `edgeConfidence` and
  `pathConfidence`; `FrontierResult` gained `lowConfidenceFlags`.
- `src/lib/research-os/db.ts`: `loadSubgraph` and `loadAncestorRows` read the new
  columns; new `writeEdgeFlags` (item 3).
- `src/app/api/research-os/route/route.ts`: returns `lowConfidenceFlags`; writes them
  to `graph.edge_flags` for a signed-in learner, best-effort, never failing the route
  response on a write error.
- `scripts/rebuild-prereq-ancestor.ts`: reads edge confidence, writes
  `min_confidence`.
- `scripts/seed-research-os.mjs`: every seed edge defaults to `confidence: 1.0,
  confidence_source: "seed"`.
- `src/lib/research-os/ingest/types.ts`: `IngestEdgeDraft` gained `confidence` /
  `confidenceSource`; `ReviewItemKind` gained `inferred_prerequisite_proposal`; new
  `CONFIDENCE_DEFAULTS`.
- `src/lib/research-os/ingest/academy.ts`: every `requires` edge writes `confidence:
  1.0, confidenceSource: "academy_requires"`.
- `src/lib/research-os/ingest/canon.ts`: every `cites` / `derives_from` edge writes
  `confidence: 0.9, confidenceSource: "canon_map"`.
- `scripts/research-os/ingest/academy-import.ts`, `.../canon-import.ts`: the
  Supabase upsert now carries `confidence` / `confidence_source`.
- `scripts/research-os/ingest/canon-atom-map.json` (item 4): three of the four
  `unmatched_derives_from` review items resolved by hand, `bell-theorem` ->
  `quantum-entanglement`, `quantum-field-theory` -> `qft-idea`, `quantum-mechanics` ->
  `wavefunction`. `gauge-principle` stays on the review list; no Academy atom covers
  gauge invariance or Yang-Mills theory.
- `scripts/research-os/ingest/test-ingest-canon.ts`: the real-dossier assertion
  updated from 4-unmatched to the new 5-matched/1-unmatched split.
- `scripts/research-os/ingest/out/sample-canon-preview.json`,
  `sample-review-list.json`, `sample-academy-preview.json`: regenerated against the
  new real output (7 canon edges, 1 review item, confidence fields on every edge).
- `package.json`: `test:research-os` runs the two new test files; new
  `ingest:research-os:infer` script.
- `.gitignore`, `learning/research-os/INGESTION.md`: the new sample file and the new
  dry-run numbers.

### Removed

None.

### Verified

`npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run test:research-os` (117/117
pass, 8 new confidence-routing tests plus 15 new inference tests, every pre-existing
research-os test file green with no assertion loosened beyond the two the real-dossier
count required), `next lint` on every touched file, `agf-lint-voice-src check` /
`agf-lint-voice check` on every touched file/doc: all clean. Dry run: Academy importer
unchanged (487 nodes, 820 edges, 0 review items); canon importer now 7 edges (2 cites,
5 derives_from) and 1 review item (was 4 edges, 4 review items); offline inference
scans 517 nodes across 8 branches and proposes 36 edges, confidence 0.3-0.65, none
applied.

## Iteration 14: PR #27 review pass

Date 2026-09-10. Review pass on PR #27 (`feat/ros-03-confidence-routing`), worktree
`.ros-worktrees/r27`. Numbered past Iteration 13, the highest number already in this
file.

### Edited

- `_intake/research-os-k12/CHANGELOG.md`: this pass's own entry added; a stale
  cross-reference in the ros-03 entry ("Iteration 11") corrected to "Iteration 13,
  ros-03 routing", the number that entry landed as.
- `learning/research-os/CHANGE-LEDGER.md`, this file: this pass's own entry.

### Removed

None.

### Verified

Leak scan on the full diff's added lines (2096 lines): no keys, `.env` contents, IPs,
non-public hostnames, personal emails other than `gianyrox@gmail.com`, PII,
`/home/gian` paths, or Claude session URLs. `computeFrontier`'s Dijkstra variant
checked against `scripts/test-research-os-routing.ts`, an unmodified file with
hardcoded seed-graph assertions predating confidence, green against the new
implementation: a real old-output equivalence check. Cost function
`-log(confidence)` confirmed monotone and non-negative via `edgeConfidence()`'s
`(0, 1]` clamp; a synthetic cycle (`a -> b -> c -> a`, `c -> target`) and a
zero-indegree target both confirmed to terminate by direct execution, settling
every node exactly once.
`writeEdgeFlags` confirmed scoped to the token-verified `learnerId` only, no
client-supplied learner id path; a write failure caught and logged, never surfacing
to the route response. `infer-edges.ts` has no `--apply` mode; its output (both
`infer-preview.json` and `review-list.json`) diffed byte-identical across two runs
(`generated_at` excluded). `canon-atom-map.json`'s three new resolutions checked
against `learning/app/corpus/02-physics.json` directly, all three atom ids exist with
matching titles. `npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run
test:research-os` (117/117), `next lint`, `agf-lint-voice check` / `agf-lint-voice-src
check` on every touched file: all clean. Not behind `origin/main`, no merge required.

## Iteration 10

Date 2026-09-10. Branch `feat/ros-canon-ingest`, worktree `wt-ingest`. Numbered
Iteration 10 rather than 5: origin/main used "Iteration 5" for a concurrent PR
#10 review pass and ran through Iteration 9 (a PR #19 review pass) by the time
this branch merged, per `git merge origin/main`'s own conflict here. A
canon-to-graph ingestion slice: two importers that grow the graph beyond the
22-node Phase 0 seed with no model in the loop, per `_intake/research-os-k12/
RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 3 and `02-architecture.md` section
10's own ingestion pipeline description.

### Added

- `src/lib/research-os/ingest/types.ts`: shared `IngestNodeDraft`,
  `IngestEdgeDraft`, `ReviewItem`, `IngestResult` types both importers use.
- `src/lib/research-os/ingest/academy.ts`: the Academy corpus importer
  (`buildAcademyImport`, `buildAcademyFileImport`, `computeRequiresDepth`,
  `academyNodeSlug`, `mapAtomKind`, `isAcademyCorpusFile`). Pure, no
  filesystem access.
- `src/lib/research-os/ingest/canon.ts`: the canon entry importer
  (`buildCanonImport`, `buildCanonEntryNode`, `buildCanonSourceNode`,
  `buildCanonCitesEdge`, `matchAcademyAtom`, `isLawFolder`,
  `canonEntrySlug`/`canonSourceSlug`). Pure, no filesystem access.
- `src/lib/research-os/ingest/validate.ts`: `checkOrphanEdges`,
  `checkTierMonotonicity`, `tierViolationsToReviewItems`, shared by both
  importers, their CLIs, and their tests.
- `src/lib/research-os/ingest/review.ts`: `mergeReviewList`, the review-list
  convergence helper both CLIs call.
- `scripts/research-os/ingest/academy-import.ts`, `.../canon-import.ts`: the
  two CLI scripts (dry-run default, `--apply` upserts through the
  graph-schema service-role client, `scripts/seed-research-os.mjs`'s own
  construction).
- `scripts/research-os/ingest/lib/load-academy-corpus.ts`: the filesystem
  loader both CLIs share, so a canon `derives_from` edge's target slug
  always agrees with the node `academy-import.ts` itself writes.
- `scripts/research-os/ingest/canon-atom-map.json`: the explicit
  canon-to-Academy-atom override file, seeded with the sky-blue seed's own
  three canon-bridge node pairs (`waves`, `em-waves`, `wave-optics`).
- `scripts/research-os/ingest/test-ingest-validate.ts`,
  `test-ingest-academy.ts`, `test-ingest-canon.ts`: 42 `node:test` cases
  total, fixture-based plus two blocks run against the real corpus and the
  real `bucket-canon/02-physics/` dossiers on disk. Wired into
  `npm run test:research-os`.
- `scripts/research-os/ingest/out/sample-academy-preview.json`,
  `sample-canon-preview.json`, `sample-review-list.json`: small committed
  samples of the gitignored dry-run output (`.gitignore` gains a
  `scripts/research-os/ingest/out/*` rule with these three exceptions).
- `learning/research-os/INGESTION.md`: the data flow, the tier and kind
  heuristics, the canon-to-Academy matching order, and the review-list
  contract.
- `package.json`: two convenience scripts, `ingest:research-os:academy`,
  `ingest:research-os:canon`; `test:research-os` now also runs the three new
  test files.

### Edited

- `.gitignore`: added the `scripts/research-os/ingest/out/` ignore block.
- `_intake/research-os-k12/CHANGELOG.md`, this file: this iteration's own
  entries.

### Removed

None.

### Verified

`npm ci`, `npx tsc --noEmit`, `npm run build`, `npm run test:research-os`
(42/42 pass, this slice's three new files plus the three pre-existing
research-os test files), `next lint` on every touched file, and
`agf-lint-voice-src check` / `agf-lint-voice check` on every touched
file/doc: all clean. Dry run against the current repo: Academy importer, 487
nodes, 820 `prerequisite` edges, 0 tier violations, 0 review items; canon
importer, 8 nodes, 4 edges, 4 `unmatched_derives_from` review items (of the
six `bucket-canon/02-physics/` dossiers, `special-relativity` and
`standard-model` match an Academy atom id exactly, `bell-theorem`,
`gauge-principle`, `quantum-field-theory`, and `quantum-mechanics` do not).
Zero orphan edges in either run.

## Iteration 11

Date 2026-09-10. Branch `docs/ros-02-learner-state-model`, worktree `ros02`. Bead `ros-02`,
the learner-state mapping paper every later Research OS outcome claim depends on. Docs only,
no code, no migration, no schema change.

### Added

- `learning/research-os/LEARNER-STATE-MODEL.md`: the five states defined operationally
  against `src/lib/research-os/stages.ts`, `probe.ts`, and the two Phase 0 migrations (entry
  condition, evidence, judge, decay rule, per state, read from the shipped code rather than
  `PLAN.md` alone);
  mapping tables against ICAP, SOLO, Bloom revised, Perkins's understanding performances, and
  the founder's three-level model; a mapping to the shipped Academy Recall, Apply, Derive,
  Teach ladder and to FSRS and IRT signals, finding no code path connects Research OS state
  transitions to Academy's `M = P^alpha * R^beta` fusion today; the three-arm pilot's
  measurement plan (outcome variable per state, the Internalization transfer-task
  construction rule, an inter-rater procedure for teacher judgments, the minimal logging
  schema); and seven questions marked OPEN, each tied to the paper that poses it.
- `src/lib/research-os/EVIDENCE-SCHEMA.md`: the evidence jsonb contract `ros-04` and `ros-06`
  implement against. Docs only; no `EvidenceEvent` field, no migration column, added in this
  pass.
- `_intake/research-os-k12-literature/educational-methods/chi-wylie-2014-icap-framework.md`,
  `biggs-collis-1982-solo-taxonomy.md`, `anderson-krathwohl-2001-taxonomy-revision.md`,
  `perkins-1993-teaching-for-understanding.md`, `wiske-1998-teaching-for-understanding.md`:
  five intake cards for the framework citations `PLAN.md` section 2 already cited by DOI but
  that had no corpus card. Every citation DOI- or ISBN-verified before writing the card; the
  three with no Crossref DOI (Anderson and Krathwohl 2001, Perkins 1993, Wiske 1998) carry an
  ISBN or an ERIC id and ISSN instead, each file's own "Verification note" naming the exact
  records checked.

### Edited

- `_intake/research-os-k12-literature/README.md`: five new index rows, paper count 77 to 82,
  educational-methods count 17 to 22, a new note on which records lack a Crossref DOI and why.
- `BEADS-PENDING.jsonl`: one status line appended for `ros-02`; the original line unedited.
- `_intake/research-os-k12/CHANGELOG.md`, this file: this iteration's own entries.

### Removed

None.

### Verified

Read in full before writing: `learning/research-os/PLAN.md`, `PLAN-REVISION-1.md`,
`RESEARCH-QUESTIONS.md`, `_intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md` section
3, `src/lib/research-os/stages.ts`, `types.ts`, `probe.ts`, `grounding.ts`, `frontier.ts`,
`reviewer.ts`, `db.ts`'s `recordEvidence`, `src/app/api/research-os/review/route.ts`,
`supabase/migrations/20260910000000_research_os_graph.sql`,
`supabase/migrations/20260910020000_research_os_teacher_reviews.sql`,
`supabase/migrations/20260612000000_academy_progress.sql`, `src/lib/academy/mastery.ts`,
`learning/EPIC.md`, `src/lib/depth-ladder.ts`, and `src/lib/research-os/ingest/academy.ts`.
Every framework citation (ICAP, SOLO, Bloom revised, Anderson and Krathwohl 2001, Perkins
1993, Wiske 1998) resolved by DOI, ISBN, or ERIC id via WebFetch against `doi.org`,
`api.openalex.org`, `openlibrary.org`, and `api.ies.ed.gov` before this paper cited it. A
full-text search of `src/lib/research-os/` and `src/app/api/research-os/` for `retrievability`,
`stability`, `fsrs`, `theta`, and `proficiency` returned zero matches, the evidence for
section 3's central finding that no code path joins Research OS state transitions to
Academy's FSRS/IRT signals today. No file under `src/` outside the two new docs files is
touched by this pass, so no `npm run build` gate applies to it; `agf-lint-voice check` run
against every file this pass authored.

## Iteration 12

Date 2026-09-10. Review pass on PR #25 (`docs/ros-02-learner-state-model`), worktree
`review/pr25`. Docs only.

### Edited

- `anderson-krathwohl-2001-taxonomy-revision.md`, `wiske-1998-teaching-for-understanding.md`:
  fixed a wrong Open Library `url` shared by both cards (`OL3906603W`, "Russia's Road to
  Democracy," unrelated to either book), replaced with the verified work ids `OL16641840W`
  and `OL16467129W`; each confirmed against Open Library's own work record before writing.
- `perkins-1993-teaching-for-understanding.md`, this file: removed two banned filler-word
  instances flagged by voice review.

### Verified

Leak scan on the full diff's added lines: no keys, `.env` contents, IPs, non-public
hostnames, personal emails other than `gianyrox@gmail.com`, PII, `/home/gian` paths, or
Claude session URLs. Six code claims spot-checked against `origin/main`: `stages.ts`'s five
transition functions, `probe.ts`'s cold-start-only firing, the review route's production
branch never calling `recordEvidence` (confirmed, the named bug is real), the
`learner_node_state`/`teacher_reviews` schema shape (single `confidence` column with no
writer, single `reviewer_id` with no second-rater columns), `academyNodeSlug`'s slug format,
and `mastery.ts`'s `inferDepth` thresholds plus `fuseMastery` formula. All matched. README
index row count (82) matched the corpus file count (82) exactly, `find` counted per branch:
22 educational methods, 25 HCI, 18 scientific discovery, 12 AI and researchers, 5
prerequisite graphs. Every framework mapping table states "No counterpart" with a reason
where one applies. `agf-lint-voice check` clean on every file it scanned.

## Iteration 15: ros-07 minors compliance pack part A

Date 2026-09-10. Bead `ros-07`, branch `feat/ros-07-compliance-part-a`, worktree
`.ros-worktrees/ros07`. `PLAN-REVISION-1.md` section 3 item 8 scopes this bead to the
decision-independent slice only (the front-door decision between the sky-blue and
quantum-history pilot paths stays open); everything below holds regardless of which path
gets picked.

### Added

- `learning/research-os/compliance/DATA-INVENTORY.md`: every table and jsonb field across
  the `graph` and `bucket` schemas that can hold a learner's data, its legal basis, its
  retention rule, and a data-minimization audit, including the three free-text fields a
  child may have written (`learner_node_state.evidence[].learnerText`/`.note`,
  `productions.claim`/`.evidence`/`.transfer_proof`) and their deletion rule.
- `supabase/migrations/20260910040000_research_os_privacy_consent.sql`: `graph.
  learner_profiles` (role, coarse birth-year bucket, consent status and source), `graph.
  privacy_events` (a hashed-learner-id audit log), and `graph.privacy_delete_learner`, a
  plpgsql function that hard-deletes a learner's rows across every table in the inventory
  and writes one audit row, in one Postgres transaction.
- `src/app/api/research-os/privacy/route.ts` + `src/lib/research-os/privacy.ts`: `POST
  /api/research-os/privacy` with `export` and `delete` actions, self- or reviewer-gated
  (`resolvePrivacyActor`). `PRIVACY_TABLES` is the single table-list source both the export
  read path and the delete RPC call are checked against; `buildExportEnvelope` re-scopes
  every row to the requesting learner as a second, pure enforcement layer on top of the
  database query's own filter; `simulateLearnerDelete` is a pure, offline-testable mirror of
  the SQL function's table list and semantics.
- `src/lib/research-os/consent.ts`: the age-and-consent gate's decision rule, `decideConsent`
  (pure) and `requireConsent` (the thin DB-reading wrapper). Rule: no profile row, or an
  under-13/13-to-17 bucket with `consent_status` `'none'`, blocks a workspace tool call or
  Production submission; every other case is allowed.
- `learning/research-os/compliance/PRIVACY-POLICY-DRAFT.md`,
  `STUDENT-DATA-PRIVACY-ADDENDUM-DRAFT.md`, `AI-DISCLOSURE-DRAFT.md`: three policy drafts,
  each marked draft and requiring counsel review. The addendum's NDPA version note was
  verified live by direct `WebFetch` against `privacy.a4l.org/national-dpa/` on 2026-09-10:
  current version 2.2, published November 19, 2025, superseding the compliance research's
  earlier "130,000+ signed agreements" figure (now over 222,000, per the same page).
- `learning/research-os/compliance/README.md`: what part A covers, what part B still needs
  (the front-door decision, a VPC vendor, age assurance, district DPA signatures,
  time-based retention, self-service UI, counsel review), and the two open founder decisions
  restated.
- `scripts/test-research-os-consent.ts` (7 tests), `scripts/test-research-os-privacy.ts` (13
  tests, including a drift check that reads the migration file's own text and asserts every
  `PRIVACY_TABLES` entry has a matching `delete from` statement in it), both wired into
  `package.json`'s `test:research-os` chain.

### Edited

- `package.json`: appended the two new test scripts to `test:research-os`.
- `_intake/research-os-k12/CHANGELOG.md`, `learning/research-os/CHANGE-LEDGER.md` (this
  file): this iteration's own entry.
- `BEADS-PENDING.jsonl`: appended a `ros-07` status line.

### Skipped, and why

`requireConsent` is not wired into `src/app/api/research-os/workspace/route.ts` or
`.../production/route.ts`: `git log -3 --since='3 hours ago' -- src/app/api/research-os/`
showed two commits, the most recent 2 minutes old at the time this bead started, matching
this bead's own instruction to leave concurrently-edited tool handlers and routes alone.
The helper is exported complete and tested; wiring it in is a two-line addition documented
as a TODO at the bottom of `consent.ts`'s own file header.

### Verified

`npm ci`, `npx tsc --noEmit`, `npm run build` (the new `/api/research-os/privacy` route
appears in the build's own route manifest), and `npm run test:research-os` (137 tests, 0
failures) all green. `next lint` on every touched TypeScript file: no warnings or errors.
`agf-lint-voice check` on all five new files under `learning/research-os/compliance/`, and
`agf-lint-voice-src check` on `consent.ts`, `privacy.ts`, the new route, both new test
scripts, and the new migration: 0 violations after one auto-fix pass plus a manual rewrite
pass on every antithesis-pattern and appended-clause-heading flag (neither is auto-fixed).
No secrets, absolute local paths, or PII in any new file; the SDPC NDPA version claim is
the only external fact in this pass, sourced to a direct fetch rather than carried forward
from the source compliance document unchecked.

### Iteration 15 addendum: merge against origin/main

`origin/main` had moved during this bead's work: PR #28 (`ros-06`, teacher class view and
accept path) and PR #30 (`ros-12`/`ros-13`, engine bridge wiring) both landed. Two real
conflicts (`package.json`, `_intake/research-os-k12/CHANGELOG.md`), both a "both sides added
something at the same place" case resolved by keeping both additions, matching the pattern
the PR #30 review pass entry above documents for the same two files. `ros-06` added
`graph.classes` and `graph.class_members` (roster tables) and a `notes` jsonb column on
`graph.productions` (teacher decisions, written on both approve and return); `DATA-
INVENTORY.md` gained a `graph.class_members` row (learner-keyed, in scope) and a
`graph.classes` row under "Not learner data" (reviewer-owned, out of this bead's learner-
scoped rights), and `graph.privacy_delete_learner` gained a `delete from graph.class_members`
statement, keeping `PRIVACY_TABLES` and the migration's own table list in sync (verified
by the drift-check test, which reads the migration file's own text). Gates rerun clean
post-merge: `npx tsc --noEmit`, `npm run build` (`/api/research-os/class` and `/api/research-
os/privacy` both present in the route manifest), `npm run test:research-os` (171 tests, 0
failures, `class_members` fixture rows added to the privacy test's own store), `next lint`
on every touched file. `agf-lint-voice check`/`agf-lint-voice-src check` clean after one more
manual antithesis rewrite pass on the updated inventory rows and migration comments.
