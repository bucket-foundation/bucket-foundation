import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const ROOT = path.join(__dirname, "..");
const SRC = path.join(fs.realpathSync(ROOT), "src") + path.sep;
const GOLDEN = path.join(__dirname, "test-llm-contract.golden.json");
const ENV_KEYS = ["LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY", "LLM_TIMEOUT_S", "ANTHROPIC_API_KEY"];

type Msg = { role: "user" | "assistant"; content: string };
type Env = Partial<Record<(typeof ENV_KEYS)[number], string>>;
type AnthropicPlan = { kind: "ok"; content: unknown[]; usage?: unknown } | { kind: "throw"; status?: number; message: string };
type FetchPlan =
  | { kind: "json"; status: number; body: unknown }
  | { kind: "text"; status: number; body: string }
  | { kind: "reject" }
  | { kind: "hang" };

type Log = { fetches: unknown[]; anthropicInits: unknown[]; anthropicCalls: unknown[]; timeouts: number[] };

const log: Log = { fetches: [], anthropicInits: [], anthropicCalls: [], timeouts: [] };
let anthropicPlan: AnthropicPlan = { kind: "ok", content: [] };

class FakeAnthropic {
  messages: { create: (params: unknown) => Promise<unknown> };
  constructor(opts: unknown) {
    log.anthropicInits.push(opts);
    this.messages = {
      create: async (params: unknown) => {
        log.anthropicCalls.push(params);
        if (anthropicPlan.kind === "throw") {
          const err = new Error(anthropicPlan.message) as Error & { status?: number };
          if (anthropicPlan.status !== undefined) err.status = anthropicPlan.status;
          throw err;
        }
        return { content: anthropicPlan.content, usage: anthropicPlan.usage };
      },
    };
  }
}

const sdkPath = require.resolve("@anthropic-ai/sdk");
const ModuleCtor = module.constructor as new (id: string) => NodeModule;
const sdkModule = new ModuleCtor(sdkPath);
sdkModule.exports = { __esModule: true, default: FakeAnthropic, Anthropic: FakeAnthropic };
sdkModule.loaded = true;
require.cache[sdkPath] = sdkModule;

function freshSrc(): void {
  for (const key of Object.keys(require.cache)) if (key.startsWith(SRC)) delete require.cache[key];
}

function setEnv(env: Env): void {
  for (const k of ENV_KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

function describeBody(body: unknown): unknown {
  if (typeof body !== "string") return body ?? null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function installFetch(plan: FetchPlan): () => void {
  const realFetch = globalThis.fetch;
  const realSetTimeout = globalThis.setTimeout;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    log.fetches.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: Array.from(new Headers(init.headers).entries()).sort(),
      body: describeBody(init.body),
      signal: init.signal instanceof AbortSignal,
    });
    if (plan.kind === "reject") throw new TypeError("fetch failed");
    if (plan.kind === "hang") {
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("This operation was aborted", "AbortError")));
      });
    }
    const text = plan.kind === "json" ? JSON.stringify(plan.body) : plan.body;
    return new Response(text, { status: plan.status });
  }) as typeof fetch;
  globalThis.setTimeout = ((fn: () => void, ms?: number) => {
    log.timeouts.push(ms ?? 0);
    return realSetTimeout(fn, ms);
  }) as typeof setTimeout;
  return () => {
    globalThis.fetch = realFetch;
    globalThis.setTimeout = realSetTimeout;
  };
}

function errorShape(e: unknown): unknown {
  const err = e as { name?: string; message?: string; status?: number };
  return { threw: true, name: err?.name ?? null, message: err?.message ?? null, status: err?.status ?? null };
}

type Scenario = {
  name: string;
  loadEnv: Env;
  callEnv?: Env;
  fetch: FetchPlan;
  anthropic?: AnthropicPlan;
  provider?: "local" | "anthropic" | null;
};

