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
| `public.research_os_productions_outbox` | public (PostgREST default schema, deliberately) | `db.ts`'s `writeProductionOutbox` (item 3) | `hte.corpus.production.load_supabase(table="research_os_productions_outbox")`, PR #10, once pointed at this table |

`public.research_os_productions_outbox` is defined in
`supabase/migrations/20260910010000_research_os_engine_bridge.sql`,
alongside a `graph.edges (from_id, to_id, kind)` unique index item 1's own
edge writer needs.

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
| The Next.js route that calls `hte-serve` | `docs/research-os-hypothesize-route.patch`, an unapplied patch against `src/app/api/research-os/hypothesize/route.ts` and `src/lib/research-os/types.ts`'s `HypothesizeResult`. Explicitly deferred to its own PR once PR #6 merged (it has) | Not touched; still unapplied after this PR, same as PR #10 left it |
| Literature corpus adapter | `hte/corpus/literature.py`, 45 DOI-verified papers | Not touched |

## Stubs, open items

- **The outbox has no reader yet.** `writeProductionOutbox` writes rows;
  nothing in `tools/hypothesis-engine` points `load_supabase` at
  `research_os_productions_outbox` today. That one-line wiring
  (`load_supabase(table="research_os_productions_outbox")` inside a
  registered `--corpus research-os` loader, the same one-line pattern
  `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` names for `production` and
  `literature`) is engine-side work, out of this PR's own scope.
- **Item 3's hook is unreached today.** `/api/research-os/production`'s
  POST handler only emits to the outbox when a write leaves a production
  at status `"accepted"`; Phase 0 has no teacher-accept path (task item 6),
  so no production ever reaches that status yet. The hook is wired and
  tested (`scripts/test-research-os-engine-bridge.ts`) against a fixture,
  not against a live accept.
- **Item 1 has no caller yet either.** Nothing in `tools/hypothesis-engine`
  calls `upsertEngineHypothesisNode`/`writeEngineEdges` after a real
  campaign run; a campaign's own accepted-hypothesis list would need a
  small script or `hte.runner` hook to walk it and call these. This PR
  ships the write path and its idempotency; the scheduler that would drive
  it is separate, unbuilt work.
- **`engineFrontier`'s "prerequisite" reading is `derives_from`, not
  `prerequisite`.** Item 1 writes only `cites` and `derives_from` edges for
  an engine hypothesis node, never `prerequisite`; `engine-frontier.ts`'s
  own header comment names this explicitly: `derives_from` targets stand
  in for the prerequisite set a K-12 path node's own frontier routing
  walks. A future engine hypothesis with a real prerequisite structure of
  its own may want its own edge kind rather than reusing `derives_from` for
  both "canon it builds on" and "concept it requires."
- **`GapNode`/`value_of_information` are still unwired**, unchanged from
  `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`'s own accounting
  (`hte/unknowns.py:273`, `:289`, `:323`, recorded there as built but never
  called from `hte.runner`): this PR's `engineFrontier` reads only
  accepted hypothesis nodes already in the graph, never a live gap-node
  queue.
