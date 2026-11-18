import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleWebhook } from "../src/lib/billing/polingual-checkout";
import {
  deliverDueGifts,
  formatGiftCode,
  giftCodeHash,
  giftConfig,
  giftForm,
  giftFromEvent,
  giftStatus,
  handleGiftCheckout,
  handleGiftEvent,
  handleRedeem,
  newGiftCode,
  normalizeGiftCode,
  parseGiftRequest,
  renderGiftEmail,
  renderReceipt,
  WindowLimiter,
  type GiftEmail,
  type GiftFulfilDeps,
  type GiftRow,
  type GiftStore,
  type RedeemOutcome,
} from "../src/lib/billing/polingual-gift";
import { sendGiftEmail } from "../src/lib/billing/gift-store";
import { withWebEntitlement } from "../src/lib/billing/web-entitlement";
import { NO_ENTITLEMENT } from "../src/lib/app-store/entitlement";
import { NextRequest } from "next/server";
import { handleEntitlement } from "../src/app/api/app-store/notifications/handler";

const NOW = Date.parse("2026-12-01T15:00:00Z");
const ENV = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_POLINGUAL_GIFT_YEARLY: "price_gift", STRIPE_WEBHOOK_SECRET: "whsec_x", POLINGUAL_GIFT_PRICE_DISPLAY: "$00.00 test", RESEND_API_KEY: "re_x", INVITE_POSTAL_ADDRESS: "1 Test Street, Testville" };
const BODY = { buyerEmail: "Buyer@Example.com", recipientEmail: "kid@example.com", recipientName: "Ana", note: "Feliz Navidad", deliverOn: "2026-12-25", locale: "es" };
const POSTAL = "1 Test Street, Testville";
const sign = (payload: string, secret: string, t: number) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

function event(over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}, id = "evt_1") {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        mode: "payment",
        payment_status: "paid",
        customer_email: "buyer@example.com",
        amount_total: 1234,
        currency: "usd",
        metadata: { product: "polingual_gift", recipient_email: "kid@example.com", recipient_name: "Ana", deliver_on: "2026-12-25", locale: "en", note: "Enjoy <b>it</b>", ...meta },
        ...over,
      },
    },
  };
}

function memoryStore() {
  const rows: (GiftRow & { codeHash: string; redeemedBy: string | null })[] = [];
  const access = new Map<string, string>();
  const subscribers = new Set<string>();
  const store: GiftStore = {
    record: async (p, code, expiresAt) => {
      const have = rows.find((r) => r.sessionId === p.sessionId);
      if (have) return { ...have };
      const row = { ...p, id: `gift_${rows.length + 1}`, code, codeHash: giftCodeHash(code), expiresAt, receiptSentAt: null, deliveredAt: null, redeemedAt: null, redeemedBy: null };
      rows.push(row);
      return { ...row };
    },
    markReceipt: async (id, at) => void (rows.find((r) => r.id === id)!.receiptSentAt = at),
    markDelivered: async (id, at) => void (rows.find((r) => r.id === id)!.deliveredAt = at),
    due: async (day, limit) => rows.filter((r) => !r.deliveredAt && !r.redeemedAt && r.code && r.deliverOn <= day).slice(0, limit).map((r) => ({ ...r })),
    redeem: async (codeHash, userId, at) => {
      const g = rows.find((r) => r.codeHash === codeHash);
      const out = (outcome: RedeemOutcome, until: string | null = null) => ({ outcome, until });
      if (!g) return out("invalid");
      if (g.redeemedAt) return g.redeemedBy === userId ? out("already", access.get(userId) ?? null) : out("used");
      if (g.expiresAt <= at) return out("expired");
      if (subscribers.has(userId)) return out("subscribed");
      const base = Math.max(Date.parse(access.get(userId) ?? at), Date.parse(at));
      const until = new Date(new Date(base).setUTCFullYear(new Date(base).getUTCFullYear() + 1)).toISOString();
      access.set(userId, until);
      Object.assign(g, { redeemedAt: at, redeemedBy: userId, code: null });
      return out("redeemed", until);
    },
  };
  return { rows, store, subscribers };
}

