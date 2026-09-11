# Research OS Ingestion

Two importers that grow the Research OS graph past the Phase 0 seed's 22 nodes without a model in the loop: the Academy corpus importer (`src/lib/research-os/ingest/academy.ts`, 487 atoms across eight `learning/app/corpus/*.json` files) and the canon entry importer (`src/lib/research-os/ingest/canon.ts`, `bucket-canon/02-physics/`'s six dossiers). Both extend the ingestion pattern `_intake/research-os-k12/02-architecture.md` section 10 and `RESEARCH-OS-K12-SYSTEM-REVIEW.md` section 3 already describe: source, parse, node candidate, dedupe/tier, edge inference, publish, with a human review step before anything ambiguous goes live.

## Data flow

```
learning/app/corpus/*.json          bucket-canon/02-physics/*/
  (487 atoms, requires edges)         primary-papers.yaml (6 dossiers)
        │                                    │
        │ academy.ts                         │ canon.ts (+ src/lib/canon-primary.ts's
        │ buildAcademyImport                 │  existing loader, /api/research's own
        ▼                                     │  "served layer" reader, reused not
graph.nodes drafts                            │  rebuilt)
  (kind concept|law, tier              ▼
  13 + requires-depth)            graph.nodes drafts
        │                          (kind law|primary_source, tier 90)
        │ requires -> prerequisite      │
        │ edge (source easier,          │ cites edge (law -> its own
        │ target harder)                │ bibliographic source node)
        ▼                               │ derives_from edge (entry ->
graph.edges drafts                      │ a matched Academy atom, by
                                         │ slug or canon-atom-map.json)
                                         ▼
                                   graph.edges drafts
        │                                    │
        └─────────────────┬──────────────────┘
                           ▼
              validate.ts: checkOrphanEdges,
              checkTierMonotonicity
                           │
              dry run (default): scripts/research-os/ingest/out/
              *-preview.json + review-list.json
                           │
              apply (--apply): upsert through the graph-schema
              service-role client, scripts/seed-research-os.mjs's
              own construction
```

Both importers are pure functions over plain objects (`buildAcademyImport`, `buildCanonImport`): no filesystem access, no Supabase client, so both are unit-testable with fixtures and produce byte-identical output on repeat input. The two CLI scripts (`scripts/research-os/ingest/academy-import.ts`, `.../canon-import.ts`) do the I/O: read the source files, call the importer, validate the result, then either write a JSON preview (default) or upsert it (`--apply`).

```bash
# from the repo root
npm run ingest:research-os:academy            # dry run: preview + review list
npm run ingest:research-os:academy -- --apply # upsert into graph.nodes / graph.edges
npm run ingest:research-os:canon
npm run ingest:research-os:canon -- --apply
npm run ingest:research-os:infer              # lexical proposer, no model, no --apply mode ever
npm run ingest:research-os:infer-llm          # LLM-assisted proposer, no --apply mode ever; queues graph.edge_proposals when Supabase is configured
```

Run the Academy importer's `--apply` before the canon importer's: a canon entry's `derives_from` edge targets an Academy atom node, and the apply-mode writer skips (and warns on) an edge whose target is not yet a live row rather than failing the whole run. Re-running either importer, in either order, converges: every node upserts on its own deterministic slug, every edge upserts on `(from_id, to_id, kind)` with `ignoreDuplicates`, the same idempotency pattern `scripts/seed-research-os.mjs` and `src/lib/research-os/engine-bridge.ts`'s `engineNodeSlug` already use.

## Tier heuristic

`graph.nodes.tier` is a plain smallint with three populations sharing one column, none of them the review's original `grade_band int4range` (deferred to Phase 1, per the Phase 0 migration's own header comment):

