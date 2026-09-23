import type { ReviewItem } from "./types";

export function mergeReviewList(existing: ReviewItem[], incoming: ReviewItem[]): ReviewItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}
