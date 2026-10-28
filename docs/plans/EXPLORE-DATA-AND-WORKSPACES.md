# Explore Data Modes and Research OS Workspaces

Bead: bkt-khfw. Plan only. Status as of dev at 943c06692, 2026-10-22.

## Founder Ideas Still Open

Grouped by the surface they land on. Bead ids are the open `source-founder` beads.

| Idea | Beads | Lands on |
|------|-------|----------|
| One stage: canon search is the one tool, `/explore` redirects to it | bkt-0sj7, .39 | Explore |
| One record model: every item as angle, radius and time | bkt-0sj7.25 | Explore, row sets |
| Forms morph in place, camera persists, full-bleed layout | bkt-0sj7.26, .28 | Explore |
| Circle graph for every observation, minted cards, slice scroll | bkt-0sj7.36, .37, .38 | Explore |
| Mappers and forms for every mode, links resolver, URL state | bkt-0sj7.30, .32, .33 | Explore |
| One rendering module: disc, slice, star graph, polygon | bkt-5f2h | Explore, Workspaces |
| Frontier thesis: fill the circle, measure the multiplier | bkt-yeav | Explore coverage |
| No JSON in the default experience | bkt-398t | Workspaces |
| Desktop parity for every web function | bkt-6wjd, .25, .26, .27 | Workspaces |
| Learner data given back to the learner | bkt-98gt5 and children | Workspaces |
| Agent panel in desktop and TUI | bkt-fy3i6 | Workspaces |
| One funnel from home to Research OS | bkt-n7f9 | Web Research OS |
| Workspaces are tabs, one per data type | bkt-khfw notes | Workspaces |
| Decks are not items in the index | bkt-khfw.8 | Workspaces |

Unbuilt ideas in `learning/`: the corpus tables `claims`, `mechanisms`, `methods`, `definitions` and `works` (1,088 rows) have no renderer anywhere; `learning/corpus/market/` is prose with no row set; `learning/corpus/progressions/completeness/` and `COVERAGE.md` hold coverage numbers that only reach Explore through `coverage-by-country`.

## What Dev Has

Desktop, `packages/bkt-ui`:

- Explore V2 with 12 mode ids in `router.ts`: globe, helix, dna, atom, particle, molecule, reaction, protein, graph, timeline, earth, map. Route `#/explore/<data>/<mode>/<row:set:id>`.
- Row sets built by `packages/bkt/src/pack/row-sets/` under the contract in `contract.ts` and the licence registry in `licences.ts`:

| Row set | Modes |
|---------|-------|
| mathematics-chain | graph |
| major-to-career | graph |
| occupations-time | map, timeline |
| technology-waves | timeline |
| coverage-by-country | earth, map |
| education-by-country | earth, map |

- Workspaces in `views/Workspace.tsx`, eight types in `WORKSPACE_TYPES`: tables, figures, papers, records, graphs, people, decks, maps. Each keeps its own tab list under `bucket.workspace.<type>.tabs`. Graphs and maps open row sets and carry marked rows to Explore. The alignment review opens as a records tab.

Web, `src/app`:

- `/explore` runs the older client in `src/lib/explore/` with its own modes and `canon.space.json`. It reads no row set.
- `/research-os/workspace` is one page for the learner's target, notes and evidence. It has no tabs and no data types.

The gap: the desktop has the data contract and the workspaces; the web has neither, and three data families have no row set.

## How The Ideas Connect

One spine carries all of them: **a row set is the unit of data, a mode is a view of a row set, a workspace is where a person works on one kind of row set.**

- bkt-0sj7.25 (one record model) is the row set contract plus angle, radius and time fields. It sits under every Explore idea, so it goes first.
- bkt-5f2h (one rendering module) is the shared renderer both Explore and the graphs and maps workspaces call. Explore modes and workspace previews must draw from the same module or they drift.
- bkt-yeav (frontier thesis) is a coverage row set drawn as the circle graph (bkt-0sj7.36). Coverage numbers already exist in `progressions/completeness`.
- bkt-398t (no JSON) and bkt-6wjd (parity) are acceptance rules on every workspace: each tab opens with its data in plain words, and each desktop workspace has a web route.
- bkt-98gt5 (learner data) is a workspace type whose rows come from the learner's own database and never enter the public pack. bkt-98gt5.9 (privacy guardrails) gates it.
- bkt-n7f9 (one funnel) ends at the web workspace tabs.

## Part One: Explore Renders The Data

### Row Sets To Add

| Row set | Source | Modes | Licence note |
|---------|--------|-------|--------------|
| corpus-claims | `learning/corpus/claims.jsonl`, joined to `works.jsonl` | graph, timeline | per-work licence; snippet and link only |
| corpus-mechanisms | `mechanisms.jsonl`, `methods.jsonl` | graph | same |
| progressions | `learning/corpus/progressions/completeness/frame.jsonl` | graph, timeline, helix | per-standard licences already in the registry |
| coverage-frontier | `learning/corpus/progressions/completeness/validation.json`, `COVERAGE.md` | graph with the circle layout, earth | derived counts |
| market | new `learning/corpus/market/rows.jsonl` extracted from the three market docs | graph, timeline | each row needs a source address |
| technology-links | existing technology lags, kept to rows with a source address | graph, timeline | bkt-khfw.7 rule holds |

Occupations and technologies already have row sets; they gain the angle, radius and time fields only.

### Contract Change

