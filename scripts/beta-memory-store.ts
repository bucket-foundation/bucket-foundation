import type { BetaStore, BetaTester, StoredBetaEvent } from "../src/lib/beta/store";

export const NOW = new Date("2026-10-26T12:00:00Z");

export function memory(optedOut = false) {
  const rows = new Map<string, StoredBetaEvent>();
  const testers = new Map<string, BetaTester>();
  const store: BetaStore & { rows: typeof rows } = {
    rows,
    tester: async (userId, app) => {
      if (!testers.has(userId)) testers.set(userId, { userId, cohort: "default", firstApp: app, optedOut, enrolledAt: NOW.toISOString() });
      return testers.get(userId)!;
    },
    insert: async (userId, app, events, cap) => {
      if (testers.get(userId)?.optedOut) return { outcome: "opted_out", accepted: 0 };
      const fresh = events.filter((e) => !rows.has(`${userId}:${e.id}`));
      const used = Array.from(rows.values()).filter((r) => r.userId === userId).length;
      if (used + fresh.length > cap) return { outcome: "rate_limited", accepted: 0 };
      for (const e of fresh) rows.set(`${userId}:${e.id}`, { userId, app, name: e.name, sessionId: e.sessionId, ts: e.ts, props: e.props });
      return { outcome: "recorded", accepted: fresh.length };
    },
    setOptOut: async (userId, value) => {
      const t = testers.get(userId) ?? { userId, cohort: "default", firstApp: "web" as const, optedOut: value, enrolledAt: NOW.toISOString() };
      t.optedOut = value;
      testers.set(userId, t);
      if (value) for (const k of Array.from(rows.keys())) if (k.startsWith(`${userId}:`)) rows.delete(k);
    },
    testers: async () => Array.from(testers.values()),
    events: async () => ({ rows: Array.from(rows.values()), truncated: false }),
    setCohort: async (userId, cohort) => {
      const t = testers.get(userId);
      if (!t) return false;
      t.cohort = cohort;
      return true;
    },
  };
  return store;
}
