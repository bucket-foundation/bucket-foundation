import test from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { APPLE_SIGNIN_REPLY_BUDGET_MS, appleAudiences, bearerToken, clientIp, createSessionHandler, OTP_LOCKOUT_MESSAGE, RATE_MESSAGE, SESSION_LIMITS, type AuthResult, type SessionDeps } from "../src/lib/academy/session-server";
import { PROXY_IP_HEADER, PROXY_TS_HEADER, signClientIp, verifiedProxyIp } from "../src/lib/academy/proxy-ip";

const SESSION = { access_token: "at", refresh_token: "rt", expires_in: 3600, user: { id: "u1" } };

function world(over: Partial<SessionDeps> = {}) {
  const hits = new Map<string, number>();
  const calls: string[] = [];
  const deps: SessionDeps = {
    enabled: () => true,
    configured: () => true,
    now: () => 1_760_000_000_000,
    rateHit: async (key, limit) => {
      const n = (hits.get(key) ?? 0) + 1;
      hits.set(key, n);
      return n <= limit;
    },
    sendOtp: async (email) => (calls.push(`otp ${email}`), { status: null }),
    verifyOtp: async (_e, code): Promise<AuthResult> => (code === "123456" ? { session: SESSION, status: null } : { session: null, status: 403 }),
    refresh: async (): Promise<AuthResult> => ({ session: SESSION, status: null }),
    signInWithApple: async (token, nonce): Promise<AuthResult> => (calls.push(`apple ${token} ${nonce}`), token.endsWith(".sig") ? { session: SESSION, status: null } : { session: null, status: 400 }),
    deleteAccount: async (token) => (calls.push(`delete ${token}`), { status: null }),
    ...over,
  };
  return { handle: createSessionHandler(deps), calls };
}

test("verify returns the token pair and user, and a wrong code is a 400", async () => {
  const w = world();
  const ok = await w.handle({ action: "verify", email: "a@b.co", code: "123456" }, "1.1.1.1");
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user_id, "u1");
  assert.equal(ok.body.expires_at, 1_760_000_000 + 3600);
  assert.equal((await w.handle({ action: "verify", email: "a@b.co", code: "000000" }, "1.1.1.1")).status, 400);
});

for (const [status, want] of [[400, 401], [401, 401], [403, 401], [429, 429], [500, 502], [0, 502]] as const) {
  test(`a refresh that Supabase answers ${status} becomes ${want}`, async () => {
    const w = world({ refresh: async () => ({ session: null, status }) });
    assert.equal((await w.handle({ action: "refresh", refresh_token: "rt" }, "1.1.1.1")).status, want);
  });
}

test("code requests are capped per email and per address", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.otpEmail; i++) assert.equal((await w.handle({ action: "otp", email: "a@b.co" }, `10.0.0.${i}`)).status, 200);
  assert.equal((await w.handle({ action: "otp", email: "A@b.co" }, "10.0.0.99")).status, 429);
  const v = world();
  for (let i = 0; i < SESSION_LIMITS.otpIp; i++) await v.handle({ action: "otp", email: `u${i}@b.co` }, "9.9.9.9");
  assert.equal((await v.handle({ action: "otp", email: "fresh@b.co" }, "9.9.9.9")).status, 429);
  assert.equal(v.calls.length, SESSION_LIMITS.otpIp);
});

test("an email that hit its code cap says to wait, and the address cap says the same in its own words", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.otpEmail; i++) await w.handle({ action: "otp", email: "a@b.co" }, `10.2.0.${i}`);
  assert.deepEqual((await w.handle({ action: "otp", email: "a@b.co" }, "10.2.0.99")).body, { error: "too_many_requests", message: OTP_LOCKOUT_MESSAGE });
  const v = world();
  for (let i = 0; i < SESSION_LIMITS.otpIp; i++) await v.handle({ action: "otp", email: `u${i}@b.co` }, "9.9.9.8");
  assert.deepEqual((await v.handle({ action: "otp", email: "new@b.co" }, "9.9.9.8")).body, { error: "too_many_requests", message: RATE_MESSAGE });
});

