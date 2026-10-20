import test from "node:test";
import assert from "node:assert/strict";
import { callbackErrorMessage, callbackNext, callbackRedirectUrl, resolveCallback, type CallbackAuth } from "../src/lib/auth/callback";

const ORIGIN = "http://localhost:3000";

function fakeAuth(ok: boolean) {
  const calls: string[] = [];
  const auth: CallbackAuth = {
    async exchangeCodeForSession(code) {
      calls.push(`code:${code}`);
      return { error: ok ? null : { message: "invalid flow state" } };
    },
    async verifyOtp({ token_hash, type }) {
      calls.push(`otp:${token_hash}:${type}`);
      return { error: ok ? null : { message: "Token has expired" } };
    },
  };
  return { calls, factory: () => auth };
}

function run(query: string, ok = true) {
  const fake = fakeAuth(ok);
  return resolveCallback(new URL(`${ORIGIN}/auth/callback${query}`), fake.factory).then((url) => ({ url, calls: fake.calls }));
}

test("a valid PKCE code redirects to next on the same origin", async () => {
  const { url, calls } = await run("?code=abc&next=%2Fresearch-os%2Fhome");
  assert.deepEqual(calls, ["code:abc"]);
  assert.equal(url.toString(), `${ORIGIN}/research-os/home`);
});

test("a valid code with no next lands on /learn", async () => {
  const { url } = await run("?code=abc");
  assert.equal(url.toString(), `${ORIGIN}/learn`);
});

test("a valid token_hash and type is verified with verifyOtp", async () => {
  const { url, calls } = await run("?token_hash=h1&type=magiclink&next=%2Faccount");
  assert.deepEqual(calls, ["otp:h1:magiclink"]);
  assert.equal(url.toString(), `${ORIGIN}/account`);
});

test("a bad code returns to sign-in with the expired message", async () => {
  const { url } = await run("?code=bad&next=%2Faccount", false);
  assert.equal(url.pathname, "/sign-in");
  assert.equal(url.searchParams.get("error"), "link_expired");
  assert.equal(url.searchParams.get("next"), "/account");
  assert.match(callbackErrorMessage("link_expired") ?? "", /expired/);
});

test("a throwing client counts as a bad code", async () => {
  const url = await resolveCallback(new URL(`${ORIGIN}/auth/callback?code=x`), () => {
    throw new Error("boom");
  });
  assert.equal(url.searchParams.get("error"), "link_expired");
});

test("open-redirect attempts fall back to /learn on the request origin", async () => {
  for (const next of ["https://evil.example/x", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/sign-in"]) {
    const { url } = await run(`?code=abc&next=${encodeURIComponent(next)}`);
    assert.equal(url.toString(), `${ORIGIN}/learn`, next);
  }
});

test("a missing code and token_hash returns the incomplete message without calling auth", async () => {
  const { url, calls } = await run("?next=%2Faccount");
  assert.deepEqual(calls, []);
  assert.equal(url.searchParams.get("error"), "link_incomplete");
});

test("token_hash with an unknown type is incomplete", async () => {
  const { url, calls } = await run("?token_hash=h1&type=bogus");
  assert.deepEqual(calls, []);
  assert.equal(url.searchParams.get("error"), "link_incomplete");
});

test("an error from Supabase in the link returns link_failed", async () => {
  const { url, calls } = await run("?error=access_denied&error_description=expired");
  assert.deepEqual(calls, []);
  assert.equal(url.searchParams.get("error"), "link_failed");
});

test("callbackRedirectUrl builds the emailRedirectTo for web and localhost", () => {
  assert.equal(callbackRedirectUrl("https://bucket.foundation", "/learn"), "https://bucket.foundation/auth/callback?next=%2Flearn");
  assert.equal(callbackRedirectUrl(ORIGIN, "//evil"), `${ORIGIN}/auth/callback?next=%2Flearn`);
  assert.equal(callbackNext(null), "/learn");
});

test("unknown error codes render no message", () => {
  assert.equal(callbackErrorMessage("Call 555 to recover your account"), null);
  assert.equal(callbackErrorMessage("toString"), null);
  assert.equal(callbackErrorMessage(null), null);
});
