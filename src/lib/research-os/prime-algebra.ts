import type { Decomposition } from "./primes";

export type PrimeBasis = {
  composites: number;
  df: Map<string, number>;
  idf: Map<string, number>;
  vectors: Map<string, Map<string, number>>;
  norms: Map<string, number>;
};

function compositeList(dec: Map<string, Decomposition>): Decomposition[] {
  return Array.from(dec.values())
    .filter((d) => d.status === "composite")
    .sort((a, b) => a.id.localeCompare(b.id));
}

function primeIds(dec: Map<string, Decomposition>): string[] {
  return Array.from(dec.values())
    .filter((d) => d.status === "prime")
    .map((d) => d.id)
    .sort();
}

export function documentFrequency(dec: Map<string, Decomposition>): Map<string, number> {
  const df = new Map<string, number>();
  for (const id of primeIds(dec)) df.set(id, 0);
  for (const d of compositeList(dec)) for (const p of Array.from(d.signature.keys())) df.set(p, (df.get(p) ?? 0) + 1);
  return df;
}

export function primeBasis(dec: Map<string, Decomposition>): PrimeBasis {
  const n = compositeList(dec).length;
  const df = documentFrequency(dec);
  const idf = new Map<string, number>();
  for (const [p, f] of Array.from(df)) idf.set(p, Math.log((n + 1) / (f + 1)));
  const vectors = new Map<string, Map<string, number>>();
  const norms = new Map<string, number>();
  for (const d of Array.from(dec.values())) {
    if (d.status === "unfactored") continue;
    const x = new Map<string, number>();
    let sq = 0;
    for (const [p, m] of Array.from(d.signature)) {
      const w = Math.log(1 + m) * (idf.get(p) ?? 0);
      if (w === 0) continue;
      x.set(p, w);
      sq += w * w;
    }
    vectors.set(d.id, x);
    norms.set(d.id, Math.sqrt(sq));
  }
  return { composites: n, df, idf, vectors, norms };
}

export type AttendOptions = {
  k?: number;
  tau?: number;
  basis?: PrimeBasis;
  tieBreak?: (a: string, b: string) => number;
  mask?: ReadonlySet<string>;
  queryVector?: Map<string, number>;
};

export type PrimeTerm = { prime: string; term: number };

export type Attention = { id: string; score: number; weight: number; sharedPrimes: string[]; terms: PrimeTerm[] };

export function queryVectorOf(basis: PrimeBasis, ids: { id: string; weight?: number }[]): Map<string, number> {
  const q = new Map<string, number>();
  for (const { id, weight = 1 } of ids) for (const [p, w] of Array.from(basis.vectors.get(id) ?? new Map<string, number>())) q.set(p, (q.get(p) ?? 0) + weight * w);
  return q;
}

export function attend(dec: Map<string, Decomposition>, queryIds: string[], opts: AttendOptions = {}): Attention[] {
  const k = opts.k ?? 8;
  const tau = opts.tau ?? 0.1;
  const basis = opts.basis ?? primeBasis(dec);
  const tieBreak = opts.tieBreak ?? ((a: string, b: string) => (dec.get(a)?.depth ?? 0) - (dec.get(b)?.depth ?? 0) || a.localeCompare(b));
  const q = opts.queryVector ?? queryVectorOf(basis, queryIds.map((id) => ({ id })));
  let qsq = 0;
  for (const w of Array.from(q.values())) qsq += w * w;
  const qn = Math.sqrt(qsq);
  if (qn === 0) return [];
  const seeds = new Set(queryIds);
  const scored: { id: string; score: number; norm: number; shared: { p: string; c: number }[] }[] = [];
  for (const [id, x] of Array.from(basis.vectors)) {
    if (seeds.has(id) || opts.mask?.has(id) || dec.get(id)?.status !== "composite") continue;
    const vn = basis.norms.get(id) ?? 0;
    if (vn === 0) continue;
    let dot = 0;
    const shared: { p: string; c: number }[] = [];
    for (const [p, w] of Array.from(x)) {
      const qw = q.get(p);
      if (qw === undefined) continue;
      dot += qw * w;
      shared.push({ p, c: qw * w });
    }
    if (dot > 0) scored.push({ id, score: dot / (qn * vn), norm: qn * vn, shared });
  }
  if (!scored.length) return [];
  const top = Math.max(...scored.map((s) => s.score));
  let z = 0;
  for (const s of scored) z += Math.exp((s.score - top) / tau);
  return scored
    .map((s) => ({
      id: s.id,
      score: s.score,
      weight: Math.exp((s.score - top) / tau) / z,
      sharedPrimes: s.shared.sort((a, b) => b.c - a.c || a.p.localeCompare(b.p)).map((x) => x.p),
      terms: s.shared.map((x) => ({ prime: x.p, term: x.c / s.norm })),
    }))
    .sort((a, b) => b.score - a.score || tieBreak(a.id, b.id))
    .slice(0, k);
}

