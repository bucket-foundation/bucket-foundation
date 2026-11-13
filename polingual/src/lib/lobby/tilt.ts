export type Tilt = "score" | "pass" | null;

export const TILT_TRIGGER = 6;
export const TILT_RESET = 3;

export function classifyTilt(z: number | null): Tilt {
  if (z === null) return null;
  if (z <= -TILT_TRIGGER) return "score";
  if (z >= TILT_TRIGGER) return "pass";
  return null;
}

export function settled(z: number | null): boolean {
  return z !== null && Math.abs(z) <= TILT_RESET;
}
