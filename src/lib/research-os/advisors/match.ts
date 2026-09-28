import { cosine, project, sharedTopics, type Projector } from "./project";

export type AdvisorProfile = {
  openalexId: string;
  name: string;
  institution: string;
  ror: string;
  country: string;
  field: string;
  topics: string[];
  links: Record<string, string>;
  scores: ArrayLike<number>;
};

export type AdvisorMatch = Omit<AdvisorProfile, "scores"> & {
  rank: number;
  score: number;
  percentile: number;
  shared: string[];
};

export const PAGE_SIZE = 25;
export const MAX_RESULTS = 300;
export const MIN_QUERY_TERMS = 3;

export function percentiles(values: number[]): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 100);
  const sorted = [...values].sort((a, b) => a - b);
  return values.map((v) => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] <= v) lo = mid + 1;
      else hi = mid;
    }
    return (100 * (lo - 1)) / (n - 1);
  });
}

export function diversify<T extends { institution: string }>(rows: T[], cap = 5, window = 50): T[] {
  const picked: T[] = [];
  let held: T[] = [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const inst = row.institution;
    if (picked.length < window && inst && (counts.get(inst) ?? 0) >= cap) {
      held.push(row);
      continue;
    }
    counts.set(inst, (counts.get(inst) ?? 0) + 1);
    picked.push(row);
    if (picked.length === window) {
      picked.push(...held);
      held = [];
    }
  }
  return picked.concat(held);
}

export type MatchResult =
  | { ok: true; total: number; offset: number; results: AdvisorMatch[]; queryTerms: number }
  | { ok: false; reason: "too_few_terms"; queryTerms: number };

export function matchAdvisors(
  p: Projector,
  profiles: AdvisorProfile[],
  text: string,
  opts: { offset?: number; limit?: number; cap?: number | null } = {},
): MatchResult {
  const q = project(p, text);
  if (q.terms.size < MIN_QUERY_TERMS) return { ok: false, reason: "too_few_terms", queryTerms: q.terms.size };
  const scores = profiles.map((prof) => cosine(prof.scores, q.whitened));
  const pct = percentiles(scores);
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || profiles[a].openalexId.localeCompare(profiles[b].openalexId));
  const ranked = order.slice(0, MAX_RESULTS).map((i, r) => ({ i, rank: r + 1, institution: profiles[i].institution }));
  const arranged = opts.cap === null ? ranked : diversify(ranked, opts.cap ?? 5, 50);
  const offset = Math.max(0, Math.min(opts.offset ?? 0, MAX_RESULTS));
  const limit = Math.max(1, Math.min(opts.limit ?? PAGE_SIZE, PAGE_SIZE));
  const results = arranged.slice(offset, offset + limit).map(({ i, rank }) => {
    const { scores: _scores, ...pub } = profiles[i];
    return { ...pub, rank, score: Number(scores[i].toFixed(4)), percentile: Number(pct[i].toFixed(2)), shared: sharedTopics(p, q.terms, profiles[i].topics) };
  });
  return { ok: true, total: arranged.length, offset, results, queryTerms: q.terms.size };
}
