import type { EdgeKind, NodeKind } from "../types";

export interface IngestNodeDraft {
  slug: string;
  title: string;
  kind: NodeKind;
  tier: number;
  branch: string;
  summary: string | null;
  labels: Record<string, { title?: string; summary?: string }>;
  provenance: Record<string, unknown>;
}

export interface IngestEdgeDraft {
  fromSlug: string;
  toSlug: string;
  kind: EdgeKind;
  weight?: number | null;
  provenance?: Record<string, unknown>;
  confidence?: number | null;
  confidenceSource?: string | null;
}

export type ReviewItemKind =
  | "unmatched_derives_from"
  | "unresolved_map_entry"
  | "tier_violation"
  | "unresolved_requires"
  | "prerequisite_cycle"
  | "inferred_prerequisite_proposal"
  | "llm_proposed_edge";

export interface ReviewItem {
  id: string;
  kind: ReviewItemKind;
  note: string;
  detail: Record<string, unknown>;
}

export interface IngestResult {
  nodes: IngestNodeDraft[];
  edges: IngestEdgeDraft[];
  reviewList: ReviewItem[];
  stats: Record<string, number>;
}

export const CONFIDENCE_DEFAULTS: Record<"seed" | "academy_requires" | "canon_map" | "inferred", number> = {
  seed: 1.0,
  academy_requires: 1.0,
  canon_map: 0.9,
  inferred: 0.5,
};

export function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
