/**
 * Research OS <-> hypothesis engine bridge (bkt-ros, engine bridge task).
 * Pure, dependency-free mapping functions between the two envelopes
 * `_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`
 * names: `tools/hypothesis-engine`'s own accepted-hypothesis output on one
 * side, `graph.nodes`/`graph.edges`/`graph.productions` on the other. No
 * Supabase types, no fetch, so both directions are unit-testable with plain
 * objects and no database (see scripts/test-research-os-engine-bridge.ts),
 * matching frontier.ts's own "dependency-free" convention.
 *
 * Full contract and rationale: learning/research-os/ENGINE-BRIDGE.md.
 */
import type { EdgeKind, NodeKind, Provenance } from "./types";

// ---------------------------------------------------------------------------
// Direction 1: an accepted engine hypothesis -> a graph.nodes/graph.edges pair
// (task item 1)
// ---------------------------------------------------------------------------

export type EngineNodeKind = Extract<NodeKind, "derivation" | "artifact">;

const ENGINE_TIER_PATTERN = /^T([1-6])$/;

/**
 * `hte.evidence.Tier`'s six source-reliability rungs ("T1".."T6", T1 most
 * reliable) read straight onto `graph.nodes.tier`'s smallint: `"T3"` becomes
 * `3`. A run that carries no `tier_assigned` (or one outside `T1`-`T6`) reads
 * as `6`, the engine's own least-reliable rung, rather than guessing a more
 * favorable one. This deliberately diverges from the Phase 0 seed's other
 * two `tier` conventions (a K-12 grade level 3-12 for path nodes, the
 * sentinel `90` for a canon-bridge mirror node): an engine hypothesis is
 * neither, and the task that names this adapter is explicit that its tier
 * comes from "the engine's own level."
 */
export function engineTierToGraphTier(tierAssigned: string | null | undefined): number {
  if (tierAssigned) {
    const match = ENGINE_TIER_PATTERN.exec(tierAssigned.trim());
    if (match) return Number(match[1]);
  }
  return 6;
}

function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Deterministic on `(engine, runId, hypothesisId)`, task item 1's own
 * idempotency key: the same three values always produce the same slug, and
 * `graph.nodes.slug`'s unique constraint (the Phase 0 migration) is what
 * turns that determinism into real idempotency at the database level, a
 * second write with the same three values updates the same row rather than
 * inserting a duplicate.
 */
export function engineNodeSlug(engine: string, runId: string, hypothesisId: string): string {
  return `engine-${slugifyPart(engine)}-${slugifyPart(runId)}-${slugifyPart(hypothesisId)}`;
}

export interface EngineHypothesisInput {
  /** Which engine produced this, e.g. "hte" (`tools/hypothesis-engine`). */
  engine: string;
  /** `hte.runner`'s own run directory or run id, e.g. "runs/production/2026-09-10T12-00-00Z". */
  runId: string;
  /** The corpus or campaign name, e.g. "education-atlas", "quantum-history", "production". */
  campaign: string;
  /** `hte.hypothesis.Hypothesis.short_id`, e.g. "h-af3c". */
  hypothesisId: string;
  /** Which model tier produced or reviewed it (`hte/data/model-policy.json`'s own role aliases). */
  model?: string;
  /** `hte.evidence.Tier` ("T1".."T6"), `RESEARCH-OS-INTEGRATION.md`'s own `hypothesize_result.tier_assigned`. */
  tierAssigned?: string;
  /** Which canon branch this hypothesis's subject falls under, e.g. "02-physics". */
  branch: string;
  /** A human-readable statement of the hypothesis. Rendering slot ids into prose is the
   * engine-side caller's own job (this adapter does no natural-language generation). */
  title: string;
  /** Defaults to `title` when omitted. */
  summary?: string;
  /** "derivation" (a claim derived from evidence, the default) or "artifact" (an emitted
   * object such as a paper or export). */
  kind?: EngineNodeKind;
  /** `P(h) = b + a*u`, `hte.belief.Opinion.project()`. */
  posterior?: number;
  /** The hypothesis's current Elo rating from the tournament. */
  elo?: number;
  /** The five concept slots the placement filled (`hte.concepts.Slot`), kept for display. */
  slots?: Record<string, string | null>;
  /** The address's own time bin, if the hypothesis is bin-scoped. */
  addressTimeBin?: string | number | null;
  /** Node slugs this hypothesis cites as evidence; a `cites` edge per resolvable ref. */
  evidenceRefs?: string[];
  /** Canon node slugs this hypothesis builds on; a `derives_from` edge per resolvable ref. */
  derivesFromSlugs?: string[];
}