function fulfil(now = NOW, ok: (e: GiftEmail) => boolean = () => true) {
  const mem = memoryStore();
  const sent: { email: GiftEmail; key: string }[] = [];
  const clock = { now };
  let n = 0;
  const deps: GiftFulfilDeps = {
    store: () => mem.store,
    site: () => "https://www.polingual.com",
    postalAddress: () => POSTAL,
    send: async (email, key) => {
      if (!ok(email)) return false;
      sent.push({ email, key });
      return true;
    },
    now: () => clock.now,
    code: () => ["ABCDEFGHJKMNPQRS", "TUVWXYZ23456789A"][n++ % 2],
  };
  return { ...mem, sent, deps, clock };
}

test("gifts stay closed until every env var and the store exist, and the price comes from config", () => {
  assert.deepEqual(giftStatus({}, true), { open: false, price: null });
  for (const k of Object.keys(ENV)) assert.deepEqual(giftStatus({ ...ENV, [k]: "" }, true), { open: false, price: null }, k);
  assert.deepEqual(giftStatus(ENV, false), { open: false, price: null });
  assert.deepEqual(giftStatus(ENV, true), { open: true, price: "$00.00 test" });
  assert.equal(giftConfig({ ...ENV, POLINGUAL_SITE_URL: "https://example.test/" })?.site, "https://example.test");
});

test("parseGiftRequest validates emails, name, note, date and locale", () => {
  const ok = parseGiftRequest(BODY, NOW);
  assert.deepEqual(ok, { ok: true, req: { buyerEmail: "buyer@example.com", recipientEmail: "kid@example.com", recipientName: "Ana", note: "Feliz Navidad", deliverOn: "2026-12-25", locale: "es" } });
  const err = (over: Record<string, unknown>) => (parseGiftRequest({ ...BODY, ...over }, NOW) as { error?: string }).error;
  assert.equal(err({ buyerEmail: "nope" }), "bad_buyer_email");
  assert.equal(err({ recipientEmail: "a@b" }), "bad_recipient_email");
  assert.equal(err({ recipientName: "  " }), "bad_recipient_name");
  assert.equal(err({ recipientName: "x".repeat(81) }), "bad_recipient_name");
  assert.equal(err({ note: "x".repeat(301) }), "bad_note");
  assert.equal(err({ deliverOn: "2026-02-30" }), "bad_delivery_date");
  assert.equal(err({ deliverOn: "2026-11-01" }), "bad_delivery_date");
  assert.equal(err({ deliverOn: "2028-01-01" }), "bad_delivery_date");
  assert.equal(err({ locale: "fr" }), "bad_locale");
  const today = parseGiftRequest({ ...BODY, deliverOn: "", note: "", locale: undefined }, NOW);
  assert.ok(today.ok && today.req.deliverOn === "2026-12-01" && today.req.note === null && today.req.locale === "en");
  const yesterday = parseGiftRequest({ ...BODY, deliverOn: "2026-11-30" }, NOW);
  assert.ok(yesterday.ok && yesterday.req.deliverOn === "2026-12-01");
});

