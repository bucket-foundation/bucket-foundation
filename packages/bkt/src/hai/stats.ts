import { seededRandom } from "../grade";

export const CHOICES = 4;

export function guessCorrect(rawFraction: number, k = CHOICES): number {
  return (rawFraction - 1 / k) / (1 - 1 / k);
}

export interface PairOutcome {
  pairId: string;
  h: number;
  j: number;
  a: number;
  hRetest?: number;
  jRetest?: number;
}

export interface Estimate {
  value: number | null;
  lo: number | null;
  hi: number | null;
}

export interface Summary {
  pairs: number;
  retested: number;
  H: number;
  J: number;
  A: number;
  D: Estimate;
  m: Estimate;
  R: Estimate;
  L: Estimate;
  JminusH: Estimate;
  dependence: boolean | null;
}

export const M_FLOOR = 0.1;

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function point(pairs: PairOutcome[]) {
  const H = guessCorrect(mean(pairs.map((p) => p.h)));
  const J = guessCorrect(mean(pairs.map((p) => p.j)));
  const A = guessCorrect(mean(pairs.map((p) => p.a)));
  const base = Math.max(H, A);
  return { H, J, A, D: J - base, m: base < M_FLOOR ? null : J / base, JminusH: J - H };
}

function retestPoint(pairs: PairOutcome[]) {
  const r = pairs.filter((p) => p.hRetest !== undefined && p.jRetest !== undefined);
  if (!r.length) return { R: null, L: null };
  const H0 = guessCorrect(mean(r.map((p) => p.h)));
  const H7 = guessCorrect(mean(r.map((p) => p.hRetest!)));
  const J7 = guessCorrect(mean(r.map((p) => p.jRetest!)));
  return { R: H7 - H0, L: J7 - H7 };
}

function quantile(sorted: number[], q: number): number {
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

export function bootstrapPairs(pairs: PairOutcome[], stat: (p: PairOutcome[]) => number | null, draws = 2000, seed = "hai-boot"): Estimate {
  const value = pairs.length ? stat(pairs) : null;
  if (value === null) return { value: null, lo: null, hi: null };
  const rand = seededRandom(seed);
  const out: number[] = [];
  for (let d = 0; d < draws; d++) {
    const sample = Array.from({ length: pairs.length }, () => pairs[Math.floor(rand() * pairs.length)]);
    const v = stat(sample);
    if (v !== null && Number.isFinite(v)) out.push(v);
  }
  if (out.length < draws / 2) return { value, lo: null, hi: null };
  out.sort((a, b) => a - b);
  return { value, lo: quantile(out, 0.025), hi: quantile(out, 0.975) };
}

export function summarize(pairs: PairOutcome[], draws = 2000, seed = "hai-boot"): Summary {
  const retested = pairs.filter((p) => p.hRetest !== undefined && p.jRetest !== undefined);
  const p = pairs.length ? point(pairs) : { H: NaN, J: NaN, A: NaN };
  const D = bootstrapPairs(pairs, (s) => point(s).D, draws, seed);
  const m = bootstrapPairs(pairs, (s) => point(s).m, draws, seed);
  const JminusH = bootstrapPairs(pairs, (s) => point(s).JminusH, draws, seed);
  const R = bootstrapPairs(retested, (s) => retestPoint(s).R, draws, seed);
  const L = bootstrapPairs(retested, (s) => retestPoint(s).L, draws, seed);
  return { pairs: pairs.length, retested: retested.length, H: p.H, J: p.J, A: p.A, D, m, R, L, JminusH, dependence: dependenceFlag(JminusH, L) };
}

export function dependenceFlag(JminusH: Estimate, L: Estimate): boolean | null {
  if (JminusH.lo === null || L.hi === null) return null;
  return JminusH.lo > 0 && L.hi <= 0;
}

export function halfWidthItems(halfWidth: number, p = 0.5, k = CHOICES, z = 1.96): number {
  const scale = 1 / (1 - 1 / k);
  return Math.ceil(2 * p * (1 - p) * (z * scale / halfWidth) ** 2);
}
