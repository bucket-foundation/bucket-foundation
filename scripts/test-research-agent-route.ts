import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleAgent, type AgentDeps } from "../src/app/api/research-agent/handler";
import { memoryLimiter } from "../src/lib/llm/daily-limit";
import { isResearchAgentEmail } from "../src/lib/research-os/reviewer";

process.env.RESEARCH_AGENT_EMAILS = " agent@bucket.test , ops@bucket.test";

function deps(over: Partial<AgentDeps<{ ok: boolean }>> = {}) {
  const runs: string[] = [];
  const limiter = memoryLimiter();
  const d: AgentDeps<{ ok: boolean }> = {
    verifyUser: async (req) => {
      const auth = req.headers.get("authorization");
      if (auth === "Bearer good") return { id: "user-9", email: "Agent@Bucket.test" };
      if (auth === "Bearer member") return { id: "member-1", email: "teacher@bucket.test" };
      return null;
    },
    isAllowed: (user) => isResearchAgentEmail(user.email),
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

test("a signed-in user off the allowlist gets 404 with no run and no quota spent", async () => {
  const hits: string[] = [];
  const { d, runs } = deps({ limiter: () => ({ hit: async (s) => (hits.push(s), 1) }) });
  const res = await handleAgent(request(Q, "Bearer member"), d);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "Not found." });
  assert.equal(runs.length, 0);
  assert.deepEqual(hits, []);
});

test("the allowlist check runs before the provider check", async () => {
  const res = await handleAgent(request(Q, "Bearer member"), deps({ provider: () => null }).d);
  assert.equal(res.status, 404);
});

test("a failing access check gets 503 and no run", async () => {
  const { d, runs } = deps({ isAllowed: async () => { throw new Error("db down"); } });
  assert.equal((await handleAgent(request(Q), d)).status, 503);
  assert.equal(runs.length, 0);
});

test("a self-made teacher off the allowlist is refused even though class staff", async () => {
  const { d, runs } = deps();
  const res = await handleAgent(request(Q, "Bearer member"), d);
  assert.equal(res.status, 404);
  assert.equal(runs.length, 0);
});

test("an allowlisted email is admitted case-insensitively", () => {
  assert.equal(isResearchAgentEmail("AGENT@bucket.test"), true);
  assert.equal(isResearchAgentEmail("ops@bucket.test"), true);
  assert.equal(isResearchAgentEmail(null), false);
});

test("an unset or empty allowlist refuses everyone", async () => {
  const saved = process.env.RESEARCH_AGENT_EMAILS;
  try {
    for (const value of [undefined, "", " , "]) {
      if (value === undefined) delete process.env.RESEARCH_AGENT_EMAILS;
      else process.env.RESEARCH_AGENT_EMAILS = value;
      assert.equal(isResearchAgentEmail("agent@bucket.test"), false);
      const { d, runs } = deps();
      assert.equal((await handleAgent(request(Q), d)).status, 404);
      assert.equal(runs.length, 0);
    }
  } finally {
    process.env.RESEARCH_AGENT_EMAILS = saved;
  }
});
