import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { newDataKey } from "../src/crypto";
import type { Item } from "../src/grade";
import { localRoutes } from "../src/local";
import { startServe, type Serve } from "../src/serve";
import { Store } from "../src/store";
import { createBktServeStore } from "../../../src/lib/academy/bkt-serve-store";
import { grade, buildEncompassingMap, normalizeState, route } from "../../../src/lib/academy/engine";

const items: Item[] = ["a", "b", "c", "d", "e"].map((id) => ({
  id: `phys/${id}/0`,
  atomId: id,
  branch: "phys",
  title: id,
  level: "recall",
  prompt: `what is ${id}`,
  answer: `answer ${id}`,
}));

const content = {
  decks: [{ id: "phys", source: "phys", title: "Physics", atoms: 5 }],
  atoms: { phys: items.map((i, k) => ({ id: i.atomId, title: i.title, shell: "nucleus", requires: k ? [items[k - 1].atomId] : [], quiz: [{ level: "recall", prompt: i.prompt, answer: i.answer }] })) },
};

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
  s = startServe({ uid, resolvePeerUid: () => uid, now: () => clock, routes: localRoutes(store, { now: () => clock, seed: () => "seed", content }) });
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

describe("learn routes", () => {
  const DAY = 86_400_000;
  const post = (path: string, body: unknown) => req(path, { method: "POST", headers: auth, body });

  test("decks and atoms come from the pack", async () => {
    const d = (await (await req("/local/decks", { headers: auth })).json()) as { decks: { id: string; introduced: number }[] };
    expect(d.decks.map((x) => [x.id, x.introduced])).toEqual([["phys", 0]]);
    const a = (await (await req("/local/atoms?deck=phys", { headers: auth })).json()) as { atoms: { id: string; leverage: number }[] };
    expect(a.atoms.map((x) => x.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(a.atoms[0].leverage).toBe(1);
    expect((await req("/local/atoms?deck=nope", { headers: auth })).status).toBe(404);
  });

  test("the TUI and Learn share one card per atom", async () => {
    await post("/local/review", { itemId: items[0].id, rating: 3, elapsedMs: 100 });
    const p = (await (await req("/local/progress", { headers: auth })).json()) as { branches: Record<string, { data: { cards: Record<string, unknown>; prof: Record<string, { n: number }> } }> };
    expect(Object.keys(p.branches.phys.data.cards)).toEqual(["a"]);
    expect(p.branches.phys.data.prof.a.n).toBe(1);
  });

  test("progress POST merges by lastReview and rejects bad decks", async () => {
    const atoms = content.atoms.phys;
    const enc = buildEncompassingMap(atoms);
    const s1 = grade(normalizeState(null), atoms, enc, "a", 3, "recall", clock);
    expect((await post("/local/progress", { branch: "phys", data: s1 })).status).toBe(200);
    const older = grade(normalizeState(null), atoms, enc, "a", 1, "recall", clock - DAY);
    const r = (await (await post("/local/progress", { branch: "phys", data: older })).json()) as { data: { cards: { a: { lastReview: number } } } };
    expect(r.data.cards.a.lastReview).toBe(clock);
    expect((await post("/local/progress", { branch: "../etc", data: s1 })).status).toBe(400);
    expect((await post("/local/progress", { branch: "phys" })).status).toBe(400);
  });

  test("web import runs once and merges localStorage keys", async () => {
    const atoms = content.atoms.phys;
    const web = grade(normalizeState(null), atoms, buildEncompassingMap(atoms), "b", 4, "recall", clock);
    expect((await post("/local/import", { branches: { "bad key!": web } })).status).toBe(400);
    const r = await post("/local/import", { "bucket-academy/v1/phys": JSON.stringify(web) });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { imported: string[] }).imported).toEqual(["phys"]);
    expect(store.learnState("phys").cards.b).toEqual(web.cards.b);
    expect((await post("/local/import", { branches: { phys: web } })).status).toBe(409);
  });

  test("BktServeStore loads, saves and flushes through the header token", async () => {
    const errors: string[] = [];
    const bs = createBktServeStore({
      token: auth.authorization.slice("Bucket ".length),
      base: `http://127.0.0.1:${s.port}`,
      fetch: ((u: string, init: RequestInit = {}) => fetch(u, { ...init, headers: { ...(init.headers as Record<string, string>), host: `127.0.0.1:${s.port}` } })) as typeof fetch,
      onError: (e) => errors.push(e.message),
    });
    const atoms = content.atoms.phys;
    const start = await bs.load("phys");
    expect(route(start, atoms, clock)[0]).toEqual({ id: "a", kind: "new" });
    const next = grade(start, atoms, buildEncompassingMap(atoms), "a", 3, "recall", clock);
    bs.save("phys", next);
    expect((await bs.load("phys")).cards.a).toEqual(next.cards.a);
    await bs.flush();
    expect(store.learnState("phys").cards.a).toEqual(next.cards.a);
    expect(errors).toEqual([]);
  });

  test("BktServeStore reports a rejected token", async () => {
    const errors: string[] = [];
    const bs = createBktServeStore({
      token: "x".repeat(43),
      base: `http://127.0.0.1:${s.port}`,
      fetch: ((u: string, init: RequestInit = {}) => fetch(u, { ...init, headers: { ...(init.headers as Record<string, string>), host: `127.0.0.1:${s.port}` } })) as typeof fetch,
      onError: (e) => errors.push(e.message),
    });
    expect(await bs.pull()).toBeNull();
    expect(errors).toEqual(["progress pull 401"]);
  });
});
