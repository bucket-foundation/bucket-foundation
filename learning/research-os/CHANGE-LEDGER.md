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

## Iteration 2

Date 2026-09-10. Branch `intake/research-os-k12-literature`, rebased onto `main` after PR #3
merged (squash `391fe1bf9`).

### Added

- `_intake/research-os-k12-literature/`: 46 canon-intake files, one per verified paper (DOI
  checked against OpenAlex, Crossref, Semantic Scholar, or DataCite), across four areas:
  educational methods (12), HCI and human-AI collaboration (12), scientific discovery and
  metascience (9), AI and researchers (13). Each carries frontmatter (title, authors, year,
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
