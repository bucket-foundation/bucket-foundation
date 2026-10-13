export const WHEEL_GESTURE_GAP_MS = 140;
export const PAGE_STEP = 10;

export function clampIndex(i: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(i)));
}

export function indexFromFraction(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return clampIndex(Math.min(1, Math.max(0, fraction)) * (count - 1), count);
}

export function fractionOfIndex(index: number, count: number): number {
  return count <= 1 ? 0 : clampIndex(index, count) / (count - 1);
}

export function keyStep(key: string, index: number, count: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return clampIndex(index + 1, count);
  if (key === "ArrowLeft" || key === "ArrowUp") return clampIndex(index - 1, count);
  if (key === "PageDown") return clampIndex(index + PAGE_STEP, count);
  if (key === "PageUp") return clampIndex(index - PAGE_STEP, count);
  if (key === "Home") return 0;
  if (key === "End") return clampIndex(count - 1, count);
  return null;
}

export function wheelShouldStep(last: number, now: number, gap = WHEEL_GESTURE_GAP_MS): boolean {
  return now - last >= gap;
}

export function describeItem(title: string, index: number, count: number, meta: string[] = []): string {
  const head = count > 0 ? `${title} · ${index + 1} / ${count}` : title;
  return [head, ...meta.filter(Boolean)].join(" · ");
}

export function yearSteps(obs: { t?: number | null }[]): number[] {
  const years = obs.map((o) => o.t).filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  return Array.from(new Set(years)).sort((a, b) => a - b);
}
