export type DepEdge = {
  fromId: string;
  toId: string;
  kind: string;
  confidence?: number | null;
};

export type PrimeNodeInput = {
  id: string;
  slug?: string | null;
  title?: string | null;
  kind?: string | null;
  branch?: string | null;
};

export type PrimeStatus = "prime" | "composite" | "unfactored";

export type Decomposition = {
  id: string;
  status: PrimeStatus;
  factors: { id: string; confidence: number }[];
  dependents: string[];
  signature: Map<string, number>;
  depth: number;
  tier: number;
  inCycle: boolean;
};

export type PrimePenetration = {
  id: string;
  composites: number;
  branches: number;
  spread: number;
};

export const FACTOR_EDGES: Record<string, "from" | "to"> = {
  prerequisite: "from",
  derives_from: "to",
};

export const MULTIPLICITY_CAP = 1e12;

export function factorMap(edges: DepEdge[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const e of edges) {
    const side = FACTOR_EDGES[e.kind];
    if (!side || e.fromId === e.toId) continue;
    const node = side === "from" ? e.toId : e.fromId;
    const factor = side === "from" ? e.fromId : e.toId;
    const c = typeof e.confidence === "number" && Number.isFinite(e.confidence) ? e.confidence : 1;
    if (!out.has(node)) out.set(node, new Map());
    const m = out.get(node)!;
    m.set(factor, Math.max(m.get(factor) ?? 0, c));
  }
  return out;
}

export function contractedFactorEdges(keep: Set<string>, edges: DepEdge[]): DepEdge[] {
  const factors = factorMap(edges);
  const out = new Map<string, number>();
  for (const start of Array.from(keep)) {
    const best = new Map<string, number>();
    const stack: [string, number][] = Array.from(factors.get(start) ?? new Map<string, number>()).map(([f, c]) => [f, c] as [string, number]);
    const seen = new Map<string, number>();
    while (stack.length) {
      const [id, conf] = stack.pop()!;
      if (id === start) continue;
      if ((seen.get(id) ?? -1) >= conf) continue;
      seen.set(id, conf);
      if (keep.has(id)) {
        best.set(id, Math.max(best.get(id) ?? 0, conf));
        continue;
      }
      for (const [next, c] of Array.from(factors.get(id) ?? new Map<string, number>())) stack.push([next, Math.min(conf, c)]);
    }
    for (const [factor, conf] of Array.from(best)) {
      const key = `${factor}\u0000${start}`;
      out.set(key, Math.max(out.get(key) ?? 0, conf));
    }
  }
  return Array.from(out).map(([key, confidence]) => {
    const [fromId, toId] = key.split("\u0000");
    return { fromId, toId, kind: "prerequisite", confidence };
  });
}

export function components(ids: string[], factors: Map<string, Map<string, number>>): Map<string, number> {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const comp = new Map<string, number>();
  let next = 0;
  let compId = 0;
  for (const root of ids) {
    if (index.has(root)) continue;
    const work: { id: string; it: Iterator<string> }[] = [];
    const enter = (id: string) => {
      index.set(id, next);
      low.set(id, next);
      next++;
      stack.push(id);
      onStack.add(id);
      work.push({ id, it: (factors.get(id)?.keys() ?? [][Symbol.iterator]()) as Iterator<string> });
    };
    enter(root);
    while (work.length) {
      const top = work[work.length - 1];
      const step = top.it.next();
      if (!step.done) {
        const f = step.value;
        if (!index.has(f)) enter(f);
        else if (onStack.has(f)) low.set(top.id, Math.min(low.get(top.id)!, index.get(f)!));
        continue;
      }
      work.pop();
      if (work.length) {
        const parent = work[work.length - 1].id;
        low.set(parent, Math.min(low.get(parent)!, low.get(top.id)!));
      }
      if (low.get(top.id) === index.get(top.id)) {
        let v: string;
        do {
          v = stack.pop()!;
          onStack.delete(v);
          comp.set(v, compId);
        } while (v !== top.id);
        compId++;
      }
    }
  }
  return comp;
}