const LOCAL: Env = { LLM_BASE_URL: "http://llm.test/v1/", LLM_MODEL: "tiny", LLM_API_KEY: "k-local", LLM_TIMEOUT_S: "7" };
const ANTH: Env = { ANTHROPIC_API_KEY: "k-anth" };
const MODEL_JSON = JSON.stringify({ reply: "Grounded reply.", confidence: "high", abstained: false, citations: ["Lesson"] });
const OK_LOCAL: FetchPlan = {
  kind: "json",
  status: 200,
  body: { choices: [{ message: { content: `  ${MODEL_JSON}  ` } }], usage: { prompt_tokens: 11, completion_tokens: 5 } },
};
const OK_ANTH: AnthropicPlan = {
  kind: "ok",
  content: [
    { type: "text", text: ` ${MODEL_JSON}` },
    { type: "tool_use", id: "t", name: "x", input: {} },
    { type: "text", text: "tail " },
  ],
  usage: { input_tokens: 21, output_tokens: 9 },
};

const SCENARIOS: Scenario[] = [
  { name: "local ok", loadEnv: LOCAL, fetch: OK_LOCAL },
  { name: "local ok without key or usage", loadEnv: { LLM_BASE_URL: "http://llm.test" }, fetch: { kind: "json", status: 200, body: { choices: [{ message: { content: "hi" } }] } } },
  { name: "local empty choices", loadEnv: LOCAL, fetch: { kind: "json", status: 200, body: {} } },
  { name: "local 401", loadEnv: LOCAL, fetch: { kind: "json", status: 401, body: { error: "no" } } },
  { name: "local 429", loadEnv: LOCAL, fetch: { kind: "json", status: 429, body: {} } },
  { name: "local 500", loadEnv: LOCAL, fetch: { kind: "text", status: 500, body: "boom" } },
  { name: "local non-json 200", loadEnv: LOCAL, fetch: { kind: "text", status: 200, body: "not json" } },
  { name: "local network error", loadEnv: LOCAL, fetch: { kind: "reject" } },
  { name: "local timeout", loadEnv: { ...LOCAL, LLM_TIMEOUT_S: "0.02" }, fetch: { kind: "hang" } },
  { name: "local default timeout", loadEnv: { LLM_BASE_URL: "http://llm.test" }, fetch: OK_LOCAL },
  { name: "env changes after load", loadEnv: LOCAL, callEnv: { ...LOCAL, LLM_BASE_URL: "http://later.test", LLM_MODEL: "later", LLM_TIMEOUT_S: "3" }, fetch: OK_LOCAL },
  { name: "local wins over anthropic", loadEnv: { ...LOCAL, ...ANTH }, fetch: OK_LOCAL, anthropic: OK_ANTH },
  { name: "anthropic ok", loadEnv: ANTH, fetch: { kind: "reject" }, anthropic: OK_ANTH },
  { name: "anthropic no usage", loadEnv: ANTH, fetch: { kind: "reject" }, anthropic: { kind: "ok", content: [{ type: "text", text: "plain" }] } },
  { name: "anthropic 401", loadEnv: ANTH, fetch: { kind: "reject" }, anthropic: { kind: "throw", status: 401, message: "bad key" } },
  { name: "anthropic 429", loadEnv: ANTH, fetch: { kind: "reject" }, anthropic: { kind: "throw", status: 429, message: "slow" } },
  { name: "anthropic error", loadEnv: ANTH, fetch: { kind: "reject" }, anthropic: { kind: "throw", message: "down" } },
  { name: "no provider", loadEnv: {}, fetch: { kind: "reject" } },
  { name: "explicit local without base url", loadEnv: ANTH, provider: "local", fetch: OK_LOCAL, anthropic: OK_ANTH },
  { name: "explicit anthropic with local env", loadEnv: LOCAL, provider: "anthropic", fetch: OK_LOCAL, anthropic: OK_ANTH },
  { name: "explicit null", loadEnv: LOCAL, provider: null, fetch: OK_LOCAL },
];

const SYSTEM = "You are a test.";
const MESSAGES: Msg[] = [
  { role: "user", content: "first" },
  { role: "assistant", content: "answer" },
  { role: "user", content: "second" },
];

type Caller = {
  name: string;
  applies: (s: Scenario) => boolean;
  run: (s: Scenario) => Promise<unknown>;
};

let ipCounter = 0;