export interface EngineNodeProvenance extends Provenance {
  type: "engine_hypothesis";
  engine: string;
  run_id: string;
  campaign: string;
  hypothesis_id: string;
  model?: string;
  tier_assigned: string | null;
  posterior: number | null;
  elo: number | null;
  slots: Record<string, string | null> | null;
  time_bin: string | number | null;
  evidence_refs: string[];
}

export interface EngineNodeDraft {
  slug: string;
  title: string;
  kind: EngineNodeKind;
  tier: number;
  branch: string;
  summary: string;
  provenance: EngineNodeProvenance;
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`buildEngineNode: ${field} is required`);
}

/**
 * An accepted engine hypothesis, as the `graph.nodes` row `db.ts`'s
 * `upsertEngineHypothesisNode` writes (task item 1). Pure: no I/O, no
 * randomness, callable from a test with a plain fixture object.
 */
export function buildEngineNode(input: EngineHypothesisInput): EngineNodeDraft {
  requireNonEmpty(input.engine, "engine");
  requireNonEmpty(input.runId, "runId");
  requireNonEmpty(input.hypothesisId, "hypothesisId");
  requireNonEmpty(input.branch, "branch");
  requireNonEmpty(input.title, "title");

  return {
    slug: engineNodeSlug(input.engine, input.runId, input.hypothesisId),
    title: input.title,
    kind: input.kind ?? "derivation",
    tier: engineTierToGraphTier(input.tierAssigned),
    branch: input.branch,
    summary: input.summary ?? input.title,
    provenance: {
      type: "engine_hypothesis",
      engine: input.engine,
      run_id: input.runId,
      campaign: input.campaign,
      hypothesis_id: input.hypothesisId,
      model: input.model,
      tier_assigned: input.tierAssigned ?? null,
      posterior: input.posterior ?? null,
      elo: input.elo ?? null,
      slots: input.slots ?? null,
      time_bin: input.addressTimeBin ?? null,
      evidence_refs: input.evidenceRefs ?? [],
    },
  };
}

export interface EngineEdgeDraft {
  toSlug: string;
  kind: Extract<EdgeKind, "cites" | "derives_from">;
}

/**
 * Every edge this hypothesis node wants: `cites` to each evidence ref,
 * `derives_from` to each canon node it builds on (task item 1). Both lists
 * name target slugs. Resolving a slug to a live `graph.nodes.id`, and
 * dropping a ref that resolves to nothing (`graph.edges`'s foreign key
 * requires both ends to exist), happens in `db.ts`'s `writeEngineEdges`. A
 * dropped ref is never lost: it stays on the node's own
 * `provenance.evidence_refs`.
 */
export function buildEngineEdges(input: EngineHypothesisInput): EngineEdgeDraft[] {
  const cites = (input.evidenceRefs ?? []).map((toSlug) => ({ toSlug, kind: "cites" as const }));
  const derivesFrom = (input.derivesFromSlugs ?? []).map((toSlug) => ({ toSlug, kind: "derives_from" as const }));
  return [...cites, ...derivesFrom];
}

// ---------------------------------------------------------------------------
// Direction 1b: a campaign's own gap node -> a graph.nodes/graph.edges pair
// (ros-12 item 4, "GapNode wiring"). `hte.unknowns.GapNode`/`value_of_
// information` shipped built but never called from `hte.runner`
// (learning/research-os/ENGINE-BRIDGE.md's own "Stubs, open items");
// `tools/hypothesis-engine/scripts/campaign_research_os.py` closes that
// gap on the read side (`hte.unknowns.unresolved_slot_gaps`), this section
// closes it on the write side, the same "graph node plus edges" shape
// direction 1 above already gives an accepted hypothesis.
// ---------------------------------------------------------------------------

