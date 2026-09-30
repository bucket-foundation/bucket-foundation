import { SPHERE_RADIUS, spherePoint, type Vec3 } from "./geometry";
import { SLICE_RADIUS, sliceCenter, slicePoint, type Slice } from "./slices";
import { radiusOf, smooth, spokeAngle, type PolarSample, type ScoreScale, type SpaceComponent, type SpaceObservation } from "./space";

export const SURFACE_STEPS = 48;
export const SURFACE_ANGLES = 64;
export const SPHERE_DISPLAY_SCALE = SLICE_RADIUS / SPHERE_RADIUS;
export const DEFAULT_YEAR = 1975;

export interface SurfaceMesh {
  positions: Vec3[];
  index: number[];
  steps: number;
  angles: number;
}

export function slicePolarPoints(slices: Slice[], components: Pick<SpaceComponent, "angle_deg">[], scale: ScoreScale = "standardized"): PolarSample[] {
  return slices.flatMap((s, i) => components.map((c, j) => ({ angle: spokeAngle(c), u: i, r: radiusOf(s.scores[j], scale) })));
}

export function surfaceRadius(points: PolarSample[], u: number, angle: number, scale: ScoreScale = "standardized"): number {
  return smooth(points, u, angle, { fallback: radiusOf(0, scale) });
}

export function surfaceMesh(slices: Slice[], components: Pick<SpaceComponent, "angle_deg">[], steps = SURFACE_STEPS, angles = SURFACE_ANGLES, scale: ScoreScale = "standardized"): SurfaceMesh {
  const n = slices.length;
  const points = slicePolarPoints(slices, components, scale);
  const positions: Vec3[] = [];
  for (let iu = 0; iu <= steps; iu++) {
    const u = n > 1 ? (iu / steps) * (n - 1) : 0;
    const center = sliceCenter(u, n);
    for (let ia = 0; ia < angles; ia++) {
      const a = (ia / angles) * Math.PI * 2;
      positions.push(slicePoint(center, a, SLICE_RADIUS * surfaceRadius(points, u, a, scale)));
    }
  }
  const index: number[] = [];
  for (let iu = 0; iu < steps; iu++) {
    for (let ia = 0; ia < angles; ia++) {
      const a = iu * angles + ia;
      const b = iu * angles + ((ia + 1) % angles);
      const c = (iu + 1) * angles + ia;
      const d = (iu + 1) * angles + ((ia + 1) % angles);
      index.push(a, b, c, b, d, c);
    }
  }
  return { positions, index, steps, angles };
}

export function obsTheta(scores: number[], components: Pick<SpaceComponent, "angle_deg">[], scale: ScoreScale = "standardized"): number {
  let x = 0;
  let y = 0;
  scores.forEach((s, i) => {
    const w = Math.max(0, radiusOf(s, scale) - radiusOf(0, scale));
    const a = spokeAngle(components[i]);
    x += w * Math.cos(a);
    y += w * Math.sin(a);
  });
  if (x === 0 && y === 0) return 0;
  return ((Math.atan2(y, x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export function yearRange(obs: Pick<SpaceObservation, "t">[]): [number, number] | null {
  const ts = obs.map((o) => o.t).filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  return ts.length ? [Math.min(...ts), Math.max(...ts)] : null;
}

export function midYear(obs: Pick<SpaceObservation, "t">[]): number {
  const ts = obs.map((o) => o.t).filter((t): t is number => typeof t === "number").sort((a, b) => a - b);
  return ts.length ? ts[Math.floor(ts.length / 2)] : DEFAULT_YEAR;
}

export function spherePlacement(o: Pick<SpaceObservation, "scores" | "t">, components: Pick<SpaceComponent, "angle_deg">[], fallbackYear: number, scale: ScoreScale = "standardized"): Vec3 {
  return spherePoint(obsTheta(o.scores, components, scale), typeof o.t === "number" ? o.t : fallbackYear);
}

export function visibleAt(o: Pick<SpaceObservation, "t">, year: number): boolean {
  return typeof o.t !== "number" || o.t <= year;
}
