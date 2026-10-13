import type { ClaimCard } from "@/lib/canon-claims";

export const FOUNDATION_MIN_SCORE = 8;
export const FOUNDATION_MIN_SIGNALS = 3;

export type ExcerptItem = {
  concept: string;
  slug: string;
  excerpt: string;
  videoTitle: string;
  timestamp: string;
  score: number;
  url: string;
  crossConcepts: string[];
  qualified: boolean;
};

export function isFoundationTier(c: Pick<ClaimCard, "score" | "patternSignals">): boolean {
  return c.score >= FOUNDATION_MIN_SCORE && c.patternSignals.length >= FOUNDATION_MIN_SIGNALS;
}

export function toExcerptItem(c: ClaimCard): ExcerptItem {
  return {
    concept: c.concept,
    slug: c.slug,
    excerpt: c.excerpt,
    videoTitle: c.videoTitle,
    timestamp: c.timestamp,
    score: c.score,
    url: c.url,
    crossConcepts: c.crossConcepts,
    qualified: isFoundationTier(c),
  };
}
