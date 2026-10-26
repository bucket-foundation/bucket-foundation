import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { answeredProps, BETA_LIMITS, parseBatch, parseProps } from "../src/lib/beta/events";
import type { Question } from "../src/lib/academy/question-types";
import type { BetaStore, BetaTester, StoredBetaEvent } from "../src/lib/beta/store";
import { memory, NOW } from "./beta-memory-store";
import { buildReport, summarizeUser, utcDay } from "../src/lib/beta/metrics";
import { handleBetaEvents, handleBetaOptOut } from "../src/app/api/beta/events/handler";
import { handleBetaReport, handleSetCohort } from "../src/app/api/admin/beta/handler";

const USER = "11111111-1111-1111-1111-111111111111";
const KEY = "k".repeat(24);

function ev(over: Record<string, unknown> = {}) {
  return { id: randomUUID(), name: "card_answered", ts: "2026-10-26T11:00:00Z", session_id: randomUUID(), props: { correct: true }, ...over };
}

function post(body: unknown, auth = true): NextRequest {
  return new NextRequest("http://localhost/api/beta/events", {
    method: "POST",
    headers: auth ? { authorization: "Bearer t" } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function ingest(store: BetaStore | null) {
  return (req: NextRequest) =>
    handleBetaEvents(req, { verifyUser: async (r) => (r.headers.get("authorization") ? { id: USER, email: null } : null), store: () => store, now: () => NOW });
}

test("parseProps refuses device identifiers, location and nested values", () => {
  assert.equal(parseProps({ ip: "1.2.3.4" }).ok, false);
  assert.equal(parseProps({ device_id: "x" }).ok, false);
  assert.equal(parseProps({ latitude: 1 }).ok, false);
  assert.equal(parseProps({ deck: { a: 1 } }).ok, false);
  assert.equal(parseProps({ Card: 1 }).ok, false);
  assert.deepEqual(parseProps({ correct: true, ms: 1200, deck: "es-a1" }), { ok: true, value: { correct: true, ms: 1200, deck: "es-a1" } });
});

test("parseBatch keeps good events and lists bad ones by index", () => {
  const dup = ev();
  const r = parseBatch({ app: "polingual", events: [ev(), { ...ev(), name: "nope" }, ev({ ts: "2030-01-01T00:00:00Z" }), dup, dup] }, NOW);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.events.length, 2);
  assert.deepEqual(r.value.rejected, [
    { index: 1, error: "bad_name" },
    { index: 2, error: "ts_in_future" },
    { index: 4, error: "duplicate_in_batch" },
  ]);
  assert.equal(parseBatch({ app: "android", events: [ev()] }, NOW).ok, false);
  assert.equal(parseBatch({ app: "bucket", events: Array.from({ length: BETA_LIMITS.maxEvents + 1 }, () => ev()) }, NOW).ok, false);
});

test("ingest needs a bearer token and a store", async () => {
  assert.equal((await ingest(memory())(post({ app: "bucket", events: [ev()] }, false))).status, 401);
  assert.equal((await ingest(null)(post({ app: "bucket", events: [ev()] }))).status, 503);
  assert.equal((await ingest(memory())(post("{"))).status, 400);
});

test("ingest is idempotent on event id", async () => {
  const store = memory();
  const e = ev();
  const first = await (await ingest(store)(post({ app: "bucket", events: [e] }))).json();
  const again = await (await ingest(store)(post({ app: "bucket", events: [e] }))).json();
  assert.deepEqual([first.accepted, first.duplicate, first.cohort], [1, 0, "default"]);
  assert.deepEqual([again.accepted, again.duplicate], [0, 1]);
  assert.equal(store.rows.size, 1);
});

test("ingest records nothing for an opted-out tester", async () => {
  const store = memory(true);
  const body = await (await ingest(store)(post({ app: "bucket", events: [ev()] }))).json();
  assert.equal(body.opted_out, true);
  assert.equal(store.rows.size, 0);
});

test("ingest returns 429 past the daily cap and resent duplicates do not count", async () => {
  const store = memory();
  const batch = Array.from({ length: 50 }, () => ev());
  for (let i = 0; i < BETA_LIMITS.dailyCap / 50; i++) {
    const fresh = Array.from({ length: 50 }, () => ev());
    assert.equal((await ingest(store)(post({ app: "bucket", events: i === 0 ? batch : fresh }))).status, 200);
  }
  assert.equal((await ingest(store)(post({ app: "bucket", events: batch }))).status, 200);
  const res = await ingest(store)(post({ app: "bucket", events: [ev()] }));
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get("retry-after")) > 0);
  assert.equal(store.rows.size, BETA_LIMITS.dailyCap);
});

