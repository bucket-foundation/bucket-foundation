import type { AtlasProduction } from "./solvability-atlas";

export const SPACE_VIEWS = ["circle", "sphere", "slices", "helix"] as const;
export type SpaceView = (typeof SPACE_VIEWS)[number];
export type Vec3 = [number, number, number];

export const ERAS: readonly { from: number; to: number; label: string }[] = [
  { from: -Infinity, to: 1899, label: "before 1900" },
  { from: 1900, to: 1949, label: "1900 to 1949" },
  { from: 1950, to: 1979, label: "1950 to 1979" },
  { from: 1980, to: 1999, label: "1980 to 1999" },
  { from: 2000, to: 2019, label: "2000 to 2019" },
  { from: 2020, to: Infinity, label: "2020 on" },
];

export const AXIS_LENGTH = 18;
export const SPHERE_RADIUS = 6;
const AXIS: Vec3 = [Math.SQRT1_2, 0, Math.SQRT1_2];
const SIDE: Vec3 = [-Math.SQRT1_2, 0, Math.SQRT1_2];

export function eraOf(year: number): number {
  const i = ERAS.findIndex((e) => year >= e.from && year <= e.to);
  return i < 0 ? ERAS.length - 1 : i;
}

export function timeCoord(year: number): number {
  const e = eraOf(year);
  const { from, to } = ERAS[e];
  const lo = Number.isFinite(from) ? from : 1600;
  const hi = Number.isFinite(to) ? to : 2026;
  return e + Math.min(1, Math.max(0, (year - lo) / (hi - lo + 1)));
}

export function spaceRadius(solvability: number): number {
  return 0.6 + 1.8 * solvability;
}

export function axisPoint(u: number): Vec3 {
  const d = (u / ERAS.length - 0.5) * AXIS_LENGTH;
  return [AXIS[0] * d, 0, AXIS[2] * d];
}

export function ringPoint(u: number, r: number, angle: number): Vec3 {
  const c = axisPoint(u);
  return [c[0] + SIDE[0] * Math.cos(angle) * r, Math.sin(angle) * r, c[2] + SIDE[2] * Math.cos(angle) * r];
}

export function circlePoint(theta: number, solvability: number): Vec3 {
  const r = spaceRadius(solvability) * 2.2;
  return [r * Math.cos(theta), r * Math.sin(theta), 0];
}

export function spherePoint(theta: number, year: number): Vec3 {
  const lat = (timeCoord(year) / ERAS.length - 0.5) * Math.PI * 0.9;
  return [Math.cos(lat) * Math.cos(theta) * SPHERE_RADIUS, Math.sin(lat) * SPHERE_RADIUS, -Math.cos(lat) * Math.sin(theta) * SPHERE_RADIUS];
}

export function helixAngle(theta: number, u: number): number {
  return theta + u * Math.PI * 2;
}

export function place(p: Pick<AtlasProduction, "theta" | "solvability" | "posed">, view: SpaceView): Vec3 {
  const u = timeCoord(p.posed);
  const r = spaceRadius(p.solvability);
  if (view === "circle") return circlePoint(p.theta, p.solvability);
  if (view === "sphere") return spherePoint(p.theta, p.posed);
  if (view === "slices") return ringPoint(eraOf(p.posed) + 0.5, r, p.theta);
  return ringPoint(u, r, helixAngle(p.theta, u));
}

export function sharedTokenEdges(rows: Pick<AtlasProduction, "id" | "tokens">[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) if (rows[i].tokens.some((t) => rows[j].tokens.includes(t))) out.push([rows[i].id, rows[j].id]);
  return out;
}

export function smoothedRadius(rows: Pick<AtlasProduction, "theta" | "solvability" | "posed">[], u: number, angle: number, view: "slices" | "helix"): number {
  let w = 0;
  let v = 0;
  for (const p of rows) {
    const pu = view === "slices" ? eraOf(p.posed) + 0.5 : timeCoord(p.posed);
    const pa = view === "helix" ? helixAngle(p.theta, pu) : p.theta;
    const d = Math.atan2(Math.sin(angle - pa), Math.cos(angle - pa));
    const k = Math.exp(-((u - pu) ** 2) / 0.5 - (d * d) / 0.4);
    w += k;
    v += k * spaceRadius(p.solvability);
  }
  return w > 1e-3 ? v / w : spaceRadius(0);
}

export function sliceRows<T extends Pick<AtlasProduction, "posed">>(rows: T[], era: number, year: number): T[] {
  return rows.filter((p) => eraOf(p.posed) === era && p.posed <= year);
}
