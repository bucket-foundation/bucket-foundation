import test from "node:test";
import assert from "node:assert/strict";
import { createExperimentHandlers, rowToEnrolment } from "../src/lib/academy/experiment-server";
import { assignArm, type Enrolment } from "../src/lib/academy/input-experiment";
import { fetchEnrolment, registerEnrolment } from "../src/lib/academy/experiment-store";

function harness(opts: { user?: string | null; adult?: boolean | null; configured?: boolean; loadFails?: boolean } = {}) {
  const rows = new Map<string, Enrolment>();
  let inserts = 0;
  const h = createExperimentHandlers({
    configured: () => opts.configured ?? true,
    verifyUser: async () => (opts.user === undefined ? "u1" : opts.user),
    adult: async () => (opts.adult === undefined ? true : opts.adult),
    load: async (u) => (opts.loadFails ? undefined : rows.get(u) ?? null),
    insertFirst: async (u, e) => {
      inserts++;
      if (!rows.has(u)) rows.set(u, e);
      return rows.get(u)!;
    },
    now: () => 1000,
  });
  return { h, rows, inserts: () => inserts };
}

const post = (body: unknown) => new Request("http://x/api/academy/experiment", { method: "POST", body: JSON.stringify(body) });
const get = () => new Request("http://x/api/academy/experiment");

test("the server assigns the arm from the account and keeps the first enrolment", async () => {
  const { h, rows } = harness();
  const first = await h.POST(post({ experiment: "ci14-share-v1", stratum: "to-a2" }));
  assert.equal(first.status, 201);
  const e = (await first.json()).enrolment;
  assert.deepEqual(e, { experiment: "ci14-share-v1", key: "acct:u1", arm: assignArm("acct:u1"), stratum: "to-a2", at: 1000 });
  const again = await h.POST(post({ experiment: "ci14-share-v1", stratum: "past-a2" }));
  assert.equal(again.status, 200);
  assert.deepEqual((await again.json()).enrolment, e);
  assert.equal(rows.size, 1);
  assert.deepEqual((await (await h.GET(get())).json()).enrolment, e);
});

test("the server refuses minors, strangers, bad bodies and an unconfigured store", async () => {
  assert.equal((await harness({ adult: false }).h.POST(post({ experiment: "ci14-share-v1", stratum: "to-a2" }))).status, 403);
  assert.equal((await harness({ user: null }).h.GET(get())).status, 401);
  assert.equal((await harness().h.POST(post({ experiment: "other", stratum: "to-a2" }))).status, 400);
  assert.equal((await harness().h.POST(post({ experiment: "ci14-share-v1", stratum: "b1" }))).status, 400);
  assert.equal((await harness({ configured: false }).h.GET(get())).status, 503);
  assert.equal((await harness({ loadFails: true }).h.GET(get())).status, 502);
  assert.equal((await harness({ adult: null }).h.POST(post({ experiment: "ci14-share-v1", stratum: "to-a2" }))).status, 502);
});

test("stored rows map back to enrolments and reject unknown arms", () => {
  assert.deepEqual(rowToEnrolment({ experiment: "ci14-share-v1", unit: "acct:u", arm: "s70", stratum: "to-a2", enrolled_at: "1970-01-01T00:00:01.000Z" }), { experiment: "ci14-share-v1", key: "acct:u", arm: "s70", stratum: "to-a2", at: 1000 });
  assert.equal(rowToEnrolment({ experiment: "ci14-share-v1", unit: "acct:u", arm: "s60", stratum: "to-a2", enrolled_at: 1 }), null);
  assert.equal(rowToEnrolment(null), null);
});

test("the web client reads and registers through the route", async () => {
  const { h } = harness();
  const fetcher = (async (_u: string, init?: RequestInit) => (init?.method === "POST" ? h.POST(new Request("http://x", init)) : h.GET(new Request("http://x")))) as unknown as typeof fetch;
  assert.deepEqual(await fetchEnrolment("t", fetcher), { ok: true, enrolment: null });
  const e = await registerEnrolment("t", "past-a2", fetcher);
  assert.equal(e?.arm, assignArm("acct:u1"));
  assert.deepEqual(await fetchEnrolment("t", fetcher), { ok: true, enrolment: e });
  const broken = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
  assert.deepEqual(await fetchEnrolment("t", broken), { ok: false });
  assert.equal(await registerEnrolment("t", "to-a2", broken), null);
});
