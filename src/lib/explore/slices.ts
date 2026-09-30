import { AXIS, SIDE, type Vec3 } from "./geometry";
import { circleProfile, meanScores, radiusOf, spokeAngle, type Dataset } from "./space";

export const STACK_LENGTH = 11;
export const SLICE_RADIUS = 2.1;
export const CYLINDER_MARGIN = 1.12;
export const MAX_FALLBACK_SLICES = 6;
export const PROFILE_SAMPLES = 96;

export interface Slice {
  index: number;
  label: string;
  obsIds: string[];
  scores: number[];
}

function sweepSlices(ds: Dataset): Slice[] {
  if (!ds.sweep) return [];
  const k = ds.components.length;
  const out: Slice[] = [];
  for (const bin of ds.sweep.bins) {
    const inBin = ds.obs.filter((o) => typeof o.t === "number" && o.t >= bin.from && o.t <= bin.to);
    if (inBin.length) out.push({ index: out.length, label: bin.label, obsIds: inBin.map((o) => o.id), scores: meanScores(inBin, k) });
  }
  return out;
}

function chunkSlices(ds: Dataset): Slice[] {
  const n = ds.obs.length;
  if (!n) return [];
  const count = Math.min(MAX_FALLBACK_SLICES, n);
  const k = ds.components.length;
  const out: Slice[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * n) / count);
    const end = Math.floor(((i + 1) * n) / count);
    const group = ds.obs.slice(start, end);
    out.push({ index: i, label: group.length === 1 ? `${start + 1}` : `${start + 1} to ${end}`, obsIds: group.map((o) => o.id), scores: meanScores(group, k) });
  }
  return out;
}

export function makeSlices(ds: Dataset): Slice[] {
  const swept = sweepSlices(ds);
  return swept.length >= 2 ? swept : chunkSlices(ds);
}

export function stepSlice(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, index + delta));
}

export function sliceCenter(index: number, count: number, length = STACK_LENGTH): Vec3 {
  const d = ((index + 0.5) / Math.max(1, count) - 0.5) * length;
  return [AXIS[0] * d, 0, AXIS[2] * d];
}

export function slicePoint(center: Vec3, angle: number, r: number): Vec3 {
  const c = Math.cos(angle) * r;
  const s = Math.sin(angle) * r;
  return [center[0] + SIDE[0] * c, center[1] + s, center[2] + SIDE[2] * c];
}

export function sliceOutline(slice: Slice, ds: Pick<Dataset, "components">, index: number, count: number): Vec3[] {
  const angles = ds.components.map(spokeAngle);
  const profile = circleProfile(slice.scores, angles, PROFILE_SAMPLES);
  const center = sliceCenter(index, count);
  return profile.map((r, j) => slicePoint(center, (j / PROFILE_SAMPLES) * Math.PI * 2, SLICE_RADIUS * r));
}

export function cylinderRadius(): number {
  return SLICE_RADIUS * CYLINDER_MARGIN;
}

export function distanceFromAxis(p: Vec3): number {
  const along = p[0] * AXIS[0] + p[2] * AXIS[2];
  const dx = p[0] - AXIS[0] * along;
  const dz = p[2] - AXIS[2] * along;
  return Math.hypot(dx, p[1], dz);
}

export function sliceRadiusAt(slice: Slice): number {
  return SLICE_RADIUS * Math.max(...slice.scores.map(radiusOf));
}