test("checkout builds a one-time payment session with the gift in metadata", async () => {
  const cfg = giftConfig(ENV)!;
  const parsed = parseGiftRequest(BODY, NOW);
  assert.ok(parsed.ok);
  if (!parsed.ok) return;
  const f = giftForm(cfg, parsed.req);
  assert.equal(f.get("mode"), "payment");
  assert.equal(f.get("line_items[0][price]"), "price_gift");
  assert.equal(f.get("customer_email"), "buyer@example.com");
  assert.equal(f.get("success_url"), "https://www.polingual.com/es/gift?paid=1");
  assert.equal(f.get("cancel_url"), "https://www.polingual.com/es/gift");
  assert.deepEqual([f.get("metadata[product]"), f.get("metadata[recipient_email]"), f.get("metadata[recipient_name]"), f.get("metadata[deliver_on]"), f.get("metadata[locale]"), f.get("metadata[note]")], ["polingual_gift", "kid@example.com", "Ana", "2026-12-25", "es", "Feliz Navidad"]);
  assert.equal(f.has("subscription_data[metadata][product]"), false);
  const forms: URLSearchParams[] = [];
  const deps = { config: () => giftConfig(ENV), ready: () => true, now: () => NOW, allow: () => true, createSession: async (_c: unknown, form: URLSearchParams) => (forms.push(form), { url: "https://checkout.stripe.test/c/1", id: "cs_1" }) };
  assert.deepEqual(await handleGiftCheckout(deps, BODY), { status: 200, body: { url: "https://checkout.stripe.test/c/1", id: "cs_1" } });
  assert.equal(forms.length, 1);
  assert.equal((await handleGiftCheckout({ ...deps, config: () => null }, BODY)).status, 503);
  assert.equal((await handleGiftCheckout({ ...deps, ready: () => false }, BODY)).status, 503);
  assert.equal((await handleGiftCheckout({ ...deps, allow: () => false }, BODY)).status, 429);
  assert.equal((await handleGiftCheckout(deps, { ...BODY, buyerEmail: "" })).status, 400);
  assert.equal((await handleGiftCheckout({ ...deps, createSession: async () => ({ url: null, id: null }) }, BODY)).status, 502);
  assert.equal(forms.length, 1);
});

test("the limiter allows a fixed count per window", () => {
  const l = new WindowLimiter(2, 1000);
  assert.deepEqual([l.take("a", 0), l.take("a", 1), l.take("a", 2), l.take("b", 2), l.take("a", 1001)], [true, true, false, true, true]);
});

test("giftFromEvent reads a paid gift session and ignores the rest", () => {
  const g = giftFromEvent(event(), NOW);
  assert.deepEqual(g && [g.eventId, g.sessionId, g.buyerEmail, g.recipientEmail, g.deliverOn, g.locale, g.amountTotal, g.currency], ["evt_1", "cs_1", "buyer@example.com", "kid@example.com", "2026-12-25", "en", 1234, "usd"]);
  assert.equal(giftFromEvent(event({ payment_status: "unpaid" }), NOW), null);
  assert.equal(giftFromEvent(event({ mode: "subscription" }), NOW), null);
  assert.equal(giftFromEvent(event({}, { product: "polingual" }), NOW), null);
  assert.equal(giftFromEvent(event({}, { recipient_email: "x" }), NOW), null);
  assert.equal(giftFromEvent(event({ customer_email: null, customer_details: { email: "d@example.com" } }), NOW)?.buyerEmail, "d@example.com");
  assert.equal(giftFromEvent(event({}, { deliver_on: "garbage" }), NOW)?.deliverOn, "2026-12-01");
});

test("the webhook checks the signature before a gift is recorded", async () => {
  const f = fulfil();
  const payload = JSON.stringify(event());
  const t = Math.floor(NOW / 1000);
  const deps = { secret: () => "whsec_x", now: () => NOW, record: async () => true, gift: (e: unknown) => handleGiftEvent(f.deps, e) };
  assert.equal((await handleWebhook(deps, payload, sign(payload, "wrong", t))).status, 400);
  assert.equal((await handleWebhook(deps, payload, sign(payload, "whsec_x", t - 1000))).status, 400);
  assert.equal((await handleWebhook(deps, payload, null)).status, 400);
  assert.equal(f.rows.length, 0);
  assert.equal((await handleWebhook({ ...deps, secret: () => null }, payload, sign(payload, "whsec_x", t))).status, 503);
  const ok = await handleWebhook(deps, payload, sign(payload, "whsec_x", t));
  assert.deepEqual(ok, { status: 200, body: { received: true, gift: "gift_1" } });
  assert.equal(f.rows.length, 1);
});

test("a repeated event records one gift and sends one receipt", async () => {
  const f = fulfil();
  for (const id of ["evt_1", "evt_1", "evt_retry"]) assert.equal((await handleGiftEvent(f.deps, event({}, {}, id)))?.status, 200);
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].code, "ABCDEFGHJKMNPQRS");
  assert.equal(f.rows[0].expiresAt, "2027-12-25T00:00:00.000Z");
  assert.deepEqual(f.sent.map((s) => s.key), ["polingual-gift/receipt/gift_1"]);
  assert.equal(f.sent[0].email.to, "buyer@example.com");
  assert.equal(await handleGiftEvent(f.deps, { type: "customer.subscription.updated", data: { object: {} } }), null);
  assert.deepEqual((await handleGiftEvent(f.deps, event({ payment_status: "unpaid" })))?.body, { received: true, ignored: true });
});

