/**
 * Research OS for K-12, Phase 0, shared types (bkt-ros).
 * Mirrors the graph.* tables in
 * supabase/migrations/20260910000000_research_os_graph.sql. Kept dependency-
 * free (no Supabase types) so src/lib/research-os/frontier.ts stays a pure
 * function, testable with plain objects and no database.
 */

export type NodeKind = "fact" | "concept" | "law" | "derivation" | "primary_source" | "artifact";

export type EdgeKind =
  | "prerequisite"
  | "derives_from"
  | "cites"
  | "generalizes"
  | "example_of"
  | "contradicts";

/** The five learner states, in order (RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3). */
export type Stage = "access" | "awareness" | "understanding" | "internalization" | "production";

export const STAGE_ORDER: Stage[] = [
  "access",
  "awareness",
  "understanding",
  "internalization",
  "production",
];

export function stageAtLeast(stage: Stage, min: Stage): boolean {
  return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(min);
}

export interface Provenance {
  type?: "primary_source" | "textbook" | "reference" | "mirror" | string;
  author?: string;
  year?: number;
  title?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  license?: string;
  [k: string]: unknown;
}

export interface GraphNode {
  id: string;
  slug: string;
  title: string;
  kind: NodeKind;
  tier: number;
  branch: string;
  summary: string | null;
  labels?: Record<string, { title?: string; summary?: string }>;
  provenance?: Provenance;
}

export interface GraphEdge {
  fromId: string;
  toId: string;
  kind: EdgeKind;
  weight?: number | null;
}

export interface LearnerNodeState {
  nodeId: string;
  stage: Stage;
  confidence?: number | null;
  updatedAt?: string;
}

/**
 * `hte-serve`'s own `POST /hypothesize` response (`tools/hypothesis-
 * engine/hte/api.py`'s `_build_response`), trimmed to what the workspace
 * UI needs and reshaped to this file's own camelCase convention. Built by
 * `src/app/api/research-os/hypothesize/route.ts` (see that file's own
 * patch, `tools/hypothesis-engine/docs/research-os-hypothesize-route.
 * patch`, not yet applied to this tree).
 */
export interface HypothesizeCorpusSummary {
  nProductions: number;
  statusMin: string;
  priorProfile: string;
  nSources: number | null;
  nEvidence: number | null;
  nHypothesesGenerated: number | null;
  nSurvivors: number | null;
}

export interface HypothesizeGapNode {
  id: string;
  kind: string;
  description: string;
  valueOfInformation: number;
}

export interface HypothesizeCalibration {
  mode: string | null;
  brierScore: number | null;
  coverageOfTruth: number | null;
}

export interface HypothesizeModels {
  roles: Record<string, string>;
  escalation: string;
}

export interface HypothesizeResult {
  runId: string;
  artifactVersion: string | null;
  models: HypothesizeModels | null;
  corpus: HypothesizeCorpusSummary;
  timeline: { bins: Array<{ timeBin: string; rankedHypotheses: unknown[] }> };
  gapNodes: HypothesizeGapNode[];
  calibration: HypothesizeCalibration | null;
}
