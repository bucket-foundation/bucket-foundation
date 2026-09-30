import { SIDE, UP, add, norm, scale, type Vec3 } from "../explore/frame";
import { CYLINDER_RADIUS, STAGE_RADIUS, axisAt, clamp01, ringAt, sphereAt } from "./shape";
import type { StageRecord } from "./record";

const TAU = Math.PI * 2;
const DEG2RAD = Math.PI / 180;

export const STAGE_MODES = ["globe", "circle", "helix", "dna", "atom", "particle", "molecule", "reaction", "protein", "earth", "graph", "map", "timeline"] as const;
export type StageMode = (typeof STAGE_MODES)[number];

export const FORM_IDS = ["sphere", "circle", "cylinder", "helicoid", "shells", "ball-stick", "two-structures", "residues", "earth", "graph", "disc", "flat-cylinder"] as const;
export type FormId = (typeof FORM_IDS)[number];

export const FORM_OF_MODE: Record<StageMode, FormId> = {
  globe: "sphere",
  circle: "circle",
  helix: "cylinder",
  dna: "helicoid",
  atom: "shells",
  particle: "shells",
  molecule: "ball-stick",
  reaction: "two-structures",
  protein: "residues",
  earth: "earth",
  graph: "graph",
  map: "disc",
  timeline: "flat-cylinder",
};

export const HELICOID_TURNS = 6;
export const MAX_SHELLS = 7;
export const GRAPH_STEPS = 80;

export function sphereForm(theta: number, t: number | null): Vec3 {
  const lat = ((t === null ? 0.5 : clamp01(t)) - 0.5) * Math.PI * 0.9;
  return sphereAt(lat, theta);
}

export function cylinderForm(theta: number, r: number, t: number | null): Vec3 {
  return ringAt(t === null ? 0.5 : t, theta, r);
}

export function circleForm(theta: number, r: number): Vec3 {
  return ringAt(0.5, theta, r);
}

export function helicoidForm(u: number, s: number, turns = HELICOID_TURNS): Vec3 {
  return ringAt(u, u * turns * TAU, s);
}

export function shellsForm(theta: number, r: number, shells = MAX_SHELLS): Vec3 {
  const shell = Math.min(shells, Math.round(clamp01(r) * (shells - 1)) + 1);
  return ringAt(0.5, theta, shell / shells);
}

export function earthForm(lat: number, lng: number): Vec3 {
  const phi = (90 - lat) * DEG2RAD;
  const a = (lng + 180) * DEG2RAD;
  return [STAGE_RADIUS * Math.sin(phi) * Math.sin(a), STAGE_RADIUS * Math.cos(phi), STAGE_RADIUS * Math.sin(phi) * Math.cos(a)];
}

export function discForm(lat: number, lng: number): Vec3 {
  return ringAt(0.5, lng * DEG2RAD, (90 - lat) / 180);
}

export function flatCylinderForm(theta: number, t: number | null): Vec3 {
  const y = ((((theta % TAU) + TAU) % TAU) / TAU - 0.5) * 2 * CYLINDER_RADIUS;
  return add(axisAt(t === null ? 0.5 : t), scale(UP, y));
}

export interface PlanarAtom {
  x: number;
  y: number;
}

export function structurePoints(atoms: PlanarAtom[], center: Vec3, fit: number): Vec3[] {
  if (!atoms.length) return [];
  const cx = atoms.reduce((s, a) => s + a.x, 0) / atoms.length;
  const cy = atoms.reduce((s, a) => s + a.y, 0) / atoms.length;
  const far = Math.max(1e-9, ...atoms.map((a) => Math.hypot(a.x - cx, a.y - cy)));
  const k = fit / far;
  return atoms.map((a) => add(center, add(scale(SIDE, (a.x - cx) * k), scale(UP, -(a.y - cy) * k))));
}

export function ballStickForm(atoms: PlanarAtom[]): Vec3[] {
  return structurePoints(atoms, [0, 0, 0], 0.9 * CYLINDER_RADIUS);
}

export function twoStructuresForm(reactants: PlanarAtom[], products: PlanarAtom[]): { reactants: Vec3[]; products: Vec3[] } {
  const fit = 0.45 * STAGE_RADIUS;
  return {
    reactants: structurePoints(reactants, axisAt(0.25), fit),
    products: structurePoints(products, axisAt(0.75), fit),
  };
}

