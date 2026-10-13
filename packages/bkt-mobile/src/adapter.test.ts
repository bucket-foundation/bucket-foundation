import { expect, test } from "bun:test";
import { createSyncFetch, requireHttps } from "./adapter";

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function fake(routes: Record<string, (c: Call) => Response>) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const c = { url: String(input), method: init?.method ?? "GET", headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body };
    calls.push(c);
    const hit = routes[c.url];
    return hit ? hit(c) : new Response("missing", { status: 404 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

const PRIMES = {
  generatedAt: "2026-09-30",
  summary: { nodes: 1, prime: 1, composite: 0 },
  unfactoredByKind: [],
  penetrating: [],
  deepest: [],
  widest: [],
  confirmedIrreducible: { count: 0, of: 0, sample: [] },
  reviewAgain: [],
  algebra: { coverage: [], frontier: {}, together: [], implied: [], reach: [] },
};

test("refuses a sync base without https", () => {
  expect(() => requireHttps("http://bucket.foundation")).toThrow(/https/);
  expect(requireHttps("https://bucket.foundation/x")).toBe("https://bucket.foundation");
});

test("hands the ui a session without a desktop nonce", async () => {
  const { f, calls } = fake({});
  const sf = createSyncFetch({ base: "https://sync.test", token: async () => null, fetch: f });
  const r = await sf("/session", { method: "POST", body: "{}" });
  expect(await r.json()).toEqual({ token: "mobile" });
  expect(calls).toHaveLength(0);
});

test("reads atlases from the web path and validates them with the contract", async () => {
  const { f, calls } = fake({ "https://sync.test/api/research-os/primes-report": () => Response.json(PRIMES) });
  const sf = createSyncFetch({ base: "https://sync.test", token: async () => null, fetch: f });
  const r = await sf("/local/ros/primes", { headers: { authorization: "Bucket mobile" } });
  expect(r.status).toBe(200);
  expect((await r.json()).summary.nodes).toBe(1);
  expect(calls[0].headers).toEqual({});
});

test("rejects an atlas that breaks the contract", async () => {
  const { f } = fake({ "https://sync.test/api/research-os/primes-report": () => Response.json({ generatedAt: 3 }) });
  const sf = createSyncFetch({ base: "https://sync.test", token: async () => null, fetch: f });
  const r = await sf("/local/ros/primes");
  expect(r.status).toBe(502);
  expect((await r.json()).error).toMatch(/contract/);
});

test("syncs progress with the stored bearer token", async () => {
  const { f, calls } = fake({ "https://sync.test/api/academy/progress": () => Response.json({ branches: {} }) });
  const sf = createSyncFetch({ base: "https://sync.test", token: async () => "jwt-1", fetch: f });
  await sf("/local/progress");
  await sf("/local/progress", { method: "POST", body: JSON.stringify({ branch: "math", data: {} }) });
  expect(calls.map((c) => [c.method, c.headers.authorization])).toEqual([
    ["GET", "Bearer jwt-1"],
    ["POST", "Bearer jwt-1"],
  ]);
  expect(calls[1].body).toBe('{"branch":"math","data":{}}');
});

test("progress without a token stays on the device", async () => {
  const { f, calls } = fake({});
  const sf = createSyncFetch({ base: "https://sync.test", token: async () => null, fetch: f });
  expect((await sf("/local/progress")).status).toBe(401);
  expect(calls).toHaveLength(0);
});

test("desktop-only routes answer 501 and other urls pass through", async () => {
  const { f, calls } = fake({ "https://cdn.test/a.png": () => new Response("png") });
  const sf = createSyncFetch({ base: "https://sync.test", token: async () => "t", fetch: f });
  expect((await sf("/local/jobs")).status).toBe(501);
  expect(await (await sf("https://cdn.test/a.png")).text()).toBe("png");
  expect(calls.map((c) => c.url)).toEqual(["https://cdn.test/a.png"]);
});
