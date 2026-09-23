import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReviewItem } from "../../../../src/lib/research-os/ingest/types";

export const INGEST_OUT_DIR = join(__dirname, "..", "out");

export function readExistingReviewList(): ReviewItem[] {
  const p = join(INGEST_OUT_DIR, "review-list.json");
  if (!existsSync(p)) return [];
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function writeReviewList(items: ReviewItem[]): void {
  mkdirSync(INGEST_OUT_DIR, { recursive: true });
  writeFileSync(
    join(INGEST_OUT_DIR, "review-list.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), items }, null, 2) + "\n",
  );
}
