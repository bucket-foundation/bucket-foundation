import { test } from "node:test";
import assert from "node:assert/strict";
import { FOUNDER_EMAIL, founderFromToken, refreshFounder, sendFounderCode, verifyFounderCode } from "./gate";

const env = { POLINGUAL_DB_URL: "https://db.test", POLINGUAL_DB_ANON_KEY: "anon", POLINGUAL_SYNC_BASE: "https://bucket.test" };

function fake(routes: Record<string, (init: RequestInit) => Response>) {
  const calls: string[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push(`${init.method} ${url}`);
    const hit = Object.entries(routes).find(([k]) => url.startsWith(k));
    if (!hit) throw new Error(`unexpected ${url}`);
    return hit[1](init);
  };
  return { send, calls };
}

const user = (email: string) => () => new Response(JSON.stringify({ id: "u", email }), { status: 200 });
const tokens = () => new Response(JSON.stringify({ access_token: "at", refresh_token: "rt", expires_at: 2_000_000_000 }), { status: 200 });

test("founderFromToken accepts the founder email only", async () => {
  assert.equal(await founderFromToken("t", env, fake({ "https://db.test/auth/v1/user": user("GianyRox@gmail.com") }).send), FOUNDER_EMAIL);
  assert.equal(await founderFromToken("t", env, fake({ "https://db.test/auth/v1/user": user("someone@gmail.com") }).send), null);
  assert.equal(await founderFromToken("t", env, fake({ "https://db.test/auth/v1/user": () => new Response("{}", { status: 401 }) }).send), null);
});

test("founderFromToken makes no call without a token or config", async () => {
  const f = fake({});
  assert.equal(await founderFromToken(undefined, env, f.send), null);
  assert.equal(await founderFromToken("t", {}, f.send), null);
  assert.deepEqual(f.calls, []);
});

test("sendFounderCode refuses other emails before any network call", async () => {
  const f = fake({});
  assert.deepEqual(await sendFounderCode("other@x.com", env, f.send), { ok: false, error: "not_founder" });
  assert.deepEqual(f.calls, []);
});

test("sendFounderCode asks the academy session route for a code", async () => {
  let body = "";
  const f = fake({ "https://bucket.test/api/academy/session": (init) => ((body = String(init.body)), new Response('{"ok":true}', { status: 200 })) });
  assert.deepEqual(await sendFounderCode(FOUNDER_EMAIL, env, f.send), { ok: true });
  assert.deepEqual(JSON.parse(body), { action: "otp", email: FOUNDER_EMAIL, app: "polingual" });
});

test("verifyFounderCode returns tokens only when the session user is the founder", async () => {
  const ok = await verifyFounderCode(FOUNDER_EMAIL, "123456", env, fake({ "https://bucket.test/": tokens, "https://db.test/": user(FOUNDER_EMAIL) }).send);
  assert.ok(ok.ok && ok.tokens?.access_token === "at");
  const wrong = await verifyFounderCode(FOUNDER_EMAIL, "123456", env, fake({ "https://bucket.test/": tokens, "https://db.test/": user("x@y.com") }).send);
  assert.deepEqual(wrong, { ok: false, error: "not_founder" });
  const bad = await verifyFounderCode(FOUNDER_EMAIL, "1", env, fake({ "https://bucket.test/": () => new Response('{"error":"bad_code"}', { status: 400 }) }).send);
  assert.deepEqual(bad, { ok: false, error: "bad_code" });
});

test("refreshFounder rechecks the founder on the new token", async () => {
  const r = await refreshFounder("rt", env, fake({ "https://bucket.test/": tokens, "https://db.test/": user(FOUNDER_EMAIL) }).send);
  assert.ok(r.ok);
  assert.deepEqual(await refreshFounder("", env, fake({}).send), { ok: false, error: "no_session" });
});
