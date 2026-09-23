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

export type AttendOptions = { k?: number; tau?: number; basis?: PrimeBasis; tieBreak?: (a: string, b: string) => number };

export type Attention = { id: string; score: number; weight: number; sharedPrimes: string[] };

export function attend(dec: Map<string, Decomposition>, queryIds: string[], opts: AttendOptions = {}): Attention[] {
  const k = opts.k ?? 8;
  const tau = opts.tau ?? 0.1;
  const basis = opts.basis ?? primeBasis(dec);
  const tieBreak = opts.tieBreak ?? ((a: string, b: string) => (dec.get(a)?.depth ?? 0) - (dec.get(b)?.depth ?? 0) || a.localeCompare(b));
  const q = new Map<string, number>();
  for (const id of queryIds) for (const [p, w] of Array.from(basis.vectors.get(id) ?? new Map<string, number>())) q.set(p, (q.get(p) ?? 0) + w);
  let qsq = 0;
  for (const w of Array.from(q.values())) qsq += w * w;
  const qn = Math.sqrt(qsq);
  if (qn === 0) return [];
  const seeds = new Set(queryIds);
  const scored: { id: string; score: number; shared: { p: string; c: number }[] }[] = [];
  for (const [id, x] of Array.from(basis.vectors)) {
    if (seeds.has(id) || dec.get(id)?.status !== "composite") continue;
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
    if (dot > 0) scored.push({ id, score: dot / (qn * vn), shared });
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