export function decompose(nodes: PrimeNodeInput[], edges: DepEdge[]): Map<string, Decomposition> {
  const factors = factorMap(edges);
  const idSet = new Set<string>(nodes.map((n) => n.id));
  for (const [n, fs] of Array.from(factors)) {
    idSet.add(n);
    for (const f of Array.from(fs.keys())) idSet.add(f);
  }
  const ids = Array.from(idSet);
  const dependents = new Map<string, string[]>();
  for (const [n, fs] of Array.from(factors)) {
    for (const f of Array.from(fs.keys())) {
      if (!dependents.has(f)) dependents.set(f, []);
      dependents.get(f)!.push(n);
    }
  }

  const comp = components(ids, factors);
  const members = new Map<number, string[]>();
  for (const id of ids) {
    const c = comp.get(id)!;
    if (!members.has(c)) members.set(c, []);
    members.get(c)!.push(id);
  }
  const compFactors = new Map<number, Map<number, number>>();
  for (const [c, ms] of Array.from(members)) {
    const cf = new Map<number, number>();
    for (const m of ms) {
      for (const f of Array.from(factors.get(m)?.keys() ?? [])) {
        const fc = comp.get(f)!;
        if (fc !== c) cf.set(fc, (cf.get(fc) ?? 0) + 1);
      }
    }
    compFactors.set(c, cf);
  }

  const order = Array.from(members.keys()).sort((a, b) => a - b);
  const compSig = new Map<number, Map<string, number>>();
  const compDepth = new Map<number, number>();
  for (const c of order) {
    const cf = compFactors.get(c)!;
    if (cf.size === 0) {
      const ms = members.get(c)!;
      const hasDependents = ms.some((m) => (dependents.get(m) ?? []).some((d) => comp.get(d) !== c));
      const isCycle = ms.length > 1;
      const sig = new Map<string, number>();
      if (hasDependents || isCycle) for (const m of ms) sig.set(m, 1);
      compSig.set(c, sig);
      compDepth.set(c, 0);
      continue;
    }
    const sig = new Map<string, number>();
    let depth = 0;
    for (const [fc, paths] of Array.from(cf)) {
      for (const [p, mult] of Array.from(compSig.get(fc)!)) {
        sig.set(p, Math.min(MULTIPLICITY_CAP, (sig.get(p) ?? 0) + mult * paths));
      }
      depth = Math.max(depth, compDepth.get(fc)! + 1);
    }
    compSig.set(c, sig);
    compDepth.set(c, depth);
  }

  const out = new Map<string, Decomposition>();
  for (const id of ids) {
    const c = comp.get(id)!;
    const fs = factors.get(id);
    const deps = dependents.get(id) ?? [];
    const inCycle = members.get(c)!.length > 1;
    const externalFactors = compFactors.get(c)!.size > 0;
    let status: PrimeStatus;
    if (externalFactors) status = "composite";
    else if (deps.length > 0 || inCycle) status = "prime";
    else status = "unfactored";
    const depth = compDepth.get(c)!;
    out.set(id, {
      id,
      status,
      factors: Array.from(fs ?? new Map<string, number>())
        .map(([f, confidence]) => ({ id: f, confidence }))
        .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id)),
      dependents: deps.slice().sort(),
      signature: status === "unfactored" ? new Map() : compSig.get(c)!,
      depth,
      tier: depth,
      inCycle,
    });
  }
  return out;
}

export function penetration(nodes: PrimeNodeInput[], dec: Map<string, Decomposition>): PrimePenetration[] {
  const branchOf = new Map<string, string>();
  for (const n of nodes) if (n.branch) branchOf.set(n.id, n.branch);
  const allBranches = new Set<string>(Array.from(branchOf.values()));
  const norm = Math.log(Math.max(2, allBranches.size));
  const byPrime = new Map<string, Map<string, number>>();
  const counts = new Map<string, number>();
  for (const d of Array.from(dec.values())) {
    if (d.status !== "composite") continue;
    const b = branchOf.get(d.id) ?? "(none)";
    for (const p of Array.from(d.signature.keys())) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
      if (!byPrime.has(p)) byPrime.set(p, new Map());
      const m = byPrime.get(p)!;
      m.set(b, (m.get(b) ?? 0) + 1);
    }
  }
  const out: PrimePenetration[] = [];
  for (const d of Array.from(dec.values())) {
    if (d.status !== "prime") continue;
    const n = counts.get(d.id) ?? 0;
    const mix = byPrime.get(d.id) ?? new Map<string, number>();
    let h = 0;
    for (const k of Array.from(mix.values())) {
      const q = k / n;
      h -= q * Math.log(q);
    }
    out.push({ id: d.id, composites: n, branches: mix.size, spread: n > 0 ? h / norm : 0 });
  }
  return out.sort((a, b) => b.composites - a.composites || b.spread - a.spread || a.id.localeCompare(b.id));
}

export type PrimeSummary = {
  nodes: number;
  prime: number;
  composite: number;
  unfactored: number;
  inCycle: number;
  maxDepth: number;
  tiers: number[];
};

export function summarize(dec: Map<string, Decomposition>): PrimeSummary {
  const s: PrimeSummary = { nodes: dec.size, prime: 0, composite: 0, unfactored: 0, inCycle: 0, maxDepth: 0, tiers: [] };
  for (const d of Array.from(dec.values())) {
    s[d.status]++;
    if (d.inCycle) s.inCycle++;
    if (d.status === "unfactored") continue;
    s.maxDepth = Math.max(s.maxDepth, d.depth);
    while (s.tiers.length <= d.tier) s.tiers.push(0);
    s.tiers[d.tier]++;
  }
  return s;
}

export type PriorStanding = { id: string; status: PrimeStatus; depth: number };

export type PrimeMoves = {
  decomposed: string[];
  joined: string[];
  newPrimes: string[];
  deeper: number;
  shallower: number;
};

export function movesSince(prior: PriorStanding[], dec: Map<string, Decomposition>): PrimeMoves {
  const before = new Map(prior.map((p) => [p.id, p]));
  const out: PrimeMoves = { decomposed: [], joined: [], newPrimes: [], deeper: 0, shallower: 0 };
  for (const d of Array.from(dec.values())) {
    const p = before.get(d.id);
    const was = p?.status ?? "unfactored";
    if (was === "prime" && d.status === "composite") out.decomposed.push(d.id);
    if (was === "unfactored" && d.status !== "unfactored") out.joined.push(d.id);
    if (was !== "prime" && d.status === "prime") out.newPrimes.push(d.id);
    if (p && was === d.status && d.status !== "unfactored") {
      if (d.depth > p.depth) out.deeper++;
      else if (d.depth < p.depth) out.shallower++;
    }
  }
  return out;
}