export interface GapNodeInput {
  /** Which engine produced this, e.g. "hte" (`tools/hypothesis-engine`). */
  engine: string;
  /** The same run id the campaign's own accepted hypotheses carry (`EngineHypothesisInput.runId`). */
  runId: string;
  /** The corpus or campaign name. */
  campaign: string;
  /** `hte.unknowns.GapNode.id`, e.g. "gap-ev-001". */
  gapId: string;
  /** `hte.unknowns.GapNode.kind`, e.g. "unresolved-slot". */
  kind: string;
  /** `hte.unknowns.GapNode.description`. */
  description: string;
  /** `hte.unknowns.value_of_information`'s own score for this gap against the campaign's own survivors. */
  valueOfInformation: number;
  /** Which canon branch this gap's subject falls under. */
  branch: string;
  /** `hte.hypothesis.Hypothesis.short_id` for every hypothesis `hte.unknowns.GapNode.would_move`
   * names, "the node it concerns." Resolved to that hypothesis's own `engineNodeSlug` at write
   * time (below); a hypothesis this same campaign did not also write as a node (never survived
   * its own critic filter) drops out the same way `writeEngineEdges` already drops any
   * unresolved slug, never raised. */
  concernsHypothesisIds: string[];
}

export interface GapNodeProvenance extends Provenance {
  type: "gap";
  engine: string;
  run_id: string;
  campaign: string;
  gap_id: string;
  gap_kind: string;
  value_of_information: number;
  concerns_hypothesis_ids: string[];
}

export interface GapNodeDraft {
  slug: string;
  title: string;
  kind: Extract<NodeKind, "artifact">;
  tier: number;
  branch: string;
  summary: string;
  provenance: GapNodeProvenance;
}

/**
 * Deterministic on `(engine, runId, gapId)`, the same idempotency shape
 * `engineNodeSlug` gives an engine hypothesis node (task item 1's own
 * convention, reused here): a repeat write of the same gap updates the
 * same row rather than inserting a duplicate.
 */
export function gapNodeSlug(engine: string, runId: string, gapId: string): string {
  return `gap-${slugifyPart(engine)}-${slugifyPart(runId)}-${slugifyPart(gapId)}`;
}

/**
 * A campaign's own gap node, as the `graph.nodes` row `db.ts`'s
 * `upsertGapNode` writes (ros-12 item 4): kind `artifact`, provenance
 * `type: "gap"`, so the router and class view can list it alongside every
 * other artifact-kind node without a schema change. `tier` is fixed at
 * `6`, the engine's own least-reliable rung (`engineTierToGraphTier`'s
 * default): a gap marks an absence in the corpus, carrying no reliability
 * rating of its own to assign. Pure: no I/O.
 */
export function buildGapNode(input: GapNodeInput): GapNodeDraft {
  requireNonEmpty(input.engine, "engine");
  requireNonEmpty(input.runId, "runId");
  requireNonEmpty(input.gapId, "gapId");
  requireNonEmpty(input.branch, "branch");
  requireNonEmpty(input.description, "description");
  return {
    slug: gapNodeSlug(input.engine, input.runId, input.gapId),
    title: `Gap: ${input.description}`,
    kind: "artifact",
    tier: 6,
    branch: input.branch,
    summary: input.description,
    provenance: {
      type: "gap",
      engine: input.engine,
      run_id: input.runId,
      campaign: input.campaign,
      gap_id: input.gapId,
      gap_kind: input.kind,
      value_of_information: input.valueOfInformation,
      concerns_hypothesis_ids: input.concernsHypothesisIds,
    },
  };
}

/**
 * One `cites` edge per hypothesis this gap concerns, targeting that
 * hypothesis's own `engineNodeSlug` (task item 1's convention): "an edge
 * to the node it concerns" (ros-12 item 4). `cites` rather than
 * `prerequisite`: `src/lib/research-os/frontier.ts` and `closure.ts` walk
 * only `prerequisite` edges for real routing, and `engine-frontier.ts`
 * walks only `derives_from`; `cites` is the one edge kind task item 1
 * already established as inert to both, so a gap node's own edges add
 * traceability without perturbing either routing algorithm.
 */
