import test from "node:test";
import assert from "node:assert/strict";
import { findUserByEmail, isReviewDemoEmail, isReviewDemoUser, mintReviewSession, reviewCodeMatches, reviewDemoConfig, type ReviewDemoAuth, type ReviewDemoUser } from "../src/lib/academy/review-demo";
import { reviewPeerEmail, reviewProgressRows, reviewSystem, reviewSystemsDoc } from "../src/lib/academy/review-demo-seed";
import { createSessionHandler, SESSION_LIMITS, type AuthResult, type SessionDeps } from "../src/lib/academy/session-server";
import { memberSummary, normalizeInviteCode } from "../src/lib/academy/groups";
import { normalizeSystemsDoc, progressBranch } from "../src/lib/academy/lang-systems";

const EMAIL = "review@bucket.example";
const CODE = "48151623";
const NOW = 1_760_000_000_000;
const UNTIL = new Date(NOW + 86_400_000).toISOString();
const SESSION = { access_token: "at", refresh_token: "rt", expires_in: 3600, user: { id: "demo" } };

function world(over: Partial<SessionDeps> = {}, config: () => ReturnType<typeof reviewDemoConfig> = () => reviewDemoConfig(EMAIL, CODE, UNTIL, NOW)) {
  const hits = new Map<string, number>();
  const calls: string[] = [];
  const logs: { outcome: string; ip: string }[] = [];
  const deps: SessionDeps = {
    enabled: () => true,
    configured: () => true,
    now: () => NOW,
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
  const config = (email?: string, code?: string) => reviewDemoConfig(email, code, UNTIL, NOW);
  assert.deepEqual(config(` ${EMAIL.toUpperCase()} `, ` ${CODE} `), { email: EMAIL, code: CODE });
  assert.equal(config(undefined, CODE), null);
  assert.equal(config(EMAIL, undefined), null);
  assert.equal(config("", ""), null);
  assert.equal(config("nope", CODE), null);
  assert.equal(config(EMAIL, "123456"), null);
  assert.equal(config(EMAIL, "12345678901"), null);
  assert.equal(config(EMAIL, "abcdefgh"), null);
});

test("a missing, past, exact or unreadable REVIEW_DEMO_UNTIL turns the path off", () => {
  assert.notEqual(reviewDemoConfig(EMAIL, CODE, "2099-01-01", NOW), null);
  for (const until of [undefined, "", "2020-01-01", new Date(NOW).toISOString(), "soon", "12", "2099-13-45"]) assert.equal(reviewDemoConfig(EMAIL, CODE, until, NOW), null);
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
  const w = world({}, () => reviewDemoConfig(undefined, undefined, undefined, NOW));
  await w.handle({ action: "otp", email: EMAIL }, "1.1.1.1");
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "1.1.1.1")).status, 400);
  assert.deepEqual(w.calls, [`otp ${EMAIL}`, `verify ${EMAIL} ${CODE}`]);
  assert.equal(w.logs.length, 0);
});

test("strangers guessing from many addresses cannot lock the reviewer out", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.verifyEmail * 3; i++) assert.equal((await w.handle({ action: "verify", email: EMAIL, code: "11111111" }, `10.1.0.${i}`)).status, 400);
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "198.51.100.7")).status, 200);
});

test("strangers asking for codes cannot lock the reviewer out", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.otpEmail * 3; i++) await w.handle({ action: "otp", email: EMAIL }, `10.3.0.${i}`);
  assert.equal((await w.handle({ action: "otp", email: EMAIL }, "198.51.100.7")).status, 200);
});

test("guesses at the demo address are capped per address, and other addresses stay open", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.reviewVerifyIp; i++) assert.equal((await w.handle({ action: "verify", email: EMAIL, code: "11111111" }, "10.1.0.1")).status, 400);
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "10.1.0.1")).status, 429);
  assert.equal(w.calls.length, 0);
  assert.equal(w.logs.at(-1)?.outcome, "rate_limited");
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "10.1.0.2")).status, 200);
});

test("other addresses keep their per-email cap", async () => {
  const w = world();
  for (let i = 0; i < SESSION_LIMITS.verifyEmail; i++) await w.handle({ action: "verify", email: "a@b.co", code: "000000" }, `10.4.0.${i}`);
  assert.equal((await w.handle({ action: "verify", email: "a@b.co", code: "000000" }, "10.4.0.200")).status, 429);
});

test("a failed mint is a bad code and logged", async () => {
  const w = world({ reviewDemo: { config: () => reviewDemoConfig(EMAIL, CODE, UNTIL, NOW), signIn: async () => ({ session: null, status: 403 }), log: () => {} } });
  assert.equal((await w.handle({ action: "verify", email: EMAIL, code: CODE }, "1.1.1.1")).status, 400);
});

test("log lines carry an outcome and a hashed address, with no code or email", async () => {
  const w = world();
  await w.handle({ action: "verify", email: EMAIL, code: CODE }, "203.0.113.9");
  await w.handle({ action: "verify", email: EMAIL, code: "11111111" }, "203.0.113.9");
  const text = JSON.stringify(w.logs);
  for (const secret of [CODE, "11111111", EMAIL, "203.0.113.9"]) assert.equal(text.includes(secret), false);
});

function auth(user: ReviewDemoUser | null, status: number | null = null) {
  const seen: string[] = [];
  const deps: ReviewDemoAuth = {
    findUser: async () => user,
    generateLink: async () => (seen.push("link"), status === null ? { link: { tokenHash: "hash", type: "magiclink" }, status: null } : { link: null, status }),
    verifyToken: async (hash, type) => (seen.push(`${hash} ${type}`), { session: SESSION, status: null }),
  };
  return { deps, seen };
}

test("a session is minted only for a user the seed marked, and nothing else generates a link", async () => {
  const marked = auth({ app_metadata: { review_demo: true } });
  assert.deepEqual(await mintReviewSession(EMAIL, marked.deps), { session: SESSION, status: null });
  assert.deepEqual(marked.seen, ["link", "hash magiclink"]);
  for (const user of [{ app_metadata: {} }, { app_metadata: { review_demo: "true" } }, {}, null]) {
    const a = auth(user);
    assert.deepEqual(await mintReviewSession(EMAIL, a.deps), { session: null, status: 403 });
    assert.deepEqual(a.seen, []);
    assert.equal(isReviewDemoUser(user), false);
  }
});

test("a link failure passes through without a verify", async () => {
  const a = auth({ app_metadata: { review_demo: true } }, 500);
  assert.deepEqual(await mintReviewSession(EMAIL, a.deps), { session: null, status: 500 });
  assert.deepEqual(a.seen, ["link"]);
});

test("the user lookup walks every page and stops at the last one", async () => {
  const pages: { email: string }[][] = [Array.from({ length: 1000 }, (_, i) => ({ email: `u${i}@b.co` })), [{ email: EMAIL.toUpperCase() }]];
  const asked: number[] = [];
  const list = async (page: number) => (asked.push(page), pages[page - 1] ?? []);
  assert.deepEqual(await findUserByEmail(list, EMAIL), { email: EMAIL.toUpperCase() });
  assert.deepEqual(asked, [1, 2]);
  assert.equal(await findUserByEmail(list, "absent@b.co"), null);
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