test("a failed receipt returns 500 and the retry finishes the job", async () => {
  let up = false;
  const f = fulfil(NOW, () => up);
  assert.deepEqual(await handleGiftEvent(f.deps, event()), { status: 500, body: { error: "receipt_failed" } });
  assert.equal(f.rows.length, 1);
  up = true;
  assert.equal((await handleGiftEvent(f.deps, event()))?.status, 200);
  assert.equal(f.sent.length, 1);
  assert.ok(f.rows[0].receiptSentAt);
  assert.equal((await handleGiftEvent({ ...f.deps, store: () => null }, event()))?.status, 503);
});

test("a gift dated today goes out with the receipt, a later one waits for the delivery run", async () => {
  const today = fulfil();
  await handleGiftEvent(today.deps, event({}, { deliver_on: "2026-12-01" }));
  assert.deepEqual(today.sent.map((s) => s.email.to), ["buyer@example.com", "kid@example.com"]);
  assert.ok(today.rows[0].deliveredAt);

  const later = fulfil();
  await handleGiftEvent(later.deps, event());
  assert.deepEqual(await deliverDueGifts(later.deps), { due: 0, sent: 0, failed: 0 });
  later.clock.now = Date.parse("2026-12-25T13:05:00Z");
  assert.deepEqual(await deliverDueGifts(later.deps), { due: 1, sent: 1, failed: 0 });
  assert.deepEqual(later.sent.map((s) => s.key), ["polingual-gift/receipt/gift_1", "polingual-gift/deliver/gift_1"]);
  assert.deepEqual(await deliverDueGifts(later.deps), { due: 0, sent: 0, failed: 0 });
  assert.equal(await deliverDueGifts({ ...later.deps, postalAddress: () => null }), null);

  const down = fulfil(NOW, (e) => e.to !== "kid@example.com");
  await handleGiftEvent(down.deps, event());
  down.clock.now = Date.parse("2026-12-26T13:05:00Z");
  assert.deepEqual(await deliverDueGifts(down.deps), { due: 1, sent: 0, failed: 1 });
  assert.equal(down.rows[0].deliveredAt, null);
});

test("codes are 16 unambiguous characters and normalize from what people type", () => {
  const code = newGiftCode();
  assert.match(code, /^[A-HJKMNP-Z2-9]{16}$/);
  assert.notEqual(code, newGiftCode());
  assert.equal(newGiftCode(() => new Uint8Array(32).fill(255).map((v, i) => (i < 8 ? 255 : i))).length, 16);
  assert.equal(formatGiftCode("ABCDEFGHJKMNPQRS"), "ABCD-EFGH-JKMN-PQRS");
  assert.equal(normalizeGiftCode(" abcd-efgh jkmn-pqrs "), "ABCDEFGHJKMNPQRS");
  assert.equal(normalizeGiftCode("ABCD-EFGH"), null);
  assert.equal(normalizeGiftCode("ABCDEFGHIJKLMNOP"), null);
  assert.equal(normalizeGiftCode(42), null);
  assert.match(giftCodeHash(code), /^[0-9a-f]{64}$/);
});

