import { expect, test } from "bun:test";
import { createMobileSync } from "../../../src/lib/academy/mobile-sync";
import { createSyncFetch } from "./adapter";
import { SESSION_KEY, SecureStorageVault, type SecureStore } from "./token";

const BASE = "https://sync.test";
const NOW = Date.UTC(2026, 9, 19, 12);

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  };
}

function secure(): SecureStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: async (k) => data.get(k) ?? null, set: async (k, v) => void data.set(k, v), remove: async (k) => void data.delete(k) };
}

function server(opts: { online?: boolean; refreshRevoked?: boolean; refreshStatus?: number } = {}) {
  const state = { online: opts.online ?? true, log: [] as { review_id: string; auth: string }[], calls: [] as string[], token: "at-1" };
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!state.online) throw new TypeError("offline");
    const url = new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    const auth = new Headers(init?.headers).get("authorization") ?? "";
    state.calls.push(`${method} ${url.pathname}`);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    if (url.pathname === "/api/academy/session") {
      if (body.action === "otp") return Response.json({ ok: true });
      if (body.action === "verify") return body.code === "123456" ? Response.json({ access_token: state.token, refresh_token: "rt-1", expires_at: NOW / 1000 + 3600, user_id: "u1" }) : Response.json({ error: "bad_code" }, { status: 400 });
      if (body.action === "refresh") {
        if (opts.refreshRevoked) return Response.json({ error: "revoked" }, { status: 401 });
        if (opts.refreshStatus) return Response.json({ error: "too_many_requests" }, { status: opts.refreshStatus });
        await new Promise((res) => setTimeout(res, 5));
        state.token = "at-2";
        return Response.json({ access_token: "at-2", refresh_token: "rt-2", expires_at: NOW / 1000 + 7200, user_id: "u1" });
      }
    }
    if (url.pathname === "/api/academy/review-log") {
      if (auth !== `Bearer ${state.token}`) return Response.json({ error: "unauthorized" }, { status: 401 });
      if (method === "GET") return Response.json({ user: "u1", reviews: state.log.map((r, i) => ({ ...r, seq: i + 1 })), cursor: state.log.length, more: false });
      const results = (body.reviews as { review_id: string }[]).map((r) => {
        if (!state.log.some((x) => x.review_id === r.review_id)) state.log.push({ review_id: r.review_id, auth });
        return { review_id: r.review_id, status: "inserted", seq: state.log.length };
      });
      return Response.json({ results, folded: [], advanced: 0 });
    }
    return new Response("missing", { status: 404 });
  }) as typeof fetch;
  return { state, f };
}

function app(srv: ReturnType<typeof server>, storage: Storage, store: ReturnType<typeof secure>, now = () => NOW) {
  const mobile = createMobileSync({ base: BASE, storage: () => storage, vault: new SecureStorageVault(store), fetch: srv.f, readLocal: () => null, now });
  const fetch = createSyncFetch({ base: BASE, token: () => mobile.accessToken(), fetch: srv.f, account: mobile });
  return { mobile, fetch };
}