test("the platform client address wins over a forwarded chain the client can write", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.5", "x-vercel-forwarded-for": "203.0.113.5" })), "203.0.113.5");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "198.51.100.7" })), "198.51.100.7");
});

test("code guesses are capped per email", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.verifyEmail; i++) await w.handle({ action: "verify", email: "a@b.co", code: "000000" }, `10.1.0.${i}`);
  assert.equal((await w.handle({ action: "verify", email: "a@b.co", code: "123456" }, "10.1.0.200")).status, 429);
});

test("the switch and configuration gate every action, and the client address comes from the first forwarded hop", async () => {
  assert.equal((await world({ enabled: () => false }).handle({ action: "otp", email: "a@b.co" }, "x")).status, 503);
  assert.equal((await world({ configured: () => false }).handle({ action: "otp", email: "a@b.co" }, "x")).status, 503);
  assert.equal((await world().handle({ action: "nope" }, "x")).status, 400);
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })), "203.0.113.5");
  assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.7" })), "198.51.100.7");
});

test("delete_account needs a bearer token and passes it to the deleter", async () => {
  const w = world();
  assert.equal((await w.handle({ action: "delete_account" }, "1.1.1.1")).status, 401);
  const ok = await w.handle({ action: "delete_account" }, "1.1.1.1", "tok");
  assert.deepEqual([ok.status, ok.body], [200, { ok: true }]);
  assert.deepEqual(w.calls, ["delete tok"]);
});

test("delete_account works with the review log switch off and fails closed when unconfigured", async () => {
  assert.equal((await world({ enabled: () => false }).handle({ action: "delete_account" }, "x", "tok")).status, 200);
  assert.equal((await world({ configured: () => false }).handle({ action: "delete_account" }, "x", "tok")).status, 503);
});

for (const [status, want] of [[401, 401], [403, 401], [500, 502], [404, 502]] as const) {
  test(`a delete that the deleter answers ${status} becomes ${want}`, async () => {
    const w = world({ deleteAccount: async () => ({ status }) });
    assert.equal((await w.handle({ action: "delete_account" }, "1.1.1.1", "tok")).status, want);
  });
}

test("delete_account is capped per address", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.deleteIp; i++) await w.handle({ action: "delete_account" }, "7.7.7.7", "tok");
  assert.equal((await w.handle({ action: "delete_account" }, "7.7.7.7", "tok")).status, 429);
});

test("bearerToken reads the authorization header", () => {
  assert.equal(bearerToken(new Headers({ authorization: "Bearer abc.def" })), "abc.def");
  assert.equal(bearerToken(new Headers({ authorization: "Basic abc" })), "");
  assert.equal(bearerToken(new Headers()), "");
});

const appleToken = (claims: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

test("apple id token with a matching nonce returns the verify session shape", async () => {
  const w = world();
  const tok = appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") });
  const ok = await w.handle({ action: "apple", id_token: tok, nonce: "n1" }, "1.1.1.1");
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, { access_token: "at", refresh_token: "rt", expires_at: 1_760_000_000 + 3600, user_id: "u1" });
  assert.deepEqual(w.calls, [`apple ${tok} n1`]);
});

