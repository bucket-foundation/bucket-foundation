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

function memoryStore(p: LearnerProfile | null): LearnEventStore & { rows: LearnEventRow[]; writes: number; hits: number; batches: number } {
  const rows: LearnEventRow[] = [];
  const counts = new Map<string, number>();
  const store = {
    rows,
    writes: 0,
    hits: 0,
    batches: 0,
    writeBatch: async (userId: string, batch: LearnEventRow[], caps: Record<string, number>) => {
      store.batches++;
      return batch.map((row) => {
        if (rows.some((r) => r.user_id === userId && r.event_id === row.event_id)) return { id: row.event_id, outcome: "duplicate" as const };
        if (rows.filter((r) => r.user_id === userId && r.name === row.name).length >= (caps[row.name] ?? 0)) return { id: row.event_id, outcome: "rate_limited" as const };
        rows.push(row);
        return { id: row.event_id, outcome: "recorded" as const };
      });
    },
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

test("the daily caps are placement 20, study sessions 60, assessments 30, exposures 300, session mixes 60 and vocab tests 4", () => {
  assert.deepEqual(EVENT_DAILY_CAPS, { placement_done: 20, study_session_done: 60, assess_done: 30, exposure: 300, session_mix: 60, vocab_test: 4 });
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

const EXPOSURE: LearnEventProps["exposure"] = { item: "tatoeba:123", unit: "set:es:1", lemmas_seen: ["casa", "perro"], taps: ["perro"], seconds: 42, coverage_pred: 0.95, completed: true };
const MIX: LearnEventProps["session_mix"] = { session: "s-1", share_target: null, share_real: null, arm: null, units: null, cards: 12, seconds: 600 };
const ADULT = async () => ({ id: USER, email: null });

test("exposure props cap lemmas at 200 and seconds at 3600", () => {
  assert.equal(parseProps("exposure", EXPOSURE).ok, true);
  assert.equal(parseProps("exposure", { ...EXPOSURE, lemmas_seen: Array.from({ length: 200 }, (_, i) => `w${i}`) }).ok, true);
  assert.equal(parseProps("exposure", { ...EXPOSURE, lemmas_seen: Array.from({ length: 201 }, (_, i) => `w${i}`) }).ok, false);
  assert.equal(parseProps("exposure", { ...EXPOSURE, seconds: 3600 }).ok, true);
  assert.equal(parseProps("exposure", { ...EXPOSURE, seconds: 3601 }).ok, false);
  assert.equal(parseProps("exposure", { ...EXPOSURE, coverage_pred: 1.2 }).ok, false);
  assert.equal(parseProps("exposure", { ...EXPOSURE, taps: ["two words"] }).ok, false);
  assert.equal(parseProps("session_mix", MIX).ok, true);
  assert.equal(parseProps("session_mix", { ...MIX, share_real: -0.1 }).ok, false);
  assert.equal(parseProps("session_mix", { ...MIX, share_target: 0.7, share_real: 0.66, arm: "share70", units: 4 }).ok, true);
  assert.equal(parseProps("session_mix", { ...MIX, arm: "control" }).ok, true);
  assert.equal(parseProps("session_mix", { ...MIX, cards: null }).ok, false);
});

test("one batch per session records every row in one request", async () => {
  const store = memoryStore(profile("18plus"));
  const events = [
    { id: randomUUID(), name: "exposure", props: EXPOSURE },
    { id: randomUUID(), name: "exposure", props: { ...EXPOSURE, item: "tatoeba:124" } },
    { id: randomUUID(), name: "session_mix", props: MIX },
  ];
  const res = await handleLearnEvent(post({ events }), { verifyUser: ADULT, store: () => store });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).outcome, "recorded");
  assert.deepEqual(store.rows.map((r) => r.name), ["exposure", "exposure", "session_mix"]);
  assert.equal(store.batches, 1, "one bulk write per batch");
  assert.equal(store.writes + store.hits, 0, "no per-event write or cap call");
});

test("a batch from a minor or a learner without a profile writes nothing", async () => {
  for (const p of [profile("13to17", "parent"), profile("under13", "school"), null]) {
    const store = memoryStore(p);
    const res = await handleLearnEvent(post({ events: [{ id: randomUUID(), name: "exposure", props: EXPOSURE }] }), { verifyUser: ADULT, store: () => store });
    assert.notEqual((await res.json()).outcome, "recorded");
    assert.equal(store.writes + store.hits + store.batches, 0);
  }
});

test("a batch refuses review-only names, duplicate ids and bad props", async () => {
  const store = memoryStore(profile("18plus"));
  const id = randomUUID();
  for (const events of [
    [{ id, name: "assess_done", props: ASSESS }],
    [{ id, name: "exposure", props: EXPOSURE }, { id, name: "exposure", props: EXPOSURE }],
    [{ id, name: "exposure", props: { ...EXPOSURE, seconds: 4000 } }],
  ]) assert.equal((await handleLearnEvent(post({ events }), { verifyUser: ADULT, store: () => store })).status, 400);
  assert.equal(store.writes, 0);
});

test("past 300 exposures a day the batch marks the rest rate limited", async () => {
  const store = memoryStore(profile("18plus"));
  const events = Array.from({ length: 302 }, () => ({ id: randomUUID(), name: "exposure", props: EXPOSURE }));
  const body = await (await handleLearnEvent(post({ events }), { verifyUser: ADULT, store: () => store })).json();
  assert.equal(store.rows.length, 300);
  assert.equal(body.results.filter((r: { outcome: string }) => r.outcome === "rate_limited").length, 2);
});

test("a retried batch dedupes before the cap, so a retry never burns the cap", async () => {
  const store = memoryStore(profile("18plus"));
  const events = Array.from({ length: 300 }, () => ({ id: randomUUID(), name: "exposure", props: EXPOSURE }));
  await handleLearnEvent(post({ events }), { verifyUser: ADULT, store: () => store });
  const again = await (await handleLearnEvent(post({ events }), { verifyUser: ADULT, store: () => store })).json();
  assert.ok(again.results.every((r: { outcome: string }) => r.outcome === "duplicate"));
  assert.equal(store.rows.length, 300);
});

test("an empty batch probes the gate and writes nothing", async () => {
  const store = memoryStore(profile("13to17", "parent"));
  const body = await (await handleLearnEvent(post({ events: [] }), { verifyUser: ADULT, store: () => store })).json();
  assert.equal(body.outcome, "under_age");
  assert.equal(store.batches, 0);
});