export function firstPrimes(count: number): number[] {
  const out: number[] = [];
  for (let c = 2; out.length < count; c++) if (out.every((p) => p * p > c || c % p !== 0)) out.push(c);
  return out;
}

export type LeibnizPrime = { id: string; q: number; df: number };

export function leibnizPrimes(dec: Map<string, Decomposition>): LeibnizPrime[] {
  const df = documentFrequency(dec);
  const ranked = Array.from(df).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const qs = firstPrimes(ranked.length);
  return ranked.map(([id, f], i) => ({ id, q: qs[i], df: f }));
}

function supportKey(ids: string[]): string {
  return ids.slice().sort().join("\u0000");
}

function distinctSupports(dec: Map<string, Decomposition>): string[][] {
  const seen = new Map<string, string[]>();
  for (const d of compositeList(dec)) {
    const s = Array.from(d.signature.keys()).sort();
    if (s.length) seen.set(supportKey(s), s);
  }
  return Array.from(seen.values());
}

function logSumExp(xs: number[]): number {
  if (!xs.length) return -Infinity;
  const m = Math.max(...xs);
  let t = 0;
  for (const x of xs) t += Math.exp(x - m);
  return m + Math.log(t);
}

export type Coverage = { s: number; logD: number; logClosure: number; coverage: number; supports: number };

export function coverage(dec: Map<string, Decomposition>, s: number, primes = leibnizPrimes(dec)): Coverage {
  const logQ = new Map(primes.map((p) => [p.id, Math.log(p.q)]));
  const supports = distinctSupports(dec);
  const logD = logSumExp(supports.map((sup) => -s * sup.reduce((t, p) => t + (logQ.get(p) ?? 0), 0)));
  let logE = 0;
  for (const p of primes) logE += Math.log1p(Math.exp(-s * Math.log(p.q)));
  const logClosure = logE > 0 ? logE + Math.log(-Math.expm1(-logE)) : -Infinity;
  return { s, logD, logClosure, coverage: logClosure === -Infinity ? 0 : Math.exp(logD - logClosure), supports: supports.length };
}

export type Nonface = { primes: string[]; expected: number };

export type Frontier = {
  composites: number;
  pairs: number;
  triples: number;
  expectedAtLeastOne: number;
  nonfaces: Nonface[];
};

export function frontier(dec: Map<string, Decomposition>, maxSize: 2 | 3 = 3): Frontier {
  const comps = compositeList(dec);
  const n = comps.length;
  const words = Math.ceil(n / 32) || 1;
  const df = documentFrequency(dec);
  const ids = Array.from(df)
    .filter(([, f]) => f > 0)
    .map(([id]) => id)
    .sort();
  const bits = ids.map(() => new Uint32Array(words));
  const index = new Map(ids.map((id, i) => [id, i]));
  comps.forEach((d, c) => {
    for (const p of Array.from(d.signature.keys())) {
      const i = index.get(p);
      if (i !== undefined) bits[i][c >>> 5] |= 1 << (c & 31);
    }
  });
  const meets = (sets: Uint32Array[]) => {
    for (let w = 0; w < words; w++) {
      let v = sets[0][w];
      for (let j = 1; j < sets.length && v; j++) v &= sets[j][w];
      if (v) return true;
    }
    return false;
  };
  const expected = (set: string[]) => set.reduce((t, p) => t * ((df.get(p) ?? 0) / n), n);
  const out: Nonface[] = [];
  const above: Set<number>[] = ids.map(() => new Set<number>());
  let pairs = 0;
  let triples = 0;
  for (let a = 0; a < ids.length; a++) {
    for (let b = a + 1; b < ids.length; b++) {
      if (meets([bits[a], bits[b]])) above[a].add(b);
      else {
        pairs++;
        out.push({ primes: [ids[a], ids[b]], expected: expected([ids[a], ids[b]]) });
      }
    }
  }
  if (maxSize === 3) {
    for (let a = 0; a < ids.length; a++)
      for (const b of Array.from(above[a]))
        for (const c of Array.from(above[b])) {
          if (!above[a].has(c) || meets([bits[a], bits[b], bits[c]])) continue;
          triples++;
          const set = [ids[a], ids[b], ids[c]];
          out.push({ primes: set, expected: expected(set) });
        }
  }
  out.sort((x, y) => y.expected - x.expected || x.primes.join().localeCompare(y.primes.join()));
  return { composites: n, pairs, triples, expectedAtLeastOne: out.filter((x) => x.expected >= 1).length, nonfaces: out };
}

