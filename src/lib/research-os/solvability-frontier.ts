import type { AtlasBranch, AtlasProduction } from "./solvability-atlas";

export interface SimilarityData {
  schema: string;
  ids: string[];
  upper: number[][];
}

export const FRONTIER_KINDS = ["problem", "sourced", "variant", "lean"] as const;
export type FrontierKind = (typeof FRONTIER_KINDS)[number];

export interface NeighborNode {
  id: string;
  title: string;
  branch: AtlasBranch;
  kind: FrontierKind;
  form: string;
  variant_of: string | null;
  status: string;
  solved: boolean;
  resolved: number | null;
  posed?: number | null;
  words?: number;
  theta: number;
  source: string;
  licence: string;
  text_kind: string;
  n: number[];
  s: number[];
  solved_nearest: { id: string; sim: number } | null;
}

export interface NeighborData {
  schema: string;
  model: string;
  revision: string;
  k: number;
  note: string;
  solved_rule: string;
  text_counts: Record<string, number>;
  ids: string[];
  solved: string[];
  nodes: NeighborNode[];
}

export type FrontierInput = SimilarityData | NeighborData;

export function isNeighborData(data: FrontierInput): data is NeighborData {
  return "nodes" in data && "k" in data;
}

export const REACH_QUANTILE = 0.1;
export const CORE_RADIUS = 0.6;
export const FRONTIER_RADIUS = 1;
export const OUTER_RADIUS = 1.5;
export const MIN_BRANCH_SOLVED = 10;
export const ZONES = ["solved", "reachable", "beyond", "unsampled"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABEL: Record<Zone, string> = {
  solved: "solved",
  reachable: "open, close to a solved problem",
  beyond: "open, far from every solved problem",
  unsampled: "open, no solved problems in its branch yet",
};

export interface BranchCount {
  total: number;
  solved: number;
  reachable: number;
  beyond: number;
  unsampled: number;
}

export interface FrontierOptions {
  minBranchSolved?: number;
}

export interface FrontierPoint {
  id: string;
  title: string;
  branch: AtlasBranch;
  sourceKind: FrontierKind;
  theta: number;
  zone: Zone;
  reach: number;
  nearest: { id: string; title: string; similarity: number } | null;
  radius: number;
  pulls: string[];
  growth: number;
}

export interface Frontier {
  schema: "bucket.solvability-frontier/v1";
  threshold: number;
  rule: string;
  counts: Record<Zone, number>;
  inside: number;
  outside: number;
  branches: Record<string, BranchCount>;
  gaps: string;
  missing: string[];
  points: FrontierPoint[];
}

export type FrontierRow = Pick<AtlasProduction, "id" | "title" | "branch" | "theta" | "resolved"> & { source_kind: FrontierKind; solved?: boolean };

export const solvedOf = (r: FrontierRow): boolean => r.solved ?? r.resolved !== null;

export function similarityOf(data: SimilarityData): (a: string, b: string) => number | null {
  const at = new Map(data.ids.map((id, i) => [id, i]));
  return (a, b) => {
    const i = at.get(a);
    const j = at.get(b);
    if (i === undefined || j === undefined) return null;
    if (i === j) return 1;
    const [lo, hi] = i < j ? [i, j] : [j, i];
    return data.upper[lo]?.[hi - lo - 1] ?? null;
  };
}

export function frontierRows(data: NeighborData, opts: { lean?: boolean } = {}): FrontierRow[] {
  return data.nodes
    .filter((n) => opts.lean || n.kind !== "lean")
    .map((n) => ({ id: n.id, title: n.title, branch: n.branch, theta: n.theta, resolved: n.resolved, source_kind: n.kind, solved: n.solved }));
}

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error("a quantile needs at least one value");
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

function span(value: number, from: number, to: number): number {
  return to === from ? 0 : Math.min(1, Math.max(0, (value - from) / (to - from)));
}

interface Graph {
  has: (id: string) => boolean;
  nearestSolved: (r: FrontierRow, solved: ReadonlySet<string>) => { id: string; similarity: number } | null;
  pulls: (r: FrontierRow, beyond: ReadonlySet<string>, tau: number) => string[];
  bounded: string;
}

function denseGraph(data: SimilarityData, rows: readonly FrontierRow[]): Graph {
  const sim = similarityOf(data);
  const known = rows.filter((r) => sim(r.id, r.id) !== null);
  return {
    has: (id) => sim(id, id) !== null,
    nearestSolved: (r, solved) => {
      let best: { id: string; similarity: number } | null = null;
      solved.forEach((s) => {
        if (s === r.id) return;
        const v = sim(r.id, s)!;
        if (!best || v > best.similarity) best = { id: s, similarity: v };
      });
      return best;
    },
    pulls: (r, beyond, tau) => known.filter((b) => b.id !== r.id && beyond.has(b.id) && sim(r.id, b.id)! >= tau).map((b) => b.id),
    bounded: "",
  };
}

function sparseGraph(data: NeighborData): Graph {
  const node = new Map(data.nodes.map((n) => [n.id, n]));
  const neighbours = (id: string): [string, number][] => {
    const n = node.get(id)!;
    return n.n.map((j, i) => [data.ids[j], n.s[i]]);
  };
  return {
    has: (id) => node.has(id),
    nearestSolved: (r, solved) => {
      const n = node.get(r.id)!;
      const stored = n.solved_nearest;
      let best: { id: string; similarity: number } | null = stored && stored.id !== r.id && solved.has(stored.id) ? { id: stored.id, similarity: stored.sim } : null;
      for (const [id, v] of neighbours(r.id)) {
        if (id === r.id || !solved.has(id)) continue;
        if (!best || v > best.similarity) best = { id, similarity: v };
      }
      return best;
    },
    pulls: (r, beyond, tau) => neighbours(r.id).filter(([id, v]) => id !== r.id && beyond.has(id) && v >= tau).map(([id]) => id),
    bounded: ` Pulls count only a problem's ${data.k} stored neighbours.`,
  };
}

export function buildFrontier(rows: readonly FrontierRow[], data: FrontierInput, threshold?: number, opts: FrontierOptions = {}): Frontier {
  const minBranchSolved = opts.minBranchSolved ?? MIN_BRANCH_SOLVED;
  const graph = isNeighborData(data) ? sparseGraph(data) : denseGraph(data, rows);
  const known = rows.filter((r) => graph.has(r.id));
  const missing = rows.filter((r) => !graph.has(r.id)).map((r) => r.id);
  const title = new Map(known.map((r) => [r.id, r.title]));
  const solved = new Set(known.filter(solvedOf).map((r) => r.id));
  if (solved.size < 2) throw new Error("the frontier needs at least two solved problems");
  const near = new Map(
    known.map((r) => {
      const n = graph.nearestSolved(r, solved);
      if (!n) throw new Error(`${r.id} has no solved neighbour in the data`);
      return [r.id, { ...n, title: title.get(n.id) ?? n.id }];
    }),
  );
  const solvedReach = Array.from(solved, (id) => near.get(id)!.similarity).sort((a, b) => a - b);
  const tau = threshold ?? quantile(solvedReach, REACH_QUANTILE);
  if (!(tau > 0 && tau < 1)) throw new Error("the threshold must sit between 0 and 1");
  const solvedInBranch = new Map<string, number>();
  for (const r of known) if (solved.has(r.id)) solvedInBranch.set(r.branch, (solvedInBranch.get(r.branch) ?? 0) + 1);
  const sampled = (r: FrontierRow) => (solvedInBranch.get(r.branch) ?? 0) >= minBranchSolved;
  const zoneOf = (r: FrontierRow): Zone => (solved.has(r.id) ? "solved" : !sampled(r) ? "unsampled" : near.get(r.id)!.similarity >= tau ? "reachable" : "beyond");
  const zones = new Map(known.map((r) => [r.id, zoneOf(r)]));
  const topLevel = (r: FrontierRow) => r.source_kind !== "variant";
  const beyond = new Set(known.filter((r) => zones.get(r.id) === "beyond" && topLevel(r)).map((r) => r.id));
  const floor = Math.min(tau, ...known.map((r) => near.get(r.id)!.similarity));
  const radiusOf = (zone: Zone, reach: number) => {
    if (zone === "solved") return CORE_RADIUS * (1 - span(reach, solvedReach[0], 1));
    if (zone === "reachable") return CORE_RADIUS + (FRONTIER_RADIUS - CORE_RADIUS) * (1 - span(reach, tau, 1));
    if (zone === "unsampled") return FRONTIER_RADIUS + (OUTER_RADIUS - FRONTIER_RADIUS) * (1 - span(reach, floor, 1));
    return FRONTIER_RADIUS + (OUTER_RADIUS - FRONTIER_RADIUS) * (1 - span(reach, floor, tau));
  };
  const points = known.map((r): FrontierPoint => {
    const zone = zones.get(r.id)!;
    const n = near.get(r.id)!;
    const pulls = zone === "solved" || zone === "unsampled" || !topLevel(r) ? [] : graph.pulls(r, beyond, tau);
    return {
      id: r.id,
      title: r.title,
      branch: r.branch,
      sourceKind: r.source_kind,
      theta: r.theta,
      zone,
      reach: round3(n.similarity),
      nearest: { ...n, similarity: round3(n.similarity) },
      radius: round3(radiusOf(zone, n.similarity)),
      pulls,
      growth: zone === "beyond" && topLevel(r) ? pulls.length + 1 : pulls.length,
    };
  });
  const counts = { solved: 0, reachable: 0, beyond: 0, unsampled: 0 } as Record<Zone, number>;
  for (const p of points) counts[p.zone] += 1;
  const branches: Record<string, BranchCount> = {};
  for (const p of points) {
    branches[p.branch] ??= { total: 0, solved: 0, reachable: 0, beyond: 0, unsampled: 0 };
    branches[p.branch].total += 1;
    branches[p.branch][p.zone] += 1;
  }
  const thin = Object.entries(branches)
    .filter(([, c]) => c.unsampled > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([b, c]) => `${b} ${c.solved} of ${c.total}`);
  const gaps = thin.length
    ? `Branches with fewer than ${minBranchSolved} solved problems (${thin.join(", ")}): their open problems are unsampled, since no solved peer exists in the corpus to measure reach against, and they stay out of the growth count.`
    : `Every branch holds at least ${minBranchSolved} solved problems.`;
  const left = missing.length ? ` ${missing.length} ${missing.length === 1 ? "problem has" : "problems have"} no similarity row and ${missing.length === 1 ? "is" : "are"} left off.` : "";
  return {
    schema: "bucket.solvability-frontier/v1",
    threshold: round3(tau),
    rule:
      (threshold === undefined
        ? `Reach is a problem's highest text similarity to a solved problem. The circle sits at reach ${round3(tau)}: nine in ten solved problems are at least that close to another solved problem.`
        : `Reach is a problem's highest text similarity to a solved problem. The circle sits at reach ${round3(tau)}, set by hand.`) +
      graph.bounded +
      " Variants neither pull nor count as pulled." +
      left,
    counts,
    inside: counts.solved + counts.reachable,
    outside: counts.beyond + counts.unsampled,
    branches,
    gaps,
    missing,
    points,
  };
}

export function frontierXY(p: Pick<FrontierPoint, "theta" | "radius">): [number, number] {
  return [p.radius * Math.cos(p.theta), -p.radius * Math.sin(p.theta)];
}

export function growthRanking(f: Frontier): FrontierPoint[] {
  return f.points.filter((p) => p.zone === "beyond" && p.sourceKind !== "variant").sort((a, b) => b.growth - a.growth || a.reach - b.reach || a.id.localeCompare(b.id));
}

export function edgeRanking(f: Frontier): FrontierPoint[] {
  return f.points.filter((p) => p.zone === "reachable" || p.zone === "beyond").sort((a, b) => Math.abs(a.reach - f.threshold) - Math.abs(b.reach - f.threshold) || a.id.localeCompare(b.id));
}

export function branchCounts(f: Frontier): Record<string, BranchCount> {
  return f.branches;
}
