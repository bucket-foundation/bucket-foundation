import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { footerLinks, giftFooterLink } from "../app/site";
import { siteLocale } from "../app/(site)/word/views";
import { GIFT_CLOSED, GIFT_LANGS, giftCopy, giftDay, giftError, giftMeta, giftPath, loadGiftStatus, redeemGift, startGiftCheckout } from "./gift";

type Call = { url: string; init: RequestInit };

function stub(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

const down = (async () => {
  throw new Error("offline");
}) as unknown as typeof fetch;

test("English and Spanish carry the same keys and their own words", () => {
  const en = giftCopy("en");
  const es = giftCopy("es");
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  assert.deepEqual(Object.keys(es.errors).sort(), Object.keys(en.errors).sort());
  for (const k of ["title", "lede", "buy", "soon", "redeemTitle", "terms"] as const) assert.notEqual(en[k], es[k], k);
  assert.equal(en.soon, "Gifts open soon");
  assert.equal(giftPath("en"), "/gift");
  assert.equal(giftPath("es", "/redeem"), "/es/gift/redeem");
});

test("no price is written into the page copy", () => {
  for (const lang of GIFT_LANGS) assert.doesNotMatch(JSON.stringify(giftCopy(lang)), /[$€£]\s?\d|\d+[.,]\d{2}/);
  assert.equal(giftCopy("en").price("$00 test"), "$00 test, paid once.");
});

test("the gift status stays closed unless the API says open with a price", async () => {
  assert.deepEqual(await loadGiftStatus(stub(200, { open: true, price: "$00 test" })), { open: true, price: "$00 test" });
  assert.deepEqual(await loadGiftStatus(stub(200, { open: true, price: null })), GIFT_CLOSED);
  assert.deepEqual(await loadGiftStatus(stub(200, { open: false, price: null })), GIFT_CLOSED);
  assert.deepEqual(await loadGiftStatus(stub(503, {})), GIFT_CLOSED);
  assert.deepEqual(await loadGiftStatus(down), GIFT_CLOSED);
});

test("checkout posts the form with the locale and returns the Stripe URL or a localized error", async () => {
  const calls: Call[] = [];
  const ok = await startGiftCheckout({ buyerEmail: "b@x.co" }, "es", stub(200, { url: "https://checkout.stripe.test/c/1" }, calls));
  assert.deepEqual(ok, { ok: true, value: "https://checkout.stripe.test/c/1" });
  assert.equal(calls[0].url, "/api/academy/gift/checkout");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { buyerEmail: "b@x.co", locale: "es" });
  assert.deepEqual(await startGiftCheckout({}, "en", stub(400, { error: "bad_recipient_email" })), { ok: false, error: "Enter their email like name@example.com." });
  assert.deepEqual(await startGiftCheckout({}, "es", stub(503, { error: "gifts_unavailable" })), { ok: false, error: "Los regalos abren pronto." });
  assert.deepEqual(await startGiftCheckout({}, "en", stub(500, { error: "mystery" })), { ok: false, error: giftError("en", undefined) });
  assert.deepEqual(await startGiftCheckout({}, "en", down), { ok: false, error: "No connection. Check your network and try again." });
});

test("redeem sends the bearer token and maps each outcome", async () => {
  const calls: Call[] = [];
  assert.deepEqual(await redeemGift("ABCD", "tok", "en", stub(200, { outcome: "redeemed", until: "2027-12-01T15:00:00.000Z" }, calls)), { ok: true, value: "2027-12-01T15:00:00.000Z" });
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer tok");
  assert.equal(calls[0].url, "/api/academy/gift/redeem");
  assert.deepEqual(await redeemGift("ABCD", null, "en", stub(200, {}, calls)), { ok: false, error: "Sign in first, then redeem." });
  assert.equal(calls.length, 1);
  assert.match((await redeemGift("x", "tok", "en", stub(409, { outcome: "used" })) as { error: string }).error, /already redeemed/);
  assert.match((await redeemGift("x", "tok", "es", stub(410, { outcome: "expired" })) as { error: string }).error, /venció/);
  assert.match((await redeemGift("x", "tok", "en", stub(400, { error: "bad_code" })) as { error: string }).error, /16 characters/);
  assert.match((await redeemGift("x", "tok", "en", stub(410, { outcome: "void" })) as { error: string }).error, /refunded/);
  assert.match((await redeemGift("x", "tok", "es", stub(429, { error: "too_many_requests" })) as { error: string }).error, /Demasiados/);
  assert.equal(giftDay("2027-12-01T15:00:00.000Z", "en"), "December 1, 2027");
  assert.equal(giftDay("2027-12-01T15:00:00.000Z", "es"), "1 de diciembre de 2027");
  assert.equal(giftDay(null, "en"), "");
});

test("both languages have a gift page and a redeem page with paired alternates", () => {
  const app = join(__dirname, "../app");
  for (const p of ["(site)/gift/page.tsx", "(site)/gift/redeem/page.tsx", "(intl)/[lang]/gift/page.tsx", "(intl)/[lang]/gift/redeem/page.tsx"]) assert.ok(existsSync(join(app, p)), p);
  const m = giftMeta("es", "");
  assert.equal(m.alternates?.canonical, "https://www.polingual.com/es/gift");
  assert.deepEqual(m.alternates?.languages, { en: "https://www.polingual.com/gift", es: "https://www.polingual.com/es/gift", "x-default": "https://www.polingual.com/gift" });
  assert.deepEqual(giftMeta("en", "/redeem").robots, { index: false, follow: true });
  const form = readFileSync(join(app, "(site)/gift/GiftForm.tsx"), "utf8");
  assert.match(form, /disabled=\{!status\.open \|\| busy\}/);
  assert.match(form, /!status\.open \? c\.soon/);
});

test("the footer shows Gift only while the gift price env var is set", () => {
  assert.equal(giftFooterLink("en", {}), null);
  assert.equal(giftFooterLink("en", { STRIPE_PRICE_POLINGUAL_GIFT_YEARLY: "  " }), null);
  const on = { STRIPE_PRICE_POLINGUAL_GIFT_YEARLY: "price_gift" };
  assert.deepEqual(giftFooterLink("en", on), { key: "gift", href: "/gift", label: "Gift" });
  assert.deepEqual(giftFooterLink("es", on), { key: "gift", href: "/es/gift", label: "Regalo" });
  assert.equal(giftFooterLink("fr", on)?.href, "/gift");
  const es = siteLocale("es");
  const off = footerLinks(es, {}).map((l) => l.key);
  assert.deepEqual(off, ["play", "words", "guides", "teachers", "privacy", "terms", "support", "appstore"]);
  assert.deepEqual(footerLinks(es, on).map((l) => l.key), ["play", "words", "guides", "teachers", "gift", "privacy", "terms", "support", "appstore"]);
  assert.equal(footerLinks(es, on).find((l) => l.key === "gift")?.href, "/es/gift");
});