test("apple sign-in rejects a missing token or missing nonce with 400", async () => {
  const w = world();
  assert.equal((await w.handle({ action: "apple", nonce: "n1" }, "1.1.1.1")).status, 400);
  assert.equal((await w.handle({ action: "apple", id_token: appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") }) }, "1.1.1.1")).status, 400);
  assert.deepEqual(w.calls, []);
});

test("apple sign-in rejects a wrong or absent nonce claim before calling Supabase", async () => {
  const w = world();
  assert.equal((await w.handle({ action: "apple", id_token: appleToken({ aud: "foundation.bucket.app", nonce: sha("other") }), nonce: "n1" }, "1.1.1.1")).status, 401);
  assert.equal((await w.handle({ action: "apple", id_token: appleToken({}), nonce: "n1" }, "1.1.1.1")).status, 401);
  assert.equal((await w.handle({ action: "apple", id_token: "garbage", nonce: "n1" }, "1.1.1.1")).status, 401);
  assert.deepEqual(w.calls, []);
});

for (const [status, want] of [[400, 401], [500, 502], [503, 502], [429, 429]] as const) {
  test(`an apple sign-in that Supabase answers ${status} becomes ${want}`, async () => {
    const w = world({ signInWithApple: async () => ({ session: null, status }) });
    assert.equal((await w.handle({ action: "apple", id_token: appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") }), nonce: "n1" }, "1.1.1.1")).status, want);
  });
}

test("contract: the app half of #987 posts this exact apple request and gets the verify session shape", async () => {
  for (const [app, aud] of [["bucket", "foundation.bucket.app"], ["polingual", "com.polingual.app"]] as const) {
    const w = world();
    const r = await w.handle({ action: "apple", id_token: appleToken({ aud, nonce: sha("raw-nonce") }), nonce: "raw-nonce", app }, "1.1.1.1");
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body).sort(), ["access_token", "expires_at", "refresh_token", "user_id"]);
    assert.deepEqual(r.body, { access_token: "at", refresh_token: "rt", expires_at: 1_760_000_000 + 3600, user_id: "u1" });
  }
});

test("apple sign-in rejects a wrong or missing aud and an unknown app", async () => {
  const w = world();
  assert.equal((await w.handle({ action: "apple", id_token: appleToken({ aud: "com.evil.app", nonce: sha("n1") }), nonce: "n1", app: "bucket" }, "1.1.1.1")).status, 401);
  assert.equal((await w.handle({ action: "apple", id_token: appleToken({ nonce: sha("n1") }), nonce: "n1", app: "bucket" }, "1.1.1.1")).status, 401);
  assert.equal((await w.handle({ action: "apple", id_token: appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") }), nonce: "n1", app: "other" }, "1.1.1.1")).status, 400);
  assert.deepEqual(w.calls, []);
});

test("apple audiences come from APPLE_AUDIENCES with the two bundle ids as default", () => {
  assert.deepEqual(appleAudiences(undefined), ["foundation.bucket.app", "com.polingual.app"]);
  assert.deepEqual(appleAudiences(" a.b , c.d "), ["a.b", "c.d"]);
  const w = world({ appleAudiences: () => ["a.b"] });
  return w.handle({ action: "apple", id_token: appleToken({ aud: ["x", "a.b"], nonce: sha("n1") }), nonce: "n1" }, "1.1.1.1").then((r) => assert.equal(r.status, 200));
});

test("otp with app polingual redirects to polingual.com, other apps keep the default", async () => {
  const seen: (string | undefined)[] = [];
  const w = world({ sendOtp: async (_e, redirectTo) => (seen.push(redirectTo), { status: null }) });
  assert.equal((await w.handle({ action: "otp", email: "a@b.co", app: "polingual" }, "1.1.1.1")).status, 200);
  assert.equal((await w.handle({ action: "otp", email: "c@b.co", app: "constructor" }, "1.1.1.1")).status, 200);
  assert.equal((await w.handle({ action: "otp", email: "d@b.co" }, "1.1.1.1")).status, 200);
  assert.deepEqual(seen, ["https://polingual.com/", undefined, undefined]);
});

test("apple sign-in passes the authorization code on, and an exchange failure still signs in", async () => {
  const linked: string[] = [];
  const tok = appleToken({ aud: "com.polingual.app", nonce: sha("n1") });
  const ok = world({ linkAppleCode: async (u, app, code) => void linked.push(`${u} ${app} ${code}`) });
  assert.equal((await ok.handle({ action: "apple", id_token: tok, nonce: "n1", app: "polingual", authorization_code: "c1" }, "1.1.1.1")).status, 200);
  assert.deepEqual(linked, ["u1 polingual c1"]);
  const failing = world({ linkAppleCode: async () => { throw new Error("apple down"); } });
  const r = await failing.handle({ action: "apple", id_token: tok, nonce: "n1", app: "polingual", authorization_code: "c1" }, "1.1.1.1");
  assert.equal(r.status, 200);
  assert.equal(r.body.access_token, "at");
});

test("an Apple code exchange that finishes inside the budget is awaited and nothing is deferred", async () => {
  const saved: string[] = [];
  const deferred: Promise<unknown>[] = [];
  const tok = appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") });
  const w = world({ linkBudgetMs: 50, defer: (p) => void deferred.push(p), linkAppleCode: async (u, _a, c) => void saved.push(`${u} ${c}`) });
  const r = await w.handle({ action: "apple", id_token: tok, nonce: "n1", app: "bucket", authorization_code: "c1" }, "1.1.1.1");
  assert.equal(r.status, 200);
  assert.deepEqual(saved, ["u1 c1"]);
  assert.equal(deferred.length, 0);
  assert.equal(APPLE_SIGNIN_REPLY_BUDGET_MS, 3000);
});

test("a late Apple code exchange returns the session first, keeps the same exchange running, and stores the token", async () => {
  const saved: string[] = [];
  const deferred: Promise<unknown>[] = [];
  let starts = 0;
  let finish: () => void = () => undefined;
  const tok = appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") });
  const w = world({
    linkBudgetMs: 10,
    defer: (p) => void deferred.push(p),
    linkAppleCode: (u, _a, c) => (starts++, new Promise<void>((res) => (finish = () => (saved.push(`${u} ${c}`), res())))),
  });
  const r = await w.handle({ action: "apple", id_token: tok, nonce: "n1", app: "bucket", authorization_code: "c1" }, "1.1.1.1");
  assert.equal(r.status, 200);
  assert.equal(r.body.access_token, "at");
  assert.deepEqual(saved, []);
  assert.equal(deferred.length, 1);
  finish();
  await deferred[0];
  assert.deepEqual(saved, ["u1 c1"]);
  assert.equal(starts, 1);
});

test("a late Apple code exchange that fails is logged once", async () => {
  const deferred: Promise<unknown>[] = [];
  const errors: unknown[][] = [];
  const realError = console.error;
  console.error = (...a: unknown[]) => void errors.push(a);
  let fail: () => void = () => undefined;
  try {
    const tok = appleToken({ aud: "foundation.bucket.app", nonce: sha("n1") });
    const w = world({
      linkBudgetMs: 10,
      defer: (p) => void deferred.push(p),
      linkAppleCode: () => new Promise<void>((_, rej) => (fail = () => rej(new Error("apple down")))),
    });
    const r = await w.handle({ action: "apple", id_token: tok, nonce: "n1", app: "bucket", authorization_code: "c1" }, "1.1.1.1");
    assert.equal(r.status, 200);
    assert.equal(errors.length, 0);
    fail();
    await deferred[0];
  } finally {
    console.error = realError;
  }
  assert.deepEqual(errors, [["apple code exchange", "apple down"]]);
});

test("clientIp trusts a signed proxy header and ignores a forged or stale one", () => {
  const now = Date.parse("2027-01-01T00:00:00Z");
  const base = { "x-vercel-forwarded-for": "76.76.21.21" };
  const signed = new Headers({ ...base, ...signClientIp("203.0.113.9", "s3cret", now) });
  assert.equal(clientIp(signed, { secret: "s3cret", now }), "203.0.113.9");
  assert.equal(clientIp(signed, { secret: "other", now }), "76.76.21.21");
  assert.equal(clientIp(signed, { now }), "76.76.21.21");
  assert.equal(clientIp(signed, { secret: "s3cret", now: now + 301_000 }), "76.76.21.21");
  const forged = new Headers(signed);
  forged.set(PROXY_IP_HEADER, "198.51.100.1");
  assert.equal(clientIp(forged, { secret: "s3cret", now }), "76.76.21.21");
  const unsigned = new Headers({ ...base, [PROXY_IP_HEADER]: "198.51.100.1", [PROXY_TS_HEADER]: String(now / 1000) });
  assert.equal(clientIp(unsigned, { secret: "s3cret", now }), "76.76.21.21");
  assert.equal(verifiedProxyIp(new Headers(signClientIp("not an ip!", "s3cret", now)), "s3cret", now), null);
});
