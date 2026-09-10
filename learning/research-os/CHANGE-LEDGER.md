# Research OS for K-12: Change Ledger

Every file this work adds, edits, or would remove is listed here with the reason, so nothing is lost. Policy: no deletions; when text is replaced, the old text is recorded below before the change lands.

## Iteration 6, Phase 1 stub closures: closure table, diagnostic probe, real quotes, review hold

Date 2026-09-10. Branch `feat/ros-phase0-stubs`, closing four of the Phase 0 PR's (#6)
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
