# Research OS Engine Bridge

Wires `tools/hypothesis-engine` (the `hte` combinatorial hypothesis engine)
and Research OS for K-12's own graph in both directions, per the task map
in `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`,
"Integration Points". Three data flows land here, alongside what PR #10
shipped concurrently, so a reader holds one account of the whole bridge
rather than two separate diffs.

## Data flow

```
                    accepted engine hypothesis
tools/hypothesis-engine  ──────────────────────▶  graph.nodes / graph.edges
   (a campaign run)         (item 1, this PR)       (kind derivation|artifact,
                                                       provenance.type
                                                       "engine_hypothesis")
                                                              │
                                                              │ read by
                                                              ▼
                                              src/app/api/research-os/route
                                              (item 2, this PR): an engine
                                              node whose derives_from targets
                                              a learner mostly holds surfaces
                                              as engineFrontier

graph.productions ──────▶ public.research_os_productions_outbox ──────▶ hte.corpus.production.load_supabase
 (an accepted             (item 3, this PR: RAW row, no hand-built          (PR #10, reads the outbox
  production)               envelope; see "Why the outbox carries           table's own rows directly,
                            the raw row" below)                             auto-detects the shape,
                                                                             normalizes server-side)
```

A fourth flow, `hte-serve`'s `POST /hypothesize` called from a Next.js
route, is PR #10's own work end to end (`hte/api.py`, `hte/serve.py`,
`hte/mcp_tool.py`, the unapplied `docs/research-os-hypothesize-route.patch`).
This PR does not touch it; see "What PR #10 covers" below.

## Tables

| Table | Schema | Written by | Read by |
|---|---|---|---|
| `graph.nodes` | private (`graph`, outside PostgREST's schema list) | `src/lib/research-os/db.ts`'s `upsertEngineHypothesisNode` (item 1) | `loadSubgraph`, `findNodeById`, the `/api/research-os/route` handler |
| `graph.edges` | private (`graph`) | `db.ts`'s `writeEngineEdges` (item 1) | `loadSubgraph` |
| `graph.productions` | private (`graph`) | the existing `/api/research-os/production` route | the same route, on an accepted write, feeds item 3's outbox |
| `public.research_os_productions_outbox` | public (PostgREST default schema, deliberately) | `db.ts`'s `writeProductionOutbox` (item 3) | `hte.corpus.research_os_outbox.load`/`load_and_consume` (ros-12 item 2, registered as the `"research-os"` corpus in `hte.cli`'s own `_CORPUS_LOADERS`), and `tools/hypothesis-engine/scripts/campaign_research_os.py`'s `fetch_and_build` (ros-12 item 3) |

`public.research_os_productions_outbox` is defined in
`supabase/migrations/20260910010000_research_os_engine_bridge.sql`,
alongside a `graph.edges (from_id, to_id, kind)` unique index item 1's own
edge writer needs. `supabase/migrations/
20260910030000_research_os_outbox_consumed_at.sql` (ros-12 item 2) adds
the row's own `consumed_at` column, `null` until a reader has used it:
`hte.corpus.research_os_outbox.fetch_unconsumed_rows` filters on
`consumed_at is null`; `mark_consumed` sets it.

## Idempotency keys

- **Engine node (item 1).** `graph.nodes.slug`, deterministic on
  `(engine, runId, hypothesisId)` via `engine-bridge.ts`'s
  `engineNodeSlug`. A repeat write with the same three values updates the
  same row; it never inserts a duplicate.
- **Engine edges (item 1).** `graph.edges (from_id, to_id, kind)`, the
  bridge's own migration adds this as a unique index; `writeEngineEdges`
  upserts with `ignoreDuplicates: true`.
- **Production outbox row (item 3).** `public.research_os_productions_
  outbox.id`, the production's own `graph.productions.id` reused verbatim
  (no synthetic prefix): `writeProductionOutbox` upserts on `id`.
- **Outbox consumption (ros-12 item 2).** `consumed_at`, a per-row
  timestamp: `mark_consumed` setting it on an already-consumed row
  overwrites it with a later time, so a retry after a partial failure
  never needs to check which ids already carry one first.