const review = (card: string) => ({ branch: "lang", review: { card_id: card, rating: 3, level: "recall", reviewed_at: NOW - 1000, tz: "UTC", atoms_version: "lang" } });
const post = (f: typeof fetch, path: string, body: unknown) => f(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

test("email and code sign-in keeps the session in secure storage and nowhere in web storage", async () => {
  const srv = server();
  const storage = memoryStorage();
  const store = secure();
  const { fetch } = app(srv, storage, store);
  expect((await post(fetch, "/local/account/email", { email: "a@b.co" })).status).toBe(200);
  expect((await post(fetch, "/local/account/verify", { email: "a@b.co", code: "999999" })).status).toBe(400);
  expect((await post(fetch, "/local/account/verify", { email: "a@b.co", code: "123456" })).status).toBe(200);
  expect(JSON.parse(store.data.get(SESSION_KEY)!).refresh_token).toBe("rt-1");
  for (let i = 0; i < storage.length; i++) expect(storage.getItem(storage.key(i)!)).not.toContain("rt-1");
  const account = (await (await fetch("/local/account")).json()) as { signed_in: boolean; methods: string[] };
  expect(account).toMatchObject({ signed_in: true, methods: ["email"] });
});

test("a review studied offline waits in the device outbox across an app restart, then syncs once", async () => {
  const srv = server({ online: false });
  const storage = memoryStorage();
  const store = secure();
  store.data.set(SESSION_KEY, JSON.stringify({ access_token: "at-1", refresh_token: "rt-1", expires_at: NOW / 1000 + 3600, user_id: "u1", device_id: "mobile", supabase_url: BASE, anon_key: "" }));
  const first = app(srv, storage, store);
  const r = await post(first.fetch, "/local/review-log", review("ru:da"));
  expect(r.status).toBe(200);
  await first.mobile.sync.flush();
  expect(first.mobile.sync.pending()).toHaveLength(1);
  srv.state.online = true;
  const second = app(srv, storage, store);
  const pulled = (await (await second.fetch("/local/review-log")).json()) as { reviews: { review_id: string }[]; pending: number };
  expect(pulled.pending).toBe(0);
  expect(srv.state.log).toHaveLength(1);
  expect(srv.state.log[0].auth).toBe("Bearer at-1");
  expect(pulled.reviews.map((x) => x.review_id)).toEqual([srv.state.log[0].review_id]);
  expect(second.mobile.sync.cursor()).toBe(1);
  await second.mobile.sync.flush();
  expect(srv.state.log).toHaveLength(1);
});

test("an expired access token is refreshed through the site and the new pair is stored", async () => {
  const srv = server();
  const store = secure();
  store.data.set(SESSION_KEY, JSON.stringify({ access_token: "at-1", refresh_token: "rt-1", expires_at: NOW / 1000 - 10, user_id: "u1", device_id: "mobile", supabase_url: BASE, anon_key: "" }));
  const { mobile } = app(srv, memoryStorage(), store);
  expect(await mobile.accessToken()).toBe("at-2");
  expect(JSON.parse(store.data.get(SESSION_KEY)!).refresh_token).toBe("rt-2");
  expect(srv.state.calls).toEqual(["POST /api/academy/session"]);
});

test("a revoked refresh token signs the device out and clears secure storage", async () => {
  const srv = server({ refreshRevoked: true });
  const store = secure();
  store.data.set(SESSION_KEY, JSON.stringify({ access_token: "at-1", refresh_token: "rt-1", expires_at: NOW / 1000 - 10, user_id: "u1", device_id: "mobile", supabase_url: BASE, anon_key: "" }));
  const { fetch, mobile } = app(srv, memoryStorage(), store);
  expect(await mobile.accessToken()).toBeNull();
  expect(store.data.has(SESSION_KEY)).toBe(false);
  expect((await fetch("/local/progress")).status).toBe(401);
});

test("logout clears the session and a bad review body is refused", async () => {
  const srv = server();
  const store = secure();
  store.data.set(SESSION_KEY, "{}");
  const { fetch } = app(srv, memoryStorage(), store);
  expect((await post(fetch, "/local/review-log", { branch: "lang", review: { rating: 3 } })).status).toBe(400);
  expect((await post(fetch, "/local/account/logout", {})).status).toBe(200);
  expect(store.data.size).toBe(0);
});

const expired = () => JSON.stringify({ access_token: "at-1", refresh_token: "rt-1", expires_at: NOW / 1000 - 10, user_id: "u1", device_id: "mobile", supabase_url: BASE, anon_key: "" });

test("parallel callers share one refresh, so the rotating refresh token is spent once", async () => {
  const srv = server();
  const store = secure();
  store.data.set(SESSION_KEY, expired());
  const { mobile } = app(srv, memoryStorage(), store);
  const got = await Promise.all([mobile.accessToken(), mobile.accessToken(), mobile.accessToken()]);
  expect(got).toEqual(["at-2", "at-2", "at-2"]);
  expect(srv.state.calls.filter((c) => c === "POST /api/academy/session")).toHaveLength(1);
});

test("a rate-limited refresh keeps the session for a later try", async () => {
  const srv = server({ refreshStatus: 429 });
  const store = secure();
  store.data.set(SESSION_KEY, expired());
  const { mobile } = app(srv, memoryStorage(), store);
  expect(await mobile.accessToken()).toBeNull();
  expect(JSON.parse(store.data.get(SESSION_KEY)!).refresh_token).toBe("rt-1");
});

test("the app answers the held-review action and refuses a bad one", async () => {
  const srv = server();
  const { fetch } = app(srv, memoryStorage(), secure());
  expect(await (await post(fetch, "/local/review-log/held", { action: "discard" })).json()).toEqual({ discarded: 0, held: 0 });
  expect((await post(fetch, "/local/review-log/held", { action: "nope" })).status).toBe(400);
});
