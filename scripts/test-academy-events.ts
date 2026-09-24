import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { EVENT_DAILY_CAPS, parseClientEvent, parseProps, type LearnEventProps } from "../src/lib/academy/events";
import { learnEventGate, recordLearnEvent, type LearnEventRow, type LearnEventStore, type WriteOutcome } from "../src/lib/academy/events-server";
import { createEventSender } from "../src/lib/academy/events-client";
import { handleLearnEvent } from "../src/app/api/academy/event/handler";
import type { BirthYearBucket, ConsentStatus, LearnerProfile } from "../src/lib/research-os/consent";

const USER = "11111111-1111-1111-1111-111111111111";

function profile(band: BirthYearBucket | null, consent: ConsentStatus = "none"): LearnerProfile {
  return { learnerId: USER, role: "independent", birthYearBucket: band, consentStatus: consent, consentSource: null, updatedAt: "2026-09-23T00:00:00Z" };
}

function memoryStore(p: LearnerProfile | null): LearnEventStore & { rows: LearnEventRow[]; writes: number; hits: number } {
  const rows: LearnEventRow[] = [];
  const counts = new Map<string, number>();
  const store = {
    rows,
    writes: 0,
    hits: 0,
    readProfile: async () => p,
    hit: async (userId: string, name: string) => {
      store.hits++;
      const n = (counts.get(`${userId}:${name}`) ?? 0) + 1;
      counts.set(`${userId}:${name}`, n);
      return n;
    },
    write: async (row: LearnEventRow): Promise<WriteOutcome> => {
      store.writes++;
      if (rows.some((r) => r.user_id === row.user_id && r.event_id === row.event_id)) return "duplicate";
      rows.push(row);
      return "recorded";
    },
  };
  return store;
}

const ASSESS: LearnEventProps["assess_done"] = {
  branch: "02-physics",
  items: [
    { atomId: "newton-2", level: "recall", correct: true, autoGraded: true },
    { atomId: "momentum", level: "apply", correct: false, autoGraded: false },
  ],
};

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/academy/event", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
}

test("the gate records adults and refuses a missing profile and every minor band, consented or not", () => {
  assert.deepEqual(learnEventGate(profile("18plus")), { record: true });
  assert.deepEqual(learnEventGate(null), { record: false, reason: "no_profile" });
  assert.deepEqual(learnEventGate(profile(null)), { record: false, reason: "under_age" });
  for (const band of ["under13", "13to17"] as const) {
    for (const consent of ["none", "school", "parent"] as const) {
      assert.deepEqual(learnEventGate(profile(band, consent)), { record: false, reason: "under_age" }, `${band}/${consent}`);
    }
  }
});

test("a refused event never reaches the store", async () => {
  for (const p of [null, profile("13to17", "parent"), profile("under13")]) {
    const store = memoryStore(p);
    const out = await recordLearnEvent(store, USER, { id: randomUUID(), name: "assess_done", props: ASSESS });
    assert.equal(out.recorded, false);
    assert.equal(store.writes, 0);
  }
});

test("a retried event with the same id is written once", async () => {
  const store = memoryStore(profile("18plus"));
  const id = randomUUID();
  const first = await recordLearnEvent(store, USER, { id, name: "assess_done", props: ASSESS });
  const again = await recordLearnEvent(store, USER, { id, name: "assess_done", props: ASSESS });
  assert.deepEqual(first, { recorded: true, outcome: "recorded" });
  assert.deepEqual(again, { recorded: false, outcome: "duplicate" });
  assert.equal(store.rows.length, 1);
  assert.deepEqual(store.rows[0].props, ASSESS);
});

test("props validation rejects out-of-range and malformed payloads", () => {
  assert.equal(parseProps("study_session_done", { branch: "02-physics", items: 3, correct: 4, seconds: 10 }).ok, false);
  assert.equal(parseProps("placement_done", { branch: "../x", questions: 5, known: 1 }).ok, false);
  assert.equal(parseProps("assess_done", { branch: "02-physics", items: [] }).ok, false);
  assert.equal(parseProps("assess_done", { branch: "02-physics", items: [{ atomId: "a", level: "guess", correct: true, autoGraded: true }] }).ok, false);
  assert.equal(parseProps("age_band_set", { band: "adult" }).ok, false);
  const extra = parseProps("placement_done", { branch: "02-physics", questions: 5, known: 2, email: "x@y.z" });
  assert.deepEqual(extra, { ok: true, value: { branch: "02-physics", questions: 5, known: 2 } });
});

