import { quantile, type Frontier, type FrontierPoint, type NeighborData } from "./solvability-frontier";

export const REACH_CLASSES = ["AI can reach with known results", "borderline", "needs a new idea", "unsampled"] as const;
export type ReachClass = (typeof REACH_CLASSES)[number];
export const UPPER_QUANTILE = 0.75;
export const NEAREST = 3;
export const PAGE_TOP = 50;

export interface StartingWork {
  title: string;
  year: number | null;
  role: string;
  doi: string | null;
}

export interface NearestSolved {
  id: string;
  title: string;
  similarity: number;
}

export interface Prediction {
  id: string;
  title: string;
  branch: string;
  sourceKind: FrontierPoint["sourceKind"];
  status: string;
  reach: number;
  zone: FrontierPoint["zone"];
  reachClass: ReachClass;
  growth: number;
  nearest: NearestSolved[];
  works: StartingWork[];
  atlas: boolean;
}

export interface Predictions {
  schema: "bucket.solvability-predictions/v1";
  threshold: number;
  upperReach: number;
  rule: string;
  counts: Record<ReachClass, number>;
  rows: Prediction[];
}

export type WorksIndex = Record<string, StartingWork[]>;

export function classify(p: Pick<FrontierPoint, "zone" | "reach">, upperReach: number): ReachClass | null {
  if (p.zone === "solved") return null;
  if (p.zone === "unsampled") return "unsampled";
  if (p.zone === "beyond") return "needs a new idea";
  return p.reach >= upperReach ? "AI can reach with known results" : "borderline";
}

export function nearestSolved(data: NeighborData, id: string, solved: ReadonlySet<string>, title: Map<string, string>, k = NEAREST): NearestSolved[] {
  const node = data.nodes.find((n) => n.id === id);
  if (!node) return [];
  const seen = new Map<string, number>();
  node.n.forEach((j, i) => {
    const nid = data.ids[j];
    if (nid !== id && solved.has(nid)) seen.set(nid, Math.max(seen.get(nid) ?? -1, node.s[i]));
  });
  if (node.solved_nearest && node.solved_nearest.id !== id && solved.has(node.solved_nearest.id)) seen.set(node.solved_nearest.id, Math.max(seen.get(node.solved_nearest.id) ?? -1, node.solved_nearest.sim));
  return Array.from(seen, ([nid, similarity]) => ({ id: nid, title: title.get(nid) ?? nid, similarity }))
    .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
    .slice(0, k);
}

export const CLASS_ORDER: Record<ReachClass, number> = { "AI can reach with known results": 0, borderline: 1, "needs a new idea": 2, unsampled: 3 };

export function rankPredictions(rows: readonly Prediction[]): Prediction[] {
  return [...rows].sort((a, b) => CLASS_ORDER[a.reachClass] - CLASS_ORDER[b.reachClass] || b.growth - a.growth || b.reach - a.reach || a.id.localeCompare(b.id));
}

export function buildPredictions(frontier: Frontier, data: NeighborData, works: WorksIndex = {}): Predictions {
  const title = new Map(data.nodes.map((n) => [n.id, n.title]));
  const status = new Map(data.nodes.map((n) => [n.id, n.status]));
  const solved = new Set(frontier.points.filter((p) => p.zone === "solved").map((p) => p.id));
  const reachable = frontier.points.filter((p) => p.zone === "reachable").map((p) => p.reach).sort((a, b) => a - b);
  const upperReach = reachable.length ? quantile(reachable, UPPER_QUANTILE) : frontier.threshold;
  const rows: Prediction[] = [];
  for (const p of frontier.points) {
    if (p.sourceKind === "variant") continue;
    const reachClass = classify(p, upperReach);
    if (!reachClass) continue;
    rows.push({
      id: p.id,
      title: p.title,
      branch: p.branch,
      sourceKind: p.sourceKind,
      status: status.get(p.id) ?? "open",
      reach: p.reach,
      zone: p.zone,
      reachClass,
      growth: p.growth,
      nearest: nearestSolved(data, p.id, solved, title),
      works: works[p.id] ?? [],
      atlas: p.sourceKind === "problem",
    });
  }
  const ranked = rankPredictions(rows);
  const counts = { "AI can reach with known results": 0, borderline: 0, "needs a new idea": 0, unsampled: 0 } as Record<ReachClass, number>;
  for (const r of ranked) counts[r.reachClass] += 1;
  return {
    schema: "bucket.solvability-predictions/v1",
    threshold: frontier.threshold,
    upperReach,
    rule: `Open top-level problems only; variants are left off. A problem inside the frontier (reach at or above ${frontier.threshold}) with reach at or above ${upperReach}, the ${Math.round(UPPER_QUANTILE * 100)}th percentile of reach among inside open problems, is "AI can reach with known results"; inside below that is "borderline"; beyond the frontier is "needs a new idea"; a branch with too few solved problems is "unsampled". Within a class, rows rank by growth, then reach, then id. The nearest solved problems come from the ${data.k} stored neighbours. Starting works exist only for the atlas problems with a record.`,
    counts,
    rows: ranked,
  };
}

export function topPerClass(p: Predictions, top = PAGE_TOP): Record<ReachClass, Prediction[]> {
  const out = { "AI can reach with known results": [], borderline: [], "needs a new idea": [], unsampled: [] } as Record<ReachClass, Prediction[]>;
  for (const r of p.rows) if (out[r.reachClass].length < top) out[r.reachClass].push(r);
  return out;
}

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function predictionsCsv(p: Predictions): string {
  const head = ["id", "title", "branch", "status", "class", "reach", "growth", "nearest_1", "sim_1", "nearest_2", "sim_2", "nearest_3", "sim_3", "starting_works"];
  const lines = p.rows.map((r) => {
    const near = [0, 1, 2].flatMap((i) => [r.nearest[i]?.id ?? "", r.nearest[i]?.similarity ?? ""]);
    const works = r.works.map((w) => `${w.title}${w.year ? ` (${w.year})` : ""}`).join("; ");
    return [r.id, r.title, r.branch, r.status, r.reachClass, r.reach, r.growth, ...near, works].map(csvCell).join(",");
  });
  return [head.join(","), ...lines].join("\n") + "\n";
}
