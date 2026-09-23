import type { EdgeKind, NodeKind, Provenance } from "./types";

export type EngineNodeKind = Extract<NodeKind, "derivation" | "artifact">;

const ENGINE_TIER_PATTERN = /^T([1-6])$/;

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

export function engineNodeSlug(engine: string, runId: string, hypothesisId: string): string {
  return `engine-${slugifyPart(engine)}-${slugifyPart(runId)}-${slugifyPart(hypothesisId)}`;
}

export interface EngineHypothesisInput {
  engine: string;
  runId: string;
  campaign: string;
  hypothesisId: string;
  model?: string;
  tierAssigned?: string;
  branch: string;
  title: string;
  summary?: string;
  kind?: EngineNodeKind;
  posterior?: number;
  elo?: number;
  slots?: Record<string, string | null>;
  addressTimeBin?: string | number | null;
  evidenceRefs?: string[];
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

export function buildEngineEdges(input: EngineHypothesisInput): EngineEdgeDraft[] {
  const cites = (input.evidenceRefs ?? []).map((toSlug) => ({ toSlug, kind: "cites" as const }));
  const derivesFrom = (input.derivesFromSlugs ?? []).map((toSlug) => ({ toSlug, kind: "derives_from" as const }));
  return [...cites, ...derivesFrom];
}

export interface GapNodeInput {
  engine: string;
  runId: string;
  campaign: string;
  gapId: string;
  kind: string;
  description: string;
  valueOfInformation: number;
  branch: string;
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

export function gapNodeSlug(engine: string, runId: string, gapId: string): string {
  return `gap-${slugifyPart(engine)}-${slugifyPart(runId)}-${slugifyPart(gapId)}`;
}

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

export function buildGapEdges(input: GapNodeInput): EngineEdgeDraft[] {
  return input.concernsHypothesisIds.map((hypothesisId) => ({
    toSlug: engineNodeSlug(input.engine, input.runId, hypothesisId),
    kind: "cites" as const,
  }));
}

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

export interface ProductionOutboxTargetNode {
  slug: string;
  title: string;
  tier: number;
  branch: string;
}

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
