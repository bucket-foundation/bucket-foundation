export function dailyToolCap(): number {
  const raw = Number(process.env.RESEARCH_OS_DAILY_TOOL_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 200;
}

export function dailyKeyFor(learnerId: string, at: Date = new Date()): string {
  return `${learnerId}|${at.toISOString().slice(0, 10)}`;
}

interface Bucket {
  day: string;
  count: number;
}

const buckets = new Map<string, Bucket>();

export function recordAndCheck(
  learnerId: string,
  cap: number,
  store: Map<string, Bucket> = buckets,
  now: Date = new Date(),
): { allowed: boolean; count: number; cap: number } {
  const key = dailyKeyFor(learnerId, now);
  const day = now.toISOString().slice(0, 10);
  const existing = store.get(key);
  const count = existing && existing.day === day ? existing.count + 1 : 1;
  store.set(key, { day, count });
  return { allowed: count <= cap, count, cap };
}

export const dailyCapMessage = (cap: number): string =>
  `Daily workspace tool limit reached (${cap} calls). Try again after midnight UTC, or ask a teacher to raise RESEARCH_OS_DAILY_TOOL_CAP.`;
