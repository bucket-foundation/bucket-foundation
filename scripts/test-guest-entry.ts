import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isGuestPath, PATH_HEADER } from "../src/lib/auth/paths";
import { guestMayGrade, mergeGuestProgress } from "../src/lib/academy/guest-merge";

class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

const store = new MemoryStorage();
Object.assign(globalThis, { localStorage: store, window: globalThis });

function state(cards: string[], xp = 0) {
  return { cards: Object.fromEntries(cards.map((c) => [c, { due: 1, reps: 1 }])), prof: {}, settings: { newPerDay: 10, requestRetention: 0.9 }, stats: { xp, streak: 0, lastStudyDay: null, history: {} } };
}

test("only Learn paths are open to guests", () => {
  for (const p of ["/research-os/learn", "/research-os/learn/01-mathematics/study", "/research-os/learn/languages"]) assert.equal(isGuestPath(p), true, p);
  for (const p of ["/research-os/learn-evil", "/research-os/learnX", "/research-os/home", "/research-os/profile", "", null, undefined]) assert.equal(isGuestPath(p), false, String(p));
});

test("a guest grades one atom across all decks, and that atom again", () => {
  store.clear();
  assert.equal(guestMayGrade("a", {}, "x"), true);
  store.setItem("bucket-academy/v1/a", JSON.stringify(state(["x"])));
  assert.equal(guestMayGrade("a", state(["x"]).cards, "x"), true);
  assert.equal(guestMayGrade("a", state(["x"]).cards, "y"), false);
  assert.equal(guestMayGrade("b", {}, "z"), false);
});

function stubFetch(server: Record<string, { data: unknown; updated_at: string }> | null, posts: unknown[]) {
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      posts.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: 200 });
    }
    return server ? new Response(JSON.stringify({ branches: server }), { status: 200 }) : new Response("{}", { status: 401 });
  }) as typeof fetch;
}

test("merge pushes a deck the server lacks and merges one it has", async () => {
  store.clear();
  store.setItem("bucket-academy/v1/a", JSON.stringify(state(["x"], 7)));
  store.setItem("bucket-academy/v1/b", JSON.stringify(state(["y"], 3)));
  const posts: { branch: string }[] = [];
  stubFetch({ b: { data: state(["z"], 9), updated_at: "2026-10-01" } }, posts);
  await mergeGuestProgress();
  assert.deepEqual(posts.map((p) => p.branch).sort(), ["a", "b"]);
  const b = JSON.parse(store.getItem("bucket-academy/v1/b")!);
  assert.deepEqual(Object.keys(b.cards).sort(), ["y", "z"]);
});

test("merge keeps local progress when the server read fails", async () => {
  store.clear();
  store.setItem("bucket-academy/v1/a", JSON.stringify(state(["x"], 7)));
  const posts: unknown[] = [];
  stubFetch(null, posts);
  await mergeGuestProgress();
  assert.equal(posts.length, 0);
  assert.equal(JSON.parse(store.getItem("bucket-academy/v1/a")!).stats.xp, 7);
});

test("a demo tag comes from the URL first, then the session, and must be a short slug", async () => {
  const { demoSession } = await import("../src/lib/analytics/funnel");
  assert.equal(demoSession("?demo=ru-en", null), "ru-en");
  assert.equal(demoSession("", "spanish"), "spanish");
  assert.equal(demoSession("?demo=Bad%20Tag", "hebrew"), "hebrew");
  assert.equal(demoSession("?demo=" + "a".repeat(40), null), null);
  assert.equal(demoSession("", null), null);
});

test("a guest's language lesson is one system within one sitting, and merge clears it", async () => {
  const { guestMayStudyLanguage, GUEST_LESSON_KEY, GUEST_LESSON_MS } = await import("../src/lib/academy/guest-merge");
  store.clear();
  assert.equal(guestMayStudyLanguage("en-ru", 1000), true);
  assert.equal(guestMayStudyLanguage("en-ru", 2000), true);
  assert.equal(guestMayStudyLanguage("en-es-pt", 2000), false);
  assert.equal(guestMayStudyLanguage("en-ru", 1000 + GUEST_LESSON_MS), false);
  stubFetch({}, []);
  await mergeGuestProgress();
  assert.equal(store.getItem(GUEST_LESSON_KEY), null);
});

test("merge saves local language systems to the account", async () => {
  const { SYSTEMS_KEY } = await import("../src/lib/academy/lang-client");
  store.clear();
  store.setItem(SYSTEMS_KEY, JSON.stringify({ systems: [], removed: {} }));
  const posts: { branch: string }[] = [];
  stubFetch({}, posts);
  await mergeGuestProgress();
  assert.deepEqual(posts.map((p) => p.branch), ["lang-systems"]);
});

test("middleware overwrites a spoofed path header", async () => {
  const { middleware } = await import("../src/middleware");
  const req = new NextRequest("http://localhost/canon", { headers: { [PATH_HEADER]: "/research-os/learn" } });
  const res = await middleware(req);
  assert.equal(res.headers.get(`x-middleware-request-${PATH_HEADER}`), "/canon");
});
