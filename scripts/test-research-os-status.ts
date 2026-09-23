import test from "node:test";
import assert from "node:assert/strict";
import { checkEngine, checkModel, fetchRuns, latestRuns, type Fetcher } from "../src/lib/research-os/status";

const json = (status: number, body: unknown): Fetcher => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const refused: Fetcher = async () => {
  throw new TypeError("fetch failed");
};
const hangs: Fetcher = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  });

test("the engine: up, unhealthy, no answer, not set", async () => {
  assert.equal((await checkEngine("http://engine", json(200, { ok: true, status: "healthy" }))).state, "up");
  assert.equal((await checkEngine("http://engine", json(200, { ok: false, status: "loading" }))).state, "unhealthy");
  assert.equal((await checkEngine("http://engine", json(500, {}))).state, "unhealthy");
  const down = await checkEngine("http://engine", refused);
  assert.equal(down.state, "unreachable");
  assert.match(down.detail, /connection failed/);
  assert.equal((await checkEngine(undefined, refused)).state, "unset");
  assert.equal((await checkEngine("  ", refused)).state, "unset");
});

test("the engine: a hung service reads as no answer within the timeout", async () => {
  const c = await checkEngine("http://engine", hangs);
  assert.equal(c.state, "unreachable");
  assert.match(c.detail, /no answer in 3 s/);
  assert.ok((c.ms ?? 0) < 4000);
});

test("the engine check calls /health once, without a doubled slash", async () => {
  const urls: string[] = [];
  await checkEngine("http://engine/", async (u) => {
    urls.push(u);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  });
  assert.deepEqual(urls, ["http://engine/health"]);
});

test("the model: lists models, sends the key, and reads failures", async () => {
  let auth = "";
  const up = await checkModel("http://llm/v1", "k", async (_u, init) => {
    auth = new Headers(init?.headers).get("authorization") ?? "";
    return new Response(JSON.stringify({ data: [{ id: "qwen2.5-coder-7b" }] }), { status: 200 });
  });
  assert.equal(up.state, "up");
  assert.match(up.detail, /qwen2\.5-coder-7b/);
  assert.equal(auth, "Bearer k");
  assert.equal((await checkModel("http://llm/v1", undefined, json(401, {}))).state, "unhealthy");
  assert.equal((await checkModel("http://llm/v1", undefined, json(200, { data: [] }))).state, "unhealthy");
  assert.equal((await checkModel("http://llm/v1", undefined, refused)).state, "unreachable");
  assert.equal((await checkModel(undefined, undefined, refused)).state, "unset");
});

test("CI runs: newest per workflow, and null when GitHub does not answer", async () => {
  const body = {
    workflow_runs: [
      { name: "site-ci", status: "completed", conclusion: "success", head_sha: "083ead80b0000", created_at: "2026-09-21T17:19:11Z", html_url: "u1" },
      { name: "hygiene", status: "in_progress", conclusion: null, head_sha: "083ead80b0000", created_at: "2026-09-21T17:19:11Z", html_url: "u2" },
      { name: "site-ci", status: "completed", conclusion: "failure", head_sha: "b36c160ab0000", created_at: "2026-09-20T10:00:00Z", html_url: "u3" },
    ],
  };
  const runs = latestRuns(body, "dev");
  assert.deepEqual(runs.map((r) => [r.workflow, r.conclusion, r.sha]), [
    ["site-ci", "success", "083ead80b"],
    ["hygiene", null, "083ead80b"],
  ]);
  assert.deepEqual(latestRuns(null, "dev"), []);
  assert.equal(await fetchRuns("dev", refused), null);
  assert.equal(await fetchRuns("dev", json(403, { message: "rate limited" })), null);
  assert.equal((await fetchRuns("dev", json(200, body)))?.length, 2);
});