test("a code redeems once, expires, and needs a signed-in user", async () => {
  const f = fulfil();
  await handleGiftEvent(f.deps, event());
  await handleGiftEvent(f.deps, event({ id: "cs_2" }, { deliver_on: "2026-12-02" }, "evt_2"));
  const redeem = (code: unknown, user: string | null, now = NOW) => handleRedeem({ store: () => f.store, userId: async () => user, now: () => now }, { code });
  assert.equal((await redeem("ABCD-EFGH-JKMN-PQRS", null)).status, 401);
  assert.equal((await redeem("nope", "u1")).status, 400);
  assert.deepEqual(await redeem("2222-2222-2222-2222", "u1"), { status: 404, body: { outcome: "invalid", until: null } });
  assert.deepEqual(await redeem("abcd-efgh-jkmn-pqrs", "u1"), { status: 200, body: { outcome: "redeemed", until: "2027-12-01T15:00:00.000Z" } });
  assert.equal(f.rows[0].code, null);
  assert.deepEqual((await redeem("ABCDEFGHJKMNPQRS", "u1")).body.outcome, "already");
  assert.deepEqual(await redeem("ABCDEFGHJKMNPQRS", "u2"), { status: 409, body: { outcome: "used", until: null } });
  assert.deepEqual(await redeem("TUVW-XYZ2-3456-789A", "u2", Date.parse("2027-12-02T00:00:00Z")), { status: 410, body: { outcome: "expired", until: null } });
  f.subscribers.add("u3");
  assert.equal((await redeem("TUVW-XYZ2-3456-789A", "u3")).status, 409);
  assert.ok(f.rows[1].code);
  assert.deepEqual((await redeem("TUVW-XYZ2-3456-789A", "u1")).body, { outcome: "redeemed", until: "2028-12-01T15:00:00.000Z" });
  assert.equal((await handleRedeem({ store: () => null, userId: async () => "u1", now: () => NOW }, { code: "x" })).status, 503);
  assert.deepEqual(await deliverDueGifts({ ...f.deps, now: () => Date.parse("2026-12-30T00:00:00Z") }), { due: 0, sent: 0, failed: 0 });
});

function row(over: Partial<GiftRow> = {}): GiftRow {
  return { id: "gift_1", eventId: "evt_1", sessionId: "cs_1", buyerEmail: "buyer@example.com", recipientEmail: "kid@example.com", recipientName: "Ana <3", note: "Enjoy <b>it</b>", deliverOn: "2026-12-25", locale: "en", amountTotal: 1234, currency: "usd", code: "ABCDEFGHJKMNPQRS", expiresAt: "2027-12-25T00:00:00.000Z", receiptSentAt: null, deliveredAt: null, redeemedAt: null, ...over };
}

test("the receipt names the recipient, the amount Stripe charged, the delivery date and the postal footer", () => {
  const r = renderReceipt(row(), POSTAL);
  assert.equal(r.to, "buyer@example.com");
  assert.equal(r.subject, "Your Polingual gift for Ana <3");
  assert.match(r.text, /You paid \$12\.34\./);
  assert.match(r.text, /kid@example\.com on December 25, 2026/);
  assert.match(r.text, /Polingual, AGFarms LLC\n1 Test Street, Testville/);
  assert.match(r.html, /Ana &lt;3/);
  assert.doesNotMatch(r.html, /Ana <3/);
  assert.doesNotMatch(r.text + r.html, /ABCD/);
  assert.doesNotMatch(renderReceipt(row({ amountTotal: null }), POSTAL).text, /You paid/);
  const es = renderReceipt(row({ locale: "es" }), POSTAL);
  assert.match(es.subject, /^Tu regalo de Polingual/);
  assert.match(es.text, /25 de diciembre de 2026/);
});

test("the gift email carries the code, the redeem link, the note, the deadline and the postal footer", () => {
  const g = renderGiftEmail(row(), "https://www.polingual.com", POSTAL);
  assert.equal(g.to, "kid@example.com");
  assert.match(g.text, /Your gift code: ABCD-EFGH-JKMN-PQRS/);
  assert.match(g.text, /https:\/\/www\.polingual\.com\/gift\/redeem\?code=ABCD-EFGH-JKMN-PQRS/);
  assert.match(g.text, /Redeem by December 25, 2027\./);
  assert.match(g.text, /privacy@polingual\.com/);
  assert.match(g.text, /1 Test Street, Testville/);
  assert.match(g.html, /Enjoy &lt;b&gt;it&lt;\/b&gt;/);
  assert.doesNotMatch(g.html, /<b>it<\/b>/);
  assert.match(g.html, /href="https:\/\/www\.polingual\.com\/gift\/redeem\?code=ABCD-EFGH-JKMN-PQRS"/);
  assert.doesNotMatch(renderGiftEmail(row({ note: null }), "https://www.polingual.com", POSTAL).text, /Their note/);
  const es = renderGiftEmail(row({ locale: "es" }), "https://www.polingual.com", POSTAL);
  assert.match(es.text, /https:\/\/www\.polingual\.com\/es\/gift\/redeem\?code=/);
  assert.match(es.text, /Tu código de regalo: ABCD-EFGH-JKMN-PQRS/);
  assert.throws(() => renderGiftEmail(row({ code: null }), "https://www.polingual.com", POSTAL));
});

