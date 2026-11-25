export type MergeableCard = { reps?: number; lastReview?: number | null; lapses?: number; due?: number | null };

const RANK: ((c: MergeableCard) => number)[] = [(c) => c.reps || 0, (c) => c.lastReview || 0, (c) => c.lapses || 0, (c) => c.due || 0];

export function laterCard<T extends MergeableCard>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  for (const rank of RANK) {
    const d = rank(b) - rank(a);
    if (d !== 0) return d > 0 ? b : a;
  }
  return a;
}
