import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanUtm, conversionFromBody, metaEvent, pixelIds, sendConversions, sha256, tiktokEvent, type Conversion } from "./ads";

const conv: Conversion = { eventId: "abc12345-0000", email: " Ana@Example.com ", ip: "1.2.3.4", userAgent: "UA", url: "https://www.polingual.com/", utm: { utm_source: "meta" }, now: 1_700_000_000_000 };

test("email is hashed after trim and lowercase", () => {
  assert.equal(sha256(" Ana@Example.com "), sha256("ana@example.com"));
  assert.match(sha256("a"), /^[0-9a-f]{64}$/);
});

test("no conversion without consent or a valid event id", () => {
  assert.equal(conversionFromBody({ consent: false, event_id: "abc12345" }), null);
  assert.equal(conversionFromBody({ consent: true, event_id: "<x>" }), null);
  assert.equal(conversionFromBody({ consent: "true", event_id: "abc12345" }), null);
  assert.deepEqual(conversionFromBody({ consent: true, event_id: "abc12345", utm: { utm_source: "tt", bad: "x" } })?.utm, { utm_source: "tt" });
});

test("utm keeps only known keys and trims", () => {
  assert.deepEqual(cleanUtm({ utm_campaign: "  fall ", other: "x", utm_term: 5 }), { utm_campaign: "fall" });
});

test("meta and tiktok payloads share the browser event id and never carry the raw email", () => {
  const m = metaEvent(conv);
  const t = tiktokEvent("PIX123", conv);
  assert.equal(m.data[0].event_name, "Lead");
  assert.equal(m.data[0].event_id, conv.eventId);
  assert.equal(t.data[0].event_id, conv.eventId);
  assert.equal(m.data[0].event_time, 1_700_000_000);
  assert.ok(!JSON.stringify([m, t]).includes("example.com"));
});

test("sends nothing until both id and token are set", async () => {
  const calls: string[] = [];
  const send = async (url: string) => (calls.push(url), new Response("{}"));
  assert.deepEqual(await sendConversions({ META_PIXEL_ID: "123456" }, conv, send), []);
  assert.equal(calls.length, 0);
  const ok = await sendConversions({ META_PIXEL_ID: "123456", META_CAPI_TOKEN: "t", TIKTOK_PIXEL_ID: "ABCDEF", TIKTOK_EVENTS_TOKEN: "u" }, conv, send);
  assert.deepEqual(ok, ["meta", "tiktok"]);
  assert.match(calls[0], /graph\.facebook\.com\/v21\.0\/123456\/events/);
  assert.match(calls[1], /business-api\.tiktok\.com/);
});

test("a failing provider does not throw", async () => {
  const send = async (url: string) => (url.includes("facebook") ? new Response("{}", { status: 400 }) : Promise.reject(new Error("down")));
  assert.deepEqual(await sendConversions({ META_PIXEL_ID: "123456", META_CAPI_TOKEN: "t", TIKTOK_PIXEL_ID: "ABCDEF", TIKTOK_EVENTS_TOKEN: "u" }, conv, send), []);
});

test("pixel ids must look like ids", () => {
  assert.deepEqual(pixelIds({ META_PIXEL_ID: "1234567890", TIKTOK_PIXEL_ID: "x'); alert(1)//" }), { meta: "1234567890", tiktok: null });
  assert.deepEqual(pixelIds({}), { meta: null, tiktok: null });
});

test("static pages load the consent script and the modal reports the browser event", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const d8 = join(__dirname, "../../public/d8");
  for (const page of ["index.html", "es.html"]) assert.match(readFileSync(join(d8, page), "utf8"), /<script src="\/d8\/ads\.js"><\/script>/);
  const ads = readFileSync(join(d8, "ads.js"), "utf8");
  assert.match(ads, /if\(!j\|\|!\(j\.meta\|\|j\.tiktok\)\)return/);
  assert.match(ads, /if\(get\(\)!=="granted"\)return\{consent:false\}/);
  const beta = readFileSync(join(d8, "beta.js"), "utf8");
  assert.match(beta, /\.\.\.ex,/);
  assert.match(beta, /plAds\.lead\(ex\.event_id\)/);
});
