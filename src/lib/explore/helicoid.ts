import { AXIS, SIDE } from "./geometry";
import type { Vec3 } from "./geometry";
import { SLICE_RADIUS, STACK_LENGTH } from "./slices";
import type { Dataset, SpaceMark, SpaceObservation } from "./space";

export const HELICOID_TURNS = 3;
export const HELICOID_RADIUS = SLICE_RADIUS;
export const RIBBON_STEPS = 240;
export const RIBBON_ACROSS = 8;

export function helicoidAngle(u: number, turns = HELICOID_TURNS): number {
  return u * turns * Math.PI * 2;
}

export function helicoidPoint(u: number, s: number, turns = HELICOID_TURNS, radius = HELICOID_RADIUS, length = STACK_LENGTH): Vec3 {
  const d = (u - 0.5) * length;
  const a = helicoidAngle(u, turns);
  const r = s * radius;
  return [AXIS[0] * d + SIDE[0] * Math.cos(a) * r, Math.sin(a) * r, AXIS[2] * d + SIDE[2] * Math.cos(a) * r];
}

export interface RibbonMesh {
  positions: Vec3[];
  index: number[];
  steps: number;
  across: number;
}

export function ribbonMesh(steps = RIBBON_STEPS, across = RIBBON_ACROSS, turns = HELICOID_TURNS): RibbonMesh {
  const positions: Vec3[] = [];
  for (let iu = 0; iu <= steps; iu++) for (let is = 0; is <= across; is++) positions.push(helicoidPoint(iu / steps, -1 + (2 * is) / across, turns));
  const index: number[] = [];
  const row = across + 1;
  for (let iu = 0; iu < steps; iu++) {
    for (let is = 0; is < across; is++) {
      const a = iu * row + is;
      index.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  return { positions, index, steps, across };
}

export function sweepRange(obs: Pick<SpaceObservation, "t">[]): [number, number] | null {
  const ts = obs.map((o) => o.t).filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  return ts.length ? [Math.min(...ts), Math.max(...ts)] : null;
}

export function positionU(t: number | null | undefined, range: [number, number] | null, index: number, count: number): number {
  if (typeof t === "number" && range && range[1] > range[0]) return (t - range[0]) / (range[1] - range[0]);
  return count > 1 ? index / (count - 1) : 0.5;
}

export interface Rung {
  id: string;
  u: number;
  a: Vec3;
  b: Vec3;
  base: string;
  complement: string;
}

const COMPLEMENT: Record<string, string> = { A: "T", C: "G", G: "C", T: "A" };

export function rungsOf(ds: Pick<Dataset, "obs">, turns = HELICOID_TURNS): Rung[] {
  const range = sweepRange(ds.obs);
  return ds.obs.map((o, i) => {
    const u = 0.02 + 0.96 * positionU(o.t, range, i, ds.obs.length);
    const base = typeof o.meta.base === "string" ? o.meta.base : "";
    return { id: o.id, u, a: helicoidPoint(u, 1, turns), b: helicoidPoint(u, -1, turns), base, complement: COMPLEMENT[base] ?? "" };
  });
}

export interface Locus {
  label: string;
  u: number;
  position: Vec3;
}

export function locusOf(mark: SpaceMark, range: [number, number] | null, turns = HELICOID_TURNS): Locus {
  const u = 0.02 + 0.96 * positionU(mark.t, range, 0, 1);
  return { label: mark.label, u, position: helicoidPoint(u, 1, turns) };
}

export function lociOf(ds: Pick<Dataset, "obs" | "marks">, turns = HELICOID_TURNS): Locus[] {
  const range = sweepRange(ds.obs);
  return (ds.marks ?? []).map((m) => locusOf(m, range, turns));
}
