import test from "node:test";
import assert from "node:assert/strict";
import { BETA_JOIN_URL, TESTFLIGHT_OPEN_URL, appSiteAssociation, appleBanner, betaSteps, ogParams, ogPath, parseForms, sharePath, shareView } from "../src/lib/share/links";

test("a word link renders the gloss and each form with its language", () => {
  const v = shareView("w", { id: "night", g: "night", f: "fr:nuit|es:noche|de:Nacht" });
  assert.equal(v.title, "night");
  assert.deepEqual(v.forms.map((f) => f.lang), ["fr", "es", "de"]);
  assert.match(v.description, /French: nuit/);
});

test("a language set link names the languages and the streak", () => {
  const v = shareView("l", { l: "fr.es.it", r: "en", s: "12" });
  assert.equal(v.title, "Learning French, Spanish, Italian together");
  assert.equal(v.eyebrow, "12 day streak");
});

test("a single tile and a single language read in the singular", () => {
  assert.equal(shareView("w", { g: "night", f: "es:noche" }).eyebrow, "A word in Spanish");
  const v = shareView("l", { l: "es", r: "en" });
  assert.equal(v.title, "Learning Spanish");
  assert.equal(v.eyebrow, "A language on Bucket");
});

test("a score link names the source and the count", () => {
  const v = shareView("x", { t: "Match", p: "9", m: "12", l: "fr.es", r: "en", s: "4" });
  assert.equal(v.kind, "x");
  assert.equal(v.eyebrow, "Match score");
  assert.equal(v.title, "9 of 12 right");
  assert.deepEqual(v.langs, ["fr", "es"]);
  assert.match(sharePath("x", { t: "Match", p: "9", m: "12" }), /^\/s\/x\?t=Match&p=9&m=12$/);
});

test("a score link without a total falls back to the app card", () => {
  assert.equal(shareView("x", { t: "Match", p: "9" }).title, "Learn every subject and language together");
});

test("a content link keeps the quote and the moment", () => {
  const v = shareView("c", { t: "Gravity", b: "Spanish Wikipedia", q: "La gravedad atrae.", at: "667" });
  assert.equal(v.title, "Gravity");
  assert.equal(v.eyebrow, "Spanish Wikipedia, play from 11:07");
  assert.equal(v.description, "La gravedad atrae.");
  assert.equal(shareView("c", { t: "Gravity" }).eyebrow, "Bucket");
  assert.match(sharePath("c", { t: "Gravity", at: "667" }), /at=667/);
  assert.equal(shareView("c", { b: "x" }).title, "Learn every subject and language together");
});

test("broken or unknown links fall back to the app card", () => {
  assert.equal(shareView("w", { g: "night" }).title, "Learn every subject and language together");
  assert.equal(shareView("", {}).kind, "");
  assert.deepEqual(parseForms("nocolon|:x|fr:"), []);
});

test("share paths keep only known keys and cap their length", () => {
  const p = sharePath("a", { d: "physics", id: "f-ma", t: "Newton", evil: "<script>", q: "x".repeat(900) });
  assert.ok(!p.includes("evil"));
  assert.ok(p.length < 520);
  assert.ok(ogPath("w", { g: "night" }).startsWith("/api/share/og?k=w&g=night"));
});

test("the association file covers /s for the app and names the clip", () => {
  const a = appSiteAssociation();
  assert.deepEqual(a.applinks.details[0].appIDs, ["QQ6D6A2LLS.foundation.bucket.app"]);
  assert.deepEqual(a.appclips.apps, ["QQ6D6A2LLS.foundation.bucket.app.Clip"]);
  assert.match(appleBanner("https://www.bucket.foundation/s/w"), /app-clip-bundle-id=foundation\.bucket\.app\.Clip/);
});

test("a group invite link names the group and keeps the code", () => {
  const v = shareView("g", { c: "7k3m9q2xab", n: "The Rossis", k: "family" });
  assert.equal(v.kind, "g");
  assert.equal(v.title, "Join The Rossis on Bucket");
  assert.equal(v.eyebrow, "Family group");
  assert.equal(v.code, "7K3M9Q2XAB");
  assert.equal(shareView("g", { c: "7K3M9Q2XAB", n: "Climbers", k: "friends" }).eyebrow, "Friends group");
});

test("a group link without a valid code or name falls back to the app card", () => {
  assert.equal(shareView("g", { c: "SHORT", n: "Rossis" }).title, "Learn every subject and language together");
  assert.equal(shareView("g", { c: "7K3M9Q2XAU", n: "Rossis" }).code, "");
  assert.equal(shareView("g", { c: "7K3M9Q2XAB" }).code, "");
});

test("group share paths carry the code, name and kind, and the og image reads both kinds", () => {
  const params = { c: "7K3M9Q2XAB", n: "The Rossis", k: "family" };
  assert.equal(sharePath("g", params), "/s/g?c=7K3M9Q2XAB&n=The+Rossis&k=family");
  const og = new URL(ogPath("g", params), "https://x.test");
  const { kind, params: p } = ogParams(og.searchParams);
  assert.equal(kind, "g");
  assert.equal(p.k, "family");
  assert.equal(shareView(kind, p).title, "Join The Rossis on Bucket");
  const word = ogParams(new URL(ogPath("w", { g: "night", f: "fr:nuit" }), "https://x.test").searchParams);
  assert.equal(word.kind, "w");
  assert.equal(shareView(word.kind, word.params).title, "night");
});

test("the install steps start at the join link and offer the invite in TestFlight", () => {
  const steps = betaSteps(false);
  assert.deepEqual(steps.map((s) => s.href), [BETA_JOIN_URL, TESTFLIGHT_OPEN_URL]);
  assert.equal(TESTFLIGHT_OPEN_URL, "itms-beta://testflight.apple.com/join/HfeRBKr8");
  assert.match(steps[1].title, /asked for a code/);
});

test("an invite adds a last step to tap the link again", () => {
  const steps = betaSteps(true);
  assert.equal(steps.length, 3);
  assert.match(steps[2].title, /invite link again/);
  assert.equal(steps[2].href, undefined);
});