export function withinGroup(nonfaces: Nonface[], group: (prime: string) => string): Nonface[] {
  return nonfaces.filter((x) => x.primes.every((p) => group(p) === group(x.primes[0])));
}

export type PrimePair = { a: string; b: string; joint: number; dfA: number; dfB: number; pmi: number };

export function pmiPairs(dec: Map<string, Decomposition>, minJoint = 3): PrimePair[] {
  const comps = compositeList(dec);
  const n = comps.length;
  const df = documentFrequency(dec);
  const joint = new Map<string, number>();
  for (const d of comps) {
    const s = Array.from(d.signature.keys()).sort();
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) joint.set(`${s[i]}\u0000${s[j]}`, (joint.get(`${s[i]}\u0000${s[j]}`) ?? 0) + 1);
  }
  const out: PrimePair[] = [];
  for (const [key, c] of Array.from(joint)) {
    if (c < minJoint) continue;
    const [a, b] = key.split("\u0000");
    const dfA = df.get(a) ?? 0;
    const dfB = df.get(b) ?? 0;
    out.push({ a, b, joint: c, dfA, dfB, pmi: Math.log((c * n) / (dfA * dfB)) });
  }
  return out.sort((x, y) => y.pmi - x.pmi || y.joint - x.joint || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
}

export type Implication = { node: string; factor: string; support: number; mutual: boolean };

export function implications(dec: Map<string, Decomposition>, minSupport = 3): Implication[] {
  const comps = compositeList(dec);
  const holders = new Map<string, Set<number>>();
  comps.forEach((d, i) => {
    for (const p of Array.from(d.signature.keys())) {
      if (!holders.has(p)) holders.set(p, new Set());
      holders.get(p)!.add(i);
    }
  });
  const ids = Array.from(holders.keys()).sort();
  const implies = (i: string, j: string) => Array.from(holders.get(i)!).every((c) => holders.get(j)!.has(c));
  const out: Implication[] = [];
  for (const i of ids) {
    const support = holders.get(i)!.size;
    if (support < minSupport) continue;
    for (const j of ids) {
      if (i === j || holders.get(j)!.size < support || !implies(i, j)) continue;
      out.push({ node: i, factor: j, support, mutual: holders.get(j)!.size === support });
    }
  }
  return out.sort((a, b) => b.support - a.support || a.node.localeCompare(b.node) || a.factor.localeCompare(b.factor));
}

export type DepthPolynomial = { id: string; coefficients: number[]; penetration: number; meanDepth: number; degree: number };

export function depthPolynomials(dec: Map<string, Decomposition>): DepthPolynomial[] {
  const coeffs = new Map<string, number[]>();
  for (const id of primeIds(dec)) coeffs.set(id, [0]);
  for (const d of compositeList(dec)) {
    for (const p of Array.from(d.signature.keys())) {
      const a = coeffs.get(p) ?? [0];
      while (a.length <= d.depth) a.push(0);
      a[d.depth]++;
      coeffs.set(p, a);
    }
  }
  return Array.from(coeffs)
    .map(([id, a]) => {
      const g1 = a.reduce((t, x) => t + x, 0);
      const dg1 = a.reduce((t, x, d) => t + d * x, 0);
      return { id, coefficients: a, penetration: g1, meanDepth: g1 ? dg1 / g1 : 0, degree: g1 ? a.length - 1 : 0 };
    })
    .sort((x, y) => y.penetration - x.penetration || x.id.localeCompare(y.id));
}

export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function curveballTrade(rows: number[][], rand: () => number): void {
  if (rows.length < 2) return;
  const i = Math.floor(rand() * rows.length);
  let j = Math.floor(rand() * (rows.length - 1));
  if (j >= i) j++;
  const a = new Set(rows[i]);
  const b = new Set(rows[j]);
  const onlyA = rows[i].filter((x) => !b.has(x));
  const onlyB = rows[j].filter((x) => !a.has(x));
  if (!onlyA.length || !onlyB.length) return;
  const pool = onlyA.concat(onlyB);
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(rand() * (k + 1));
    [pool[k], pool[r]] = [pool[r], pool[k]];
  }
  const shared = rows[i].filter((x) => b.has(x));
  rows[i] = shared.concat(pool.slice(0, onlyA.length));
  rows[j] = shared.concat(pool.slice(onlyA.length));
}

export type NullOptions = { draws?: number; seed?: string; burnIn?: number; thin?: number };

export type NullResult = { draws: number; empty: number[]; p: number[] };