test("the client route accepts only client-side event names", () => {
  assert.equal(parseClientEvent({ id: randomUUID(), name: "tutor_turn", props: {} }).ok, false);
  assert.equal(parseClientEvent({ id: randomUUID(), name: "age_band_set", props: { band: "18plus" } }).ok, false);
  assert.equal(parseClientEvent({ id: "not-a-uuid", name: "assess_done", props: ASSESS }).ok, false);
  assert.equal(parseClientEvent({ id: randomUUID(), name: "assess_done", props: ASSESS }).ok, true);
});

test("the route refuses without a store, without a user and on a bad body", async () => {
  const store = memoryStore(profile("18plus"));
  const user = async () => ({ id: USER, email: null });
  assert.equal((await handleLearnEvent(post({}), { verifyUser: user, store: () => null })).status, 503);
  assert.equal((await handleLearnEvent(post({}), { verifyUser: async () => null, store: () => store })).status, 401);
  assert.equal((await handleLearnEvent(post("{"), { verifyUser: user, store: () => store })).status, 400);
  assert.equal((await handleLearnEvent(post("x".repeat(20_000)), { verifyUser: user, store: () => store })).status, 413);
  assert.equal(store.writes, 0);
});

test("an assessment run posted twice through the route is recorded once", async () => {
  const store = memoryStore(profile("18plus"));
  const deps = { verifyUser: async () => ({ id: USER, email: null }), store: () => store };
  const body = { id: randomUUID(), name: "assess_done", props: ASSESS };
  const a = await handleLearnEvent(post(body), deps);
  const b = await handleLearnEvent(post(body), deps);
  assert.deepEqual(await a.json(), { recorded: true, outcome: "recorded" });
  assert.deepEqual(await b.json(), { recorded: false, outcome: "duplicate" });
  assert.equal(store.rows.length, 1);
  assert.equal(store.rows[0].user_id, USER);
});

test("the route answers a minor with recorded false and writes nothing", async () => {
  const store = memoryStore(profile("13to17", "school"));
  const res = await handleLearnEvent(post({ id: randomUUID(), name: "assess_done", props: ASSESS }), { verifyUser: async () => ({ id: USER, email: null }), store: () => store });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { recorded: false, outcome: "under_age" });
  assert.equal(store.writes, 0);
  assert.equal(store.hits, 0, "a minor leaves no counter row either");
});

test("the daily caps are placement 20, study sessions 60 and assessments 30", () => {
  assert.deepEqual(EVENT_DAILY_CAPS, { placement_done: 20, study_session_done: 60, assess_done: 30 });
});

test("past the daily cap the route answers 429 with Retry-After and writes nothing more", async () => {
  const store = memoryStore(profile("18plus"));
  const deps = { verifyUser: async () => ({ id: USER, email: null }), store: () => store };
  const cap = EVENT_DAILY_CAPS.assess_done;
  for (let i = 0; i < cap; i++) {
    const ok = await handleLearnEvent(post({ id: randomUUID(), name: "assess_done", props: ASSESS }), deps);
    assert.equal(ok.status, 200);
  }
  const over = await handleLearnEvent(post({ id: randomUUID(), name: "assess_done", props: ASSESS }), deps);
  assert.equal(over.status, 429);
  const retryAfter = Number(over.headers.get("retry-after"));
  assert.ok(retryAfter >= 1 && retryAfter <= 86_400, String(retryAfter));
  const body = await over.json();
  assert.equal(body.error, "rate_limited");
  assert.equal(body.cap, cap);
  assert.equal(store.rows.length, cap);
  const other = await handleLearnEvent(post({ id: randomUUID(), name: "placement_done", props: { branch: "02-physics", questions: 5, known: 2 } }), deps);
  assert.equal(other.status, 200, "each event type has its own counter");
});

test("the client sends one request per id and retries a failure with the same id", async () => {
  const bodies: string[] = [];
  const statuses = [503, 200];
  const sender = createEventSender(
    async (_url, init) => {
      bodies.push(String(init.body));
      const status = statuses.shift() ?? 200;
      return { ok: status < 300, status };
    },
    async () => {},
  );
  const id = randomUUID();
  const [one, two] = await Promise.all([sender.send(id, "assess_done", ASSESS), sender.send(id, "assess_done", ASSESS)]);
  assert.equal(one, true);
  assert.equal(two, true);
  assert.equal(await sender.send(id, "assess_done", ASSESS), true);
  assert.equal(bodies.length, 2, "one first try plus one retry, never a third");
  assert.equal(bodies[0], bodies[1]);
  assert.equal(JSON.parse(bodies[1]).id, id);
});

test("the client stops on a 4xx without retrying", async () => {
  let calls = 0;
  const sender = createEventSender(async () => {
    calls++;
    return { ok: false, status: 400 };
  }, async () => {});
  assert.equal(await sender.send(randomUUID(), "placement_done", { branch: "02-physics", questions: 5, known: 2 }), false);
  assert.equal(calls, 1);
});
