/**
 * Research OS for K-12, ingestion validators (bkt-ros, ingestion slice,
 * task item 3). Two checks shared by both importers and their tests:
 * every edge resolves to a node the same import produced (no orphan
 * edges), and every `prerequisite` edge's source node has a tier no
 * greater than its target's (tier monotonicity). Both are pure functions
 * over plain drafts, no I/O.
 */

import type { IngestEdgeDraft, IngestNodeDraft, ReviewItem } from "./types";

export interface TierViolation {
  fromSlug: string;
  toSlug: string;
  fromTier: number;
  toTier: number;
}

/**
 * Every `prerequisite` edge where the source (the easier, prerequisite
 * node) carries a strictly higher tier than the target (the harder,
 * dependent node) it points at: the invariant "a prerequisite never has
 * a higher tier than its dependent." Only `prerequisite` edges are
 * checked: tier is a difficulty/grade-level proxy, and the other five edge
 * kinds (`derives_from`, `cites`, `generalizes`, `example_of`,
 * `contradicts`) carry no such ordering claim.
 */
export function checkTierMonotonicity(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[]): TierViolation[] {
  const tierBySlug = new Map(nodes.map((n) => [n.slug, n.tier] as const));
  const violations: TierViolation[] = [];
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    const fromTier = tierBySlug.get(e.fromSlug);
    const toTier = tierBySlug.get(e.toSlug);
    if (fromTier == null || toTier == null) continue; // orphan edge, reported by checkOrphanEdges
    if (fromTier > toTier) violations.push({ fromSlug: e.fromSlug, toSlug: e.toSlug, fromTier, toTier });
  }
  return violations;
}

/** Every edge whose `fromSlug` or `toSlug` does not resolve to a node in
 * the same node set: the ingestion slice never ships a dangling edge. */
export function checkOrphanEdges(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[]): IngestEdgeDraft[] {
  const slugs = new Set(nodes.map((n) => n.slug));
  return edges.filter((e) => !slugs.has(e.fromSlug) || !slugs.has(e.toSlug));
}

/** `checkTierMonotonicity`'s output, reframed as review items: task item
 * 3 asks for violations reported as a list on the review list, and the
 * import run keeps going. */
export function tierViolationsToReviewItems(violations: TierViolation[]): ReviewItem[] {
  return violations.map((v) => ({
    id: `tier_violation:${v.fromSlug}:${v.toSlug}`,
    kind: "tier_violation" as const,
    note: `Prerequisite edge ${v.fromSlug} -> ${v.toSlug} has a higher source tier (${v.fromTier}) than target tier (${v.toTier}).`,
    detail: { fromSlug: v.fromSlug, toSlug: v.toSlug, fromTier: v.fromTier, toTier: v.toTier },
  }));
}