| Population | Tier | Source |
|---|---|---|
| Path nodes (the sky-blue seed) | 3-12, approximate US grade level | hand-authored |
| Canon-bridge mirror nodes (the seed's `canon-waves` etc.) | 90 | hand-authored sentinel |
| Engine hypothesis nodes | 1-6 | `hte.evidence.Tier`, `engine-bridge.ts`'s `engineTierToGraphTier` |
| **Academy atoms (this ingestion slice)** | **13 + requires-depth** | `academy.ts`'s `computeRequiresDepth` |
| **Canon entries (this ingestion slice)** | **90** | `canon.ts`'s `CANON_TOP_TIER` |

**Academy atoms.** No atom in the 487-atom corpus carries a grade-level field (confirmed against every atom in all eight importable files); Academy's own content sits above the seed's 3-12 K-12 band, written, per `learning/app/corpus/02-physics.json`'s own `meta.note`, as a "foundations-first DAG" running from an absolute-beginner base up to a frontier shell and indexed by depth in its own prerequisite chain rather than by school grade. The tier is `ACADEMY_TIER_BASE (13)` plus the atom's own topological depth in its file's `requires` DAG: a root atom (no `requires`) is depth 0; a dependent atom's depth is `1 + max(depth of each of its prerequisites)`. Depth-based tiering is monotonic by construction: a dependent atom's depth is always strictly greater than every one of its own prerequisites' depths, so a `prerequisite` edge this importer writes can never violate task item 3's invariant, and the real corpus's deepest chain (16 hops, in `02-physics.json` and `06-cosmology.json`) still lands at tier 29, well clear of the canon sentinel at 90.

**Canon entries.** A `bucket-canon/02-physics/` dossier is canon-tier by definition (`bucket-canon`'s own promotion rubric gates every record on a `canon_score >= 70` hard floor before it ever reaches a `primary-papers.yaml` file), adult, research-grade material outside any K-12 grade band, exactly what the Phase 0 migration's `90` sentinel already means for the seed's canon-bridge mirror nodes. A canon entry reuses that sentinel rather than inventing a second "canon-but-not-K-12" tier value.

**Kind heuristic.** An Academy atom's own `type` field (`concept`, `equation`, `result`, `method`, `definition`, `theorem`, `law`, or absent) maps onto the two node kinds the ingestion task allows for this population: `type: "law"` and `type: "theorem"` (a proven regularity, the same bucket `law`'s own node-kind definition names) become `kind: "law"`; every other value, and a missing `type`, become `kind: "concept"`. A canon entry's kind follows its dossier folder's own name: `isLawFolder` matches `theorem`, `principle`, or `law` in the slug, true for exactly two of the six current dossiers (`bell-theorem`, `gauge-principle`); those become `kind: "law"` plus a second `primary_source` node for the paper that established the law, linked by a `cites` edge (a node cannot cite itself). The other four dossiers (`quantum-mechanics`, `quantum-field-theory`, `special-relativity`, `standard-model`) name a field or a body of theory rather than one named result, so their entry stays a single `primary_source` node.

## Canon-to-Academy matching

A canon entry's `derives_from` edge points at the Academy atom it builds on, resolved in order:

1. **`scripts/research-os/ingest/canon-atom-map.json`**, an explicit, hand-maintained override keyed by the dossier's own folder slug. An importer never writes to this file, only reads it; a reviewer adds a row after reading a review-list `unmatched_derives_from` item and confirming the match by hand. Seeded today with three rows carried forward from the sky-blue seed's own canon-bridge nodes (`canon-waves`, `canon-em-waves`, `canon-wave-optics`), whose `provenance.academy_atom_id` already names these exact pairs; none of the six live `02-physics` dossiers use them yet, but a future `waves`-named dossier resolves through them on day one.
2. **An exact slug match**: the dossier folder's own name equals an Academy atom's `id` field exactly (preferring a `02-physics`-branch atom when the id exists in more than one branch). Two of today's six dossiers match this way: `special-relativity` and `standard-model` both name a real Academy atom id verbatim.
3. **No match.** The other four dossiers (`bell-theorem`, `gauge-principle`, `quantum-field-theory`, `quantum-mechanics`) have no atom whose id equals their folder slug. The closest miss is `quantum-entanglement`, titled "Entanglement and Bell's theorem," which a looser fuzzy match might have caught; each of the four becomes an `unmatched_derives_from` review item instead. This is deliberate: the ingestion task is explicit that an unmatched entry goes to the review list rather than being guessed, and a near-miss on an apostrophe is exactly the kind of case a fuzzy matcher gets wrong silently.

## The review-list contract

`scripts/research-os/ingest/out/review-list.json` is the one file a human reviewer reads after an ingestion run, regardless of which importer produced an item. Both CLI scripts read the existing file, merge in their own run's items keyed by each item's own stable `id` (`src/lib/research-os/ingest/review.ts`'s `mergeReviewList`), and write the result back, so re-running either importer updates its own rows without discarding the other importer's. Five `ReviewItemKind` values exist today:

| Kind | Producer | Meaning |
|---|---|---|
| `unmatched_derives_from` | canon.ts | A canon entry's dossier slug matched no Academy atom id and no map override. |
| `unresolved_map_entry` | canon.ts | `canon-atom-map.json` names a (branch, atom_id) pair absent from the loaded corpus. |
| `tier_violation` | validate.ts, both CLIs | A `prerequisite` edge whose source tier exceeds its target tier (never observed against the real corpus; the Academy heuristic is monotonic by construction, and the canon importer writes no `prerequisite` edges at all). |
| `unresolved_requires` | academy.ts | An atom's `requires` list names an id absent from its own source file (never observed against the real 487-atom corpus; every `requires` reference resolves within its own file). |
| `prerequisite_cycle` | academy.ts | A `requires` cycle within one file's atoms (never observed against the real corpus). |
| `llm_proposed_edge` | `scripts/research-os/ingest/infer-edges-llm.ts` (`src/lib/research-os/inference/propose.ts`'s `proposeLlmEdges`) | A `prerequisite` edge an LLM judged "yes" against a strict prompt, `confidence_source: "inferred_llm"`, confidence 0.3 to 0.65. Never applied by that script; when Supabase is configured the same proposal is also queued into `graph.edge_proposals` for the live `/research-os/edges` review UI, a reviewer's approve/reject decision there is the only path to `graph.edges`. See `learning/research-os/ROUTING.md`'s "LLM-assisted prerequisite-edge inference" section for the full calibration and agreement rule. |

A review item never halts a run. An importer's own CLI throws only on a structural bug in its own output, an orphan edge whose endpoint the importer's own node set does not contain. Task item 3's monotonicity check follows the same rule: `checkTierMonotonicity` returns a list, `tierViolationsToReviewItems` turns it into review items, and the CLI keeps running.

## Dry run today

Against the current repo state: the Academy importer produces 487 nodes and 820 `prerequisite` edges across eight files, zero review items, every edge now carrying `confidence: 1.0, confidenceSource: "academy_requires"` (bkt-ros ros-03 item 1). The canon importer produces 8 nodes (6 entries plus 2 bibliographic source nodes for the two law-kind dossiers), 7 edges (2 `cites`, 5 `derives_from`, each `confidence: 0.9, confidenceSource: "canon_map"`), and 1 `unmatched_derives_from` review item (`gauge-principle`; three of the original four unmatched entries were resolved by ros-03 item 4 into explicit `canon-atom-map.json` rows). Combined: 495 new nodes and 827 new edges layered onto the Phase 0 seed's 22 nodes and 28 edges, zero tier violations, zero orphan edges. `scripts/research-os/ingest/infer-edges.ts` (ros-03 item 4, no model, no `--apply` mode) then scans all 517 nodes and proposes 36 `prerequisite` edges from lexical overlap and tier ordering, each landing on the review list as an `inferred_prerequisite_proposal` at a confidence between 0.3 and 0.65, never applied. `scripts/research-os/ingest/out/sample-academy-preview.json`, `sample-canon-preview.json`, `sample-review-list.json`, and `sample-infer-preview.json` are small committed samples of the real shape (the canon, review-list, and infer samples are the full current output; the academy sample is a two-node, one-edge slice of the full 487/820).

## What this slice does not do

No model call anywhere in either importer: `mapAtomKind` and `isLawFolder` are fixed-rule string checks, `computeRequiresDepth` is a graph walk, `matchAcademyAtom` is exact-or-nothing. This is deliberate for exactly the population these two importers cover, where the source data already carries enough structure (an atom's own `type`, a dossier's own folder name, an atom's own `requires` list) that a rule resolves it. It does not cover the case the architecture review's own ingestion section names as the harder half of the pipeline: proposing a **new** `prerequisite` or `generalizes` edge between two nodes that have no existing structural link to read a rule from (an Academy atom and a K-12 curriculum standard it was never authored against, for instance, or two canon dossiers with no shared folder-name signal). Two passes address that gap, both shipped: `scripts/research-os/ingest/infer-edges.ts` (bkt-ros ros-03, `src/lib/research-os/ingest/infer.ts`'s `inferEdges`) proposes a `prerequisite` edge from lexical overlap of two nodes' summaries and tier ordering alone, still no model call, at a bounded `inferred`-tier confidence (0.3 to 0.65, `learning/research-os/ROUTING.md`); it has no `--apply` mode, every proposal lands on the review list as an `inferred_prerequisite_proposal`. The harder case, an edge between two nodes with no lexical or structural signal at all, needs a model: `scripts/research-os/ingest/infer-edges-llm.ts` (bkt-ros ros-13) proposes the candidate edge from two independently-phrased strict yes/no prompts, each with a justification and a self-reported confidence, calibrated through the same `inferred`-tier band and forced below the teacher-flag threshold on a split verdict (`learning/research-os/ROUTING.md`'s "LLM-assisted prerequisite-edge inference" section has the full rule). Every proposal lands on the review list as an `llm_proposed_edge` item, `confidence_source: "inferred_llm"`, and, when Supabase is configured, is also queued into `graph.edge_proposals` for a human to accept or reject at `/research-os/edges` rather than a silent auto-merge. Every quality gate the architecture review names for that step applies unchanged: no node ships without at least one edge, no `prerequisite` edge ships without human review, no atom-to-canon `generalizes` edge ships without a canon-track reviewer. This slice's own deterministic matching already satisfies the last of the three for the two dossiers it did link, by construction, with no model call needed.
