import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_MAX_AGE_SECONDS, persistentCookie, sessionCookieOptions } from "../src/lib/supabase/cookie-options";
import { updateSession } from "../src/lib/supabase/session";

const SUPA = "http://127.0.0.1:54321";
const KEY = "sb-127-auth-token";
const USER = { id: "u1", aud: "authenticated", role: "authenticated", email: "f@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };

function jwt(exp: number): string {
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "HS256", typ: "JWT" })}.${b({ sub: "u1", exp, role: "authenticated" })}.sig`;
}

function session(expiresAt: number, refresh: string) {
  return { access_token: jwt(expiresAt), refresh_token: refresh, token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user: USER };
}

function cookieValue(s: object): string {
  return "base64-" + Buffer.from(JSON.stringify(s)).toString("base64url");
}

function stubSupabase() {
  const calls: string[] = [];
  const now = Math.floor(Date.now() / 1000);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/token?grant_type=refresh_token")) return new Response(JSON.stringify(session(now + 3600, "r2")), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith("/user")) return new Response(JSON.stringify(USER), { status: 200, headers: { "content-type": "application/json" } });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return calls;
}

function returningVisit(host: string, cookie: string): NextRequest {
  return new NextRequest(`https://${host}/learn`, { headers: { host, cookie } });
}

test("session cookie options are persistent and shared across bucket hosts", () => {
  const o = sessionCookieOptions("www.bucket.foundation");
  assert.equal(o.maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
  assert.equal(o.path, "/");
  assert.equal(o.sameSite, "lax");
  assert.equal(o.domain, ".bucket.foundation");
  assert.equal(sessionCookieOptions("localhost:3000").domain, undefined);
});

test("a cookie without maxAge becomes persistent, a removal stays a removal", () => {
  const set = persistentCookie({ name: KEY, value: "v", options: {} }, "bucket.foundation", true);
  assert.equal(set.options.maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
  assert.equal(set.options.secure, true);
  const gone = persistentCookie({ name: KEY, value: "", options: { maxAge: 0 } }, "bucket.foundation", true);
  assert.equal(gone.options.maxAge, 0);
});

test("a returning visit with an expired access token is refreshed by middleware into persistent cookies", async () => {
  const calls = stubSupabase();
  const expired = session(Math.floor(Date.now() / 1000) - 600, "r1");
  const req = returningVisit("bucket.foundation", `${KEY}=${cookieValue(expired)}`);
  let forwardedCookie = "";
  const { res, signedIn } = await updateSession(req, () => {
    forwardedCookie = req.headers.get("cookie") ?? "";
    return NextResponse.next({ request: { headers: new Headers(req.headers) } });
  }, SUPA, "anon");
  assert.equal(signedIn, true);
  assert.ok(calls.some((u) => u.includes("grant_type=refresh_token")));
  const set = res.cookies.getAll().filter((c) => c.name.startsWith(KEY) && c.value);
  assert.ok(set.length > 0);
  for (const c of set) {
    assert.equal(c.maxAge, SESSION_COOKIE_MAX_AGE_SECONDS);
    assert.equal(c.domain, ".bucket.foundation");
    assert.equal(c.secure, true);
    assert.equal(c.path, "/");
  }
  const header = res.headers.get("set-cookie") ?? "";
  assert.match(header, /Max-Age=34560000/);
  assert.ok(forwardedCookie.includes(set[0].value), "the page render sees the refreshed token");
  assert.notEqual(forwardedCookie, `${KEY}=${cookieValue(expired)}`);
});

test("a visit with a valid session keeps the user signed in without rewriting cookies", async () => {
  stubSupabase();
  const fresh = session(Math.floor(Date.now() / 1000) + 3000, "r1");
  const req = returningVisit("bucket.foundation", `${KEY}=${cookieValue(fresh)}`);
  const { res, signedIn } = await updateSession(req, () => NextResponse.next(), SUPA, "anon");
  assert.equal(signedIn, true);
  assert.equal(res.cookies.getAll().filter((c) => c.name.startsWith(KEY)).length, 0);
});

test("no session cookie means signed out", async () => {
  stubSupabase();
  const { signedIn } = await updateSession(returningVisit("bucket.foundation", ""), () => NextResponse.next(), SUPA, "anon");
  assert.equal(signedIn, false);
});
