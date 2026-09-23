export type NodeKind =
  | "fact"
  | "concept"
  | "law"
  | "derivation"
  | "primary_source"
  | "artifact"
  | "hypothesis"
  | "extension"
  | "replication"
  | "peer_review"
  | "production"
  | "figure"
  | "site"
  | "excerpt";

export type EdgeKind =
  | "prerequisite"
  | "derives_from"
  | "cites"
  | "generalizes"
  | "example_of"
  | "contradicts"
  | "extends"
  | "replicates"
  | "reviews"
  | "answers"
  | "contributes"
  | "authored"
  | "bridges";

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

export type Level = Stage;
export const LEVEL_ORDER: Level[] = STAGE_ORDER;
export const levelAtLeast = stageAtLeast;

export const DELETE_CONFIRM_TOKEN = "DELETE";

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

export type GuidanceLevel = "high" | "medium" | "low";

export interface WorkedExample {
  text: string;
  source: string;
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
  workedExample?: WorkedExample;
  visibility?: "public" | "private" | "shared";
  ownerId?: string | null;
  frontierFlag?: "open_question" | "frontier" | null;
}

export interface GraphEdge {
  id?: string;
  fromId: string;
  toId: string;
  kind: EdgeKind;
  weight?: number | null;
  confidence?: number | null;
  confidenceSource?: string | null;
}

export const DEFAULT_EDGE_CONFIDENCE = 1.0;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;

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
