import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RateLimiter } from "./beta";
import { claimFounding, codeEmail, fetchSpots, ipHash, parseCodes, type Outcome } from "./founding";

const env = { RESEND_API_KEY: "k", POLINGUAL_DB_SERVICE_KEY: "s", POLINGUAL_DB_URL: "https://db.test", TURNSTILE_SECRET_KEY: "ts", TURNSTILE_SITE_KEY: "site" };
const site = { origin: "https://www.polingual.com", ip: "1.2.3.4", token: "tok" };
const fresh = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(2, 3_600_000) });

type Reply = [number, unknown];
function fake(replies: Reply[]) {
  const calls: { url: string; body: string }[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body ?? "") });
    const [status, body] = replies[calls.length - 1] ?? [200, {}];
    return new Response(JSON.stringify(body), { status });
  };
  return { calls, send };
}
const human: Reply = [200, { success: true, hostname: "www.polingual.com" }];
const row = (code: string | null, outcome: Outcome, left = 100): Reply => [200, [{ code, outcome, spots_left: left }]];

test("verifies the human, claims one code and emails it", async () => {
  const f = fake([human, row("ABC123", "claimed", 199), [200, {}]]);
  const r = await claimFounding({ email: "Ana@Example.com" }, env, f.send, site, fresh());
  assert.equal(r.status, 200);
  assert.equal(r.body.left, 199);
  assert.match(f.calls[0].url, /turnstile\/v0\/siteverify/);
  assert.equal(f.calls[1].url, "https://db.test/rest/v1/rpc/claim_founding_code");
  assert.deepEqual(JSON.parse(f.calls[1].body), { p_email: "ana@example.com", p_ip_hash: ipHash("1.2.3.4", env) });
  assert.match(f.calls[2].body, /ABC123/);
});

test("a forged origin with no human token takes no code", async () => {
  const f = fake([[200, { success: false }]]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, { ...site, token: "forged" }, fresh());
  assert.equal(r.status, 403);
  assert.ok(!f.calls.some((c) => c.url.includes("claim_founding_code")));
});

test("missing token never reaches the database", async () => {
  const f = fake([]);
  assert.equal((await claimFounding({ email: "a@b.co" }, env, f.send, { ...site, token: null }, fresh())).status, 403);
  assert.equal(f.calls.length, 0);
});

test("50 scripted claims from one network with fresh limiters stay under the database cap", async () => {
  let taken = 0;
  const send = async (url: string) => {
    if (url.includes("siteverify")) return new Response(JSON.stringify({ success: true }));
    if (url.includes("claim_founding_code")) {
      const outcome = taken < 3 ? "claimed" : "ip-limit";
      if (outcome === "claimed") taken++;
      return new Response(JSON.stringify([{ code: outcome === "claimed" ? `C${taken}XXXXX` : null, outcome, spots_left: 200 - taken }]));
    }
    return new Response("{}");
  };
  const results = [];
  for (let i = 0; i < 50; i++) results.push(await claimFounding({ email: `d${i}@x.co` }, env, send, site, fresh()));
  assert.equal(taken, 3);
  assert.equal(results.filter((r) => r.status === 429).length, 47);
});

test("a recent repeat for the same email sends no second email", async () => {
  const f = fake([human, row(null, "recent")]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, site, fresh());
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 2);
});

test("reports full when no code is left", async () => {
  const f = fake([human, row(null, "full", 0)]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, site, fresh());
  assert.equal(r.status, 409);
  assert.equal(r.body.full, true);
});

test("never returns the code in the response body", async () => {
  const f = fake([human, row("SECRET99", "claimed", 5), [200, {}]]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, site, fresh());
  assert.ok(!JSON.stringify(r.body).includes("SECRET99"));
});

test("a failed email keeps the spot and says when to retry", async () => {
  const f = fake([human, row("ABC123", "claimed", 3), [500, {}]]);
  const r = await claimFounding({ email: "a@b.co" }, env, f.send, site, fresh());
  assert.equal(r.status, 502);
  assert.match(r.body.error ?? "", /10 minutes/);
});

test("offline until every key is set", async () => {
  for (const drop of Object.keys(env)) {
    const partial: Record<string, string> = { ...env };
    delete partial[drop];
    const f = fake([]);
    assert.equal((await claimFounding({ email: "a@b.co" }, partial, f.send, site, fresh())).status, 503, drop);
    assert.equal(f.calls.length, 0);
  }
});

test("rejects other origins and honeypot hits", async () => {
  const f = fake([]);
  assert.equal((await claimFounding({ email: "a@b.co" }, env, f.send, { ...site, origin: "https://evil.example" }, fresh())).status, 403);
  assert.equal((await claimFounding({ email: "a@b.co", website: "x" }, env, f.send, site, fresh())).status, 200);
  assert.equal(f.calls.length, 0);
});

test("spots read from the database and hide when offline", async () => {
  assert.deepEqual(await fetchSpots(env, fake([[200, [{ total: 200, spots_left: 17 }]]]).send), { total: 200, left: 17 });
  assert.equal(await fetchSpots(env, fake([[500, {}]]).send), null);
  assert.equal(await fetchSpots(env, fake([[200, [{ total: 0, spots_left: 0 }]]]).send), null);
  assert.equal(await fetchSpots({}, fake([]).send), null);
  const slow = async () => Promise.reject(new DOMException("timeout", "TimeoutError"));
  assert.equal(await fetchSpots(env, slow), null);
});

test("ip hash is salted and stable", () => {
  assert.equal(ipHash("1.2.3.4", env), ipHash("1.2.3.4", env));
  assert.notEqual(ipHash("1.2.3.4", env), ipHash("1.2.3.4", { FOUNDING_IP_SALT: "other" }));
  assert.ok(!ipHash("1.2.3.4", env).includes("1.2.3.4"));
});

test("parseCodes trims, uppercases and dedupes", () => {
  assert.deepEqual(parseCodes("abc123, ABC123\nzz9999  bad\n"), ["ABC123", "ZZ9999"]);
});

test("code email points at the Bucket beta and the redeem link", () => {
  const m = codeEmail("a@b.co", "P <p@x.co>", "ABC123");
  assert.match(m.text, /ABC123/);
  assert.match(m.text, /Bucket beta/);
  assert.match(m.text, /apps\.apple\.com\/redeem/);
});

test("no offer codes are committed", () => {
  const ignore = readFileSync(join(__dirname, "../../.gitignore"), "utf8");
  assert.match(ignore, /founding-codes\*/);
});

test("beta modal switches to founding mode only when the API reports open spots and a site key", () => {
  const js = readFileSync(join(__dirname, "../../public/d8/beta.js"), "utf8");
  assert.match(js, /if\(!j\|\|!\(j\.left>0\)\|\|!j\.siteKey\)return/);
  assert.match(js, /turnstile:/);
  assert.match(js, /testflight\.apple\.com\/join\/HfeRBKr8/);
});
