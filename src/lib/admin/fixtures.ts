import type { BetaApp, BetaEventName } from "@/lib/beta/events";
import type { AssignmentRow } from "@/lib/beta/experiment-registry";
import type { BetaStore, BetaTester, StoredBetaEvent } from "@/lib/beta/store";
import type { GrowthSnapshot } from "@/lib/growth/snapshot";
import type { WaitlistEntry } from "@/lib/waitlist/core";
import type { AuditRow } from "./actions";
import type { RevenueEventRow } from "./revenue";
import type { AdminSource } from "./source";
import { matchesQuery, type OverviewRow } from "./users";

const DAY = 86_400_000;

function uid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function rand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const NAMES = ["ada", "bruno", "chen", "dalia", "emeka", "farah", "goran", "hana", "ines", "jonas", "kofi", "lena", "mateo", "noor", "oskar", "priya", "quinn", "rosa", "sami", "tove", "umar", "vera", "wen", "yusuf"];
const LANGS = [["es"], ["fr", "it"], ["de"], ["ja"], ["es", "pt"], ["ar"], [], ["zh"]];

export interface FixtureWorld {
  overview: OverviewRow[];
  testers: BetaTester[];
  events: StoredBetaEvent[];
  revenue: RevenueEventRow[];
  assignments: AssignmentRow[];
  snapshot: GrowthSnapshot;
  audit: AuditRow[];
}

export function buildFixtureWorld(now: Date = new Date()): FixtureWorld {
  const r = rand(20261101);
  const t0 = now.getTime();
  const overview: OverviewRow[] = [];
  const testers: BetaTester[] = [];
  const events: StoredBetaEvent[] = [];
  const revenue: RevenueEventRow[] = [];
  const assignments: AssignmentRow[] = [];
  NAMES.forEach((name, i) => {
    const id = uid(i + 1);
    const app: BetaApp = i % 3 === 0 ? "bucket" : "polingual";
    const enrolled = t0 - Math.floor(r() * 50 + 1) * DAY;
    const activeDays = Math.floor(r() * 30);
    const streak = Math.floor(r() * 100);
    const lastEvent = activeDays > 0 ? t0 - Math.floor(r() * 4) * DAY - 3_600_000 : null;
    const bundle = app === "bucket" ? "foundation.bucket.app" : "com.polingual.app";
    const tier = i % 4;
    const product = tier === 0 ? null : tier === 1 ? `${app}.monthly` : tier === 2 ? `${app}.yearly` : `${app}.monthly`;
    const kind = tier === 0 ? null : tier === 3 ? "trial" : "renew";
    overview.push({
      user_id: id,
      email: `${name}@example.test`,
      created_at: new Date(enrolled).toISOString(),
      last_sign_in_at: lastEvent ? new Date(lastEvent).toISOString() : null,
      banned_until: i === 5 ? new Date(t0 + 365 * DAY).toISOString() : null,
      first_app: app,
      cohort: i % 2 ? "default" : "friends",
      streak_days: streak,
      last_active_day: lastEvent ? new Date(lastEvent).toISOString().slice(0, 10) : null,
      languages: app === "polingual" ? LANGS[i % LANGS.length] : [],
      last_event_at: lastEvent ? new Date(lastEvent).toISOString() : null,
      plan_product: product,
      plan_kind: kind,
      plan_bundle: product ? bundle : null,
      plan_expires_at: product ? new Date(t0 + 20 * DAY).toISOString() : null,
      placement: app === "polingual" ? (i % 5 === 0 ? null : { cefr: ["A1", "A2", "B1", "B2"][i % 4] }) : { branch: "physics", questions: 12, known: Math.floor(r() * 12) },
    });
    testers.push({ userId: id, cohort: i % 2 ? "default" : "friends", firstApp: app, optedOut: false, enrolledAt: new Date(enrolled).toISOString() });
    assignments.push({ userId: id, experiment: "new_words", arm: i % 2 ? "4" : "8", source: "hash", cohort: "default", assignedAt: new Date(enrolled).toISOString() });
    for (let d = 0; d < activeDays; d++) {
      const day = enrolled + Math.floor(r() * Math.max(1, (t0 - enrolled) / DAY)) * DAY;
      if (day > t0) continue;
      const session = uid(10_000 + i * 100 + d);
      const seq: BetaEventName[] = ["app_open", "session_start", "card_shown", "card_answered", "card_shown", "card_answered"];
      if (r() > 0.4) seq.push("lesson_complete");
      seq.push("session_end");
      seq.forEach((name, k) =>
        events.push({ userId: id, app, name, sessionId: session, ts: new Date(day + k * 30_000).toISOString(), props: name === "card_answered" ? { correct: r() > 0.3, ms: Math.floor(r() * 6000) } : {} }),
      );
    }
    if (product) {
      const otid = `fx-${i}`;
      const base = { productId: product, bundleId: bundle, environment: "Production", originalTransactionId: otid, currency: "USD" };
      const price = product.endsWith("yearly") ? 59_990 : 7_990;
      if (tier === 1 || tier === 3) revenue.push({ ...base, kind: "trial", signedAt: new Date(enrolled).toISOString(), expiresAt: new Date(enrolled + 7 * DAY).toISOString(), priceMilli: 0 });
      if (tier !== 3) revenue.push({ ...base, kind: tier === 1 ? "renew" : "subscribe", signedAt: new Date(enrolled + 7 * DAY).toISOString(), expiresAt: new Date(t0 + 20 * DAY).toISOString(), priceMilli: price });
      if (i === 9) revenue.push({ ...base, kind: "refund", signedAt: new Date(t0 - 2 * DAY).toISOString(), expiresAt: null, priceMilli: price });
    }
  });
  const audit: AuditRow[] = [
    {
      id: 1,
      createdAt: new Date(t0 - 3 * DAY).toISOString(),
      actorId: uid(900),
      actorEmail: "staff@fixtures.local",
      action: "disable",
      targetUserId: uid(6),
      targetEmail: "farah@example.test",
      reason: "spam reports from three learners",
      outcome: "ok",
      detail: null,
    },
  ];
  const snapshot: GrowthSnapshot = {
    takenAt: new Date(t0 - DAY).toISOString(),
    testers: overview.map((o, i) => ({ app: o.first_app === "bucket" ? "bucket" : "polingual", state: i % 5 === 0 ? "INVITED" : "INSTALLED" })),
    builds: [
      { app: "polingual", version: "1.2.0", build: "41", uploadedAt: new Date(t0 - 9 * DAY).toISOString(), state: "VALID", tag: "polingual-41", notes: ["streak goal of 100 days"] },
      { app: "polingual", version: "1.2.1", build: "42", uploadedAt: new Date(t0 - 2 * DAY).toISOString(), state: "VALID", tag: "polingual-42", notes: ["placement fixes"] },
      { app: "bucket", version: "0.9.0", build: "17", uploadedAt: new Date(t0 - 6 * DAY).toISOString(), state: "VALID", tag: "bucket-17", notes: ["review queue"] },
    ],
    visits: { days: 30, byApp: { bucket: 412, polingual: 1290 } },
  };
  return { overview, testers, events, revenue, assignments, snapshot, audit };
}

