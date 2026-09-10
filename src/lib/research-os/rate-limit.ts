/**
 * Research OS for K-12, the workspace's per-learner daily tool-call cap
 * (bkt-ros ros-04, "Rate and cost guard"). Distinct from the existing
 * crude per-minute burst limiter in src/app/api/research-os/workspace/
 * route.ts (RL_WINDOW_MS/RL_MAX): that guards against a runaway client in
 * one sitting, this guards the day's total spend across every Locate,
 * Quote, Check, and Organize call a learner makes.
 *
 * Same best-effort posture as the burst limiter and as writeEdgeFlags
 * elsewhere in this package: in-memory only, so a serverless cold start or
 * a multi-instance deploy resets or fragments the count. A durable,
 * cross-instance cap belongs in the Viatika metering layer (CLAUDE.md #6,
 * the same TODO /api/academy/tutor already carries); this is the Phase 0/1
 * floor, a placeholder ahead of that real metering layer.
 *
 * Pure counting logic (dailyKeyFor, DailyCapState.record/remaining) is
 * exported separately from the module-level store below so
 * scripts/test-research-os-workspace-contracts.ts can exercise it without
 * timers or environment variables.
 */

/** Env-configurable daily cap; RESEARCH_OS_DAILY_TOOL_CAP overrides the
 * default of 200 (the task's own stated default). A non-positive or
 * unparseable value falls back to the default rather than disabling the
 * cap silently. */
export function dailyToolCap(): number {
  const raw = Number(process.env.RESEARCH_OS_DAILY_TOOL_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 200;
}

/** The UTC calendar-day key for `at` (or now): every learner's cap resets
 * at UTC midnight, a fixed, unambiguous boundary rather than a rolling
 * 24-hour window, so "today's count" means the same thing in every log line
 * and in a future durable store's own date column. */
export function dailyKeyFor(learnerId: string, at: Date = new Date()): string {
  return `${learnerId}|${at.toISOString().slice(0, 10)}`;
}

interface Bucket {
  day: string;
  count: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Records one tool call for `learnerId` and returns whether it is allowed
 * under `cap` (the call is still recorded either way, so a learner cannot
 * reset their own count by retrying past the cap). Exported as a pure-ish
 * function over an injectable store so tests can pass their own Map instead
 * of sharing the module-level one.
 */
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
