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
