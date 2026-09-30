export type Vec3 = [number, number, number];

export const UP: Vec3 = [0, 1, 0];
export const AXIS: Vec3 = [Math.SQRT1_2, 0, Math.SQRT1_2];
export const SIDE: Vec3 = [-Math.SQRT1_2, 0, Math.SQRT1_2];

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function norm(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}
