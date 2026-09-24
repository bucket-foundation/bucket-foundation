import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAgent, type AgentDeps } from "../src/app/api/research-agent/handler";
import { memoryLimiter } from "../src/lib/llm/daily-limit";

function deps(over: Partial<AgentDeps<{ ok: boolean }>> = {}) {
  const runs: string[] = [];
  const limiter = memoryLimiter();
  const d: AgentDeps<{ ok: boolean }> = {
    verifyUser: async (req) => (req.headers.get("authorization") === "Bearer good" ? { id: "user-9", email: null } : null),
    provider: () => "local",
    limiter: () => limiter,
    caps: () => ({ user: 1, global: 100 }),
    run: async (q) => {
      runs.push(q);
      return { ok: true };
    },
    now: () => new Date("2026-09-23T23:00:00Z"),
    ...over,
  };
  return { d, runs };
}

function request(body: unknown, auth: string | null = "Bearer good"): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = auth;
  return new NextRequest("http://localhost/api/research-agent", { method: "POST", headers, body: JSON.stringify(body) });
}

const Q = { question: "How does ocean salinity change with depth?" };

test("anonymous request gets 401 with no run", async () => {
  const { d, runs } = deps();
  const res = await handleAgent(request(Q, null), d);
  assert.equal(res.status, 401);
  assert.equal((await res.json()).signIn, true);
  assert.equal(runs.length, 0);
});

test("signed-in request gets 200 and the brief", async () => {
  const { d, runs } = deps();
  const res = await handleAgent(request(Q), d);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.deepEqual(runs, [Q.question]);
});

test("second run in a day over a cap of one gets 429 with Retry-After", async () => {
  const { d, runs } = deps();
  assert.equal((await handleAgent(request(Q), d)).status, 200);
  const res = await handleAgent(request(Q), d);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "3600");
  assert.equal(runs.length, 1);
});

test("oversized body gets 413", async () => {
  const { d, runs } = deps();
  const res = await handleAgent(request({ question: "q".repeat(5000) }), d);
  assert.equal(res.status, 413);
  assert.equal(runs.length, 0);
});

test("unset provider gets 503, and a limiter failure gets 503", async () => {
  assert.equal((await handleAgent(request(Q), deps({ provider: () => null }).d)).status, 503);
  const broken = deps({ limiter: () => ({ hit: async () => { throw new Error("down"); } }) });
  assert.equal((await handleAgent(request(Q), broken.d)).status, 503);
  assert.equal(broken.runs.length, 0);
});

test("short question gets 400", async () => {
  assert.equal((await handleAgent(request({ question: "why" }), deps().d)).status, 400);
});
