import type { BetaEventName } from "@/lib/beta/events";
import type { StoredBetaEvent } from "@/lib/beta/store";

export const FUNNEL_STEPS: readonly BetaEventName[] = ["app_open", "session_start", "card_shown", "card_answered", "lesson_complete"];

export interface EventFunnelStep {
  name: BetaEventName;
  users: number;
  ofFirst: number | null;
}

export function eventFunnel(events: StoredBetaEvent[], app?: string): EventFunnelStep[] {
  const byUser = new Map<string, Set<BetaEventName>>();
  for (const e of events) {
    if (app && e.app !== app) continue;
    const s = byUser.get(e.userId) ?? new Set<BetaEventName>();
    s.add(e.name);
    byUser.set(e.userId, s);
  }
  const steps: EventFunnelStep[] = [];
  let reached = Array.from(byUser.entries());
  let first: number | null = null;
  for (const name of FUNNEL_STEPS) {
    reached = reached.filter(([, names]) => names.has(name));
    if (first === null) first = reached.length;
    steps.push({ name, users: reached.length, ofFirst: first ? reached.length / first : null });
  }
  return steps;
}

export interface TimelineEntry {
  ts: string;
  app: string;
  name: string;
  detail: string;
}

export function userTimeline(events: StoredBetaEvent[], userId: string, limit = 200): TimelineEntry[] {
  return events
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, limit)
    .map((e) => ({
      ts: e.ts,
      app: e.app,
      name: e.name,
      detail: Object.entries(e.props)
        .map(([k, v]) => `${k}=${v}`)
        .join(" "),
    }));
}

export type ConsentStatus = { state: "pending"; note: string } | { state: "live"; granted: number; denied: number };

export function pixelConsentStatus(): ConsentStatus {
  return { state: "pending", note: "Pixel and consent tracking arrive with PR #1013." };
}
