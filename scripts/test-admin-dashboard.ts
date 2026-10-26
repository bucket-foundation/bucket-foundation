import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runUserAction, type ActionDeps, type AuditEntry } from "../src/lib/admin/actions";
import { buildFixtureWorld } from "../src/lib/admin/fixtures";
import { FIXTURE_STAFF, fixturesEnabled, resolveStaff } from "../src/lib/admin/gate";
import { monthlyFactor, summarizeRevenue, type RevenueEventRow } from "../src/lib/admin/revenue";
import { eventFunnel, userTimeline } from "../src/lib/admin/tracking";
import { levelFor, matchesQuery, parseUserQuery, planFor, streakFor, toProfile, type OverviewRow } from "../src/lib/admin/users";
import { buildActivity } from "../src/lib/growth/activity";
import type { StoredBetaEvent } from "../src/lib/beta/store";

const NOW = new Date("2026-11-01T12:00:00.000Z");
const STAFF_ENV = { RESEARCH_OS_REVIEWER_EMAILS: "boss@bucket.test" };

function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    return fn();
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("gate admits launch staff and refuses everyone else", () => {
  withEnv(STAFF_ENV, () => {
    assert.deepEqual(resolveStaff({ id: "u1", email: "Boss@bucket.test" }, {}), { id: "u1", email: "Boss@bucket.test" });
    assert.equal(resolveStaff({ id: "u2", email: "learner@bucket.test" }, {}), null);
    assert.equal(resolveStaff({ id: "u3", email: null }, {}), null);
    assert.equal(resolveStaff(null, {}), null);
  });
});

test("gate refuses everyone when no staff list is set", () => {
  withEnv({ RESEARCH_OS_REVIEWER_EMAILS: "" }, () => assert.equal(resolveStaff({ id: "u1", email: "boss@bucket.test" }, {}), null));
});

test("fixture staff only exists on a local non-production run", () => {
  assert.equal(fixturesEnabled({ ADMIN_FIXTURES: "1", NODE_ENV: "development" }), true);
  assert.equal(fixturesEnabled({ ADMIN_FIXTURES: "1", NODE_ENV: "production" }), false);
  assert.equal(fixturesEnabled({ ADMIN_FIXTURES: "1", NODE_ENV: "development", VERCEL: "1" }), false);
  assert.equal(fixturesEnabled({ NODE_ENV: "development" }), false);
  assert.deepEqual(resolveStaff(null, { ADMIN_FIXTURES: "1", NODE_ENV: "development" }), FIXTURE_STAFF);
  assert.equal(resolveStaff(null, { ADMIN_FIXTURES: "1", NODE_ENV: "production" }), null);
});

function overview(over: Partial<OverviewRow> = {}): OverviewRow {
  return {
    user_id: "00000000-0000-4000-8000-000000000001",
    email: "ada@example.test",
    created_at: "2026-10-01T00:00:00.000Z",
    last_sign_in_at: "2026-10-30T00:00:00.000Z",
    banned_until: null,
    first_app: "polingual",
    cohort: "default",
    streak_days: 12,
    last_active_day: "2026-10-31",
    languages: ["es", "fr"],
    last_event_at: "2026-10-31T09:00:00.000Z",
    plan_product: "polingual.monthly",
    plan_kind: "renew",
    plan_bundle: "com.polingual.app",
    plan_expires_at: "2026-11-20T00:00:00.000Z",
    placement: { cefr: "B1" },
    ...over,
  };
}

test("profile maps streak to day N of 100, plan, level and last active", () => {
  const p = toProfile(overview(), NOW);
  assert.equal(p.app, "polingual");
  assert.equal(p.plan, "polingual.monthly");
  assert.equal(p.streak.label, "day 12 of 100");
  assert.equal(p.level, "B1");
  assert.equal(p.lastActive, "2026-10-31T09:00:00.000Z");
  assert.equal(p.disabled, false);
  assert.equal(toProfile(overview({ banned_until: "2027-01-01T00:00:00.000Z" }), NOW).disabled, true);
  assert.equal(toProfile(overview({ banned_until: "2026-01-01T00:00:00.000Z" }), NOW).disabled, false);
});

test("plan, streak and level edge cases", () => {
  assert.equal(planFor({ plan_product: null, plan_kind: null, plan_expires_at: null }, NOW), "free");
  assert.equal(planFor({ plan_product: "p.monthly", plan_kind: "expire", plan_expires_at: null }, NOW), "free, p.monthly expire");
  assert.equal(planFor({ plan_product: "p.monthly", plan_kind: "renew", plan_expires_at: "2026-10-01T00:00:00.000Z" }, NOW), "free, p.monthly renew");
  assert.equal(planFor({ plan_product: "p.monthly", plan_kind: "trial", plan_expires_at: null }, NOW), "p.monthly trial");
  assert.equal(streakFor(null).label, "day 0 of 100");
  assert.equal(levelFor(null), "not placed");
  assert.equal(levelFor({ branch: "physics", questions: 12, known: 7 }), "physics: 7/12 known");
});