export function nullFrontier(dec: Map<string, Decomposition>, sets: string[][], opts: NullOptions = {}): NullResult {
  const draws = opts.draws ?? 1000;
  const comps = compositeList(dec);
  const ids = Array.from(new Set(comps.flatMap((d) => Array.from(d.signature.keys())))).sort();
  const index = new Map(ids.map((id, i) => [id, i]));
  const rows = comps.map((d) => Array.from(d.signature.keys()).map((p) => index.get(p)!));
  const n = rows.length;
  const words = Math.ceil(n / 32) || 1;
  const rand = seededRandom(opts.seed ?? "null-frontier");
  const burnIn = opts.burnIn ?? 5 * n;
  const thin = opts.thin ?? n;
  const asked = sets.map((s) => s.map((p) => index.get(p)));
  const empty = sets.map(() => 0);
  for (let t = 0; t < burnIn; t++) curveballTrade(rows, rand);
  for (let d = 0; d < draws; d++) {
    for (let t = 0; t < thin; t++) curveballTrade(rows, rand);
    const bits = ids.map(() => new Uint32Array(words));
    rows.forEach((r, c) => {
      for (const p of r) bits[p][c >>> 5] |= 1 << (c & 31);
    });
    asked.forEach((set, k) => {
      if (set.some((p) => p === undefined)) {
        empty[k]++;
        return;
      }
      for (let w = 0; w < words; w++) {
        let v = bits[set[0]!][w];
        for (let j = 1; j < set.length && v; j++) v &= bits[set[j]!][w];
        if (v) return;
      }
      empty[k]++;
    });
  }
  return { draws, empty, p: empty.map((e) => (e + 1) / (draws + 1)) };
}

export function benjaminiHochberg(p: number[], q = 0.05): boolean[] {
  const order = p.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  let cut = -1;
  order.forEach(([v], rank) => {
    if (v <= ((rank + 1) / p.length) * q) cut = rank;
  });
  const out = p.map(() => false);
  for (let r = 0; r <= cut; r++) out[order[r][1]] = true;
  return out;
}

export function formatP(p: number, draws: number): string {
  return p * (draws + 1) <= 1 ? `<${(1 / draws).toPrecision(1)}` : p.toPrecision(2);
}

export function primeReach(dec: Map<string, Decomposition>, tracked: string[]): Map<string, Set<string>> {
  const want = new Set(tracked);
  const reach = new Map<string, Set<string>>();
  for (const d of Array.from(dec.values())) reach.set(d.id, new Set(want.has(d.id) ? [d.id] : []));
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of Array.from(dec.values())) {
      const mine = reach.get(d.id)!;
      for (const f of d.factors)
        for (const p of Array.from(reach.get(f.id) ?? [])) {
          if (mine.has(p)) continue;
          mine.add(p);
          changed = true;
        }
    }
  }
  return reach;
}

export type GapClass = "missing_edge" | "chance" | "real";

export type ClassifiedNonface = Nonface & { p: number; gap: GapClass };

export type GapReport = { draws: number; counts: Record<GapClass, number>; nonfaces: ClassifiedNonface[] };

export function classifyFrontier(
  dec: Map<string, Decomposition>,
  nonfaces: Nonface[],
  counterfactual: Map<string, Decomposition> | null,
  opts: NullOptions & { q?: number } = {},
): GapReport {
  const nul = nullFrontier(
    dec,
    nonfaces.map((x) => x.primes),
    opts,
  );
  const significant = benjaminiHochberg(nul.p, opts.q ?? 0.05);
  const tracked = Array.from(new Set(nonfaces.flatMap((x) => x.primes)));
  const reach = counterfactual ? primeReach(counterfactual, tracked) : null;
  const closes = (set: string[]) => {
    if (!reach) return false;
    for (const r of Array.from(reach.values())) if (set.every((p) => r.has(p))) return true;
    return false;
  };
  const counts: Record<GapClass, number> = { missing_edge: 0, chance: 0, real: 0 };
  const out = nonfaces.map((x, i) => {
    const gap: GapClass = closes(x.primes) ? "missing_edge" : significant[i] ? "real" : "chance";
    counts[gap]++;
    return { ...x, p: nul.p[i], gap };
  });
  const rank: Record<GapClass, number> = { real: 0, missing_edge: 1, chance: 2 };
  out.sort((a, b) => rank[a.gap] - rank[b.gap] || b.expected - a.expected || a.primes.join().localeCompare(b.primes.join()));
  return { draws: nul.draws, counts, nonfaces: out };
}

export function topJaccard(a: string[][], b: string[][], k = 20): number {
  const key = (s: string[]) => s.slice().sort().join("|");
  const x = new Set(a.slice(0, k).map(key));
  const y = new Set(b.slice(0, k).map(key));
  const inter = Array.from(x).filter((s) => y.has(s)).length;
  const union = new Set([...Array.from(x), ...Array.from(y)]).size;
  return union ? inter / union : 1;
}
