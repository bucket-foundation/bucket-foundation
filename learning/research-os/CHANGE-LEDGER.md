# Research OS for K-12: Change Ledger

Every file this work adds, edits, or would remove is listed here with the reason, so nothing is lost. Policy: no deletions; when text is replaced, the old text is recorded below before the change lands.

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

Date 2026-09-10. Branch `docs/ros-plan-revision-1`, worktree `.wt-plan-revision-1`.
Reviewed shipped work (PRs #3, #5, #6, #7, #8, #10, #12, #14) and two open PRs
(#9, canon promotion; #15, `intake/ros-literature-2-batch2`, literature batch
two) against PLAN.md, plus PR #11 (draft, site repositioning) against the
open founder decisions this iteration names.

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

### Removed

None.
