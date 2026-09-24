import { PERIODS, REGIONS, UNPLACED, type Period, type Region } from "./regions";

export const KINDS = ["human", "site", "event"] as const;
export type CoverageKind = (typeof KINDS)[number];
export const UNRESOLVED = "unresolved";
export const MIN_EXPECTED = 5;
export const GAP_UPPER = 0.5;
export const WESTERN: Region[] = ["Europe", "Northern America"];

export interface BucketCell {
  kind: CoverageKind;
  region: string;
  period: string;
  subjects: number;
  sources: number;
  conflicted: number;
  yearOrFiner: number;
}

export interface ReferenceCell {
  kind: CoverageKind;
  region: string;
  period: string;
  n: number;
}

export interface Interval {
  low: number;
  high: number;
}

export interface CoverageCell {
  region: Region;
  period: Period;
  b: number;
  E: number;
  C: number;
  interval: Interval;
  gap: boolean;
  sources: number;
  conflictRate: number | null;
}

export interface CoverageReport {
  cells: CoverageCell[];
  printed: CoverageCell[];
  gaps: CoverageCell[];
  eurocentrism: { period: Period; b: number; E: number; EI: number; interval: Interval }[];
  precisionShare: { region: Region; subjects: number; share: number | null }[];
  unplaced: Record<CoverageKind, number>;
  unresolved: Record<CoverageKind, number>;
  totals: { B: Record<CoverageKind, number>; W: Record<CoverageKind, number> };
}

function logGamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const z = x - 1;
  let a = c[0];
  const t = z + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

export function regularizedGammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

export function gammaQuantile(p: number, shape: number): number {
  let lo = 0;
  let hi = Math.max(10, shape * 4 + 50);
  while (regularizedGammaP(shape, hi) < p) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (regularizedGammaP(shape, mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function garwood(b: number, level = 0.95): Interval {
  if (!Number.isInteger(b) || b < 0) throw new Error(`a Poisson count is a non-negative integer, got ${b}`);
  const alpha = 1 - level;
  return { low: b === 0 ? 0 : gammaQuantile(alpha / 2, b), high: gammaQuantile(1 - alpha / 2, b + 1) };
}

const zero = (): Record<CoverageKind, number> => ({ human: 0, site: 0, event: 0 });
const isRegion = (r: string): r is Region => (REGIONS as readonly string[]).includes(r);
const isPeriod = (p: string): p is Period => (PERIODS as readonly string[]).includes(p);

export function coverageReport(bucket: BucketCell[], reference: ReferenceCell[]): CoverageReport {
  const B = zero();
  const W = zero();
  const unplaced = zero();
  const unresolved = zero();
  const w = new Map<string, number>();
  for (const r of reference) {
    if (!isRegion(r.region) || !isPeriod(r.period)) continue;
    W[r.kind] += r.n;
    w.set(`${r.kind}|${r.region}|${r.period}`, (w.get(`${r.kind}|${r.region}|${r.period}`) ?? 0) + r.n);
  }
  const b = new Map<string, { n: number; sources: number; conflicted: number }>();
  const precision = new Map<string, { n: number; fine: number }>();
  for (const c of bucket) {
    if (c.period === UNRESOLVED || !isPeriod(c.period)) {
      unresolved[c.kind] += c.subjects;
      continue;
    }
    if (c.region === UNPLACED || !isRegion(c.region)) {
      unplaced[c.kind] += c.subjects;
      continue;
    }
    B[c.kind] += c.subjects;
    const key = `${c.region}|${c.period}`;
    const held = b.get(key) ?? { n: 0, sources: 0, conflicted: 0 };
    b.set(key, { n: held.n + c.subjects, sources: held.sources + c.sources, conflicted: held.conflicted + c.conflicted });
    const p = precision.get(c.region) ?? { n: 0, fine: 0 };
    precision.set(c.region, { n: p.n + c.subjects, fine: p.fine + c.yearOrFiner });
  }

  const cells: CoverageCell[] = [];
  for (const region of REGIONS) {
    for (const period of PERIODS) {
      let E = 0;
      for (const k of KINDS) if (W[k] > 0) E += (B[k] * (w.get(`${k}|${region}|${period}`) ?? 0)) / W[k];
      const got = b.get(`${region}|${period}`) ?? { n: 0, sources: 0, conflicted: 0 };
      const g = garwood(got.n);
      const interval = E > 0 ? { low: g.low / E, high: g.high / E } : { low: 0, high: Infinity };
      cells.push({
        region,
        period,
        b: got.n,
        E,
        C: E > 0 ? got.n / E : NaN,
        interval,
        gap: E >= MIN_EXPECTED && interval.high < GAP_UPPER,
        sources: got.sources,
        conflictRate: got.n > 0 ? got.conflicted / got.n : null,
      });
    }
  }
  const printed = cells.filter((c) => c.E >= MIN_EXPECTED);
  const eurocentrism = PERIODS.map((period) => {
    const west = cells.filter((c) => c.period === period && WESTERN.includes(c.region));
    const bw = west.reduce((a, c) => a + c.b, 0);
    const Ew = west.reduce((a, c) => a + c.E, 0);
    const g = garwood(bw);
    return { period, b: bw, E: Ew, EI: Ew > 0 ? bw / Ew : NaN, interval: Ew > 0 ? { low: g.low / Ew, high: g.high / Ew } : { low: 0, high: Infinity } };
  });
  const precisionShare = REGIONS.map((region) => {
    const p = precision.get(region);
    return { region, subjects: p?.n ?? 0, share: p && p.n > 0 ? p.fine / p.n : null };
  });
  return { cells, printed, gaps: printed.filter((c) => c.gap), eurocentrism, precisionShare, unplaced, unresolved, totals: { B, W } };
}