test("opt-out stops storage and deletes held events, opt-in resumes", async () => {
  const store = memory();
  await ingest(store)(post({ app: "bucket", events: [ev()] }));
  const optOut = (v: unknown, auth = true) =>
    handleBetaOptOut(post({ opted_out: v }, auth), { verifyUser: async (r) => (r.headers.get("authorization") ? { id: USER, email: null } : null), store: () => store });
  assert.equal((await optOut(true, false)).status, 401);
  assert.equal((await optOut("yes")).status, 400);
  assert.equal((await optOut(true)).status, 200);
  assert.equal(store.rows.size, 0);
  const body = await (await ingest(store)(post({ app: "bucket", events: [ev()] }))).json();
  assert.equal(body.opted_out, true);
  assert.equal(store.rows.size, 0);
  await optOut(false);
  await ingest(store)(post({ app: "bucket", events: [ev()] }));
  assert.equal(store.rows.size, 1);
});

function tester(userId: string, cohort = "a"): BetaTester {
  return { userId, cohort, firstApp: "polingual", optedOut: false, enrolledAt: "2026-09-01T00:00:00Z" };
}

function stored(userId: string, ts: string, name: StoredBetaEvent["name"], props: StoredBetaEvent["props"] = {}, sessionId = "s1"): StoredBetaEvent {
  return { userId, app: "polingual", name, sessionId, ts, props };
}

test("summarizeUser counts cards and marks D1 and D7 return, D30 unknown until due", () => {
  const events = [
    stored("u", "2026-10-01T10:00:00Z", "card_answered", { correct: true }),
    stored("u", "2026-10-02T10:00:00Z", "card_answered", { correct: false }, "s2"),
    stored("u", "2026-10-02T10:01:00Z", "card_answered", { correct: true }, "s2"),
    stored("u", "2026-10-02T10:05:00Z", "session_end", { seconds: 300 }, "s2"),
    stored("u", "2026-10-03T10:00:00Z", "lesson_complete", {}, "s3"),
  ];
  const s = summarizeUser(tester("u"), events, utcDay("2026-10-20T00:00:00Z"));
  assert.deepEqual([s.sessions, s.cardsAnswered, s.cardsCorrect, s.lessonsCompleted, s.activeDays, s.secondsInSession], [3, 3, 2, 1, 3, 300]);
  assert.deepEqual(s.retained, { 1: true, 7: false, 30: null });
  assert.equal(s.recall[1], 0.5);
});

test("buildReport groups by cohort and skips opted-out testers", () => {
  const out = { ...tester("z"), optedOut: true };
  const r = buildReport(
    [tester("u", "a"), tester("v", "a"), tester("w", "b"), out],
    [stored("u", "2026-10-01T00:00:00Z", "app_open"), stored("u", "2026-10-02T00:00:00Z", "app_open"), stored("v", "2026-10-01T00:00:00Z", "app_open")],
    new Date("2026-10-26T00:00:00Z"),
  );
  assert.equal(r.users.length, 3);
  const a = r.cohorts.find((c) => c.cohort === "a")!;
  assert.deepEqual([a.users, a.activeUsers, a.retention[1]], [2, 2, 0.5]);
  assert.equal(r.cohorts.find((c) => c.cohort === "b")!.retention[1], null);
});

function admin(method: string, key: string | null, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/beta", {
    method,
    headers: key ? { authorization: `Bearer ${key}`, "content-type": "application/json" } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("admin report hides behind the admin key and reassigns cohorts", async () => {
  const store = memory();
  await store.tester(USER, "bucket");
  const deps = { adminKey: () => KEY, store: () => store, now: () => NOW };
  assert.equal((await handleBetaReport(admin("GET", "wrong-key-wrong-key"), deps)).status, 404);
  assert.equal((await handleBetaReport(admin("GET", null), deps)).status, 404);
  const ok = await handleBetaReport(admin("GET", KEY), deps);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).users.length, 1);
  assert.equal((await handleSetCohort(admin("POST", KEY, { user_id: USER, cohort: "Bad Name" }), deps)).status, 400);
  assert.equal((await handleSetCohort(admin("POST", KEY, { user_id: USER, cohort: "wave2" }), deps)).status, 200);
  assert.equal((await store.testers())[0].cohort, "wave2");
  assert.equal((await handleSetCohort(admin("POST", KEY, { user_id: randomUUID(), cohort: "wave2" }), deps)).status, 404);
});

test("card_answered props carry question_kind and applied with the BetaEvents.swift names", () => {
  const q = { id: "x.applied", atom: "x", kind: "calculate", prompt: "?", answer: 1, applied: true } as Question;
  const props = answeredProps("science:02-physics", true, 1200, q.kind, q);
  assert.deepEqual(props, { deck: "science:02-physics", correct: true, ms: 1200, kind: "calculate", question_kind: "calculate", applied: true });
  assert.equal(answeredProps("science:02-physics", true, 1, "pick", { ...q, kind: "pick", applied: undefined } as Question).applied, false);
  const drill = answeredProps("science:02-physics", false, 900, "review");
  assert.ok(!("question_kind" in drill) && !("applied" in drill) && drill.kind === "review");
  assert.ok(parseProps(props).ok);
});
