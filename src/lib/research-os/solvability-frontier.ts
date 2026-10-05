import type { AtlasBranch, AtlasProduction } from "./solvability-atlas";

export interface SimilarityData {
  schema: string;
  ids: string[];
  upper: number[][];
}

export const REACH_QUANTILE = 0.1;
export const CORE_RADIUS = 0.6;
export const FRONTIER_RADIUS = 1;
export const OUTER_RADIUS = 1.5;
export const ZONES = ["solved", "reachable", "beyond"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABEL: Record<Zone, string> = {
  solved: "solved",
  reachable: "open, close to a solved problem",
  beyond: "open, far from every solved problem",
};

export interface FrontierPoint {
  id: string;
  title: string;
  branch: AtlasBranch;
  sourceKind: AtlasProduction["source_kind"];
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
  points: FrontierPoint[];
}

export type FrontierRow = Pick<AtlasProduction, "id" | "title" | "branch" | "theta" | "resolved" | "source_kind">;

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

export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error("a quantile needs at least one value");
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

function span(value: number, from: number, to: number): number {
  return to === from ? 0 : Math.min(1, Math.max(0, (value - from) / (to - from)));
}

export function buildFrontier(rows: readonly FrontierRow[], data: SimilarityData, threshold?: number): Frontier {
  const sim = similarityOf(data);
  const known = rows.filter((r) => sim(r.id, r.id) !== null);
  const solved = known.filter((r) => r.resolved !== null);
  if (solved.length < 2) throw new Error("the frontier needs at least two solved problems");
  const nearest = (r: FrontierRow) => {
    let best: { id: string; title: string; similarity: number } | null = null;
    for (const s of solved) {
      if (s.id === r.id) continue;
      const v = sim(r.id, s.id)!;
      if (!best || v > best.similarity) best = { id: s.id, title: s.title, similarity: v };
    }
    return best!;
  };
  const near = new Map(known.map((r) => [r.id, nearest(r)]));
  const solvedReach = solved.map((r) => near.get(r.id)!.similarity).sort((a, b) => a - b);
  const tau = threshold ?? quantile(solvedReach, REACH_QUANTILE);
  if (!(tau > 0 && tau < 1)) throw new Error("the threshold must sit between 0 and 1");
  const zoneOf = (r: FrontierRow): Zone => (r.resolved !== null ? "solved" : near.get(r.id)!.similarity >= tau ? "reachable" : "beyond");
  const zones = new Map(known.map((r) => [r.id, zoneOf(r)]));
  const beyond = known.filter((r) => zones.get(r.id) === "beyond");
  const floor = Math.min(tau, ...known.map((r) => near.get(r.id)!.similarity));
  const radiusOf = (zone: Zone, reach: number) => {
    if (zone === "solved") return CORE_RADIUS * (1 - span(reach, solvedReach[0], 1));
    if (zone === "reachable") return CORE_RADIUS + (FRONTIER_RADIUS - CORE_RADIUS) * (1 - span(reach, tau, 1));
    return FRONTIER_RADIUS + (OUTER_RADIUS - FRONTIER_RADIUS) * (1 - span(reach, floor, tau));
  };
  const points = known.map((r): FrontierPoint => {
    const zone = zones.get(r.id)!;
    const n = near.get(r.id)!;
    const pulls = zone === "solved" ? [] : beyond.filter((b) => b.id !== r.id && sim(r.id, b.id)! >= tau).map((b) => b.id);
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
      growth: zone === "solved" ? 0 : pulls.length + (zone === "beyond" ? 1 : 0),
    };
  });
  const counts = { solved: 0, reachable: 0, beyond: 0 } as Record<Zone, number>;
  for (const p of points) counts[p.zone] += 1;
  return {
    schema: "bucket.solvability-frontier/v1",
    threshold: round3(tau),
    rule:
      threshold === undefined
        ? `Reach is a problem's highest text similarity to a solved problem. The circle sits at reach ${round3(tau)}: nine in ten solved problems are at least that close to another solved problem.`
        : `Reach is a problem's highest text similarity to a solved problem. The circle sits at reach ${round3(tau)}, set by hand.`,
    counts,
    inside: counts.solved + counts.reachable,
    outside: counts.beyond,
    points,
  };
}

export function frontierXY(p: Pick<FrontierPoint, "theta" | "radius">): [number, number] {
  return [p.radius * Math.cos(p.theta), -p.radius * Math.sin(p.theta)];
}

export function growthRanking(f: Frontier): FrontierPoint[] {
  return f.points.filter((p) => p.zone === "beyond").sort((a, b) => b.growth - a.growth || a.reach - b.reach || a.id.localeCompare(b.id));
}

export function edgeRanking(f: Frontier): FrontierPoint[] {
  return f.points.filter((p) => p.zone !== "solved").sort((a, b) => Math.abs(a.reach - f.threshold) - Math.abs(b.reach - f.threshold) || a.id.localeCompare(b.id));
}
