import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAndCheck } from "@/lib/research-os/rate-limit";

export type LlmRoute = "tutor" | "agent";
type CounterRoute = LlmRoute | "all";

export const GLOBAL_SUBJECT = "global";

export interface DailyLimiter {
  hit(subject: string, route: CounterRoute, now: Date): Promise<number>;
}

export interface DailyCaps {
  user: number;
  global: number;
}

export type LimitVerdict =
  | { allowed: true; count: number }
  | { allowed: false; scope: "user" | "global"; cap: number; retryAfterSeconds: number };

export function envCap(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

export function capsFor(route: LlmRoute): DailyCaps {
  return {
    user: route === "tutor" ? envCap("ACADEMY_TUTOR_DAILY_CAP", 60) : envCap("RESEARCH_AGENT_DAILY_CAP", 10),
    global: envCap("LLM_GLOBAL_DAILY_CAP", 2000),
  };
}

export function secondsUntilUtcMidnight(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export async function checkDailyLimits(
  limiter: DailyLimiter,
  userId: string,
  route: LlmRoute,
  caps: DailyCaps,
  now: Date,
): Promise<LimitVerdict> {
  const retryAfterSeconds = secondsUntilUtcMidnight(now);
  const mine = await limiter.hit(userId, route, now);
  if (mine > caps.user) return { allowed: false, scope: "user", cap: caps.user, retryAfterSeconds };
  const all = await limiter.hit(GLOBAL_SUBJECT, "all", now);
  if (all > caps.global) return { allowed: false, scope: "global", cap: caps.global, retryAfterSeconds };
  return { allowed: true, count: mine };
}

export function dbLimiter(client: SupabaseClient): DailyLimiter {
  return {
    async hit(subject, route) {
      const { data, error } = await client.rpc("llm_usage_hit", { p_subject: subject, p_route: route });
      if (error) throw new Error(`llm_usage_hit failed: ${error.message}`);
      const n = Number(data);
      if (!Number.isFinite(n)) throw new Error("llm_usage_hit returned no count");
      return n;
    },
  };
}

export function memoryLimiter(store: Map<string, { day: string; count: number }> = new Map()): DailyLimiter {
  return {
    async hit(subject, route, now) {
      return recordAndCheck(`${route}:${subject}`, Number.MAX_SAFE_INTEGER, store, now).count;
    },
  };
}
