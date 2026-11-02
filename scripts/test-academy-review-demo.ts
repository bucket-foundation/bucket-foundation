import test from "node:test";
import assert from "node:assert/strict";
import { isReviewDemoEmail, isReviewDemoUser, mintReviewSession, reviewCodeMatches, reviewDemoConfig, type ReviewDemoAuth } from "../src/lib/academy/review-demo";
import { reviewPeerEmail, reviewProgressRows, reviewSystem, reviewSystemsDoc } from "../src/lib/academy/review-demo-seed";
import { createSessionHandler, SESSION_LIMITS, type AuthResult, type SessionDeps } from "../src/lib/academy/session-server";
import { memberSummary, normalizeInviteCode } from "../src/lib/academy/groups";
import { normalizeSystemsDoc, progressBranch } from "../src/lib/academy/lang-systems";

const EMAIL = "review@bucket.example";
const CODE = "48151623";
const SESSION = { access_token: "at", refresh_token: "rt", expires_in: 3600, user: { id: "demo" } };

function world(over: Partial<SessionDeps> = {}, config: () => ReturnType<typeof reviewDemoConfig> = () => reviewDemoConfig(EMAIL, CODE)) {
  const hits = new Map<string, number>();
  const calls: string[] = [];
  const logs: { outcome: string; ip: string }[] = [];
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
    verifyOtp: async (email, code): Promise<AuthResult> => (calls.push(`verify ${email} ${code}`), { session: null, status: 403 }),
    refresh: async () => ({ session: SESSION, status: null }),
    signInWithApple: async () => ({ session: SESSION, status: null }),
    deleteAccount: async () => ({ status: null }),
    reviewDemo: {
      config,
      signIn: async (email) => (calls.push(`mint ${email}`), { session: SESSION, status: null }),
      log: (event) => logs.push(event),
    },
    ...over,
  };
  return { handle: createSessionHandler(deps), calls, logs };
}

test("the config needs an address and a code of eight to ten digits, and fails closed", () => {
  assert.deepEqual(reviewDemoConfig(` ${EMAIL.toUpperCase()} `, ` ${CODE} `), { email: EMAIL, code: CODE });
  assert.equal(reviewDemoConfig(undefined, CODE), null);
  assert.equal(reviewDemoConfig(EMAIL, undefined), null);
  assert.equal(reviewDemoConfig("", ""), null);
  assert.equal(reviewDemoConfig("nope", CODE), null);
  assert.equal(reviewDemoConfig(EMAIL, "123456"), null);
  assert.equal(reviewDemoConfig(EMAIL, "12345678901"), null);
  assert.equal(reviewDemoConfig(EMAIL, "abcdefgh"), null);
});

test("the address match takes that one address and ignores case", () => {
  const demo = { email: EMAIL, code: CODE };
  assert.equal(isReviewDemoEmail("Review@Bucket.Example", demo), true);
  for (const other of ["review+1@bucket.example", "xreview@bucket.example", "review@bucket.example.evil.co", ""]) assert.equal(isReviewDemoEmail(other, demo), false);
});

test("the code compare handles equal, different and differently sized codes", () => {
  assert.equal(reviewCodeMatches(CODE, CODE), true);
  assert.equal(reviewCodeMatches("48151624", CODE), false);
  assert.equal(reviewCodeMatches("481516231", CODE), false);
});

test("the demo address gets no email, and the reply matches any other address", async () => {
  const w = world();
  const demo = await w.handle({ action: "otp", email: EMAIL, app: "polingual" }, "1.1.1.1");
  const other = await w.handle({ action: "otp", email: "a@b.co" }, "1.1.1.1");
  assert.deepEqual(demo, other);
  assert.deepEqual(w.calls, ["otp a@b.co"]);
  assert.equal(w.logs[0].outcome, "code_requested");
});

test("the fixed code signs in the demo address and returns the normal token pair", async () => {
  const w = world();
  const r = await w.handle({ action: "verify", email: EMAIL.toUpperCase(), code: CODE }, "1.1.1.1");
  assert.equal(r.status, 200);
  assert.equal(r.body.access_token, "at");
  assert.equal(r.body.user_id, "demo");
  assert.deepEqual(w.calls, [`mint ${EMAIL}`]);
  assert.equal(w.logs[0].outcome, "signed_in");
});