const CALLERS: Caller[] = [
  {
    name: "research-os callGroundedModelWithUsage",
    applies: () => true,
    run: async (s) => {
      const mod = module.require(path.join(ROOT, "src/lib/research-os/llm.ts"));
      if (s.callEnv) setEnv(s.callEnv);
      const provider = "provider" in s ? s.provider : mod.selectProvider();
      return { provider, result: await mod.callGroundedModelWithUsage(provider, SYSTEM, MESSAGES, 321) };
    },
  },
  {
    name: "research-os callGroundedModel",
    applies: (s) => ["local ok", "anthropic ok", "no provider"].includes(s.name),
    run: async (s) => {
      const mod = module.require(path.join(ROOT, "src/lib/research-os/llm.ts"));
      const provider = mod.selectProvider();
      return { provider, result: await mod.callGroundedModel(provider, SYSTEM, MESSAGES, 99) };
    },
  },
  {
    name: "research-agent complete",
    applies: (s) => !("provider" in s),
    run: async (s) => {
      const mod = module.require(path.join(ROOT, "src/app/api/research-agent/llm.ts"));
      if (s.callEnv) setEnv(s.callEnv);
      return { provider: mod.selectProvider(), result: await mod.complete(SYSTEM, MESSAGES, 555) };
    },
  },
  {
    name: "academy tutor POST",
    applies: (s) => !("provider" in s),
    run: async (s) => {
      const mod = module.require(path.join(ROOT, "src/app/api/academy/tutor/route.ts"));
      if (s.callEnv) setEnv(s.callEnv);
      ipCounter += 1;
      const req = new NextRequest("http://localhost/api/academy/tutor", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${ipCounter}` },
        body: JSON.stringify({
          question: "What is it?",
          atomId: "atom-1",
          grounding: { title: "Lesson", summary: "A summary.", lesson: "Body text." },
          history: [{ role: "user", content: "earlier" }, { role: "assistant", content: "reply" }],
        }),
      });
      const res: Response = await mod.POST(req);
      return { status: res.status, headers: Array.from(res.headers.entries()).sort(), body: await res.json() };
    },
  },
];

async function runCase(caller: Caller, s: Scenario): Promise<unknown> {
  log.fetches = [];
  log.anthropicInits = [];
  log.anthropicCalls = [];
  log.timeouts = [];
  anthropicPlan = s.anthropic ?? { kind: "throw", message: "anthropic not planned" };
  freshSrc();
  setEnv(s.loadEnv);
  const restore = installFetch(s.fetch);
  let outcome: unknown;
  try {
    outcome = await caller.run(s);
  } catch (e) {
    outcome = errorShape(e);
  } finally {
    restore();
    setEnv({});
  }
  return JSON.parse(
    JSON.stringify({
      outcome,
      fetches: log.fetches,
      anthropicInits: log.anthropicInits,
      anthropicCalls: log.anthropicCalls,
      timeouts: log.timeouts,
    }),
  );
}

const RECORDING = process.env.RECORD_GOLDEN === "1";
const recorded: Record<string, unknown> = {};
const golden: Record<string, unknown> = RECORDING ? {} : (JSON.parse(fs.readFileSync(GOLDEN, "utf8")) as Record<string, unknown>);

test("the golden covers every caller and scenario", () => {
  if (RECORDING) return;
  const keys = CALLERS.flatMap((c) => SCENARIOS.filter((s) => c.applies(s)).map((s) => `${c.name} | ${s.name}`));
  assert.deepEqual(keys.sort(), Object.keys(golden).sort());
});

for (const caller of CALLERS) {
  for (const s of SCENARIOS.filter((x) => caller.applies(x))) {
    const key = `${caller.name} | ${s.name}`;
    test(key, async () => {
      const got = await runCase(caller, s);
      if (RECORDING) {
        recorded[key] = got;
        return;
      }
      assert.deepEqual(got, golden[key]);
    });
  }
}

test.after(() => {
  if (!RECORDING) return;
  const lines = Object.keys(recorded).map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(recorded[k])}`);
  fs.writeFileSync(GOLDEN, `{\n${lines.join(",\n")}\n}\n`);
});