Add three optional fields to a row in `contract.ts`: `angle` (category bucket, 0 to 1), `radius` (depth or level, 0 to 1), `year`, already a row column. Bump `ROW_SET_PACK_SCHEMA` from `bucket.explore-rows-pack/1` to `/2`. The reader in `index.ts` already returns null on a schema mismatch, so an old desktop build shows no row sets until it updates; the pack test asserts the new value and one fixture at the old value reads as null. A mode reads only these plus `group` and `links`. Each row set declares a mapper that fills them; bkt-0sj7.30 is that mapper set. Rule 5 moves from iso2 to iso3 to match `world-indicators.json`, the country list `src/data/world-indicators-scoring.json` ranks, closing the open note on A4. The public pack build fails above its 1.25 MB budget.

### Mode Coverage

The circle layout exists: `circle-layout.ts` and `CircleGraphV2.tsx` draw it inside graph mode. No new mode id. bkt-5f2h folds that layout into the shared module. Every row set lists at least two modes so the morph in bkt-0sj7.26 has somewhere to go.

### Web

The web `/explore` loads the public pack's row sets through one adapter in `src/lib/explore/datasets.ts` and renders them with the same module as desktop. bkt-0sj7.39 then redirects `/explore` to canon search with a data picker. The older `canon.space.json` path stays as one row set named `canon`.

## Part Two: Research OS Workspaces

### Types

Keep the eight desktop types. Add four, each fed by a row set family:

| Workspace | Rows | Work done there |
|-----------|------|-----------------|
| Corpus | corpus-claims, corpus-mechanisms | read a claim with its source and open the linked atom; read-only in v1 |
| Progressions | progressions, mathematics-chain | walk a standard chain, see coverage gaps, open the deck atom |
| Coverage | coverage-frontier, coverage-by-country | see the filled circle and the open edge, pick a gap to work |
| My Data | the signed-in learner's own rows | due today, streaks, export and delete; gated by bkt-98gt5.9 |

Occupations, technologies and market open in the existing graphs and maps workspaces; they need no type of their own until a task needs one.

### Corpus Writes

Agree and dispute marks are cut from v1. They need a table, row level security and a reader decision the founder has not made. When they come back they follow the alignment review pattern from #795: decisions live in the local working copy, and only an export the reviewer runs leaves the machine.

### My Data Access

- Rows come from `bucket.academy_progress`, `bucket.academy_profiles` and the Research OS tables, all in the private `bucket` schema. The browser never queries them. A service-role route under `src/app/api/academy/` reads only rows whose owner is the session user from `@supabase/ssr`, and returns 401 with no session.
- Nothing in My Data enters a row set, the public pack or Explore. The workspace has no "Open in Explore" action.
- Export and delete reuse the existing path: the settings privacy route and `src/app/api/account/`, with the delete test that runs in the unit suite (#960). My Data links to them and adds no second delete path.
- Consent follows `20260910040000_research_os_privacy_consent.sql`. A learner who has not consented sees an empty state that says so.
- bkt-98gt5.9 holds the guardrail list. W2 starts only after the founder approves it, and its acceptance tests cover a second user's rows returning nothing and a deleted account returning 404.

### Shared Shell

Every workspace tab has the same four parts: a list of row sets of that type, a tab per open item, a preview drawn by bkt-5f2h, and an "Open in Explore" action that carries marked rows. The shell exists in `Workspace.tsx`; new types plug into `BUILT` and `WORKSPACE_TYPES`.

### Web Parity

`packages/bkt-ui` is a Vite app with a hash router and a desktop `Api` that reads the local pack. Mounting it under a Next route would bring two routers and an API the web has no server for. W1 builds native Next components instead:

W1 shipped in #963 with four tabs: Study, Figures, Maps and Datasets.

- Study is the current learner page and stays at `/research-os/workspace`, so every `?target` and `#production` link keeps working. It is the founder's ask that the web Workspace page becomes one of the tabs.
- `src/app/research-os/(app)/workspace/[type]/page.tsx` is a server component that validates `type` and lists items; `WorkspaceTabBar.tsx` in the workspace layout draws the tabs.
- The type list and tab copy live in `src/lib/research-os/workspace-tabs.ts`. `packages/ros-contract` holds API contract tests and no source, so the copy stays in web code, and `scripts/test-workspace-tabs.ts` checks the web names against the desktop `WORKSPACE_TYPES`.
- Figures, Maps and Datasets list data the web already holds: `loadFigures`, the research maps list and the research-atlas datasets. Datasets is a web-only name, kept apart from the desktop Records workspace, which holds research-output records.
- Tables, papers and graphs join when the web gains their data; row sets reach the web as the public pack JSON read by `src/lib/explore/datasets.ts`.
- Open-item tabs persisted in `localStorage` and drawing through bkt-5f2h remain open.

## Build Order

| Slice | Content | Depends on |
|-------|---------|------------|
| W1 | Web `/research-os/workspace/[type]` with Study, Figures, Maps and Datasets; shipped in #963 | none |
| E1 | Contract fields `angle`, `radius`, `t`; mappers for the six built row sets; iso3 rule | none |
| E2 | coverage-frontier row set in graph and earth | E1 |
| E3 | corpus-claims and corpus-mechanisms row sets; Corpus workspace | E1, W1 |
| E4 | progressions row set; Progressions workspace | E1, W1 |
| E5 | market rows extracted with source addresses; graph and timeline | E1 |
| E6 | Web `/explore` reads row sets; bkt-0sj7.39 redirect | E2 |
| W2 | My Data workspace | bkt-98gt5.9 |

W1 and E1 run in parallel. Each slice gets a critic pass before merge.

## Acceptance For Every Slice

- Each new row set passes `contract.test.ts` and carries a registry licence.
- Each workspace tab opens with data in plain words and no raw JSON (bkt-398t).
- Each desktop workspace has a web route, and the reverse (bkt-6wjd).
- No learner row reaches the public pack.

## Open Questions For The Founder

- Market rows: the three market docs cite reports behind paywalls. Ship only rows with an open source address, or hold the set.
- My Data: approve bkt-98gt5.9 guardrails before W2 starts.