export function residuesForm(coords: Vec3[]): Vec3[] {
  if (!coords.length) return [];
  const c: Vec3 = [0, 1, 2].map((i) => coords.reduce((s, p) => s + p[i], 0) / coords.length) as Vec3;
  const far = Math.max(1e-9, ...coords.map((p) => norm([p[0] - c[0], p[1] - c[1], p[2] - c[2]])));
  const k = (0.95 * STAGE_RADIUS) / far;
  return coords.map((p) => [(p[0] - c[0]) * k, (p[1] - c[1]) * k, (p[2] - c[2]) * k]);
}

export function graphForm(ids: string[], edges: [string, string][], steps = GRAPH_STEPS): Map<string, Vec3> {
  const n = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const pos: Vec3[] = ids.map((_, i) => {
    const y = n === 1 ? 0 : 1 - (2 * i) / (n - 1);
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * Math.PI * (3 - Math.sqrt(5));
    return [0.6 * STAGE_RADIUS * rr * Math.cos(a), 0.6 * STAGE_RADIUS * y, 0.6 * STAGE_RADIUS * rr * Math.sin(a)];
  });
  const pairs = edges.flatMap(([a, b]) => (index.has(a) && index.has(b) && a !== b ? [[index.get(a)!, index.get(b)!] as const] : []));
  for (let s = 0; s < steps; s++) {
    const force: Vec3[] = pos.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d: Vec3 = [pos[i][0] - pos[j][0], pos[i][1] - pos[j][1], pos[i][2] - pos[j][2]];
        const len = Math.max(0.05, norm(d));
        const f = 0.002 / (len * len);
        for (let k = 0; k < 3; k++) {
          force[i][k] += (d[k] / len) * f;
          force[j][k] -= (d[k] / len) * f;
        }
      }
    }
    for (const [i, j] of pairs) {
      const d: Vec3 = [pos[j][0] - pos[i][0], pos[j][1] - pos[i][1], pos[j][2] - pos[i][2]];
      for (let k = 0; k < 3; k++) {
        force[i][k] += d[k] * 0.05;
        force[j][k] -= d[k] * 0.05;
      }
    }
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i][k] += (force[i][k] - pos[i][k] * 0.02) * 0.5;
  }
  const far = Math.max(1e-9, ...pos.map(norm));
  const k = far > 0.95 * STAGE_RADIUS ? (0.95 * STAGE_RADIUS) / far : 1;
  return new Map(ids.map((id, i) => [id, scale(pos[i], k)]));
}

export interface FormContext {
  structure?: PlanarAtom[];
  products?: PlanarAtom[];
  residues?: Vec3[];
}

export function latLngOf(rec: Pick<StageRecord, "theta" | "r">): { lat: number; lng: number } {
  return { lat: 90 - 180 * clamp01(rec.r), lng: (((rec.theta % TAU) + TAU) % TAU) / DEG2RAD - 180 };
}

export function placeRecords(mode: StageMode, records: StageRecord[], ctx: FormContext = {}): Map<string, Vec3> {
  const form = FORM_OF_MODE[mode];
  const out = new Map<string, Vec3>();
  if (form === "graph") {
    const ids = records.map((r) => r.id);
    const edges = records.flatMap((r) => r.links.map((e): [string, string] => [r.id, e.to]));
    return graphForm(ids, edges);
  }
  if (form === "ball-stick" || form === "two-structures" || form === "residues") {
    const pts =
      form === "ball-stick"
        ? ballStickForm(ctx.structure ?? [])
        : form === "residues"
          ? residuesForm(ctx.residues ?? [])
          : (() => {
              const t = twoStructuresForm(ctx.structure ?? [], ctx.products ?? []);
              return [...t.reactants, ...t.products];
            })();
    records.forEach((r, i) => out.set(r.id, pts.length ? pts[i % pts.length] : [0, 0, 0]));
    return out;
  }
  for (const r of records) {
    let p: Vec3;
    if (form === "sphere") p = sphereForm(r.theta, r.t);
    else if (form === "circle") p = circleForm(r.theta, r.r);
    else if (form === "cylinder") p = cylinderForm(r.theta, r.r, r.t);
    else if (form === "helicoid") p = helicoidForm(r.t ?? 0.5, r.r);
    else if (form === "shells") p = shellsForm(r.theta, r.r);
    else if (form === "earth") p = earthForm(latLngOf(r).lat, latLngOf(r).lng);
    else if (form === "disc") p = discForm(latLngOf(r).lat, latLngOf(r).lng);
    else p = flatCylinderForm(r.theta, r.t);
    out.set(r.id, p);
  }
  return out;
}
