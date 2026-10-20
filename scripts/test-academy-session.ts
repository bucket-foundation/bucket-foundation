import test from "node:test";
import assert from "node:assert/strict";
import { clientIp, createSessionHandler, OTP_LOCKOUT_MESSAGE, RATE_MESSAGE, SESSION_LIMITS, type AuthResult, type SessionDeps } from "../src/lib/academy/session-server";

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
