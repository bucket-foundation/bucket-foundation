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
  /** graph.edges.id. Optional: fixtures built in tests (slug-doubles-as-id,
   * no database) never set it, and every consumer that needs it (currently
   * frontier.ts's low-confidence flag write) treats a missing id as "not
   * writable to graph.edge_flags," never as an error. */
  id?: string;
  fromId: string;
  toId: string;
  kind: EdgeKind;
  weight?: number | null;
  /** graph.edges.confidence (bkt-ros ros-03 item 1). Defaults to
   * DEFAULT_EDGE_CONFIDENCE when absent; read it through edgeConfidence()
   * below rather than this field directly, so every caller applies the
   * same default and clamp. */
  confidence?: number | null;
  /** graph.edges.confidence_source: 'seed' | 'academy_requires' |
   * 'canon_map' | 'inferred' | 'teacher'. Left as `string` rather than a
   * union so a row this app has not yet learned a source name for still
   * round-trips instead of failing to type-check. */
  confidenceSource?: string | null;
}

/** graph.edges.confidence's own column default (bkt-ros ros-03 item 1):
 * an edge with no recorded confidence is full confidence. */
export const DEFAULT_EDGE_CONFIDENCE = 1.0;

/** Below this, a router-selected edge is flagged for a teacher rather than
 * routed through silently (learning/research-os/PLAN-REVISION-1.md section
 * 2b, learning/research-os/ROUTING.md). */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

/**
 * `edge.confidence`, defaulted and clamped: DEFAULT_EDGE_CONFIDENCE when
 * absent or not a finite number, otherwise clamped to (0, 1] so a bad or
 * zero value from a data-entry mistake never produces an infinite or NaN
 * routing cost (frontier.ts's walk uses -log(confidence)). Every reader of
 * edge confidence (frontier.ts, closure.ts) goes through this function
 * rather than `edge.confidence` directly.
 */
export function edgeConfidence(edge: GraphEdge): number {
  const raw = typeof edge.confidence === "number" && Number.isFinite(edge.confidence) ? edge.confidence : DEFAULT_EDGE_CONFIDENCE;
  return Math.min(1, Math.max(1e-6, raw));
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