test("sendGiftEmail posts to the mail API with an idempotency key and reports failure", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => (calls.push({ url, init }), new Response("{}", { status: 200 }))) as unknown as typeof fetch;
  const cfg = { apiKey: "re_x", from: "Polingual <hello@example.test>", postalAddress: POSTAL };
  assert.equal(await sendGiftEmail(cfg, renderReceipt(row(), POSTAL), "polingual-gift/receipt/gift_1", fetcher), true);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers["idempotency-key"], "polingual-gift/receipt/gift_1");
  assert.deepEqual(JSON.parse(calls[0].init.body as string).to, ["buyer@example.com"]);
  assert.equal(await sendGiftEmail(cfg, renderReceipt(row(), POSTAL), "k", (async () => new Response("", { status: 500 })) as unknown as typeof fetch), false);
  assert.equal(await sendGiftEmail(cfg, renderReceipt(row(), POSTAL), "k", (async () => { throw new Error("down"); }) as unknown as typeof fetch), false);
});

test("a redeemed gift opens the entitlement the web app reads, until it ends", () => {
  const gift = { status: "active", plan: "gift_yearly", current_period_end: "2027-12-01T15:00:00.000Z" };
  assert.deepEqual(withWebEntitlement(NO_ENTITLEMENT, gift, NOW), { active: true, productId: "web.polingual.gift.yearly", expiresAt: "2027-12-01T15:00:00.000Z", trial: false });
  assert.equal(withWebEntitlement(NO_ENTITLEMENT, gift, Date.parse("2027-12-02T00:00:00Z")).active, false);
  assert.equal(withWebEntitlement(NO_ENTITLEMENT, { ...gift, status: "canceled" }, NOW).active, false);
  assert.equal(withWebEntitlement(NO_ENTITLEMENT, null, NOW).active, false);
  assert.equal(withWebEntitlement(NO_ENTITLEMENT, undefined, NOW).active, false);
  const apple = { active: true, productId: "com.polingual.yearly", expiresAt: null, trial: false };
  assert.equal(withWebEntitlement(apple, gift, NOW), apple);
  assert.equal(withWebEntitlement(NO_ENTITLEMENT, { status: "active", plan: "yearly", current_period_end: null }, NOW).productId, "web.polingual.yearly");
});

test("the entitlement route falls back to the web row and survives a failed read", async () => {
  const store = { save: async () => "recorded" as const, tokenFor: async () => "t", since: async () => [], eventsFor: async () => [] };
  const verifyUser = async () => ({ id: "u1", email: null });
  const req = () => new NextRequest("http://localhost/api/academy/entitlement");
  const gift = { status: "active", plan: "gift_yearly", current_period_end: "2027-12-01T15:00:00.000Z" };
  const asked: string[] = [];
  const open = await handleEntitlement(req(), { store: () => store, verifyUser, now: () => NOW, web: async (u) => (asked.push(u), gift) });
  assert.deepEqual(await open.json(), { active: true, productId: "web.polingual.gift.yearly", expiresAt: "2027-12-01T15:00:00.000Z", trial: false });
  assert.deepEqual(asked, ["u1"]);
  const failed = await handleEntitlement(req(), { store: () => store, verifyUser, now: () => NOW, web: async () => { throw new Error("no table yet"); } });
  assert.deepEqual([failed.status, (await failed.json()).active], [200, false]);
  const none = await handleEntitlement(req(), { store: () => store, verifyUser, now: () => NOW });
  assert.equal((await none.json()).active, false);
});
