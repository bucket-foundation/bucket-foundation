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
 * name target SLUGS, not ids, resolving a slug to a live `graph.nodes.id`,
 * and dropping a ref that resolves to nothing (`graph.edges`'s foreign key
 * requires both ends to exist), is `db.ts`'s `writeEngineEdges`, not this
 * function; a dropped ref is never lost, it stays on the node's own
 * `provenance.evidence_refs`.
 */
export function buildEngineEdges(input: EngineHypothesisInput): EngineEdgeDraft[] {
  const cites = (input.evidenceRefs ?? []).map((toSlug) => ({ toSlug, kind: "cites" as const }));
  const derivesFrom = (input.derivesFromSlugs ?? []).map((toSlug) => ({ toSlug, kind: "derives_from" as const }));
  return [...cites, ...derivesFrom];
}

// ---------------------------------------------------------------------------
// Direction 2: an accepted Research OS production -> the engine's own
// PRODUCTION-SCHEMA.md envelope (task item 3)
// ---------------------------------------------------------------------------

/** The shape one `graph.productions` row carries (the Phase 0 migration's own columns). */
export interface GraphProductionRow {
  id: string;
  learner_id?: string;
  target_node_id: string;
  claim: string | null;
  evidence: unknown[];
  sources: unknown[];
  transfer_proof: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface ProductionEnvelopeEvidence {
  source_id: string;
  locator: string;
  quote: string;
  kind: string;
  tier: string;
  citations: Array<{ type: string; value: string }>;
}

export interface ProductionEnvelopeClaim {
  text: string;
  stance: "supports" | "refutes" | "extends";
  slots: { actor: string | null; action: string | null; object: string | null; place: string | null; mechanism: string | null };
  interval: null;
  evidence: ProductionEnvelopeEvidence[];
}

/** The exact JSON shape `tools/hypothesis-engine/docs/PRODUCTION-SCHEMA.md` defines and
 * `hte.corpus.production.Production.from_dict` reads. */
export interface ProductionOutboxEnvelope {
  id: string;
  created_at: string;
  author_role: string;
  grade_band: string;
  school_or_district_id: string;
  research_question: string;
  claims: ProductionEnvelopeClaim[];
  review: { status: "accepted"; history: Array<{ status: string; date: string }> };
  provenance: string;
}

const PRODUCTION_ENVELOPE_ID_PREFIX = "ros-";

/**
 * `graph.productions.id` (a UUID) has no fixed relationship to the engine's
 * own fixture ids (`prod-001`, ...), a `ros-` prefix keeps the two id spaces
 * from ever colliding. Deterministic, so re-deriving it from the same
 * `graph.productions.id` twice is the idempotency key `writeProductionOutbox`
 * upserts on.
 */
export function productionEnvelopeId(graphProductionId: string): string {
  return `${PRODUCTION_ENVELOPE_ID_PREFIX}${graphProductionId}`;
}

/** The tier every mapped evidence entry carries: `hte.evidence.Tier` reads a K-12
 * production's own evidence, unreviewed by a domain scientist, one step more derived
 * than a peer-reviewed source, the same rung `RESEARCH-OS-INTEGRATION.md`'s own
 * `hypothesize_result` example gives a self-report citation ("T3") one notch down
 * from, since a learner's own quote has had no calibration pass run over it at all. */
export const PRODUCTION_EVIDENCE_DEFAULT_TIER = "T4";

function coerceEvidenceEntry(raw: unknown, index: number): ProductionEnvelopeEvidence {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sourceId =
    (typeof record.source_id === "string" && record.source_id) ||
    (typeof record.node_id === "string" && record.node_id) ||
    `unspecified-source-${index}`;
  const locator = typeof record.locator === "string" ? record.locator : "";
  const quote = typeof record.quote === "string" ? record.quote : "";
  return { source_id: sourceId, locator, quote, kind: "textual", tier: PRODUCTION_EVIDENCE_DEFAULT_TIER, citations: [] };
}

/**
 * An accepted `graph.productions` row, as the envelope `writeProductionOutbox`
 * writes to `public.research_os_productions_outbox` (task item 3). Throws if
 * `production.status` is not `"accepted"`, this function is the write-side
 * hook itself, called only at the point a production's status becomes
 * accepted, never speculatively.
 *
 * Mapping decisions, each a documented simplification rather than a silent
 * guess (learning/research-os/ENGINE-BRIDGE.md carries the full rationale):
 * - `author_role` is fixed `"student"`: every Phase 0 production is learner-authored.
 * - `grade_band`/`school_or_district_id` are `"unspecified"`: Phase 0 tracks neither
 *   on a production or a learner yet (task item 6, no roster).
 * - `research_question` is synthesized from the target node's own title, `graph.
 *   productions` carries no dedicated field for it.
 * - The one claim's `stance` defaults to `"supports"` and every slot reads `null`
 *   ("not asserted"): Phase 0's Production form (task item 4) collects a claim,
 *   evidence, and sources, not a stance or slot block.
 * - `review.history` collapses to the single `"accepted"` transition it is called
 *   on: Phase 0 has no review ladder to log the intermediate steps of (task item 6).
 */
export function buildProductionEnvelope(
  production: GraphProductionRow,
  targetNode: { title: string },
): ProductionOutboxEnvelope {
  if (production.status !== "accepted") {
    throw new Error(`buildProductionEnvelope: production ${production.id} is not accepted (status=${production.status})`);
  }
  const evidence = Array.isArray(production.evidence) ? production.evidence.map(coerceEvidenceEntry) : [];
  const acceptedAt = production.updated_at ?? production.created_at;

  return {
    id: productionEnvelopeId(production.id),
    created_at: production.created_at,
    author_role: "student",
    grade_band: "unspecified",
    school_or_district_id: "unspecified",
    research_question: `Research OS production toward: ${targetNode.title}`,
    claims: [
      {
        text: production.claim ?? "",
        stance: "supports",
        slots: { actor: null, action: null, object: null, place: null, mechanism: null },
        interval: null,
        evidence,
      },
    ],
    review: { status: "accepted", history: [{ status: "accepted", date: acceptedAt }] },
    provenance: "research-os-phase0",
  };
}
