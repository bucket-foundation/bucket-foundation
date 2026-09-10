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
