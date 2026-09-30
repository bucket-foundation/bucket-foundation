export const MAX_RUNNING = 2;
export const MAX_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;

interface LimiterState {
  running: number;
  owners: Set<string>;
  hits: Map<string, number[]>;
}

type LimiterGlobal = typeof globalThis & { __bucketMarketingLimiter?: LimiterState };

function state(): LimiterState {
  const g = globalThis as LimiterGlobal;
  g.__bucketMarketingLimiter ??= { running: 0, owners: new Set(), hits: new Map() };
  return g.__bucketMarketingLimiter;
}

export type Admission = { ok: true; release: () => void } | { ok: false; error: "busy" | "owner_busy" | "rate_limited" };

export function admit(ownerId: string, now = Date.now()): Admission {
  const s = state();
  const recent = (s.hits.get(ownerId) ?? []).filter((t) => now - t < HOUR_MS);
  s.hits.set(ownerId, recent);
  if (recent.length >= MAX_PER_HOUR) return { ok: false, error: "rate_limited" };
  if (s.owners.has(ownerId)) return { ok: false, error: "owner_busy" };
  if (s.running >= MAX_RUNNING) return { ok: false, error: "busy" };
  s.running += 1;
  s.owners.add(ownerId);
  recent.push(now);
  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      s.running -= 1;
      s.owners.delete(ownerId);
    },
  };
}

export function resetLimiter(): void {
  (globalThis as LimiterGlobal).__bucketMarketingLimiter = undefined;
}
