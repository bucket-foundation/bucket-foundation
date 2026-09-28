import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { inLaunchScope } from "../src/lib/research-os/launch-scope";

const BASE = "http://localhost/api/research-os/advisors";

function req(path: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${BASE}/${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("match and swipes are staff-only at launch; the opt-out and its page are public", () => {
  assert.equal(inLaunchScope("/api/research-os/advisors/match"), false);
  assert.equal(inLaunchScope("/api/research-os/advisors/swipes"), false);
  assert.equal(inLaunchScope("/research-os/advisors"), false);
  assert.equal(inLaunchScope("/api/research-os/advisors/optout"), true);
  assert.equal(inLaunchScope("/research-os/remove-advisor"), true);
});

test("anonymous calls to match and swipes are refused before any data is read", async () => {
  const match = await import("../src/app/api/research-os/advisors/match/route");
  const swipes = await import("../src/app/api/research-os/advisors/swipes/route");
  for (const res of [
    await match.POST(req("match", "POST", { text: "mitochondria membranes" })),
    await swipes.GET(req("swipes", "GET")),
    await swipes.PUT(req("swipes", "PUT", { openalexId: "A1", decision: "yes" })),
    await swipes.DELETE(req("swipes", "DELETE")),
  ]) {
    assert.ok([401, 404].includes(res.status), `status ${res.status}`);
    assert.equal(res.headers.get("cache-control")?.includes("no-store") ?? true, true);
  }
});

test("the opt-out validates input before it touches the database", async () => {
  const { POST } = await import("../src/app/api/research-os/advisors/optout/route");
  const cases: [unknown, number][] = [
    ["not json", 400],
    [{ contact: "me@x.org" }, 400],
    [{ openalexId: "B123", contact: "me@x.org" }, 400],
    [{ orcid: "1234", contact: "me@x.org" }, 400],
    [{ openalexId: "A123", contact: "x" }, 400],
    [{ openalexId: "A123", contact: "me@x.org", website: "spam" }, 200],
    ["x".repeat(5000), 413],
  ];
  for (const [body, status] of cases) {
    const res = await POST(req("optout", "POST", body));
    assert.equal(res.status, status, JSON.stringify(body).slice(0, 60));
  }
});

test("every match call spends quota, so later offsets without a first page are refused", async () => {
  const db = require("../src/lib/research-os/db");
  const gate = require("../src/lib/research-os/advisors/gate");
  const store = require("../src/lib/research-os/advisors/store");
  const saved = { identity: db.verifyLearnerIdentity, adult: gate.adultLearner, take: store.takeMatch, load: store.loadSpace, env: process.env.RESEARCH_OS_REVIEWER_EMAILS };
  const calls: { text: string }[] = [];
  let quota: string = "over_cap";
  process.env.RESEARCH_OS_REVIEWER_EMAILS = "staff@example.org";
  db.verifyLearnerIdentity = async () => ({ id: "u1", email: "staff@example.org" });
  gate.adultLearner = async () => ({ ok: true, learnerId: "u1" });
  store.takeMatch = async (_id: string, text: string) => {
    calls.push({ text });
    return quota;
  };
  store.loadSpace = async () => {
    throw new Error("loadSpace must not run when the quota refuses");
  };
  try {
    const { POST } = await import("../src/app/api/research-os/advisors/match/route");
    const text = "mitochondria membranes circadian metabolism in cells";
    for (const offset of [1, 25, 275]) {
      const res = await POST(req("match", "POST", { text, offset }));
      assert.equal(res.status, 429, `offset ${offset}`);
    }
    assert.equal(calls.length, 3);
    quota = "over_pages";
    const pages = await POST(req("match", "POST", { text, offset: 50 }));
    assert.equal(pages.status, 429);
    assert.equal((await pages.json()).message, "You loaded every page for this text today.");
    const bad = await POST(req("match", "POST", { text, offset: 300 }));
    assert.equal(bad.status, 400);
    assert.equal(calls.length, 4);
    gate.adultLearner = saved.adult;
    const anon = await POST(req("match", "POST", { text, offset: 1 }));
    assert.equal(anon.status, 401);
    assert.equal(calls.length, 4);
  } finally {
    db.verifyLearnerIdentity = saved.identity;
    gate.adultLearner = saved.adult;
    store.takeMatch = saved.take;
    store.loadSpace = saved.load;
    process.env.RESEARCH_OS_REVIEWER_EMAILS = saved.env;
  }
});

test("the opt-out answers 429 when the source is over its hourly limit and reports queued requests", async () => {
  const store = require("../src/lib/research-os/advisors/store");
  const saved = store.requestOptOut;
  const seen: string[] = [];
  let outcome = "rate_limited";
  store.requestOptOut = async (input: { source: string }) => {
    seen.push(input.source);
    return outcome;
  };
  try {
    const { POST } = await import("../src/app/api/research-os/advisors/optout/route");
    const body = { openalexId: "A123", contact: "me@example.org" };
    const limited = await POST(req("optout", "POST", body, { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }));
    assert.equal(limited.status, 429);
    outcome = "queued";
    const queued = await POST(req("optout", "POST", body, { "x-forwarded-for": "203.0.113.9" }));
    assert.deepEqual(await queued.json(), { received: true, hidden: false });
    assert.deepEqual(seen, ["203.0.113.9", "203.0.113.9"]);
  } finally {
    store.requestOptOut = saved;
  }
});

test("text hashes ignore whitespace and source hashes never contain the address", async () => {
  const { textHash, sourceHash } = await import("../src/lib/research-os/advisors/store");
  assert.equal(textHash("a  b\n c"), textHash("a b c"));
  assert.notEqual(textHash("a b c"), textHash("a b d"));
  assert.match(sourceHash("203.0.113.9"), /^[0-9a-f]{64}$/);
  assert.ok(!sourceHash("203.0.113.9").includes("203"));
});
