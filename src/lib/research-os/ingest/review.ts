/**
 * Research OS for K-12, review-list merge helper (bkt-ros, ingestion
 * slice). Both importers (and the tier-monotonicity check) can produce
 * `ReviewItem`s; scripts/research-os/ingest/*.ts merge them into one
 * `scripts/research-os/ingest/out/review-list.json` so a human reviewer
 * has a single file to read regardless of which importer last ran.
 * Keyed by `ReviewItem.id`, so re-running an importer updates that
 * item's own row instead of appending a duplicate: the review list
 * converges the same way graph.nodes' slug-keyed upsert does.
 */

import type { ReviewItem } from "./types";

export function mergeReviewList(existing: ReviewItem[], incoming: ReviewItem[]): ReviewItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}
