import type { IngestEdgeDraft, IngestNodeDraft, ReviewItem } from "./types";

export interface TierViolation {
  fromSlug: string;
  toSlug: string;
  fromTier: number;
  toTier: number;
}

export function checkTierMonotonicity(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[]): TierViolation[] {
  const tierBySlug = new Map(nodes.map((n) => [n.slug, n.tier] as const));
  const violations: TierViolation[] = [];
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    const fromTier = tierBySlug.get(e.fromSlug);
    const toTier = tierBySlug.get(e.toSlug);
    if (fromTier == null || toTier == null) continue;
    if (fromTier > toTier) violations.push({ fromSlug: e.fromSlug, toSlug: e.toSlug, fromTier, toTier });
  }
  return violations;
}

export function checkOrphanEdges(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[]): IngestEdgeDraft[] {
  const slugs = new Set(nodes.map((n) => n.slug));
  return edges.filter((e) => !slugs.has(e.fromSlug) || !slugs.has(e.toSlug));
}

export function tierViolationsToReviewItems(violations: TierViolation[]): ReviewItem[] {
  return violations.map((v) => ({
    id: `tier_violation:${v.fromSlug}:${v.toSlug}`,
    kind: "tier_violation" as const,
    note: `Prerequisite edge ${v.fromSlug} -> ${v.toSlug} has a higher source tier (${v.fromTier}) than target tier (${v.toTier}).`,
    detail: { fromSlug: v.fromSlug, toSlug: v.toSlug, fromTier: v.fromTier, toTier: v.toTier },
  }));
}
