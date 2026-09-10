# Changelog: _intake/research-os-k12/

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
