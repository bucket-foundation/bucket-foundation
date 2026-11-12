import assert from "node:assert/strict";
import { test } from "node:test";
import { adConfig, adLayout, entitlementOf, adLive, adShows, adsOn, adsTxt, needsConsent, pubId, railSize, showsAds } from "./ads";

const CLIENT = "ca-pub-1234567890123456";

test("ads stay off until the flag is set", () => {
  assert.equal(adConfig({}).mode, "off");
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "nope" }).mode, "off");
  assert.equal(adsOn(adConfig({})), false);
  assert.equal(showsAds(adConfig({}), "signed-out"), false);
});

test("the flag without real AdSense ids shows placeholder boxes", () => {
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "placeholder" }).mode, "placeholder");
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "on" }).mode, "placeholder");
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "adsense" }).mode, "off");
  assert.equal(adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "adsense", NEXT_PUBLIC_ADSENSE_CLIENT: "pub-1" }).mode, "off");
  const ph = adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "placeholder", NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_ADSENSE_SLOT_RAIL: "1234567890" });
  assert.equal(adLive(ph, "rail"), false);
  assert.equal(adShows(ph, "banner"), true);
});

test("a placement goes live only with a client and its own slot id", () => {
  const on = adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "adsense-test", NEXT_PUBLIC_ADSENSE_CLIENT: CLIENT, NEXT_PUBLIC_ADSENSE_SLOT_RAIL: "1234567890", NEXT_PUBLIC_ADSENSE_SLOT_BANNER: "12x" });
  assert.equal(on.mode, "adsense-test");
  assert.equal(adLive(on, "rail"), true);
  assert.equal(adLive(on, "banner"), false);
  assert.equal(adLive(on, "results"), false);
  assert.equal(adShows(on, "rail"), true);
  assert.equal(adShows(on, "banner"), false);
});

test("subscribers, pending checks and failed checks see no ads", () => {
  const ph = adConfig({ NEXT_PUBLIC_POLINGUAL_ADS: "placeholder" });
  assert.equal(showsAds(ph, "subscriber"), false);
  assert.equal(showsAds(ph, "checking"), false);
  assert.equal(showsAds(ph, "signed-out"), true);
  assert.equal(showsAds(ph, "free"), true);
  assert.equal(showsAds(ph, "unknown"), false);
});

test("desktop widths get rails and phones get the banner", () => {
  assert.equal(adLayout(390), "phone");
  assert.equal(adLayout(999), "phone");
  assert.equal(adLayout(1024), "rail-160");
  assert.equal(adLayout(1359), "rail-160");
  assert.equal(adLayout(1440), "rail-300");
  assert.deepEqual(railSize("rail-160"), { width: 160, height: 600 });
  assert.deepEqual(railSize("rail-300"), { width: 300, height: 600 });
  assert.equal(railSize("phone"), null);
});

test("ads.txt needs a publisher id", () => {
  assert.equal(adsTxt(undefined), null);
  assert.equal(adsTxt(""), null);
  assert.equal(adsTxt("pub-12"), null);
  assert.equal(adsTxt("pub-1234567890123456; evil"), null);
  assert.equal(adsTxt("pub-1234567890123456"), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  assert.equal(pubId(" ca-pub-1234567890123456 "), "pub-1234567890123456");
});

test("consent is asked in the EEA, the UK and Switzerland", () => {
  for (const c of ["DE", "fr", "GB", "NO", "CH", "IS"]) assert.equal(needsConsent(c), true, c);
  for (const c of ["US", "BR", "JP", "", null, undefined]) assert.equal(needsConsent(c), false, String(c));
});

test("entitlement comes from the session and the access check", () => {
  assert.equal(entitlementOf(false, null), "signed-out");
  assert.equal(entitlementOf(true, { status: "open" }), "subscriber");
  assert.equal(entitlementOf(true, { status: "locked" }), "free");
  assert.equal(entitlementOf(true, { status: "unknown" }), "unknown");
  assert.equal(entitlementOf(true, null), "unknown");
});

test("/ads.txt serves the publisher line and 404s while the id is unset", async () => {
  const { GET } = await import("../../app/ads.txt/route");
  const prior = process.env.POLINGUAL_ADSENSE_PUB_ID;
  try {
    delete process.env.POLINGUAL_ADSENSE_PUB_ID;
    assert.equal(GET().status, 404);
    process.env.POLINGUAL_ADSENSE_PUB_ID = "pub-1234567890123456";
    const res = GET();
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /^text\/plain/);
    assert.equal(await res.text(), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  } finally {
    if (prior === undefined) delete process.env.POLINGUAL_ADSENSE_PUB_ID;
    else process.env.POLINGUAL_ADSENSE_PUB_ID = prior;
  }
});
