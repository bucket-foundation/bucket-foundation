import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { newDataKey } from "../src/crypto";
import type { Item } from "../src/grade";
import { localRoutes } from "../src/local";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";

const items: Item[] = ["a", "b", "c", "d", "e"].map((id) => ({
  id: `phys/${id}/0`,
  atomId: id,
  branch: "phys",
  title: id,
  level: "recall",
  prompt: `what is ${id}`,
  answer: `answer ${id}`,
}));

let clock = 10_000_000;
let store: Store;
let s: Serve;
let auth: Record<string, string>;

function req(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return fetch(`http://127.0.0.1:${s.port}${path}`, {
    method: init.method ?? "GET",
    headers: { host: `127.0.0.1:${s.port}`, ...(init.body !== undefined ? { "content-type": "application/json" } : {}), ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

beforeEach(async () => {
  clock = 10_000_000;
  store = new Store(":memory:", newDataKey());
  store.importPack("v1", items);
  const uid = 7;
  s = startServe({ uid, resolvePeerUid: () => uid, now: () => clock, routes: localRoutes(store, { now: () => clock, seed: () => "seed" }) });
  const nonce = (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const r = await req("/session", { method: "POST", body: { nonce }, headers: { origin: `http://127.0.0.1:${s.port}` } });
  auth = { authorization: `Bucket ${((await r.json()) as { token: string }).token}` };
});

afterEach(() => {
  s.stop();
  store.close();
});

describe("local routes", () => {
  test("require the header token", async () => {
    for (const [method, path] of [
      ["GET", "/local/quiz"],
      ["POST", "/local/quiz"],
      ["GET", "/local/review"],
      ["POST", "/local/review"],
    ])
      expect((await req(path, { method, body: method === "POST" ? {} : undefined })).status).toBe(401);
  });

  test("quiz hides the answer index and grades against the store", async () => {
    const r = (await (await req("/local/quiz?n=3", { headers: auth })).json()) as { questions: { itemId: string; choices: string[] }[] };
    expect(r.questions).toHaveLength(3);
    expect(JSON.stringify(r)).not.toContain("answerIndex");
    const q = r.questions[0];
    const right = q.choices.indexOf(items.find((i) => i.id === q.itemId)!.answer);
    const g = (await (await req("/local/quiz", { method: "POST", headers: auth, body: { itemId: q.itemId, choice: right, elapsedMs: 900 } })).json()) as {
      correct: boolean;
    };
    expect(g.correct).toBe(true);
    expect(store.attempts()).toHaveLength(1);
    expect(store.card(q.itemId)!.due!).toBeGreaterThan(clock);
  });

  test("a question answers once", async () => {
    const r = (await (await req("/local/quiz?n=1", { headers: auth })).json()) as { questions: { itemId: string }[] };
    const body = { itemId: r.questions[0].itemId, choice: 0, elapsedMs: 100 };
    expect((await req("/local/quiz", { method: "POST", headers: auth, body })).status).toBe(200);
    expect((await req("/local/quiz", { method: "POST", headers: auth, body })).status).toBe(404);
  });

  test("quiz rejects bad input", async () => {
    const r = (await (await req("/local/quiz?n=1", { headers: auth })).json()) as { questions: { itemId: string }[] };
    const itemId = r.questions[0].itemId;
    expect((await req("/local/quiz", { method: "POST", headers: auth, body: { itemId, choice: 99, elapsedMs: 1 } })).status).toBe(400);
    expect((await req("/local/quiz", { method: "POST", headers: auth, body: { itemId, choice: 0, elapsedMs: -1 } })).status).toBe(400);
    expect((await req("/local/quiz", { method: "POST", headers: auth, body: { itemId: "nope", choice: 0, elapsedMs: 1 } })).status).toBe(404);
  });

  test("review lists due cards and reschedules on rating", async () => {
    expect(((await (await req("/local/review", { headers: auth })).json()) as { items: unknown[] }).items).toHaveLength(0);
    const id = items[2].id;
    expect((await req("/local/review", { method: "POST", headers: auth, body: { itemId: id, rating: 1, elapsedMs: 500 } })).status).toBe(200);
    clock += 86_400_000;
    const due = (await (await req("/local/review", { headers: auth })).json()) as { items: { id: string; answer: string }[] };
    expect(due.items.map((i) => i.id)).toEqual([id]);
    expect(due.items[0].answer).toBe(items[2].answer);
  });

  test("review rejects bad rating and unknown items", async () => {
    expect((await req("/local/review", { method: "POST", headers: auth, body: { itemId: items[0].id, rating: 5, elapsedMs: 1 } })).status).toBe(400);
    expect((await req("/local/review", { method: "POST", headers: auth, body: { itemId: "nope", rating: 3, elapsedMs: 1 } })).status).toBe(404);
    expect(store.attempts()).toHaveLength(0);
  });
});
