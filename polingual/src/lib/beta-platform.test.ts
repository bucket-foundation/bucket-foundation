import assert from "node:assert/strict";
import { test } from "node:test";
import { joinBeta, androidEmail, ANDROID_MARK, RateLimiter, UNSUBSCRIBE } from "./beta";
import { parsePlatform, platformFromUA, PLAY_GROUP_URL, PLAY_GROUP_EMAIL, PLAY_TESTING_URL } from "./beta-platform";

test("parsePlatform reads android and defaults to ios", () => {
  assert.equal(parsePlatform({ platform: "android" }), "android");
  assert.equal(parsePlatform({ platform: "ios" }), "ios");
  assert.equal(parsePlatform({ platform: "windows" }), "ios");
  assert.equal(parsePlatform(null), "ios");
  assert.equal(parsePlatform("android"), "ios");
});

test("platformFromUA picks android for Android user agents", () => {
  assert.equal(platformFromUA("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36"), "android");
  assert.equal(platformFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), "ios");
  assert.equal(platformFromUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "ios");
  assert.equal(platformFromUA(null), "ios");
});

test("android email carries both steps in order and the unsubscribe line", () => {
  const m = androidEmail("a@b.co", "x");
  for (const body of [m.text, m.html]) {
    assert.ok(body.indexOf(PLAY_GROUP_URL) > -1);
    assert.ok(body.indexOf(PLAY_GROUP_URL) < body.indexOf(PLAY_TESTING_URL));
    assert.ok(body.includes(PLAY_GROUP_EMAIL));
    assert.ok(body.includes("Become a tester"));
    assert.ok(body.includes(UNSUBSCRIBE));
    assert.ok(!body.toLowerCase().includes("testflight"));
  }
});

test("an android beta request goes to the android audience and sends the android email", async () => {
  const calls: string[] = [];
  const sent: string[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push(url);
    if (url.endsWith("/emails")) sent.push(String(init.body));
    return new Response("{}", { status: url.includes("/contacts/") ? 404 : 200 });
  };
  const env = { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud", RESEND_ANDROID_AUDIENCE_ID: "droid" };
  const limits = { ip: new RateLimiter(5, 600_000), email: new RateLimiter(2, 3_600_000) };
  const r = await joinBeta({ email: "a@b.co", kind: "testflight", platform: "android" }, env, send, { origin: "https://beta.polingual.com", ip: "1", human: true }, limits);
  assert.equal(r.status, 200);
  assert.ok(calls.every((u) => !u.includes("/audiences/aud/")));
  assert.ok(calls.some((u) => u.includes("/audiences/droid/")));
  assert.match(sent[0], /Your Polingual Android beta/);
});

function recorder() {
  const calls: { url: string; body: string }[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body ?? "") });
    return new Response("{}", { status: url.includes("/contacts/") ? 404 : 200 });
  };
  return { calls, send };
}
const site = { origin: "https://beta.polingual.com", ip: "1", human: true };
const androidBody = { email: "a@b.co", kind: "testflight", platform: "android" };
const freshLimits = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(2, 3_600_000) });

test("without an android audience the signup stays in the beta audience, marked android, with one error log", async (t) => {
  const errors = t.mock.method(console, "error", () => {});
  for (const email of ["a@b.co", "c@d.co"]) {
    const f = recorder();
    const r = await joinBeta({ ...androidBody, email }, { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud" }, f.send, site, freshLimits());
    assert.equal(r.status, 200);
    const created = f.calls.find((c) => c.url.endsWith("/audiences/aud/contacts"));
    assert.equal(JSON.parse(created!.body).last_name, ANDROID_MARK);
    assert.ok(f.calls.some((c) => c.url.endsWith("/emails") && c.body.includes("Android beta")));
  }
  assert.equal(errors.mock.callCount(), 1);
});

test("an iPhone signup carries no android mark", async () => {
  const f = recorder();
  await joinBeta({ email: "a@b.co", kind: "testflight" }, { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud", RESEND_ANDROID_AUDIENCE_ID: "droid" }, f.send, site, freshLimits());
  const created = f.calls.find((c) => c.url.endsWith("/audiences/aud/contacts"));
  assert.equal(JSON.parse(created!.body).last_name, undefined);
});

test("android signups hit the same email rate limit", async () => {
  const f = recorder();
  const limits = freshLimits();
  const env = { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud", RESEND_ANDROID_AUDIENCE_ID: "droid" };
  assert.equal((await joinBeta(androidBody, env, f.send, site, limits)).status, 200);
  assert.equal((await joinBeta(androidBody, env, f.send, site, limits)).status, 200);
  assert.equal((await joinBeta(androidBody, env, f.send, site, limits)).status, 429);
});

test("the form default covers Android tablets and iPads", () => {
  assert.equal(platformFromUA("Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 Safari/537.36"), "android");
  assert.equal(platformFromUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "ios");
  assert.equal(platformFromUA(""), "ios");
});
