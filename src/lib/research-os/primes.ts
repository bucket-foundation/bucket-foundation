/**
 * Prime decomposition of the Research OS graph (ros-prime 1, carries ros-25).
 *
 * A node's factors are the nodes it rests on: the `from` side of a
 * `prerequisite` edge that points at it, and the `to` side of a
 * `derives_from` edge that leaves it. Decomposing a node means following
 * factors until nothing splits further. The nodes at the bottom are primes:
 * the equals sign is the worked example, a prime that a large share of
 * mathematics and physics contains.
 *
 * Three states, because the graph is incomplete:
 * - composite: the node has at least one factor.
 * - prime: no factors, and at least one node rests on it. Irreducible in the
 *   graph as it stands; the decompose-further queue (ros-prime 2) confirms
 *   or splits it.
 * - unfactored: no dependency edge in either direction, so the graph says
 *   nothing about its makeup yet.
 *
 * A prime signature maps each prime under a node to the number of distinct
 * factor paths that reach it, the multiplicity. Dependency cycles collapse
 * into one unit whose members share a signature. Pure and dependency-free:
 * the script in scripts/research-os/primes-report.ts feeds it rows from the
 * local graph, and scripts/test-research-os-primes.ts tests it with plain
 * objects. Definitions and results: learning/research-os/PRIMES.md.
 */

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
  /** Direct factors with the highest edge confidence seen for each. */
  factors: { id: string; confidence: number }[];
  /** Direct dependents: the nodes that list this one as a factor. */
  dependents: string[];
  /** Prime id to the number of distinct factor paths reaching it. */
  signature: Map<string, number>;
  /** Longest factor path down to a prime; 0 for a prime or unfactored node. */
  depth: number;
  /** Tier by primality: primes sit at 0, and each step up combines lower tiers. */
  tier: number;
  /** True when the node sits in a dependency cycle with another node. */
  inCycle: boolean;
};

export type PrimePenetration = {
  id: string;
  /** Composites whose signature contains this prime. */
  composites: number;
  /** Distinct branches among those composites. */
  branches: number;
  /** Shannon entropy of the branch mix, 0 to 1, normalized by log(branches seen graph-wide). */
  spread: number;
};

/** Edge kinds that carry a factor, and which end holds the factor. */
export const FACTOR_EDGES: Record<string, "from" | "to"> = {
  prerequisite: "from",
  derives_from: "to",
};

/** Multiplicities above this are clamped, so a dense graph cannot overflow. */
export const MULTIPLICITY_CAP = 1e12;

/** Node id to its direct factors, each with its highest edge confidence. */
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

/** Tarjan's strongly connected components over node to factor links, iterative. Component ids run in reverse topological order: factors first. */
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

/** Decompose every node. Nodes named only by edges are included too. */
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

  // Collapse cycles: each component is one unit on a DAG of components.
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

  // Tarjan numbers components in reverse topological order over factor links:
  // a component's factors always get lower ids, so ascending order visits
  // factors before the nodes that rest on them.
  const order = Array.from(members.keys()).sort((a, b) => a - b);
  const compSig = new Map<number, Map<string, number>>();
  const compDepth = new Map<number, number>();
  for (const c of order) {
    const cf = compFactors.get(c)!;
    if (cf.size === 0) {
      const ms = members.get(c)!;
      const hasDependents = ms.some((m) => (dependents.get(m) ?? []).some((d) => comp.get(d) !== c));
      const isCycle = ms.length > 1;
      // A factorless unit is prime when something rests on it or it is a cycle
      // of mutual factors; each member stands for itself in the signature.
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

/** How far each prime reaches: composites containing it and their branch mix. */
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
  /** Nodes per tier, tier 0 first, composites and primes only. */
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
