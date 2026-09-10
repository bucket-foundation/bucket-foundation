# Research OS for K-12: Routing

Confidence-weighted frontier-backward routing (bkt-ros ros-03), extending
`PLAN.md`'s Phase 0 routing rule and `PLAN-REVISION-1.md` section 2b's
"Frontier routing under Gasparetti 2017" revision.

## The routing rule

`GET /api/research-os/route` walks `graph.prerequisite` edges backward from
a target node to the learner's frontier: the mastered-or-root nodes closest
to the target (`src/lib/research-os/frontier.ts`'s `computeFrontier`).
Every prerequisite edge carries a `confidence` in `(0, 1]`. When more than
one chain reaches the same ancestor, the walk prefers the chain with the
higher product of edge confidence along it, ties broken by fewer hops. This
is a Dijkstra variant over edge cost `-log(confidence)`: non-negative
weights, so the standard "settle the cheapest open node first" guarantee
holds, and a plain graph where every edge carries the default confidence
(1.0, cost 0 everywhere) reduces to the exact shortest-hop walk the router
used before confidence existed.

A chain still routes through a low-confidence edge when no stronger
alternative exists. Routing never silently drops a node the learner needs.
Weak evidence changes which path the router prefers; the router always
routes.

## Confidence sources

`graph.edges.confidence_source` names which pipeline set an edge's
confidence:

| Source | Confidence | Set by |
|---|---|---|
| `seed` | 1.0 | `scripts/seed-research-os.mjs`, the hand-authored Phase 0 path |
| `academy_requires` | 1.0 | `src/lib/research-os/ingest/academy.ts`, a Bucket Academy atom's own `requires` list |
| `canon_map` | 0.9 | `src/lib/research-os/ingest/canon.ts`, a canon dossier matched to an Academy atom by `canon-atom-map.json` or an exact slug |
| `inferred` | 0.3 to 0.65, scaled by lexical overlap (`src/lib/research-os/ingest/infer.ts`'s `inferredConfidence`); 0.5 is the systemwide fallback for the source name alone (`CONFIDENCE_DEFAULTS.inferred`) | `scripts/research-os/ingest/infer-edges.ts`, an offline proposal never applied by that script |
| `teacher` | 1.0 (a reviewer's own confirmation) | a class-view reviewer action on a flagged edge (ros-06, not yet built) |

`seed` and `academy_requires` are curator-authored and full confidence.
`canon_map` is a curated match one notch below: a real reviewer connected
the two records, but the connection is a slug or override-table match, not
a hand-written prerequisite claim. `inferred` is the weakest tier by
construction: Gasparetti et al. 2017
(`_intake/research-os-k12-literature/prerequisite-knowledge-graphs/
gasparetti-et-al-2017-prerequisites-between-learning-objects.md`) found
that instructor disagreement over automatically extracted prerequisite
edges concentrates on weak or optional pairs, the direct warning behind
keeping every `inferred` edge on the review list rather than the graph
until a reviewer confirms it.

An edge with no `confidence_source` (a non-prerequisite edge kind: `cites`,
`derives_from` outside the canon importer, `generalizes`, `example_of`,
`contradicts`) keeps the column's own default, 1.0, and carries no ordering
or routing claim (`src/lib/research-os/ingest/validate.ts`'s
`checkTierMonotonicity` only checks `prerequisite` edges for exactly this
reason).

## The threshold

`LOW_CONFIDENCE_THRESHOLD` (`src/lib/research-os/types.ts`) is 0.6. Every
edge on a returned chain with `edgeConfidence` strictly below the threshold
lands in `computeFrontier`'s `lowConfidenceFlags`, and the route API
returns that list alongside `chain`. `canon_map`'s 0.9 and every
curator-authored source sit above the threshold and are never flagged by
construction; the flag exists for `inferred` edges (which top out at 0.65,
always below threshold) and for any edge a future source drags below 0.6.

## The teacher flag path

For a signed-in learner, every flag on a route response is written to
`graph.edge_flags` (`edge_id`, `learner_id`, `target_node_id`,
`created_at`), one row per `(edge, learner)` pair: routing through the same
weak edge again does not grow a second row. An anonymous request has no
learner to attach a flag to, so the write is skipped for it; the flags
still come back in the response either way. The write is best-effort: a
failure there never fails the route response itself.

`graph.edge_flags` carries no `resolved` column in this PR. Ros-06's class
view is the reader; a resolution path is future work for that bead. Until
then, a teacher resolves a flag by editing the underlying `graph.edges`
row directly, setting `confidence_source = 'teacher'` and a confidence at
or above the threshold. That edit removes the edge from
`lowConfidenceFlags` on the next route computed through it; the
`graph.edge_flags` row itself stays as a historical record that the edge
was once weak, rather than being deleted.

## Offline prerequisite-edge inference

`scripts/research-os/ingest/infer-edges.ts` proposes a `prerequisite` edge
between two existing nodes from lexical overlap of their title-plus-summary
text and tier ordering alone: no LLM, no network call
(`src/lib/research-os/ingest/infer.ts`'s `inferEdges`). Comparison is
scoped to one branch at a time and requires a Jaccard token overlap at or
above 0.15; direction always follows tier order (the lower-tier node is the
proposed prerequisite). A pair already covered by the seed or the Academy
importer's own `requires` edges is never re-proposed.

This script has no `--apply` mode. Every proposal lands on
`scripts/research-os/ingest/out/review-list.json` as an
`inferred_prerequisite_proposal` item; a reviewer adds it to the seed, an
Academy corpus `requires` list, or a `canon-atom-map.json` row by hand, or
rejects it. An LLM-assisted inference pass (`scripts/research-os/ingest/
infer-edges.ts`'s own future sibling) is separate, scoped work, named in
`BEADS-PENDING.jsonl`'s `ros-13` entry and `learning/research-os/
INGESTION.md`; this offline pass never calls a model.

## Deferred: the workspace chain badge

The Phase 1 scope for this bead includes a small badge on the workspace
chain rendering (`src/app/research-os/workspace/page.tsx`) marking a
low-confidence step. That file was touched 22 minutes before this pass
started (`git log -1 --format="%ci"`, PR #21, `2f015ad7c`), inside the
2-hour concurrent-edit window this bead's task names, so the badge is
deferred rather than risking a collision with whatever else is landing on
that file. `chain[].edgeConfidence` and `pathConfidence`
(`src/lib/research-os/frontier.ts`) and the route API's
`lowConfidenceFlags` are already in the response; the badge itself is a
follow-up UI pass once that file is not mid-edit.
