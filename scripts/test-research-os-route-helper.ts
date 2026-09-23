import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-require-imports */
const db = require("@/lib/research-os/db") as Record<string, unknown>;
const consent = require("@/lib/research-os/consent") as Record<string, unknown>;
const helper = require("@/lib/research-os/route") as typeof import("../src/lib/research-os/route");
/* eslint-enable @typescript-eslint/no-require-imports */

const { withResearchOsRoute, readJson } = helper;
const LEARNER = "00000000-0000-0000-0000-0000000000d1";

let isConfigured = true;
let signedIn: string | null = LEARNER;
db.configured = () => isConfigured;
db.verifyLearner = async () => signedIn;

function reset(): void {
  isConfigured = true;
  signedIn = LEARNER;
  consent.requireConsent = async () => ({ allowed: true });
}

const get = () => new NextRequest("http://localhost/api/research-os/x");
const post = (body: string) => new NextRequest("http://localhost/api/research-os/x", { method: "POST", body, headers: { "content-type": "application/json" } });

async function read(res: Response): Promise<{ status: number; cache: string | null; body: unknown }> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, cache: res.headers.get("cache-control"), body };
}

test("an unconfigured stack answers 503 before auth runs", async () => {
  reset();
  isConfigured = false;
  let authed = false;
  db.verifyLearner = async () => ((authed = true), LEARNER);
  const route = withResearchOsRoute({ auth: "required" }, () => ({ ok: true }));
  assert.deepEqual(await read(await route(get(), undefined)), { status: 503, cache: "no-store", body: { error: "research_os_unavailable" } });
  assert.equal(authed, false);
  db.verifyLearner = async () => signedIn;
});

test("auth required answers 401 without a session and hands the learner id otherwise", async () => {
  reset();
  const route = withResearchOsRoute({ auth: "required" }, (_req, ctx) => ({ learnerId: ctx.learnerId }));
  signedIn = null;
  assert.deepEqual(await read(await route(get(), undefined)), { status: 401, cache: "no-store", body: { error: "unauthorized" } });
  signedIn = LEARNER;
  assert.deepEqual(await read(await route(get(), undefined)), { status: 200, cache: "no-store", body: { learnerId: LEARNER } });
});

test("auth optional passes a null learner through", async () => {
  reset();
  signedIn = null;
  const route = withResearchOsRoute({ auth: "optional" }, (_req, ctx) => ({ learnerId: ctx.learnerId }));
  assert.deepEqual(await read(await route(get(), undefined)), { status: 200, cache: "no-store", body: { learnerId: null } });
});

test("auth none never reads a session", async () => {
  reset();
  let authed = false;
  db.verifyLearner = async () => ((authed = true), LEARNER);
  const route = withResearchOsRoute({ auth: "none" }, () => ({ fine: true }));
  assert.equal((await route(get(), undefined)).status, 200);
  assert.equal(authed, false);
  db.verifyLearner = async () => signedIn;
});

test("custom refusals keep a route's own bodies and gain no-store", async () => {
  reset();
  signedIn = null;
  const route = withResearchOsRoute(
    { auth: "required", unauthorized: () => NextResponse.json({ error: "no_session", message: "Sign in." }, { status: 401 }) },
    () => ({}),
  );
  assert.deepEqual(await read(await route(get(), undefined)), { status: 401, cache: "no-store", body: { error: "no_session", message: "Sign in." } });
});

test("consent refused is a 403 and consent unavailable is a 503, both through consentRefusal", async () => {
  reset();
  const route = withResearchOsRoute({ auth: "required", consent: "workspace_tool" }, () => ({ reached: true }));
  consent.requireConsent = async () => ({ allowed: false, reason: "unavailable" });
  const down = await read(await route(get(), undefined));
  assert.equal(down.status, 503);
  assert.equal(down.cache, "no-store");
  assert.equal((down.body as { error: string }).error, "consent_unavailable");
  consent.requireConsent = async () => ({ allowed: false, reason: "no_profile" });
  const refused = await read(await route(get(), undefined));
  assert.equal(refused.status, 403);
  assert.equal(refused.cache, "no-store");
  consent.requireConsent = async () => ({ allowed: true });
  assert.deepEqual((await read(await route(get(), undefined))).body, { reached: true });
});

test("a Response the handler returns passes through with no-store added", async () => {
  reset();
  const route = withResearchOsRoute({ auth: "none" }, () => new Response("a,b\n1,2\n", { status: 202, headers: { "content-type": "text/csv" } }));
  const res = await route(get(), undefined);
  assert.equal(res.status, 202);
  assert.equal(res.headers.get("content-type"), "text/csv");
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(await res.text(), "a,b\n1,2\n");
});

test("a Response that already says no-store keeps its own cache-control", async () => {
  reset();
  const route = withResearchOsRoute({ auth: "none" }, () => NextResponse.json({}, { headers: { "cache-control": "private, no-store" } }));
  assert.equal((await route(get(), undefined)).headers.get("cache-control"), "private, no-store");
  const cached = withResearchOsRoute({ auth: "none" }, () => NextResponse.json({}, { headers: { "cache-control": "public, max-age=60" } }));
  assert.equal((await cached(get(), undefined)).headers.get("cache-control"), "no-store");
});

test("a throw is logged and answers a fixed 503 with no detail", async () => {
  reset();
  const route = withResearchOsRoute({ auth: "none" }, () => {
    throw new Error("connect ECONNREFUSED db.internal:5432");
  });
  const logged: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  let out: Awaited<ReturnType<typeof read>>;
  try {
    out = await read(await route(get(), undefined));
  } finally {
    console.error = original;
  }
  assert.deepEqual(out, { status: 503, cache: "no-store", body: { error: "research_os_unavailable" } });
  assert.ok(JSON.stringify(logged).includes("db.internal"));
});

test("readJson answers 400 for malformed or non-object bodies", async () => {
  for (const raw of ["{", "[]", "null", "3"]) {
    const r = await readJson(post(raw));
    assert.equal(r.ok, false, raw);
    if (!r.ok) assert.deepEqual(await read(r.res), { status: 400, cache: "no-store", body: { error: "bad_json" } });
  }
  const r = await readJson<{ a: number }>(post('{"a":1}'));
  assert.deepEqual(r, { ok: true, value: { a: 1 } });
});

test("consent is only accepted with auth required", () => {
  // @ts-expect-error consent needs a signed-in learner
  withResearchOsRoute({ auth: "optional", consent: "workspace_tool" }, () => ({}));
  // @ts-expect-error consent needs a signed-in learner
  withResearchOsRoute({ auth: "none", consent: "workspace_tool" }, () => ({}));
});