let world: FixtureWorld | null = null;

export function fixtureSource(): AdminSource {
  const w = (world ??= buildFixtureWorld());
  const unsupported = async (): Promise<never> => {
    throw new Error("fixture store is read-only for this call");
  };
  const beta: BetaStore = {
    tester: unsupported,
    insert: unsupported,
    setOptOut: unsupported,
    testers: async () => w.testers,
    events: async (since) => ({ rows: w.events.filter((e) => e.ts >= since), truncated: false }),
    setCohort: unsupported,
    cohortSettings: async () => [],
    setCohortSetting: unsupported,
    assignments: async (userId) => w.assignments.filter((a) => !userId || a.userId === userId),
    recordAssignments: unsupported,
  };
  return {
    users: async (q, limit) => w.overview.filter((o) => matchesQuery(o, q)).slice(0, limit),
    user: async (id) => w.overview.find((o) => o.user_id === id) ?? null,
    revenueEvents: async (since) => w.revenue.filter((e) => e.signedAt >= since),
    audit: async (limit, target) => w.audit.filter((a) => !target || a.targetUserId === target).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit),
    beta,
    snapshots: { latest: async () => w.snapshot, save: unsupported },
    waitlist: async () => w.overview.map((o): WaitlistEntry => ({ email: o.email ?? "", name: null, role: null, wanted: null, created_at: o.created_at, updated_at: o.created_at, signups: 1 })),
    actions: {
      lookup: async (id) => {
        const o = w.overview.find((x) => x.user_id === id);
        return o ? { email: o.email } : null;
      },
      setDisabled: async (id, disabled) => {
        const o = w.overview.find((x) => x.user_id === id);
        if (o) o.banned_until = disabled ? new Date(Date.now() + 365 * DAY).toISOString() : null;
      },
      revokeApple: async () => ({ failed: false }),
      deleteUser: async (id) => {
        w.overview = w.overview.filter((x) => x.user_id !== id);
      },
      audit: async (e) => {
        w.audit.push({ ...e, id: w.audit.length + 1, createdAt: new Date().toISOString() });
      },
    },
  };
}
