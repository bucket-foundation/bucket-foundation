import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedSource, joinBeta, RateLimiter, TESTFLIGHT_URL, UNSUBSCRIBE, welcomeEmail } from "./beta";

const env = { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud", TURNSTILE_SECRET_KEY: "ts" };
const site = { origin: "https://www.polingual.com", ip: "1.2.3.4", token: "tok" };
const fresh = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(2, 3_600_000) });

function fake(statuses: number[], human: unknown = { success: true, hostname: "www.polingual.com" }) {
  const calls: string[] = [];
  const checks: string[] = [];
  const send = async (url: string, init: RequestInit) => {
    if (url.includes("turnstile/v0/siteverify")) {
      checks.push(String(init.body));
      return new Response(JSON.stringify(human), { status: 200 });
    }
    calls.push(`${init.method} ${url}`);
    return new Response("{}", { status: statuses[calls.length - 1] ?? 200 });
  };
  return { calls, checks, send };
}

const join = (body: unknown, f: ReturnType<typeof fake>, req: { origin?: string; ip?: string; token?: string } = site, limits = fresh(), e: Record<string, string> = env) =>
  joinBeta(body, e, f.send, req, limits);

test("saves a new contact, sends the welcome email and returns the link", async () => {
  const f = fake([404, 200, 200]);
  const r = await join({ email: "Ana@Example.com" }, f);
  assert.equal(r.status, 200);
  assert.equal(r.body.testflight, TESTFLIGHT_URL);
  assert.equal(f.calls.length, 3);
  assert.match(f.calls[0], /^GET https:\/\/api\.resend\.com\/audiences\/aud\/contacts\//);
  assert.equal(f.calls[1], "POST https://api.resend.com/audiences/aud/contacts");
  assert.equal(f.calls[2], "POST https://api.resend.com/emails");
});

test("verifies the Turnstile token with the secret before calling Resend", async () => {
  const f = fake([200]);
  assert.equal((await join({ email: "a@b.co" }, f)).status, 200);
  assert.equal(f.checks.length, 1);
  const form = new URLSearchParams(f.checks[0]);
  assert.equal(form.get("secret"), "ts");
  assert.equal(form.get("response"), "tok");
  assert.equal(form.get("remoteip"), "1.2.3.4");
});

test("a failed Turnstile token saves nothing, and enforcement blocks a missing one", async () => {
  const none = fake([]);
  assert.equal((await join({ email: "a@b.co" }, none, { origin: site.origin, ip: "1" }, fresh(), { ...env, BETA_REQUIRE_TURNSTILE: "1" })).status, 403);
  assert.equal(none.checks.length + none.calls.length, 0);
  const failed = fake([], { success: false });
  assert.equal((await join({ email: "a@b.co" }, failed, { ...site, ip: "2" })).status, 403);
  assert.equal(failed.calls.length, 0);
  const foreign = fake([], { success: true, hostname: "evil.example" });
  assert.equal((await join({ email: "a@b.co" }, foreign, { ...site, ip: "3" })).status, 403);
  assert.equal(foreign.calls.length, 0);
});

test("without a token or enforcement the form still saves, relying on rate limits and the honeypot", async () => {
  const f = fake([]);
  const r = await join({ email: "a@b.co" }, f, { origin: site.origin, ip: "9" }, fresh(), { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud" });
  assert.notEqual(r.status, 403);
  assert.notEqual(r.status, 503);
  assert.equal(f.checks.length, 0);
});

test("does not email an address already in the audience", async () => {
  const f = fake([200]);
  const r = await join({ email: "a@b.co" }, f);
  assert.equal(r.status, 200);
  assert.equal(r.body.testflight, TESTFLIGHT_URL);
  assert.equal(f.calls.length, 1);
});

test("does not email when the create call reports a duplicate", async () => {
  const f = fake([404, 409]);
  assert.equal((await join({ email: "a@b.co" }, f)).status, 200);
  assert.equal(f.calls.some((c) => c.endsWith("/emails")), false);
});

test("rejects a bad email without calling Resend", async () => {
  const f = fake([]);
  assert.equal((await join({ email: "nope" }, f)).status, 400);
  assert.equal(f.calls.length, 0);
});

test("reports a failed save", async () => {
  const f = fake([404, 500]);
  assert.equal((await join({ email: "a@b.co" }, f)).status, 502);
  assert.equal(f.calls.length, 2);
});

test("returns 503 when keys are missing", async () => {
  assert.equal((await join({ email: "a@b.co" }, fake([]), site, fresh(), {})).status, 503);
});

test("honeypot submissions succeed without calling Resend", async () => {
  const f = fake([]);
  const r = await join({ email: "a@b.co", website: "x" }, f);
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 0);
});

test("rejects requests from other origins", async () => {
  const f = fake([]);
  assert.equal((await join({ email: "a@b.co" }, f, { origin: "https://evil.example", ip: "1" })).status, 403);
  assert.equal((await join({ email: "a@b.co" }, f, { ip: "1" })).status, 403);
  assert.equal(f.calls.length, 0);
});

test("allowedSource accepts polingual hosts by origin or referer", () => {
  assert.equal(allowedSource("https://polingual.com"), true);
  assert.equal(allowedSource(null, "https://www.polingual.com/d8/"), true);
  assert.equal(allowedSource("http://polingual.com"), false);
  assert.equal(allowedSource("https://polingual.com.evil.io"), false);
  assert.equal(allowedSource("https://evil.io", "https://polingual.com/"), false);
  assert.equal(allowedSource("garbage"), false);
});

test("limits signups per IP", async () => {
  const limits = fresh();
  for (let i = 0; i < 5; i++) assert.equal((await join({ email: `u${i}@b.co` }, fake([200]), site, limits)).status, 200);
  const f = fake([]);
  assert.equal((await join({ email: "u9@b.co" }, f, site, limits)).status, 429);
  assert.equal(f.calls.length, 0);
});

test("limits signups per email across IPs", async () => {
  const limits = fresh();
  for (let i = 0; i < 2; i++) await join({ email: "v@b.co" }, fake([200]), { ...site, ip: `ip${i}` }, limits);
  const f = fake([]);
  assert.equal((await join({ email: "V@b.co" }, f, { ...site, ip: "ip9" }, limits)).status, 429);
  assert.equal(f.calls.length, 0);
});

test("rate limiter window expires", () => {
  const l = new RateLimiter(1, 1000);
  assert.equal(l.take("k", 0), true);
  assert.equal(l.take("k", 500), false);
  assert.equal(l.take("k", 1500), true);
});

test("welcome email carries the unsubscribe line in text and html", () => {
  const m = welcomeEmail("a@b.co", "x");
  assert.ok(m.text.includes(UNSUBSCRIBE));
  assert.ok(m.html.includes(UNSUBSCRIBE));
});
