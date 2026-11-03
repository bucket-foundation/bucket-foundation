import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { streakPayload } from "../src/lib/academy/apns";
import { dayKey } from "../src/lib/academy/engine";
import { studyStats, type BranchRow } from "../src/lib/academy/groups";
import {
  atRiskStreak,
  dueDay,
  renderReminder,
  runStreakReminders,
  sendReminderEmail,
  streakUnsubscribeUrl,
  verifyStreakUnsubscribe,
  type ReminderDeps,
  type Subscriber,
} from "../src/lib/academy/streak-reminder";

const SECRET = "s".repeat(32);
const USER = "11111111-1111-4111-8111-111111111111";
const DAY_MS = 86_400_000;
const NY_EVENING = Date.UTC(2026, 10, 3, 0, 30);
const TODAY = dayKey(NY_EVENING, "America/New_York");
const YESTERDAY = dayKey(NY_EVENING - DAY_MS, "America/New_York");
const sub = (over: Partial<Subscriber> = {}): Subscriber => ({ user_id: USER, tz: "America/New_York", last_sent_day: null, ...over });
const row = (streak: number, lastStudyDay: string): BranchRow => ({ branch: "physics", data: { cards: {}, stats: { streak, lastStudyDay } } }) as BranchRow;

function harness(rows: BranchRow[] = [row(5, YESTERDAY)], over: Partial<ReminderDeps> = {}) {
  const calls: string[] = [];
  const state = { sent: new Map<string, string | null>() };
  const deps: ReminderDeps = {
    subscribers: async () => [sub({ last_sent_day: state.sent.get(USER) ?? null })],
    progress: async () => new Map([[USER, rows]]),
    adult: async () => true,
    account: async () => ({ email: "ada@example.org", banned: false }),
    async claim(id, day) {
      if (state.sent.get(id) === day) return false;
      state.sent.set(id, day);
      calls.push("claim");
      return true;
    },
    async release(id, _day, previous) {
      state.sent.set(id, previous);
      calls.push("release");
    },
    sendEmail: async () => void calls.push("email"),
    push: async () => (calls.push("push"), 1),
    ...over,
  };
  return { deps, calls, state };
}

const run = (deps: ReminderDeps, now = NY_EVENING) => runStreakReminders(deps, { now, gapMs: 0 });

test("a user is due only from 7pm to 10pm local, and not after a send that day", () => {
  assert.equal(dueDay(sub(), Date.UTC(2026, 10, 2, 23, 59)), null);
  assert.equal(dueDay(sub(), Date.UTC(2026, 11, 3, 0, 0)), "2026-12-2");
  assert.equal(dueDay(sub(), NY_EVENING), TODAY);
  assert.equal(dueDay(sub(), Date.UTC(2026, 10, 3, 3, 0)), null);
  assert.equal(dueDay(sub({ last_sent_day: TODAY }), NY_EVENING), null);
  assert.equal(dueDay(sub({ tz: "Mars/Olympus" }), NY_EVENING), null);
  assert.equal(dueDay(sub({ tz: "Asia/Tokyo" }), NY_EVENING), null);
});

test("a streak is at risk at 2 or more, studied yesterday, not yet today", () => {
  const stats = (...r: BranchRow[]) => studyStats(r);
  assert.equal(atRiskStreak(stats(row(5, YESTERDAY)), TODAY), 5);
  assert.equal(atRiskStreak(stats(row(2, YESTERDAY)), TODAY), 2);
  assert.equal(atRiskStreak(stats(row(1, YESTERDAY)), TODAY), 0);
  assert.equal(atRiskStreak(stats(row(5, TODAY)), TODAY), 0);
  assert.equal(atRiskStreak(stats(row(9, YESTERDAY), row(1, TODAY)), TODAY), 0);
  assert.equal(atRiskStreak(stats(row(9, dayKey(NY_EVENING - 2 * DAY_MS, "America/New_York"))), TODAY), 0);
  assert.equal(atRiskStreak(stats(row(3, YESTERDAY), row(7, YESTERDAY)), TODAY), 7);
  assert.equal(atRiskStreak([], TODAY), 0);
});

test("studyStats skips backups and the systems doc and reads subject and set branches", () => {
  const rows = [
    { ...row(4, TODAY), branch: "physics.bak-v1" },
    { branch: "lang-systems", data: { systems: [], removed: {} } },
    { ...row(6, TODAY), branch: "lang-sys-abc" },
    { ...row(8, TODAY), branch: "maths" },
  ] as BranchRow[];
  assert.deepEqual(studyStats(rows).map((s) => s?.streak), [6, 8]);
});

test("a due user gets one email and one push", async () => {
  const h = harness();
  const report = await run(h.deps);
  assert.deepEqual(h.calls, ["claim", "email", "push"]);
  assert.deepEqual(report, { subscribers: 1, due: 1, emailed: 1, pushed: 1, failed: 0, pending: 0 });
});

test("a second run the same evening sends nothing, even when it read a stale row", async () => {
  const h = harness();
  await run(h.deps);
  await run(h.deps, NY_EVENING + 3_600_000);
  h.deps.subscribers = async () => [sub()];
  await run(h.deps, NY_EVENING + 3_600_000);
  assert.equal(h.calls.filter((c) => c === "email").length, 1);
});

