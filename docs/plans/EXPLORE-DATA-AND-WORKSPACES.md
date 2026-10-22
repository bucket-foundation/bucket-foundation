# Explore Data Modes and Research OS Workspaces

Bead: bkt-khfw. Plan only. Status as of dev at 1af5a5011, 2026-10-22.

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
| progressions | `progressions/frame.jsonl` | graph, timeline, helix | per-standard licences already in the registry |
| coverage-frontier | `progressions/completeness/validation.json`, `COVERAGE.md` | circle, earth | derived counts |
| market | new `learning/corpus/market/rows.jsonl` extracted from the three market docs | graph, timeline | each row needs a source address |
| technology-links | existing technology lags, kept to rows with a source address | graph, timeline | bkt-khfw.7 rule holds |

Occupations and technologies already have row sets; they gain the angle, radius and time fields only.

### Contract Change

Add three optional fields to a row in `contract.ts`: `angle` (category bucket, 0 to 1), `radius` (depth or level, 0 to 1), `t` (year). A mode reads only these plus `group` and `links`. Each row set declares a mapper that fills them; bkt-0sj7.30 is that mapper set. Rule 5 moves from iso2 to iso3 to match `world-indicators.json`, closing the open note on A4.

### Mode Coverage

Add `circle` as a mode id rendered by bkt-5f2h. Then every row set lists at least two modes so the morph in bkt-0sj7.26 has somewhere to go.

### Web

The web `/explore` loads the public pack's row sets through one adapter in `src/lib/explore/datasets.ts` and renders them with the same module as desktop. bkt-0sj7.39 then redirects `/explore` to canon search with a data picker. The older `canon.space.json` path stays as one row set named `canon`.

## Part Two: Research OS Workspaces

### Types

Keep the eight desktop types. Add four, each fed by a row set family:

| Workspace | Rows | Work done there |
|-----------|------|-----------------|
| Corpus | corpus-claims, corpus-mechanisms | read a claim with its source, mark agree or dispute, link to an atom |
| Progressions | progressions, mathematics-chain | walk a standard chain, see coverage gaps, open the deck atom |
| Coverage | coverage-frontier, coverage-by-country | see the filled circle and the open edge, pick a gap to work |
| My Data | learner rows from Supabase | due today, streaks, export and delete; gated by bkt-98gt5.9 |

Occupations, technologies and market open in the existing graphs and maps workspaces; they need no type of their own until a task needs one.

### Shared Shell

Every workspace tab has the same four parts: a list of row sets of that type, a tab per open item, a preview drawn by bkt-5f2h, and an "Open in Explore" action that carries marked rows. The shell exists in `Workspace.tsx`; new types plug into `BUILT` and `WORKSPACE_TYPES`.

### Web Parity

`/research-os/workspace/[type]` renders the same shell from `packages/bkt-ui`. The current learner workspace page becomes the `study` tab, the founder's ask that the web Workspace page becomes one of the tabs. Tabs persist in `localStorage` on the web, wrapped in try/catch.

## Build Order

| Slice | Content | Depends on |
|-------|---------|------------|
| W1 | Web `/research-os/workspace/[type]` with the existing eight types, current page as `study` | none |
| E1 | Contract fields `angle`, `radius`, `t`; mappers for the six built row sets; iso3 rule | none |
| E2 | `circle` mode via bkt-5f2h; coverage-frontier row set | E1 |
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