test("a wrong code is a 400, never reaches Supabase, and is logged", async () => {
  const w = world();
  const r = await w.handle({ action: "verify", email: EMAIL, code: "11111111" }, "1.1.1.1");
  assert.deepEqual([r.status, r.body], [400, { error: "bad_code" }]);
  assert.deepEqual(w.calls, []);
  assert.equal(w.logs[0].outcome, "bad_code");
});

test("the fixed code opens nothing for any other address", async () => {
  const w = world();
  const r = await w.handle({ action: "verify", email: "someone@else.co", code: CODE }, "1.1.1.1");
  assert.equal(r.status, 400);
  assert.deepEqual(w.calls, [`verify someone@else.co ${CODE}`]);
  assert.equal(w.logs.length, 0);
});

test("with the env unset the demo address follows the normal code flow", async () => {
  const w = world({}, () => reviewDemoConfig(undefined, undefined));
  await w.handle({ action: "otp", email: EMAIL }, "1.1.1.1");
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "1.1.1.1")).status, 400);
  assert.deepEqual(w.calls, [`otp ${EMAIL}`, `verify ${EMAIL} ${CODE}`]);
  assert.equal(w.logs.length, 0);
});

test("guesses at the demo address hit the per-email cap even from new addresses, and the right code then waits", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.verifyEmail; i++) assert.equal((await w.handle({ action: "verify", email: EMAIL, code: "11111111" }, `10.1.0.${i}`)).status, 400);
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "10.1.0.200")).status, 429);
  assert.equal(w.calls.length, 0);
  assert.equal(w.logs.at(-1)?.outcome, "rate_limited");
});

test("a failed mint is a bad code and logged", async () => {
  const w = world({ reviewDemo: { config: () => reviewDemoConfig(EMAIL, CODE), signIn: async () => ({ session: null, status: 403 }), log: () => {} } });
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "1.1.1.1")).status, 400);
});

test("log lines carry an outcome and a hashed address, with no code or email", async () => {
  const w = world();
  await w.handle({ action: "verify", email: EMAIL, code: CODE }, "203.0.113.9");
  await w.handle({ action: "verify", email: EMAIL, code: "11111111" }, "203.0.113.9");
  const text = JSON.stringify(w.logs);
  for (const secret of [CODE, "11111111", EMAIL, "203.0.113.9"]) assert.equal(text.includes(secret), false);
});

function auth(user: { app_metadata?: Record<string, unknown> } | null, status: number | null = null) {
  const seen: string[] = [];
  const deps: ReviewDemoAuth = {
    generateLink: async () => (status === null ? { link: { user, tokenHash: "hash", type: "magiclink" }, status: null } : { link: null, status }),
    verifyToken: async (hash, type) => (seen.push(`${hash} ${type}`), { session: SESSION, status: null }),
  };
  return { deps, seen };
}

test("a session is minted only for a user the seed marked", async () => {
  const marked = auth({ app_metadata: { review_demo: true } });
  assert.deepEqual(await mintReviewSession(EMAIL, marked.deps), { session: SESSION, status: null });
  assert.deepEqual(marked.seen, ["hash magiclink"]);
  for (const user of [{ app_metadata: {} }, { app_metadata: { review_demo: "true" } }, {}, null]) {
    const a = auth(user);
    assert.deepEqual(await mintReviewSession(EMAIL, a.deps), { session: null, status: 403 });
    assert.deepEqual(a.seen, []);
    assert.equal(isReviewDemoUser(user), false);
  }
});

test("a link failure passes through without a verify", async () => {
  const a = auth(null, 500);
  assert.deepEqual(await mintReviewSession(EMAIL, a.deps), { session: null, status: 500 });
  assert.deepEqual(a.seen, []);
});

test("seed rows read back as a language set and a live group summary", () => {
  const now = Date.UTC(2026, 10, 2, 15);
  const rows = reviewProgressRows("u1", now);
  const system = reviewSystem(now);
  assert.deepEqual(rows.map((r) => r.branch), ["lang-systems", progressBranch(system)]);
  assert.deepEqual(normalizeSystemsDoc(rows[0].data), reviewSystemsDoc(now));
  const summary = memberSummary(rows, () => null, now);
  assert.deepEqual(summary.languages.map((l) => [l.lang, l.learned]), [["es", 8], ["fr", 8]]);
  assert.equal(summary.streak, 5);
});

test("seed helpers give a separate peer address and a valid invite code", async () => {
  assert.equal(reviewPeerEmail(EMAIL), "review+peer@bucket.example");
  const { reviewInviteCode } = await import("../src/lib/academy/review-demo-seed");
  assert.notEqual(normalizeInviteCode(reviewInviteCode()), null);
});
