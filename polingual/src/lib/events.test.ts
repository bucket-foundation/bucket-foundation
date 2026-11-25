import { test } from "node:test";
import assert from "node:assert/strict";
import { fromBilling, parseEvents, recordEvents, MAX_EVENTS } from "./events";

const V = "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12";
const env = { POLINGUAL_DB_URL: "https://db.test", POLINGUAL_DB_SERVICE_KEY: "svc" };
const ok = { origin: "https://www.polingual.com" };

function fake(status = 200, reply: unknown = 1) {
  const calls: { url: string; init: RequestInit }[] = [];
  const send = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(reply), { status });
  };
  return { calls, send };
}

test("parseEvents keeps known names, cleans tags and strips query strings", () => {
  const out = parseEvents({ visitor: V.toUpperCase(), events: [
    { name: "page_view", path: "/es?utm_source=x", utm_source: "Reddit!", utm_campaign: "beta", referrer: "https://www.reddit.com/r/polyglot", lang: "es" },
    { name: "drop_table" },
  ] });
  assert.deepEqual(out, [{ visitor: V, name: "page_view", path: "/es", utm_source: "reddit", utm_medium: null, utm_campaign: "beta", referrer_host: "www.reddit.com", lang: "es", detail: null }]);
});

test("parseEvents rejects a bad visitor id and caps the batch", () => {
  assert.equal(parseEvents({ visitor: "nope", events: [] }), null);
  assert.equal(parseEvents({ visitor: V, events: Array(50).fill({ name: "share" }) })!.length, MAX_EVENTS);
});

test("onboarding screens, the heard-about answer and day-0 cancels pass through", () => {
  const out = parseEvents({ visitor: V, events: [{ name: "onboarding_view", detail: "languages" }, { name: "heard_about", detail: "TikTok" }, { name: "trial_cancel_d0" }] }, true)!;
  assert.deepEqual(out.map((e) => [e.name, e.detail]), [["onboarding_view", "languages"], ["heard_about", "tiktok"], ["trial_cancel_d0", null]]);
});

test("the Android and iOS apps post without an origin; browsers still need one", async () => {
  const body = { visitor: V, events: [{ name: "onboarding_view", detail: "languages" }] };
  assert.equal((await recordEvents(body, env, fake().send, { client: "android" })).status, 200);
  assert.equal((await recordEvents(body, env, fake().send, { client: "ios" })).status, 200);
  assert.equal((await recordEvents(body, env, fake().send, { client: "desktop" })).status, 403);
  assert.equal((await recordEvents(body, env, fake().send, { client: "android", origin: "https://evil.example" })).status, 403);
});

test("recordEvents refuses other origins", async () => {
  const f = fake();
  const r = await recordEvents({ visitor: V, events: [{ name: "share" }] }, env, f.send, { origin: "https://evil.example" });
  assert.equal(r.status, 403);
  assert.equal(f.calls.length, 0);
});

test("recordEvents sends the batch and country to the database function", async () => {
  const f = fake(200, 1);
  const r = await recordEvents({ visitor: V, events: [{ name: "beta_signup", utm_source: "reddit" }] }, env, f.send, { ...ok, ip: "1.1.1.1", country: "US" });
  assert.equal(r.status, 200);
  assert.equal(r.body.stored, 1);
  assert.equal(f.calls[0].url, "https://db.test/rest/v1/rpc/record_polingual_web_events");
  const sent = JSON.parse(String(f.calls[0].init.body));
  assert.equal(sent.p_country, "us");
  assert.equal(sent.p_events[0].utm_source, "reddit");
});

test("recordEvents reports offline storage and database errors", async () => {
  assert.equal((await recordEvents({ visitor: V, events: [{ name: "share" }] }, {}, fake().send, { ...ok, ip: "2.2.2.2" })).status, 503);
  assert.equal((await recordEvents({ visitor: V, events: [{ name: "share" }] }, env, fake(500).send, { ...ok, ip: "3.3.3.3" })).status, 502);
});

test("trial_start, paid and day-0 cancels count only with the billing key", async () => {
  const body = { visitor: V, events: [{ name: "trial_start" }, { name: "paid" }, { name: "trial_cancel_d0" }, { name: "signup" }] };
  assert.deepEqual(parseEvents(body)!.map((e) => e.name), ["signup"]);
  const keyed = { ...env, POLINGUAL_FUNNEL_KEY: "k-123" };
  assert.equal(fromBilling(keyed, "k-123"), true);
  assert.equal(fromBilling(keyed, "k-124"), false);
  assert.equal(fromBilling(env, "k-123"), false);
  assert.equal(fromBilling(keyed, null), false);
  const f = fake();
  await recordEvents(body, keyed, f.send, { origin: "https://www.polingual.com", funnelKey: "k-123" });
  assert.deepEqual(JSON.parse(String(f.calls[0].init.body)).p_events.map((e: { name: string }) => e.name), ["trial_start", "paid", "trial_cancel_d0", "signup"]);
});
