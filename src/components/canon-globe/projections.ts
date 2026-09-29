export type Vec3 = [number, number, number];
export type ProjectionId = "globe" | "circle";
export type ThetaSort = "rank" | "year" | "branch";

export type ProjectionItem = {
  id: string;
  lat: number;
  lng: number;
  year?: number;
  branch: string;
};

export type ProjectionContext = {
  radius: number;
  theta: (id: string) => number;
};

export interface Projection {
  id: ProjectionId;
  label: string;
  earthOpacity: number;
  allowRotate: boolean;
  camera: Vec3;
  fitRadius?: number;
  position(item: ProjectionItem, ctx: ProjectionContext): Vec3;
}

export const BRANCH_ORDER = [
  "mathematics",
  "physics",
  "chemistry",
  "information",
  "biophysics",
  "cosmology",
  "mind",
  "deep-history",
  "sacred-texts",
] as const;

export const BRANCH_COUNT = BRANCH_ORDER.length + 1;

export function bareBranch(branch: string): string {
  return (branch || "").replace(/^\d+-/, "");
}

export function branchIndex(branch: string): number {
  const i = (BRANCH_ORDER as readonly string[]).indexOf(bareBranch(branch));
  return i >= 0 ? i : BRANCH_ORDER.length;
}

const DEG2RAD = Math.PI / 180;
const TAU = Math.PI * 2;

export const CIRCLE_INNER = 0.35;
export const CIRCLE_OUTER = 1.25;

export function ringRadius(branch: string, radius: number): number {
  const t = branchIndex(branch) / (BRANCH_COUNT - 1);
  return radius * (CIRCLE_INNER + (CIRCLE_OUTER - CIRCLE_INNER) * t);
}

export const globeProjection: Projection = {
  id: "globe",
  label: "Globe",
  earthOpacity: 1,
  allowRotate: true,
  camera: [0, 0, 3.4],
  position(item, ctx) {
    const phi = (90 - item.lat) * DEG2RAD;
    const theta = (item.lng + 180) * DEG2RAD;
    const r = ctx.radius;
    return [r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta)];
  },
};

export const circleProjection: Projection = {
  id: "circle",
  label: "Circle",
  earthOpacity: 0,
  allowRotate: false,
  camera: [0, 0, 3.4],
  fitRadius: CIRCLE_OUTER * 1.02,
  position(item, ctx) {
    const r = ringRadius(item.branch, ctx.radius);
    const a = ctx.theta(item.id) + Math.PI / 2;
    return [r * Math.cos(a), r * Math.sin(a), 0];
  },
};

export const PROJECTIONS: Record<ProjectionId, Projection> = {
  globe: globeProjection,
  circle: circleProjection,
};

function hashUnit(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function byId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function buildThetaIndex(
  universe: ProjectionItem[],
  sort: ThetaSort,
  rankTheta: ReadonlyMap<string, number>
): Map<string, number> {
  const out = new Map<string, number>();
  if (sort === "rank") {
    for (const it of universe) out.set(it.id, rankTheta.get(it.id) ?? hashUnit(it.id) * TAU);
    return out;
  }
  const rankOf = (id: string) => rankTheta.get(id) ?? TAU + hashUnit(id);
  const sorted = [...universe].sort((a, b) => {
    if (sort === "year") {
      const d = (a.year ?? Infinity) - (b.year ?? Infinity);
      if (d !== 0 && Number.isFinite(d)) return d;
      if (a.year === undefined && b.year !== undefined) return 1;
      if (b.year === undefined && a.year !== undefined) return -1;
    } else {
      const d = branchIndex(a.branch) - branchIndex(b.branch);
      if (d !== 0) return d;
      const r = rankOf(a.id) - rankOf(b.id);
      if (r !== 0) return r;
    }
    return byId(a.id, b.id);
  });
  const n = Math.max(1, sorted.length);
  sorted.forEach((it, i) => {
    if (!out.has(it.id)) out.set(it.id, (TAU * i) / n);
  });
  return out;
}

export function capBranchBalanced<T extends ProjectionItem>(
  items: T[],
  cap: number,
  order: (id: string) => number,
  keepId?: string | null
): T[] {
  if (items.length <= cap) return items;
  const groups = new Map<number, T[]>();
  for (const it of items) {
    const k = branchIndex(it.branch);
    const g = groups.get(k);
    if (g) g.push(it);
    else groups.set(k, [it]);
  }
  const keys = Array.from(groups.keys()).sort((a, b) => a - b);
  for (const k of keys) groups.get(k)!.sort((a, b) => order(a.id) - order(b.id) || byId(a.id, b.id));
  const chosen = new Set<string>();
  const keep = keepId ? items.find((it) => it.id === keepId) : undefined;
  if (keep) chosen.add(keep.id);
  let depth = 0;
  while (chosen.size < cap) {
    let added = false;
    for (const k of keys) {
      const g = groups.get(k)!;
      if (depth < g.length) {
        added = true;
        if (chosen.size < cap) chosen.add(g[depth].id);
      }
    }
    if (!added) break;
    depth++;
  }
  return items.filter((it) => chosen.has(it.id));
}