export function buildGapEdges(input: GapNodeInput): EngineEdgeDraft[] {
  return input.concernsHypothesisIds.map((hypothesisId) => ({
    toSlug: engineNodeSlug(input.engine, input.runId, hypothesisId),
    kind: "cites" as const,
  }));
}

// ---------------------------------------------------------------------------
// Direction 2: an accepted Research OS production -> the outbox row the
// engine ingests (task item 3)
// ---------------------------------------------------------------------------

/** The shape one `graph.productions` row carries (the Phase 0 migration's own columns). */
export interface GraphProductionRow {
  id: string;
  learner_id?: string;
  target_node_id: string;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  status: string;
  created_at: string;
  updated_at?: string;
}

/** The `_target_node` join `hte.corpus.production.normalize_research_os_record`
 * (PR #10) reads to resolve a real `grade_band` instead of `"unknown"`. */
export interface ProductionOutboxTargetNode {
  slug: string;
  title: string;
  tier: number;
  branch: string;
}

/**
 * One row of `public.research_os_productions_outbox` (task item 3), read
 * over plain PostgREST by `hte.corpus.production.load_supabase(table=
 * "research_os_productions_outbox")` with no engine-side code change: PR
 * #10's own `is_research_os_record`/`normalize_research_os_record`
 * (`tools/hypothesis-engine/hte/corpus/production.py`, merging
 * concurrently) already auto-detect and normalize this exact shape (a
 * `target_node_id` field, no `claims` field) server-side, in Python. This
 * row therefore carries the RAW `graph.productions` columns rather than a
 * hand-built `PRODUCTION-SCHEMA.md` envelope: building that envelope a
 * second time here would duplicate PR #10's own mapping with a less
 * accurate copy of it. See learning/research-os/ENGINE-BRIDGE.md, "Why the
 * outbox carries the raw row."
 *
 * `learner_id` and `transfer_proof` are deliberately absent: PR #10's own
 * normalizer never reads either
 * (`tools/hypothesis-engine/docs/PRODUCTION-SCHEMA-ALIGNMENT.md`'s field
 * table drops both), and leaving them off this row keeps a
 * pseudonymous-but-real user id and a learner's own scratch text out of a
 * table a second process, the engine's own Python loader, reads.
 */
export interface ProductionOutboxRow {
  id: string;
  target_node_id: string;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  status: string;
  created_at: string;
  updated_at: string | null;
  _target_node: ProductionOutboxTargetNode | null;
}

/**
 * An accepted `graph.productions` row, as the outbox row
 * `writeProductionOutbox` upserts (task item 3). Throws if
 * `production.status` is not `"accepted"`: this function is the write-side
 * hook itself, called only at the point a production's status becomes
 * accepted, never speculatively. `targetNode` is optional, matching PR
 * #10's own normalizer, "a bare row with no join still normalizes rather
 * than raising": a caller that cannot resolve the target node still gets
 * an outbox row, the engine reads `grade_band` as `"unknown"` for it.
 *
 * Idempotent on `production.id`: the same production always produces a
 * row keyed by its own real id (no synthetic prefix), and `public.
 * research_os_productions_outbox.id`'s own primary key (the bridge's own
 * migration) is what `writeProductionOutbox` upserts on.
 */
export function buildProductionOutboxRow(
  production: GraphProductionRow,
  targetNode: ProductionOutboxTargetNode | null,
): ProductionOutboxRow {
  if (production.status !== "accepted") {
    throw new Error(`buildProductionOutboxRow: production ${production.id} is not accepted (status=${production.status})`);
  }
  return {
    id: production.id,
    target_node_id: production.target_node_id,
    claim: production.claim ?? null,
    evidence: Array.isArray(production.evidence) ? production.evidence : [],
    sources: Array.isArray(production.sources) ? production.sources : [],
    status: production.status,
    created_at: production.created_at,
    updated_at: production.updated_at ?? null,
    _target_node: targetNode,
  };
}