test("user search parses ids and strips filter syntax from email text", () => {
  assert.deepEqual(parseUserQuery("  "), { kind: "all" });
  assert.deepEqual(parseUserQuery("00000000-0000-4000-8000-00000000000A"), { kind: "id", id: "00000000-0000-4000-8000-00000000000a" });
  assert.deepEqual(parseUserQuery("Ada%,or(x)"), { kind: "email", text: "adaorx" });
  assert.equal(matchesQuery(overview(), parseUserQuery("ADA@")), true);
  assert.equal(matchesQuery(overview(), parseUserQuery("bruno")), false);
});

function rev(over: Partial<RevenueEventRow>): RevenueEventRow {
  return {
    kind: "subscribe",
    productId: "polingual.monthly",
    bundleId: "com.polingual.app",
    environment: "Production",
    originalTransactionId: "t1",
    signedAt: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    priceMilli: 7990,
    currency: "USD",
    ...over,
  };
}

test("revenue splits by app and computes MRR, trial to paid and refunds", () => {
  const s = summarizeRevenue(
    [
      rev({ kind: "trial", originalTransactionId: "a", signedAt: "2026-09-01T00:00:00.000Z", priceMilli: 0 }),
      rev({ kind: "subscribe", originalTransactionId: "a", signedAt: "2026-09-08T00:00:00.000Z" }),
      rev({ kind: "trial", originalTransactionId: "b", signedAt: "2026-09-02T00:00:00.000Z", priceMilli: 0 }),
      rev({ kind: "expire", originalTransactionId: "b", signedAt: "2026-09-09T00:00:00.000Z" }),
      rev({ kind: "subscribe", originalTransactionId: "c", productId: "polingual.yearly", priceMilli: 60000 }),
      rev({ kind: "subscribe", originalTransactionId: "d" }),
      rev({ kind: "refund", originalTransactionId: "d", signedAt: "2026-10-02T00:00:00.000Z" }),
      rev({ kind: "subscribe", originalTransactionId: "e", bundleId: "foundation.bucket.app", productId: "bucket.monthly", priceMilli: 4990 }),
      rev({ kind: "subscribe", originalTransactionId: "f", environment: "Sandbox" }),
    ],
    90,
    NOW,
  );
  assert.equal(s.sandboxSkipped, 1);
  const pol = s.apps.find((a) => a.app === "polingual")!;
  assert.equal(pol.activeSubscriptions, 2);
  assert.deepEqual(pol.mrr, { USD: 12.99 });
  assert.equal(pol.trials, 2);
  assert.equal(pol.trialsConverted, 1);
  assert.equal(pol.trialToPaid, 0.5);
  assert.equal(pol.refunds, 1);
  assert.deepEqual(pol.planMix, [
    { productId: "polingual.monthly", active: 1 },
    { productId: "polingual.yearly", active: 1 },
  ]);
  const bucket = s.apps.find((a) => a.app === "bucket")!;
  assert.deepEqual(bucket.mrr, { USD: 4.99 });
});

test("an expired paid subscription leaves MRR", () => {
  const s = summarizeRevenue([rev({ expiresAt: "2026-10-15T00:00:00.000Z" })], 90, NOW);
  assert.equal(s.apps[0].activeSubscriptions, 0);
  assert.equal(monthlyFactor("x.annual"), 1 / 12);
  assert.equal(monthlyFactor("x.weekly"), 52 / 12);
});

function ev(userId: string, name: StoredBetaEvent["name"], ts: string, app: StoredBetaEvent["app"] = "polingual"): StoredBetaEvent {
  return { userId, app, name, sessionId: null, ts, props: name === "card_answered" ? { correct: true } : {} };
}

test("event funnel counts learners who reached every earlier step", () => {
  const events = [
    ev("a", "app_open", "2026-10-30T00:00:00Z"),
    ev("a", "session_start", "2026-10-30T00:01:00Z"),
    ev("a", "card_shown", "2026-10-30T00:02:00Z"),
    ev("b", "app_open", "2026-10-30T00:00:00Z"),
    ev("c", "card_shown", "2026-10-30T00:00:00Z"),
    ev("d", "app_open", "2026-10-30T00:00:00Z", "bucket"),
  ];
  const f = eventFunnel(events, "polingual");
  assert.deepEqual(
    f.map((s) => [s.name, s.users]),
    [["app_open", 2], ["session_start", 1], ["card_shown", 1], ["card_answered", 0], ["lesson_complete", 0]],
  );
  assert.equal(f[1].ofFirst, 0.5);
  const t = userTimeline(events, "a");
  assert.deepEqual(t.map((e) => e.name), ["card_shown", "session_start", "app_open"]);
});