test("a user who stays quiet gets one reminder for the lapse and none in the 30 days after", async () => {
  const h = harness();
  let sends = 0;
  h.deps.sendEmail = async () => void sends++;
  for (let d = 0; d < 30; d++) await run(h.deps, NY_EVENING + d * DAY_MS);
  assert.equal(sends, 1);
});

test("minors, banned accounts and users with no live streak are skipped before a claim", async () => {
  for (const h of [harness(undefined, { adult: async () => false }), harness(undefined, { account: async () => ({ email: "a@b.co", banned: true }) }), harness(undefined, { account: async () => null }), harness([row(5, TODAY)])]) {
    await run(h.deps);
    assert.deepEqual(h.calls, []);
  }
});

test("a failed email with a delivered push keeps the claim", async () => {
  const h = harness(undefined, { sendEmail: async () => { throw new Error("resend 500"); } });
  const report = await run(h.deps);
  assert.deepEqual(h.calls, ["claim", "push"]);
  assert.equal(report.failed, 0);
  assert.equal(report.pushed, 1);
});

test("when neither channel lands the claim is released for the next run", async () => {
  const h = harness(undefined, { sendEmail: async () => { throw new Error("resend 500"); }, push: async () => 0 });
  const report = await run(h.deps);
  assert.deepEqual(h.calls, ["claim", "release"]);
  assert.equal(report.failed, 1);
  assert.equal(h.state.sent.get(USER), null);
});

test("a user with no email still gets the push", async () => {
  const h = harness(undefined, { account: async () => ({ email: null, banned: false }) });
  await run(h.deps);
  assert.deepEqual(h.calls, ["claim", "push"]);
});

test("a run past its deadline reports the rest as pending", async () => {
  const h = harness();
  const report = await runStreakReminders(h.deps, { now: NY_EVENING, gapMs: 0, deadline: 1, clock: () => 2 });
  assert.equal(report.pending, 1);
  assert.deepEqual(h.calls, []);
});

test("unsubscribe tokens verify only for the signed user and secret", () => {
  const url = new URL(streakUnsubscribeUrl(USER, SECRET));
  const u = url.searchParams.get("u");
  const s = url.searchParams.get("s");
  assert.equal(verifyStreakUnsubscribe(u, s, SECRET), USER);
  assert.equal(verifyStreakUnsubscribe("22222222-2222-4222-8222-222222222222", s, SECRET), null);
  assert.equal(verifyStreakUnsubscribe(u, s, "t".repeat(32)), null);
  assert.equal(verifyStreakUnsubscribe(u, s, "short"), null);
  assert.equal(verifyStreakUnsubscribe(u, s, null), null);
  assert.equal(verifyStreakUnsubscribe(u, null, SECRET), null);
  assert.equal(verifyStreakUnsubscribe("not-a-uuid", s, SECRET), null);
});

test("the email goes through Resend with one-click headers and a daily idempotency key", async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  await sendReminderEmail(async (url, init) => (seen.push({ url, init }), new Response("{}")), { apiKey: "k", secret: SECRET, from: "f@example.org", postalAddress: "1 Main St" }, { userId: USER, email: "ada@example.org", day: TODAY, streak: 5 });
  const headers = seen[0].init.headers as Record<string, string>;
  const body = JSON.parse(String(seen[0].init.body));
  assert.equal(seen[0].url, "https://api.resend.com/emails");
  assert.equal(headers["idempotency-key"], `streak-reminder/${TODAY}/${USER}`);
  assert.equal(body.subject, "Your 5-day streak ends tonight");
  assert.equal(body.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(body.headers["List-Unsubscribe"], /\/api\/academy\/streak-reminder\/unsubscribe\?u=/);
  await assert.rejects(sendReminderEmail(async () => new Response("no", { status: 500 }), { apiKey: "k", secret: SECRET, from: "f", postalAddress: "a" }, { userId: USER, email: "a@b.co", day: TODAY, streak: 5 }), /resend 500/);
});

test("the copy carries the stop link and postal address and has no em dash", () => {
  const m = renderReminder(5, "https://x.test/u?a=1&b=2", "1 Main St");
  assert.match(m.text, /Stop these reminders: https:\/\/x\.test/);
  assert.match(m.text, /1 Main St/);
  assert.match(m.html, /a=1&amp;b=2/);
  for (const t of [m.subject, m.text, m.html, streakPayload(5).aps.alert.body]) assert.doesNotMatch(t, /[–—]/);
});

test("every streak cron slot fits the Hobby once-a-day rule and all 24 hours are covered", () => {
  const crons = (JSON.parse(readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] }).crons;
  const slots = crons.filter((c) => c.path.startsWith("/api/cron/streak-reminders"));
  assert.equal(new Set(slots.map((c) => c.path)).size, 24);
  assert.equal(new Set(slots.map((c) => c.schedule)).size, 24);
  for (const c of slots) assert.match(c.schedule, /^0 \d{1,2} \* \* \*$/);
});
