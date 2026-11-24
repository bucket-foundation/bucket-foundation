import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { googleClientId, mintGoogleSession, verifyGoogleIdToken } from "../src/lib/academy/google-token";
import { createSessionHandler, SESSION_LIMITS, type AuthResult, type SessionDeps } from "../src/lib/academy/session-server";

const CLIENT = "201543151655-7kgh9gufktnsgnsmmaclc10cbrtdqb16.apps.googleusercontent.com";
const NOW = 1_760_000_000_000;
const RAW = "a1b2c3d4";
const HASHED = createHash("sha256").update(RAW).digest("hex");
const SESSION = { access_token: "at", refresh_token: "rt", expires_in: 3600, user: { id: "u1" } };

async function fixture() {
  const good = await generateKeyPair("RS256");
  const rogue = await generateKeyPair("RS256");
  const jwk: JWK = { ...(await exportJWK(good.publicKey)), kid: "k1", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, key = good.privateKey) =>
    new SignJWT({ email: "Learner@Example.com", email_verified: true, nonce: HASHED, ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(typeof claims.iss === "string" ? claims.iss : "https://accounts.google.com")
      .setAudience(typeof claims.aud === "string" ? claims.aud : CLIENT)
      .setSubject("g-123")
      .setIssuedAt(Math.floor(NOW / 1000) - 10)
      .setExpirationTime(typeof claims.exp === "number" ? claims.exp : Math.floor(NOW / 1000) + 600)
      .sign(key);
  return { keys, sign, rogue: rogue.privateKey };
}

const verify = (token: string, keys: Parameters<typeof verifyGoogleIdToken>[2]["keys"], raw = RAW) => verifyGoogleIdToken(token, raw, { clientId: CLIENT, keys, now: NOW });

test("a signed Google token with the hashed nonce yields the lowercased email", async () => {
  const f = await fixture();
  assert.deepEqual(await verify(await f.sign({}), f.keys), { sub: "g-123", email: "learner@example.com" });
  assert.deepEqual(await verify(await f.sign({ iss: "accounts.google.com" }), f.keys), { sub: "g-123", email: "learner@example.com" });
});

test("Google tokens fail on signature, audience, issuer, expiry, nonce and unverified email", async () => {
  const f = await fixture();
  assert.equal(await verify(await f.sign({}, f.rogue), f.keys), null);
  assert.equal(await verify(await f.sign({ aud: "other.apps.googleusercontent.com" }), f.keys), null);
  assert.equal(await verify(await f.sign({ iss: "https://evil.example" }), f.keys), null);
  assert.equal(await verify(await f.sign({ exp: Math.floor(NOW / 1000) - 60 }), f.keys), null);
  assert.equal(await verify(await f.sign({}), f.keys, "wrong"), null);
  assert.equal(await verify(await f.sign({ nonce: RAW }), f.keys), null);
  assert.equal(await verify(await f.sign({ email_verified: false }), f.keys), null);
  assert.equal(await verify(await f.sign({ email_verified: "true" }), f.keys), null);
  assert.equal(await verify(await f.sign({ email: undefined }), f.keys), null);
  assert.equal(await verify("not.a.jwt", f.keys), null);
});

test("an unset or blank client id reads as no client id", () => {
  assert.equal(googleClientId(undefined), null);
  assert.equal(googleClientId("  "), null);
  assert.equal(googleClientId(` ${CLIENT} `), CLIENT);
});

function world(google: SessionDeps["google"]) {
  const hits = new Map<string, number>();
  const deps: SessionDeps = {
    enabled: () => true,
    configured: () => true,
    now: () => NOW,
    rateHit: async (key, limit) => {
      const n = (hits.get(key) ?? 0) + 1;
      hits.set(key, n);
      return n <= limit;
    },
    sendOtp: async () => ({ status: null }),
    verifyOtp: async () => ({ session: null, status: 403 }),
    refresh: async () => ({ session: null, status: 401 }),
    signInWithApple: async () => ({ session: null, status: 400 }),
    deleteAccount: async () => ({ status: null }),
    google,
  };
  return createSessionHandler(deps);
}

test("the google action returns the same token pair as the code flow", async () => {
  const f = await fixture();
  const signedIn: string[] = [];
  const handle = world({
    clientId: () => CLIENT,
    verify: (t, n, c) => verifyGoogleIdToken(t, n, { clientId: c, keys: f.keys, now: NOW }),
    signIn: async (who): Promise<AuthResult> => (signedIn.push(who.email), { session: SESSION, status: null }),
  });
  const r = await handle({ action: "google", id_token: await f.sign({}), nonce: RAW, app: "polingual" }, "1.1.1.1");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { access_token: "at", refresh_token: "rt", expires_at: NOW / 1000 + 3600, user_id: "u1", new_account: false });
  assert.deepEqual(signedIn, ["learner@example.com"]);
  const bad = await handle({ action: "google", id_token: await f.sign({}, f.rogue), nonce: RAW }, "1.1.1.1");
  assert.deepEqual(bad, { status: 401, body: { error: "bad_token" } });
  assert.equal(signedIn.length, 1);
});

test("the google action fails closed without a client id and rejects bad input", async () => {
  const called: string[] = [];
  const g = { verify: async () => (called.push("v"), null), signIn: async () => ({ session: SESSION, status: null }) };
  assert.deepEqual(await world({ ...g, clientId: () => null })({ action: "google", id_token: "a.b.c", nonce: RAW }, "ip"), { status: 503, body: { error: "google_unavailable" } });
  assert.deepEqual(await world(undefined)({ action: "google", id_token: "a.b.c", nonce: RAW }, "ip"), { status: 503, body: { error: "google_unavailable" } });
  const h = world({ ...g, clientId: () => CLIENT });
  assert.equal((await h({ action: "google", id_token: "", nonce: RAW }, "ip")).status, 400);
  assert.equal((await h({ action: "google", id_token: "a.b.c", nonce: "" }, "ip")).status, 400);
  assert.equal((await h({ action: "google", id_token: "a.b.c", nonce: RAW, app: "bucket" }, "ip")).status, 400);
  assert.deepEqual(called, []);
});

test("google sign-ins are capped per IP and Supabase failures map to 502", async () => {
  let n = 0;
  const h = world({ clientId: () => CLIENT, verify: async () => ({ sub: "s", email: `a${n++}@b.co` }), signIn: async () => ({ session: null, status: 500 }) });
  for (let i = 0; i < SESSION_LIMITS.googleIp; i++) assert.equal((await h({ action: "google", id_token: "a.b.c", nonce: RAW }, "9.9.9.9")).status, 502);
  assert.equal((await h({ action: "google", id_token: "a.b.c", nonce: RAW }, "9.9.9.9")).status, 429);
});

const WHO = { sub: "g-123", email: "n@b.co" };

type U = { id: string; app_metadata?: Record<string, unknown> } | null;

function auth(user: U, createStatus: number | null = null, ...later: U[]) {
  const calls: string[] = [];
  const reads = [user, ...later];
  let finds = 0;
  return {
    calls,
    deps: {
      findUser: async (e: string) => (calls.push(`find ${e}`), reads[Math.min(finds++, reads.length - 1)]),
      createUser: async (e: string, sub: string) => (calls.push(`create ${e} ${sub}`), { status: createStatus }),
      bindSub: async (id: string, sub: string) => (calls.push(`bind ${id} ${sub}`), { bound: sub, status: null }),
      generateLink: async (e: string) => (calls.push(`link ${e}`), { link: { tokenHash: "h", type: "magiclink" }, status: null }),
      verifyToken: async (h: string, t: string): Promise<AuthResult> => (calls.push(`verify ${h} ${t}`), { session: SESSION, status: null }),
    },
  };
}

test("a new Google email creates a confirmed user carrying the sub, then mints a session", async () => {
  const a = auth(null);
  assert.equal((await mintGoogleSession(WHO, a.deps)).session, SESSION);
  assert.deepEqual(a.calls, ["find n@b.co", "create n@b.co g-123", "link n@b.co", "verify h magiclink"]);
});

test("an existing email with no Google sub binds the sub on first Google sign-in", async () => {
  const a = auth({ id: "u1", app_metadata: {} });
  assert.equal((await mintGoogleSession(WHO, a.deps)).session, SESSION);
  assert.deepEqual(a.calls, ["find n@b.co", "bind u1 g-123", "link n@b.co", "verify h magiclink"]);
});

test("two concurrent first binds: the sign-in whose sub lost the compare-and-set is rejected", async () => {
  let stored: string | undefined;
  const links: string[] = [];
  const deps = {
    findUser: async () => ({ id: "u1", app_metadata: {} }),
    createUser: async () => ({ status: null }),
    bindSub: async (_: string, sub: string) => {
      await new Promise((r) => setTimeout(r, sub === "g-a" ? 1 : 5));
      stored ??= sub;
      return { bound: stored, status: null };
    },
    generateLink: async (e: string) => (links.push(e), { link: { tokenHash: "h", type: "magiclink" }, status: null }),
    verifyToken: async (): Promise<AuthResult> => ({ session: SESSION, status: null }),
  };
  const [a, b] = await Promise.all([mintGoogleSession({ sub: "g-a", email: "n@b.co" }, deps), mintGoogleSession({ sub: "g-b", email: "n@b.co" }, deps)]);
  assert.equal(a.session, SESSION);
  assert.deepEqual(b, { session: null, status: 409 });
  assert.deepEqual(links, ["n@b.co"]);
});

test("a matching Google sub signs in without rebinding", async () => {
  const a = auth({ id: "u1", app_metadata: { google_sub: "g-123" } });
  assert.equal((await mintGoogleSession(WHO, a.deps)).session, SESSION);
  assert.deepEqual(a.calls, ["find n@b.co", "link n@b.co", "verify h magiclink"]);
});

test("a different Google sub for the same email is rejected before minting", async () => {
  const a = auth({ id: "u1", app_metadata: { google_sub: "g-other" } });
  assert.deepEqual(await mintGoogleSession(WHO, a.deps), { session: null, status: 409 });
  assert.deepEqual(a.calls, ["find n@b.co"]);
});

test("a create race re-reads the user and still enforces the sub", async () => {
  const a = auth(null, 422, { id: "u1", app_metadata: { google_sub: "g-other" } });
  assert.deepEqual(await mintGoogleSession(WHO, a.deps), { session: null, status: 409 });
  assert.deepEqual(a.calls, ["find n@b.co", "create n@b.co g-123", "find n@b.co"]);
});

test("a failed user create stops before minting", async () => {
  const a = auth(null, 500);
  assert.deepEqual(await mintGoogleSession(WHO, a.deps), { session: null, status: 500 });
  assert.deepEqual(a.calls, ["find n@b.co", "create n@b.co g-123"]);
});

test("a sub mismatch maps to a clear 409 from the google action", async () => {
  const h = world({ clientId: () => CLIENT, verify: async () => ({ sub: "s", email: "a@b.co" }), signIn: async () => ({ session: null, status: 409 }) });
  const r = await h({ action: "google", id_token: "a.b.c", nonce: RAW }, "ip");
  assert.equal(r.status, 409);
  assert.equal(r.body.error, "google_account_mismatch");
  assert.equal(typeof r.body.message, "string");
});

test("google sign-ins are capped per email across addresses", async () => {
  const h = world({ clientId: () => CLIENT, verify: async () => ({ sub: "s", email: "same@b.co" }), signIn: async () => ({ session: SESSION, status: null }) });
  for (let i = 0; i < SESSION_LIMITS.googleEmail; i++) assert.equal((await h({ action: "google", id_token: "a.b.c", nonce: RAW }, `10.0.0.${i}`)).status, 200);
  assert.equal((await h({ action: "google", id_token: "a.b.c", nonce: RAW }, "10.0.1.1")).status, 429);
});
