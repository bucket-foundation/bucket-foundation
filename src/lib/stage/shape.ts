import { AXIS, SIDE, UP, add, scale, type Vec3 } from "../explore/frame";

export const STAGE_RADIUS = 1;
export const CYLINDER_RADIUS = STAGE_RADIUS * Math.SQRT1_2;
export const CYLINDER_HALF_LENGTH = STAGE_RADIUS * Math.SQRT1_2;

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function axisAt(t: number): Vec3 {
  return scale(AXIS, (clamp01(t) - 0.5) * 2 * CYLINDER_HALF_LENGTH);
}

export function ringAt(t: number, angle: number, r: number): Vec3 {
  const rr = clamp01(r) * CYLINDER_RADIUS;
  return add(axisAt(t), add(scale(SIDE, Math.cos(angle) * rr), scale(UP, Math.sin(angle) * rr)));
}

export function sphereAt(lat: number, lng: number): Vec3 {
  return [Math.cos(lat) * Math.cos(lng) * STAGE_RADIUS, Math.sin(lat) * STAGE_RADIUS, -Math.cos(lat) * Math.sin(lng) * STAGE_RADIUS];
}