- **Gap node (ros-12 item 4).** `graph.nodes.slug`, deterministic on
  `(engine, runId, gapId)` via `engine-bridge.ts`'s `gapNodeSlug`, the same
  shape `engineNodeSlug` gives an accepted hypothesis (item 1), with a
  `gap-` rather than `engine-` prefix so the two never collide.

## Why the outbox carries the raw row

The WIP draft of item 3 hand-built the engine's `PRODUCTION-SCHEMA.md` JSON
envelope (`claims`/`evidence`/`review` blocks) in TypeScript before writing
it to the outbox. PR #10 (`feat/hte-k12-research-os`), merging
concurrently with this branch, shipped
`hte.corpus.production.is_research_os_record` and
`normalize_research_os_record`
(`tools/hypothesis-engine/hte/corpus/production.py`): the engine now
detects a raw `graph.productions`-shaped row on sight (fingerprint: a
`target_node_id` field present, no `claims` field) and builds that exact
envelope itself, server-side, with a mapping more accurate than the
TypeScript draft's own simplification (PR #10 reads a source's `doi` to
choose tier `"T2"` vs `"T4"`; the draft defaulted every entry to `"T4"`).

So this PR's outbox row is the raw `graph.productions` columns plus an
optional `_target_node` join (`{"slug","title","tier","branch"}`, the same
enrichment `normalize_research_os_record`'s own docstring names), and
nothing more. The dropped hand-built envelope code is preserved verbatim,
with the full reasoning, in `_intake/research-os-k12/DELETIONS.md`.

`learner_id` and `transfer_proof` are deliberately excluded from the
outbox row: PR #10's normalizer never reads either field, and leaving them
off keeps a pseudonymous-but-real user id and a learner's own scratch text
out of a table a second process (the engine's own Python loader) reads.

## Why the outbox lives in `public`

Every other Research OS table lives in the private `graph` schema, kept
outside the shared Supabase's `PGRST_DB_SCHEMAS` allow-list on purpose (see
`supabase/migrations/20260910000000_research_os_graph.sql`'s own header
comment): the browser can never reach it, only this app's own service-role
Next.js routes can.

`hte.corpus.production.load_supabase(url, key, table)` breaks that pattern
by necessity: it calls the Supabase REST endpoint directly
(`{url}/rest/v1/{table}?select=*`) with no `Accept-Profile` header, so it
can only ever reach whichever schema PostgREST serves by default, `public`
on this Supabase project. Putting the outbox table anywhere else would
mean either giving `load_supabase` a schema argument it does not have
today (an engine-side change, out of this PR's own scope) or leaving item
3 with no engine-reachable table at all.

`public` here does not mean publicly readable. Row-Level Security is
enabled on `public.research_os_productions_outbox` with zero permissive
policies for `anon` or `authenticated`; RLS enabled with no matching
policy denies every row to every role except `service_role`, which
bypasses RLS entirely. Only this app's own server-side routes and the
engine's own `SUPABASE_SERVICE_KEY` ever hold that role.

## Scope Split With PR #10

| | PR #10 (`feat/hte-k12-research-os`) | This PR (`feat/ros-engine-bridge`) |
|---|---|---|
| Engine hypothesis becomes a Research OS graph node | Not touched | Item 1: `engine-bridge.ts`'s `buildEngineNode`/`buildEngineEdges`, `db.ts`'s `upsertEngineHypothesisNode`/`writeEngineEdges` |
| A Research OS learner sees an engine hypothesis as a study target | Not touched | Item 2: `engine-frontier.ts`'s `findFrontierEngineTargets`, surfaced on `/api/research-os/route`'s `engineFrontier` field and the workspace page's "from the engine" panel |
| A Research OS production reaches the engine | `hte.corpus.production.is_research_os_record`/`normalize_research_os_record`: auto-detects and normalizes a raw `graph.productions`-shaped row, server-side, once it arrives | Item 3: the outbox table and writer that gets an accepted production's raw row *to* the engine in the first place |
| Calling `hte.api.hypothesize` over HTTP | `hte/api.py`, `hte/serve.py` (`POST /hypothesize`, `GET /health`), `hte/mcp_tool.py`'s `TOOL_DEFINITION` | Not touched |
| The Next.js route that calls `hte-serve` | `docs/research-os-hypothesize-route.patch`, an unapplied patch against `src/app/api/research-os/hypothesize/route.ts` and `src/lib/research-os/types.ts`'s `HypothesizeResult`. Explicitly deferred to its own PR once PR #6 merged (it has) | Not touched; applied in ros-13 (`src/app/api/research-os/hypothesize/route.ts`, `src/lib/research-os/hypothesize-auth.ts`'s `authorizeHypothesize`) |
| Literature corpus adapter | `hte/corpus/literature.py`, 45 DOI-verified papers | Not touched |
| Outbox reader, campaign-run caller, GapNode wiring | Not touched | ros-12 items 2 to 4, `hte.corpus.research_os_outbox`, `tools/hypothesis-engine/scripts/campaign_research_os.py`, `scripts/research-os/apply-engine-campaign.ts`, `engine-bridge.ts`'s `buildGapNode`/`buildGapEdges`, `db.ts`'s `upsertGapNode` |

## Stubs Closed: ros-12 and ros-13

- **The route patch.** `tools/hypothesis-engine/docs/research-os-
  hypothesize-route.patch` applied against current `main`
  (`src/app/api/research-os/hypothesize/route.ts`,
  `src/lib/research-os/types.ts`'s `HypothesizeResult`). The ownership
  check moved into its own named, unit-tested function,
  `authorizeHypothesize` (`src/lib/research-os/hypothesize-auth.ts`,
  `scripts/test-research-os-hypothesize-route.ts`), rather than living only
  inside the un-testable Supabase query filter the patch originally wrote.
- **The outbox reader.** `hte.corpus.research_os_outbox` (ros-12 item 2):
  `fetch_unconsumed_rows`/`mark_consumed`/`load`/`load_and_consume`,
  reading `consumed_at is null` rows through `hte.corpus.production`'s
  existing normalizer (`Production.from_dict` already detects and
  normalizes a `graph.productions`-shaped row, PR #10) and marking every
  row it read consumed. Registered as the `"research-os"` corpus in
  `hte.cli`'s own `_CORPUS_LOADERS`. `supabase/migrations/
  20260910030000_research_os_outbox_consumed_at.sql` adds the column.
  Tested against a fixture row and a monkeypatched `urllib.request.
  urlopen`, `tools/hypothesis-engine/tests/test_corpus_research_os_
  outbox.py`.
- **The campaign-run caller.** `tools/hypothesis-engine/scripts/
  campaign_research_os.py` (ros-12 item 3): `run(corpus, ...)` registers a
  corpus into `hte.runner`'s own `_CORPUS_LOADERS` at call time (a runtime
  dict assignment on an already-imported module, leaving `hte/runner.py`
  itself untouched while PR #20 reviewed and merged that file concurrently
  with this work), runs one campaign, and
  returns an export of every survivor as one `EngineHypothesisInput` each,
  plus the run's own gap-node queue (see below). `main()` chains this to
  the outbox reader and to `mark_consumed`, only once the export has
  written to disk. `scripts/research-os/apply-engine-campaign.ts` reads
  that export and applies it through the existing PR #14 adapter
  (`buildEngineNode`/`buildEngineEdges`, `upsertEngineHypothesisNode`/
  `writeEngineEdges`). Tested in fake mode (`HTE_LLM_MODE=fake`, no
  network or API key) against the 14 shipped production fixtures,
  `tools/hypothesis-engine/tests/test_campaign_research_os.py`; the export
  <-> `EngineHypothesisInput`/`GapNodeInput` mapping is tested separately,
  `scripts/test-research-os-apply-engine-campaign.ts`.
- **`GapNode`/`value_of_information` wiring.** `hte.unknowns.
  unresolved_slot_gaps` (ros-12 item 4) is the public, tested
  generalization of `hte.api`'s own private `_rank_gap_nodes`: one
  `GapNode` per evidence item missing a concept slot, ranked by
  `value_of_information` against the campaign's own survivors and
  opinions. `campaign_research_os.py`'s own `export_gap_nodes` calls it
  after every campaign run; `apply-engine-campaign.ts` writes each gap as
  a `graph.nodes` row (`buildGapNode`: kind `artifact`, provenance
  `type: "gap"`) with one `cites` edge per hypothesis it concerns
  (`buildGapEdges`, targeting that hypothesis's own `engineNodeSlug`);
  `cites` rather than `prerequisite`, since `frontier.ts`/`closure.ts`
  walk only `prerequisite` edges for real routing and `engine-frontier.ts`
  walks only `derives_from`, so a gap's own edges add traceability without
  perturbing either. `hte/api.py` keeps its own private `_rank_gap_nodes`
  for now rather than importing `unresolved_slot_gaps`, since that file
  was under active review (PR #20) as this landed; folding one into the
  other is a follow-up once that review settles.

## Stubs, open items

- **Item 3's write-side hook is reached, real Supabase writes still
  untested.** `ros-06` (PR #28) shipped the teacher-accept path,
  `/api/research-os/review`'s POST now flips a submitted production to
  `"accepted"` and calls `db.ts`'s shared `emitProductionOutboxIfAccepted`
  (the same function `/api/research-os/production`'s own POST already
  called); a real reviewer decision reaches the outbox write now, not
  only a fixture. A PR #30 review pass (2026-09-10, post-merge) chained
  every pure leg of the pipeline against a fixture shaped exactly like
  `emitProductionOutboxIfAccepted`'s own output (`buildProductionOutboxRow`
  on a fixture accepted production): fed through the real
  `hte.corpus.research_os_outbox` reader (exactly one unconsumed row,
  `mark_consumed` idempotent, a second read returns nothing new), the real
  `campaign_research_os.run()` in fake LLM mode, and the real
  `toEngineHypothesisInput`/`buildEngineNode`/`toGapNodeInput`/
  `buildGapNode` mapping, landing on both an `engine_hypothesis`-typed and
  a `gap`-typed node draft with full engine provenance. The one leg still
  untested is the live Supabase read (`/api/research-os/review`'s own
  production lookup) and write (`writeProductionOutbox`'s upsert,
  `upsertEngineHypothesisNode`'s upsert): no live instance is available in
  a review sandbox, the same boundary `apply-engine-campaign.ts`'s own
  header comment already names.
- **`engineFrontier`'s "prerequisite" reading is `derives_from`, not
  `prerequisite`.** Item 1 writes only `cites` and `derives_from` edges for
  an engine hypothesis node, never `prerequisite`; `engine-frontier.ts`'s
  own header comment names this explicitly: `derives_from` targets stand
  in for the prerequisite set a K-12 path node's own frontier routing
  walks. A future engine hypothesis with a real prerequisite structure of
  its own may want its own edge kind rather than reusing `derives_from` for
  both "canon it builds on" and "concept it requires."
- **`hte/api.py`'s own `_rank_gap_nodes` stays a private duplicate of
  `hte.unknowns.unresolved_slot_gaps` for now** (see above), pending PR
  #20's own review landing.
- **Real tier assignment for an engine hypothesis is still unbuilt.**
  `docs/RESEARCH-OS-INTEGRATION.md`'s own "hypothesize_result" section
  names `tier_assigned` as future wiring; `campaign_research_os.py`'s own
  export leaves it unset, so `engineTierToGraphTier`'s documented default
  (`T6`) applies to every hypothesis node a campaign run writes today.

## Running a campaign end to end

From `tools/hypothesis-engine`:

```bash
python3 scripts/campaign_research_os.py --out runs/research-os-export.json
```

Then, from the `bucket-foundation` repo root:

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' \
  scripts/research-os/apply-engine-campaign.ts \
  tools/hypothesis-engine/runs/research-os-export.json
```

The first command needs `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (the outbox
read and the consumed-marking write) and, unless `HTE_LLM_MODE=fake` is
set, a working `claude -p` for the campaign's own model calls. The second
needs `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. `--dry-run`
on the first command writes the export but leaves every outbox row
unconsumed, for a rehearsal run.
