import { test } from "node:test";
import assert from "node:assert/strict";
import { bearerFetch, BrowserVault, createAppAuth, needsBearer, SESSION_KEY, signInError } from "./auth";

const ORIGIN = "https://www.polingual.com";

class MemStorage {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const asStorage = (m: MemStorage) => m as unknown as Storage;

test("needsBearer covers academy APIs on this origin and skips the session route", () => {
  assert.equal(needsBearer(new URL("/api/academy/progress", ORIGIN), ORIGIN), true);
  assert.equal(needsBearer(new URL("/api/academy/review-log?since=0", ORIGIN), ORIGIN), true);
  assert.equal(needsBearer(new URL("/api/academy/session", ORIGIN), ORIGIN), false);
  assert.equal(needsBearer(new URL("/academy-app/corpus/lang-core.json", ORIGIN), ORIGIN), false);
  assert.equal(needsBearer(new URL("https://evil.example/api/academy/progress"), ORIGIN), false);
});

test("bearerFetch adds the token only where needed", async () => {
  const seen: { url: string; auth: string | null }[] = [];
  const inner = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), auth: new Headers(init?.headers).get("authorization") });
    return new Response("{}");
  }) as typeof fetch;
  const f = bearerFetch(inner, async () => "tok", ORIGIN);
  await f("/api/academy/progress");
  await f("/api/academy/session", { method: "POST" });
  await f("https://evil.example/api/academy/progress");
  assert.deepEqual(seen.map((s) => s.auth), ["Bearer tok", null, null]);
});

test("bearerFetch sends no header when signed out", async () => {
  let auth: string | null = "unset";
  const inner = (async (_i: RequestInfo | URL, init?: RequestInit) => {
    auth = new Headers(init?.headers).get("authorization");
    return new Response("{}");
  }) as typeof fetch;
  await bearerFetch(inner, async () => null, ORIGIN)("/api/academy/progress");
  assert.equal(auth, null);
});

test("BrowserVault round-trips and clears a session", async () => {
  const m = new MemStorage();
  const v = new BrowserVault(() => asStorage(m));
  assert.equal(await v.get(), null);
  const s = { access_token: "a", refresh_token: "r", expires_at: 9e9, user_id: "u1", device_id: "mobile", supabase_url: ORIGIN, anon_key: "" };
  await v.set(s);
  assert.deepEqual(await v.get(), s);
  await v.clear();
  assert.equal(m.getItem(SESSION_KEY), null);
});

test("sign-in sends the polingual app id and stores the verified session", async () => {
  const m = new MemStorage();
  const bodies: Record<string, unknown>[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), `${ORIGIN}/api/academy/session`);
    const b = JSON.parse(String(init?.body)) as Record<string, unknown>;
    bodies.push(b);
    if (b.action === "otp") return new Response(JSON.stringify({ ok: true }));
    return new Response(JSON.stringify({ access_token: "at", refresh_token: "rt", expires_at: Math.floor(Date.now() / 1000) + 3600, user_id: "user-1" }));
  }) as typeof fetch;
  const auth = createAppAuth({ origin: ORIGIN, storage: () => asStorage(m), fetch: f });
  assert.equal(await auth.userId(), null);
  assert.deepEqual(await auth.mobile.sendCode("a@b.co"), { ok: true });
  assert.deepEqual(bodies[0], { action: "otp", email: "a@b.co", app: "polingual" });
  assert.deepEqual(await auth.mobile.verifyCode("a@b.co", "123456"), { ok: true });
  assert.equal(await auth.userId(), "user-1");
  assert.equal(await auth.mobile.accessToken(), "at");
  await auth.mobile.logout();
  assert.equal(await auth.userId(), null);
});

test("a rejected code maps to a readable message", async () => {
  const f = (async () => new Response(JSON.stringify({ error: "bad_code" }), { status: 400 })) as typeof fetch;
  const auth = createAppAuth({ origin: ORIGIN, storage: () => null, fetch: f });
  const r = await auth.mobile.verifyCode("a@b.co", "000000");
  assert.equal(r.ok, false);
  assert.match(signInError(r.error), /did not match/);
  assert.match(signInError("nope"), /Try again/);
});