test("activity counts DAU, WAU, reviews and weekly retention cohorts", () => {
  const testers = [
    { userId: "a", cohort: "default", firstApp: "polingual" as const, optedOut: false, enrolledAt: "2026-10-19T08:00:00Z" },
    { userId: "b", cohort: "default", firstApp: "polingual" as const, optedOut: false, enrolledAt: "2026-10-20T08:00:00Z" },
  ];
  const events = [
    ev("a", "card_answered", "2026-10-19T09:00:00Z"),
    ev("b", "card_answered", "2026-10-20T09:00:00Z"),
    ev("a", "card_answered", "2026-10-27T09:00:00Z"),
    ev("a", "card_answered", "2026-11-01T09:00:00Z"),
    ev("a", "app_open", "2026-11-01T09:00:00Z"),
  ];
  const r = buildActivity(testers, events, NOW);
  const last = r.days[r.days.length - 1];
  assert.equal(last.day, "2026-11-01");
  assert.equal(last.dau, 1);
  assert.equal(last.reviews, 1);
  assert.equal(last.wau, 1);
  assert.equal(r.days.find((d) => d.day === "2026-10-20")!.wau, 2);
  assert.equal(r.cohorts.length, 1);
  assert.equal(r.cohorts[0].week, "2026-10-19");
  assert.equal(r.cohorts[0].users, 2);
  assert.deepEqual(r.cohorts[0].retained.slice(0, 3), [1, 0.5, null]);
});

function actionWorld(over: Partial<ActionDeps> = {}) {
  const log: string[] = [];
  const audits: AuditEntry[] = [];
  const deps: ActionDeps = {
    lookup: async (id) => (id === "target" ? { email: "t@example.test" } : null),
    setDisabled: async (id, d) => void log.push(`${d ? "disable" : "enable"} ${id}`),
    deleteUser: async (id) => void log.push(`delete ${id}`),
    audit: async (e) => void audits.push(e),
    ...over,
  };
  return { deps, log, audits };
}

const ACTOR = { id: "staff", email: "boss@bucket.test" };

test("disable runs and writes one audit row with actor and reason", async () => {
  const w = actionWorld();
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "disable", targetUserId: "target", reason: " spam " }), { ok: true });
  assert.deepEqual(w.log, ["disable target"]);
  assert.deepEqual(w.audits, [
    { actorId: "staff", actorEmail: "boss@bucket.test", action: "disable", targetUserId: "target", targetEmail: "t@example.test", reason: "spam", outcome: "ok", detail: null },
  ]);
});

test("delete needs the typed email or id and is audited", async () => {
  const w = actionWorld();
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "delete", targetUserId: "target", reason: "GDPR request 42", confirm: "nope" }), { ok: false, error: "confirm_mismatch" });
  assert.equal(w.log.length + w.audits.length, 0);
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "delete", targetUserId: "target", reason: "GDPR request 42", confirm: "T@example.test" }), { ok: true });
  assert.deepEqual(w.log, ["delete target"]);
  assert.equal(w.audits[0].action, "delete");
});

test("refusals write nothing", async () => {
  const w = actionWorld();
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "drop", targetUserId: "target", reason: "x long" }), { ok: false, error: "bad_action" });
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "disable", targetUserId: "target", reason: " a " }), { ok: false, error: "reason_required" });
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "disable", targetUserId: "staff", reason: "self test" }), { ok: false, error: "self_action" });
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "disable", targetUserId: "ghost", reason: "missing" }), { ok: false, error: "not_found" });
  assert.equal(w.log.length + w.audits.length, 0);
});

test("a failed action is audited as failed", async () => {
  const w = actionWorld({ setDisabled: async () => { throw new Error("auth down"); } });
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "disable", targetUserId: "target", reason: "spam" }), { ok: false, error: "action_failed" });
  assert.equal(w.audits[0].outcome, "failed");
  assert.equal(w.audits[0].detail, "auth down");
});

test("a lost audit write is reported", async () => {
  const w = actionWorld({ audit: async () => { throw new Error("db down"); } });
  assert.deepEqual(await runUserAction(w.deps, ACTOR, { action: "enable", targetUserId: "target", reason: "appeal granted" }), { ok: false, error: "audit_failed" });
});

test("fixtures render every section without production data", () => {
  const w = buildFixtureWorld(NOW);
  assert.ok(w.overview.length >= 20);
  assert.ok(w.events.length > 0);
  const s = summarizeRevenue(w.revenue, 400, NOW);
  assert.deepEqual(s.apps.map((a) => a.app).sort(), ["bucket", "polingual"]);
  assert.ok(w.overview.every((o) => o.email?.endsWith("@example.test")));
});

test("migration keeps admin tables off anon and authenticated and the audit log append-only", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261101000000_admin_dashboard.sql"), "utf8");
  assert.match(sql, /revoke all on bucket\.admin_audit_log from public, anon, authenticated;/);
  assert.match(sql, /revoke all on bucket\.admin_user_overview from public, anon, authenticated;/);
  assert.match(sql, /grant select, insert on bucket\.admin_audit_log to service_role;/);
  assert.match(sql, /before update or delete on bucket\.admin_audit_log/);
  assert.match(sql, /force row level security/);
});

test("admin pages never import a service key into a client component", () => {
  const root = path.join(__dirname, "../src/app/admin");
  const files: string[] = [];
  const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name))));
  walk(root);
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    if (!src.startsWith('"use client"')) continue;
    assert.doesNotMatch(src, /SERVICE_ROLE|@\/lib\/admin\/source|supabase-js/, f);
  }
});
