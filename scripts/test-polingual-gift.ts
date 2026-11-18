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
  priceMatches,
  voidFromEvent,
  deliverAfter,
  GIFT_WEBHOOK_EVENTS,
  newGiftCode,
  normalizeGiftCode,
  parseGiftRequest,
  renderGiftEmail,
  renderReceipt,
  type GiftEmail,
  type GiftFulfilDeps,
  type GiftRow,
  type GiftStore,
  type RedeemOutcome,
  type LineItem,
  type VoidReason,
  type PaymentState,
  attentionFromEvent,
  reconcileGifts,
  paymentStateFrom,
} from "../src/lib/billing/polingual-gift";
import { fetchIsGiftPayment, fetchLineItems, fetchPaidGiftSessions, fetchPaymentState, sendGiftEmail } from "../src/lib/billing/gift-store";
import { layeredLimiter } from "../src/lib/capture/handler";
import { rateLimiter } from "../src/lib/download/handler";
import { sharedRateLimiter, type MarkStore } from "../src/lib/download/marks";
import { withWebEntitlement } from "../src/lib/billing/web-entitlement";
import { NO_ENTITLEMENT } from "../src/lib/app-store/entitlement";
import { NextRequest } from "next/server";
import { handleEntitlement } from "../src/app/api/app-store/notifications/handler";

const NOW = Date.parse("2026-12-01T15:00:00Z");
const PAID = Math.floor(NOW / 1000);
const ENV = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_POLINGUAL_GIFT_YEARLY: "price_gift", STRIPE_WEBHOOK_SECRET: "whsec_x", POLINGUAL_GIFT_PRICE_DISPLAY: "$00.00 test", RESEND_API_KEY: "re_x", INVITE_POSTAL_ADDRESS: "1 Test Street, Testville" };
const BODY = { buyerEmail: "Buyer@Example.com", recipientEmail: "kid@example.com", recipientName: "Ana", note: "Feliz Navidad", deliverOn: "2026-12-25", locale: "es" };
const POSTAL = "1 Test Street, Testville";
const ITEM: LineItem = { priceId: "price_gift", quantity: 1, unitAmount: 1234, currency: "usd" };
const HOUR = 3_600_000;
const sign = (payload: string, secret: string, t: number) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
const open = async () => false;

function event(over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}, id = "evt_1", type = "checkout.session.completed") {
  return {
    id,
    type,
    created: PAID,
    data: {
      object: {
        id: "cs_1",
        mode: "payment",
        payment_status: "paid",
        payment_intent: "pi_1",
        customer_email: "buyer@example.com",
        amount_subtotal: 1234,
        amount_total: 1234,
        currency: "usd",
        metadata: { product: "polingual_gift", recipient_email: "kid@example.com", recipient_name: "Ana", deliver_on: "2026-12-25", locale: "en", note: "Enjoy <b>it</b>", ...meta },
        ...over,
      },
    },
  };
}

const charge = (type: string, over: Record<string, unknown> = {}) => ({ id: `evt_${type}`, type, created: PAID, data: { object: { payment_intent: "pi_1", refunded: true, ...(type === "charge.refunded" ? { metadata: { product: "polingual_gift" } } : {}), ...over } } });

type Grant = { until: string; active: boolean; source: "gift" | "stripe" };

function memoryStore() {
  const rows: (GiftRow & { codeHash: string | null; redeemedBy: string | null; purgedAt: string | null })[] = [];
  const access = new Map<string, Grant>();
  const voids = new Map<string, { reason: VoidReason; at: string }>();
  const year = (iso: string, n: number) => {
    const d = new Date(iso);
    d.setUTCFullYear(d.getUTCFullYear() + n);
    return d.toISOString();
  };
  const store: GiftStore = {
    record: async (p, expiresAt, after, voidReason) => {
      const have = rows.find((r) => r.sessionId === p.sessionId);
      if (have) return { ...have };
      const held = voids.get(p.paymentIntent);
      const reason = voidReason ?? held?.reason ?? null;
      const row = { ...p, id: `gift_${rows.length + 1}`, codeHash: null, expiresAt, deliverAfter: after, receiptSentAt: null, deliveredAt: null, redeemedAt: null, redeemedBy: null, voidedAt: reason ? (held?.at ?? p.paidAt) : null, voidReason: reason, attentionReason: null, purgedAt: null };
      rows.push(row);
      return { ...row };
    },
    recordAttention: async (a) => {
      const have = rows.find((r) => r.sessionId === a.sessionId);
      if (have) return { ...have };
      const { reason, ...rest } = a;
      const row = { ...rest, id: `gift_${rows.length + 1}`, codeHash: null, expiresAt: a.paidAt, deliverAfter: a.paidAt, receiptSentAt: null, deliveredAt: null, redeemedAt: null, redeemedBy: null, voidedAt: null, voidReason: null, attentionReason: reason, purgedAt: null };
      rows.push(row);
      return { ...row };
    },
    knownSessions: async (ids) => rows.filter((r) => ids.includes(r.sessionId)).map((r) => r.sessionId),
    setCodeHash: async (id, hash) => void (rows.find((r) => r.id === id)!.codeHash = hash),
    markReceipt: async (id, at) => void (rows.find((r) => r.id === id)!.receiptSentAt = at),
    markDelivered: async (id, at) => void (rows.find((r) => r.id === id)!.deliveredAt = at),
    due: async (at, limit) => rows.filter((r) => !r.deliveredAt && !r.redeemedAt && !r.voidedAt && !r.attentionReason && r.recipientEmail && r.deliverAfter <= at).slice(0, limit).map((r) => ({ ...r })),
    redeem: async (codeHash, userId, at) => {
      const g = rows.find((r) => r.codeHash === codeHash);
      const out = (outcome: RedeemOutcome, until: string | null = null) => ({ outcome, until });
      if (!g) return out("invalid");
      if (g.voidedAt) return out("void");
      const mine = access.get(userId);
      if (g.redeemedAt) return g.redeemedBy === userId ? out("already", mine?.until ?? null) : out("used");
      if (g.expiresAt <= at) return out("expired");
      if (mine?.source === "stripe" && mine.active) return out("subscribed");
      const base = mine?.active && mine.source === "gift" && mine.until > at ? mine.until : at;
      access.set(userId, { until: year(base, 1), active: true, source: "gift" });
      Object.assign(g, { redeemedAt: at, redeemedBy: userId });
      return out("redeemed", year(base, 1));
    },
    voidByPayment: async (pi, reason: VoidReason, at) => {
      if (!voids.has(pi)) voids.set(pi, { reason, at });
      const g = rows.find((r) => r.paymentIntent === pi);
      if (!g) return { outcome: "held", revoked: false };
      if (g.voidedAt) return { outcome: "already", revoked: false };
      Object.assign(g, { voidedAt: at, voidReason: reason });
      const mine = g.redeemedBy ? access.get(g.redeemedBy) : undefined;
      if (!g.redeemedBy || !mine || mine.source !== "gift") return { outcome: "voided", revoked: false };
      const end = year(mine.until, -1);
      access.set(g.redeemedBy, end <= at ? { until: at, active: false, source: "gift" } : { ...mine, until: end });
      return { outcome: "voided", revoked: true };
    },
    purge: async (cutoff, at) => {
      const old = rows.filter((r) => !r.purgedAt && ((r.redeemedAt ?? "9") <= cutoff || r.expiresAt <= cutoff || (r.voidedAt ?? "9") <= cutoff));
      for (const r of old) Object.assign(r, { recipientEmail: null, recipientName: null, note: null, purgedAt: at });
      return old.length;
    },
  };
  return { rows, store, access, voids };
}

function fulfil(now = NOW, ok: (e: GiftEmail) => boolean = () => true, items: LineItem[] | null = [ITEM], state: PaymentState | null = "clear") {
  const mem = memoryStore();
  const sent: { email: GiftEmail; key: string }[] = [];
  const clock = { now };
  const asked: string[] = [];
  const alerts: { subject: string; lines: string[]; key: string }[] = [];
  const stripe: { gift: boolean | null; paid: string[] | null } = { gift: true, paid: [] };
  let n = 0;
  const deps: GiftFulfilDeps = {
    store: () => mem.store,
    site: () => "https://www.polingual.com",
    postalAddress: () => POSTAL,
    price: () => "price_gift",
    lineItems: async (id) => (asked.push(id), items),
    paymentState: async (pi) => (asked.push(pi), state),
    isGiftPayment: async () => stripe.gift,
    paidSessions: async () => stripe.paid,
    alert: async (subject, lines, key) => (alerts.push({ subject, lines, key }), true),
    send: async (email, key) => {
      if (!ok(email)) return false;
      sent.push({ email, key });
      return true;
    },
    now: () => clock.now,
    code: () => ["ABCDEFGHJKMNPQRS", "TUVWXYZ23456789A", "MNPQRSTUVWXYZ234"][n++ % 3],
  };
  const redeem = (code: unknown, user: string | null, at = clock.now) => handleRedeem({ store: () => mem.store, userId: async () => user, limited: open, ip: "1.1.1.1", now: () => at }, { code });
  const codeOf = (i: number) => sent.filter((s) => s.key.includes("/deliver/"))[i].email.text.match(/[A-Z2-9]{4}(-[A-Z2-9]{4}){3}/)![0];
  return { ...mem, sent, deps, clock, asked, redeem, codeOf, alerts, stripe };
}

async function delivered(f: ReturnType<typeof fulfil>, ev: unknown = event({}, { deliver_on: "2026-12-01" })) {
  await handleGiftEvent(f.deps, ev);
  f.clock.now += HOUR + 60_000;
  await deliverDueGifts(f.deps);
}

test("gifts stay closed until every env var and the store exist, and the price comes from config", () => {
  assert.deepEqual(giftStatus({}, true), { open: false, price: null });
  for (const k of Object.keys(ENV)) assert.deepEqual(giftStatus({ ...ENV, [k]: "" }, true), { open: false, price: null }, k);
  assert.deepEqual(giftStatus(ENV, false), { open: false, price: null });
  assert.deepEqual(giftStatus(ENV, true), { open: true, price: "$00.00 test" });
  assert.equal(giftConfig({ ...ENV, POLINGUAL_SITE_URL: "https://example.test/" })?.site, "https://example.test");
  assert.deepEqual([...GIFT_WEBHOOK_EVENTS], ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "charge.refunded", "charge.dispute.created", "charge.dispute.funds_withdrawn"]);
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

test("checkout builds a one-time payment session and is limited per IP and per buyer", async () => {
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
  assert.equal(f.get("payment_intent_data[metadata][product]"), "polingual_gift");
  assert.deepEqual([f.get("metadata[product]"), f.get("metadata[recipient_email]"), f.get("metadata[recipient_name]"), f.get("metadata[deliver_on]"), f.get("metadata[locale]"), f.get("metadata[note]")], ["polingual_gift", "kid@example.com", "Ana", "2026-12-25", "es", "Feliz Navidad"]);
  const forms: URLSearchParams[] = [];
  const keys: string[][] = [];
  const deps = { config: () => giftConfig(ENV), ready: () => true, now: () => NOW, ip: "9.9.9.9", limited: async (k: string[]) => (keys.push(k), false), createSession: async (_c: unknown, form: URLSearchParams) => (forms.push(form), { url: "https://checkout.stripe.test/c/1", id: "cs_1" }) };
  assert.deepEqual(await handleGiftCheckout(deps, BODY), { status: 200, body: { url: "https://checkout.stripe.test/c/1", id: "cs_1" } });
  assert.deepEqual(keys[0], ["ip:9.9.9.9", "buyer:buyer@example.com"]);
  assert.equal((await handleGiftCheckout({ ...deps, config: () => null }, BODY)).status, 503);
  assert.equal((await handleGiftCheckout({ ...deps, ready: () => false }, BODY)).status, 503);
  assert.equal((await handleGiftCheckout({ ...deps, limited: async () => true }, BODY)).status, 429);
  assert.equal((await handleGiftCheckout(deps, { ...BODY, buyerEmail: "" })).status, 400);
  assert.deepEqual(keys[keys.length - 1], ["ip:9.9.9.9"]);
  assert.equal((await handleGiftCheckout({ ...deps, createSession: async () => ({ url: null, id: null }) }, BODY)).status, 502);
  assert.equal(forms.length, 1);
});

test("the shared limiter counts in the mark store other routes use", async () => {
  const counts = new Map<string, number>();
  const marks = { get: async (k: string) => counts.get(k) ?? null, set: async (k: string, v: number) => void counts.set(k, v) } as unknown as MarkStore;
  const fresh = () => layeredLimiter(rateLimiter(2, HOUR, () => NOW), sharedRateLimiter(marks, 2, HOUR, () => NOW));
  const one = fresh();
  assert.deepEqual([await one("gift-redeem:user:u1"), await one("gift-redeem:user:u1")], [false, false]);
  assert.equal(await fresh()("gift-redeem:user:u1"), true);
  assert.equal(await fresh()("gift-redeem:user:u2"), false);
});

test("giftFromEvent reads a paid gift session and ignores the rest", () => {
  const g = giftFromEvent(event(), NOW);
  assert.deepEqual(g && [g.eventId, g.sessionId, g.paymentIntent, g.paidAt, g.buyerEmail, g.recipientEmail, g.deliverOn, g.locale, g.amountSubtotal, g.currency], ["evt_1", "cs_1", "pi_1", "2026-12-01T15:00:00.000Z", "buyer@example.com", "kid@example.com", "2026-12-25", "en", 1234, "usd"]);
  assert.equal(giftFromEvent(event({ payment_status: "unpaid" }), NOW), null);
  assert.equal(giftFromEvent(event({ mode: "subscription" }), NOW), null);
  assert.equal(giftFromEvent(event({}, { product: "polingual" }), NOW), null);
  assert.equal(giftFromEvent(event({}, { recipient_email: "x" }), NOW), null);
  assert.equal(giftFromEvent(event({ customer_email: null, customer_details: { email: "d@example.com" } }), NOW)?.buyerEmail, "d@example.com");
  assert.equal(giftFromEvent(event({}, { deliver_on: "garbage" }), NOW)?.deliverOn, "2026-12-01");
  assert.ok(giftFromEvent(event({}, {}, "evt_a", "checkout.session.async_payment_succeeded"), NOW));
  assert.equal(giftFromEvent(event({}, {}, "evt_f", "checkout.session.async_payment_failed"), NOW), null);
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
  assert.deepEqual(ok, { status: 200, body: { received: true, gift: "gift_1", issued: true } });
  assert.equal(f.rows.length, 1);
  const refund = JSON.stringify(charge("charge.refunded"));
  assert.equal((await handleWebhook(deps, refund, sign(refund, "wrong", t))).status, 400);
  assert.equal(f.rows[0].voidedAt, null);
});

test("a repeated event records one gift and sends one receipt, and no code is stored before delivery", async () => {
  const f = fulfil();
  for (const id of ["evt_1", "evt_1", "evt_retry"]) assert.equal((await handleGiftEvent(f.deps, event({}, {}, id)))?.status, 200);
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].codeHash, null);
  assert.equal("code" in f.rows[0], false);
  assert.equal(f.rows[0].expiresAt, "2027-12-25T00:00:00.000Z");
  assert.deepEqual(f.sent.map((s) => s.key), ["polingual-gift/receipt/gift_1"]);
  assert.equal(await handleGiftEvent(f.deps, { type: "customer.subscription.updated", data: { object: {} } }), null);
  assert.deepEqual((await handleGiftEvent(f.deps, event({ payment_status: "unpaid" })))?.body, { received: true, ignored: true });
  assert.deepEqual((await handleGiftEvent(f.deps, event({}, {}, "evt_f", "checkout.session.async_payment_failed")))?.body, { received: true, ignored: true });
  const late = fulfil();
  assert.equal((await handleGiftEvent(late.deps, event({ payment_status: "unpaid" })))?.status, 200);
  assert.equal(late.rows.length, 0);
  assert.equal((await handleGiftEvent(late.deps, event({}, {}, "evt_a", "checkout.session.async_payment_succeeded")))?.status, 200);
  assert.equal(late.rows.length, 1);
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

test("a price, amount or currency mismatch records the event and issues nothing", async () => {
  const purchase = giftFromEvent(event(), NOW)!;
  assert.equal(priceMatches("price_gift", purchase, [ITEM]), true);
  assert.equal(priceMatches("price_gift", purchase, [{ ...ITEM, priceId: "price_cheap" }]), false);
  assert.equal(priceMatches("price_gift", purchase, [{ ...ITEM, unitAmount: 1 }]), false);
  assert.equal(priceMatches("price_gift", purchase, [{ ...ITEM, currency: "eur" }]), false);
  assert.equal(priceMatches("price_gift", purchase, [{ ...ITEM, quantity: 2 }]), false);
  assert.equal(priceMatches("price_gift", purchase, [ITEM, ITEM]), false);
  assert.equal(priceMatches("price_gift", purchase, []), false);
  const f = fulfil(NOW, () => true, [{ ...ITEM, priceId: "price_cheap" }]);
  assert.deepEqual(await handleGiftEvent(f.deps, event({}, { deliver_on: "2026-12-01" })), { status: 200, body: { received: true, gift: "gift_1", issued: false } });
  assert.deepEqual(f.asked, ["cs_1", "pi_1"]);
  assert.deepEqual([f.rows.length, f.rows[0].voidReason, f.rows[0].codeHash], [1, "price_mismatch", null]);
  f.clock.now += 2 * HOUR;
  assert.deepEqual(await deliverDueGifts(f.deps), { due: 0, sent: 0, failed: 0, purged: 0 });
  assert.equal(f.sent.length, 0);
  const down = fulfil(NOW, () => true, null);
  assert.deepEqual(await handleGiftEvent(down.deps, event()), { status: 502, body: { error: "price_check_failed" } });
  assert.equal(down.rows.length, 0);
});

test("fetchLineItems reads the session line items from Stripe and fails closed", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const ok = (async (url: string, init: RequestInit) => (calls.push({ url, init }), new Response(JSON.stringify({ data: [{ quantity: 1, price: { id: "price_gift", unit_amount: 1234, currency: "usd" } }] })))) as unknown as typeof fetch;
  assert.deepEqual(await fetchLineItems("sk_test_x", "cs_1", ok), [ITEM]);
  assert.match(calls[0].url, /\/v1\/checkout\/sessions\/cs_1\/line_items\?limit=5$/);
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer sk_test_x");
  assert.equal(await fetchLineItems("sk_test_x", "cs_1", (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch), null);
  assert.equal(await fetchLineItems("sk_test_x", "cs_1", (async () => new Response("{}")) as unknown as typeof fetch), null);
  assert.equal(await fetchLineItems("sk_test_x", "cs_1", (async () => { throw new Error("down"); }) as unknown as typeof fetch), null);
});

test("delivery waits one hour after payment and a scheduled date is unchanged", async () => {
  assert.equal(deliverAfter(giftFromEvent(event({}, { deliver_on: "2026-12-01" }), NOW)!), "2026-12-01T16:00:00.000Z");
  assert.equal(deliverAfter(giftFromEvent(event(), NOW)!), "2026-12-25T00:00:00.000Z");
  const today = fulfil();
  await handleGiftEvent(today.deps, event({}, { deliver_on: "2026-12-01" }));
  assert.deepEqual(today.sent.map((s) => s.email.to), ["buyer@example.com"]);
  today.clock.now = NOW + HOUR - 1000;
  assert.equal((await deliverDueGifts(today.deps))?.due, 0);
  today.clock.now = NOW + HOUR;
  assert.deepEqual(await deliverDueGifts(today.deps), { due: 1, sent: 1, failed: 0, purged: 0 });
  assert.deepEqual(today.sent.map((s) => s.email.to), ["buyer@example.com", "kid@example.com"]);
  assert.match(today.sent[1].key, /^polingual-gift\/deliver\/gift_1\/[0-9a-f]{12}$/);
  assert.equal(today.rows[0].codeHash, giftCodeHash("ABCDEFGHJKMNPQRS"));
  assert.equal((await deliverDueGifts(today.deps))?.due, 0);

  const later = fulfil();
  await handleGiftEvent(later.deps, event());
  later.clock.now = Date.parse("2026-12-24T23:59:00Z");
  assert.equal((await deliverDueGifts(later.deps))?.due, 0);
  later.clock.now = Date.parse("2026-12-25T00:05:00Z");
  assert.equal((await deliverDueGifts(later.deps))?.sent, 1);
  assert.equal(await deliverDueGifts({ ...later.deps, postalAddress: () => null }), null);
});

test("a failed gift email retries with a fresh code and only the last code works", async () => {
  let up = false;
  const f = fulfil(NOW, (e) => e.to !== "kid@example.com" || up);
  await handleGiftEvent(f.deps, event({}, { deliver_on: "2026-12-01" }));
  f.clock.now = NOW + 2 * HOUR;
  assert.deepEqual(await deliverDueGifts(f.deps), { due: 1, sent: 0, failed: 1, purged: 0 });
  assert.equal(f.rows[0].deliveredAt, null);
  up = true;
  assert.deepEqual(await deliverDueGifts(f.deps), { due: 1, sent: 1, failed: 0, purged: 0 });
  assert.equal(f.codeOf(0), "TUVW-XYZ2-3456-789A");
  assert.equal((await f.redeem("ABCD-EFGH-JKMN-PQRS", "u1")).body.outcome, "invalid");
  assert.equal((await f.redeem("TUVW-XYZ2-3456-789A", "u1")).body.outcome, "redeemed");
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

test("a code redeems once, expires, needs a signed-in user and is rate limited per IP and account", async () => {
  const f = fulfil();
  await delivered(f);
  const at = f.clock.now;
  assert.equal((await f.redeem("ABCD-EFGH-JKMN-PQRS", null)).status, 401);
  assert.equal((await f.redeem("nope", "u1")).status, 400);
  assert.deepEqual(await f.redeem("2222-2222-2222-2222", "u1"), { status: 404, body: { outcome: "invalid", until: null } });
  assert.deepEqual(await f.redeem("abcd-efgh-jkmn-pqrs", "u1"), { status: 200, body: { outcome: "redeemed", until: "2027-12-01T16:01:00.000Z" } });
  assert.equal((await f.redeem("ABCDEFGHJKMNPQRS", "u1")).body.outcome, "already");
  assert.deepEqual(await f.redeem("ABCDEFGHJKMNPQRS", "u2"), { status: 409, body: { outcome: "used", until: null } });
  const keys: string[][] = [];
  const limited = await handleRedeem({ store: () => f.store, userId: async () => "u1", limited: async (k) => (keys.push(k), true), ip: "2.2.2.2", now: () => at }, { code: "x" });
  assert.deepEqual([limited.status, keys[0]], [429, ["ip:2.2.2.2", "user:u1"]]);
  assert.equal((await handleRedeem({ store: () => null, userId: async () => "u1", limited: open, ip: "x", now: () => at }, { code: "x" })).status, 503);
  const old = fulfil();
  await delivered(old);
  assert.deepEqual(await old.redeem("ABCD-EFGH-JKMN-PQRS", "u1", Date.parse("2027-12-02T00:00:00Z")), { status: 410, body: { outcome: "expired", until: null } });
  old.access.set("u3", { until: "2027-06-01T00:00:00.000Z", active: true, source: "stripe" });
  assert.equal((await old.redeem("ABCD-EFGH-JKMN-PQRS", "u3")).status, 409);
  assert.equal(old.rows[0].redeemedAt, null);
});

test("concurrent redeems of one code give one winner", async () => {
  const f = fulfil();
  await delivered(f);
  const results = await Promise.all(["u1", "u2", "u3", "u4", "u5", "u6"].map((u) => f.redeem("ABCD-EFGH-JKMN-PQRS", u)));
  assert.equal(results.filter((r) => r.body.outcome === "redeemed").length, 1);
  assert.equal(results.filter((r) => r.body.outcome === "used").length, 5);
});

test("a second gift for the same user adds a year", async () => {
  const f = fulfil();
  await delivered(f);
  await delivered(f, event({ id: "cs_2", payment_intent: "pi_2" }, { deliver_on: "2026-12-01" }, "evt_2"));
  const first = await f.redeem(f.codeOf(0), "u1");
  const second = await f.redeem(f.codeOf(1), "u1");
  assert.equal(first.body.until, new Date(f.clock.now).toISOString().replace("2026", "2027"));
  assert.equal(second.body.until, new Date(f.clock.now).toISOString().replace("2026", "2028"));
});

test("a refund before redeem voids the gift: no delivery and the code is refused", async () => {
  assert.deepEqual(voidFromEvent(charge("charge.refunded")), { paymentIntent: "pi_1", reason: "refund", gift: true });
  assert.deepEqual(voidFromEvent(charge("charge.dispute.created")), { paymentIntent: "pi_1", reason: "dispute", gift: false });
  assert.equal(voidFromEvent(charge("charge.refunded", { refunded: false })), null);
  assert.equal(voidFromEvent(charge("charge.dispute.closed")), null);
  assert.equal(voidFromEvent(charge("charge.refunded", { payment_intent: null })), null);
  const held = fulfil();
  await handleGiftEvent(held.deps, event({}, { deliver_on: "2026-12-01" }));
  held.clock.now = NOW + 60_000;
  assert.deepEqual((await handleGiftEvent(held.deps, charge("charge.refunded")))?.body, { received: true, void: "voided", revoked: false });
  held.clock.now = NOW + 2 * HOUR;
  assert.equal((await deliverDueGifts(held.deps))?.due, 0);
  assert.deepEqual(held.sent.map((s) => s.email.to), ["buyer@example.com"]);
  const f = fulfil();
  await delivered(f);
  await handleGiftEvent(f.deps, charge("charge.refunded"));
  assert.deepEqual([f.rows[0].voidReason, f.rows[0].voidedAt !== null], ["refund", true]);
  assert.deepEqual(await f.redeem("ABCD-EFGH-JKMN-PQRS", "u1"), { status: 410, body: { outcome: "void", until: null } });
  assert.equal(f.access.has("u1"), false);
  assert.deepEqual((await handleGiftEvent(f.deps, charge("charge.refunded")))?.body, { received: true, void: "already", revoked: false });
  assert.deepEqual((await handleGiftEvent(f.deps, charge("charge.refunded", { payment_intent: "pi_other" })))?.body, { received: true, void: "held", revoked: false });
  assert.equal((await handleGiftEvent({ ...f.deps, store: () => null }, charge("charge.refunded")))?.status, 503);
});

test("a refund or dispute that lands before the gift row exists still stops the gift", async () => {
  for (const [type, reason] of [["charge.refunded", "refund"], ["charge.dispute.created", "dispute"]] as const) {
    let stripeUp = false;
    const f = fulfil(NOW, () => true, [ITEM]);
    const flaky = { ...f.deps, lineItems: async () => (stripeUp ? [ITEM] : null) };
    assert.equal((await handleGiftEvent(flaky, event({}, { deliver_on: "2026-12-01" })))?.status, 502);
    assert.equal(f.rows.length, 0);
    assert.deepEqual((await handleGiftEvent(flaky, charge(type)))?.body, { received: true, void: "held", revoked: false }, type);
    stripeUp = true;
    assert.deepEqual(await handleGiftEvent(flaky, event({}, { deliver_on: "2026-12-01" })), { status: 200, body: { received: true, gift: "gift_1", issued: false } });
    assert.deepEqual([f.rows.length, f.rows[0].voidReason, f.rows[0].voidedAt !== null], [1, reason, true]);
    f.clock.now = NOW + 2 * HOUR;
    assert.equal((await deliverDueGifts(f.deps))?.due, 0);
    assert.equal(f.sent.length, 0);
  }
});

test("the payment is read from Stripe before issuing: refunded or disputed issues nothing, unreachable retries", async () => {
  for (const [state, reason] of [["refunded", "refund"], ["disputed", "dispute"]] as const) {
    const f = fulfil(NOW, () => true, [ITEM], state);
    assert.deepEqual(await handleGiftEvent(f.deps, event({}, { deliver_on: "2026-12-01" })), { status: 200, body: { received: true, gift: "gift_1", issued: false } });
    assert.equal(f.rows[0].voidReason, reason);
    assert.equal(f.sent.length, 0);
  }
  const down = fulfil(NOW, () => true, [ITEM], null);
  assert.deepEqual(await handleGiftEvent(down.deps, event()), { status: 502, body: { error: "payment_check_failed" } });
  assert.equal(down.rows.length, 0);
  assert.equal(giftFromEvent(event({ payment_intent: null }), NOW), null);
  const pi = (charge: Record<string, unknown> | null, status = "succeeded") => paymentStateFrom({ status, latest_charge: charge });
  assert.equal(pi({ refunded: false, disputed: false, amount: 1234, amount_refunded: 0 }), "clear");
  assert.equal(pi({ refunded: true, disputed: false }), "refunded");
  assert.equal(pi({ refunded: false, disputed: false, amount: 1234, amount_refunded: 1234 }), "refunded");
  assert.equal(pi({ refunded: false, disputed: false, amount: 1234, amount_refunded: 100 }), "clear");
  assert.equal(pi({ refunded: false, disputed: true }), "disputed");
  assert.equal(pi({ refunded: false, disputed: false }, "processing"), null);
  assert.equal(pi(null), null);
  assert.equal(paymentStateFrom({ status: "succeeded", latest_charge: "ch_1" }), null);
  const calls: string[] = [];
  const ok = (async (url: string) => (calls.push(url), new Response(JSON.stringify({ status: "succeeded", latest_charge: { refunded: true } })))) as unknown as typeof fetch;
  assert.equal(await fetchPaymentState("sk_test_x", "pi_1", ok), "refunded");
  assert.match(calls[0], /\/v1\/payment_intents\/pi_1\?expand\[\]=latest_charge$/);
  assert.equal(await fetchPaymentState("sk_test_x", "pi_1", (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch), null);
  assert.equal(await fetchPaymentState("sk_test_x", "pi_1", (async () => { throw new Error("down"); }) as unknown as typeof fetch), null);
});

test("a refund after redeem ends that grant and leaves other entitlements alone", async () => {
  const f = fulfil();
  await delivered(f);
  await f.redeem("ABCD-EFGH-JKMN-PQRS", "u1");
  assert.equal(f.access.get("u1")?.active, true);
  f.clock.now += HOUR;
  assert.deepEqual((await handleGiftEvent(f.deps, charge("charge.refunded")))?.body, { received: true, void: "voided", revoked: true });
  assert.deepEqual(f.access.get("u1"), { until: new Date(f.clock.now).toISOString(), active: false, source: "gift" });

  const two = fulfil();
  await delivered(two);
  await delivered(two, event({ id: "cs_2", payment_intent: "pi_2" }, { deliver_on: "2026-12-01" }, "evt_2"));
  await two.redeem(two.codeOf(0), "u1");
  const second = await two.redeem(two.codeOf(1), "u1");
  await handleGiftEvent(two.deps, charge("charge.refunded"));
  const left = two.access.get("u1")!;
  assert.equal(left.active, true);
  assert.equal(left.until, (second.body.until as string).replace("2028", "2027"));

  const sub = fulfil();
  await delivered(sub);
  await sub.redeem("ABCD-EFGH-JKMN-PQRS", "u1");
  const stripe: Grant = { until: "2027-06-01T00:00:00.000Z", active: true, source: "stripe" };
  sub.access.set("u1", stripe);
  assert.deepEqual((await handleGiftEvent(sub.deps, charge("charge.refunded")))?.body, { received: true, void: "voided", revoked: false });
  assert.equal(sub.access.get("u1"), stripe);
});

test("a dispute voids the gift the same way", async () => {
  for (const type of ["charge.dispute.created", "charge.dispute.funds_withdrawn"]) {
    const f = fulfil();
    await delivered(f);
    await f.redeem("ABCD-EFGH-JKMN-PQRS", "u1");
    assert.deepEqual((await handleGiftEvent(f.deps, charge(type, { refunded: undefined })))?.body, { received: true, void: "voided", revoked: true }, type);
    assert.equal(f.rows[0].voidReason, "dispute");
    assert.equal(f.access.get("u1")?.active, false);
  }
});

test("recipient name, email and note go 30 days after redeem, expiry or void; the payment record stays", async () => {
  const f = fulfil();
  await delivered(f);
  await delivered(f, event({ id: "cs_2", payment_intent: "pi_2" }, { deliver_on: "2026-12-01" }, "evt_2"));
  await f.redeem(f.codeOf(0), "u1");
  const redeemedAt = f.clock.now;
  f.clock.now = redeemedAt + 29 * 86_400_000;
  assert.equal((await deliverDueGifts(f.deps))?.purged, 0);
  f.clock.now = redeemedAt + 30 * 86_400_000;
  assert.equal((await deliverDueGifts(f.deps))?.purged, 1);
  const [a, b] = f.rows;
  assert.deepEqual([a.recipientEmail, a.recipientName, a.note], [null, null, null]);
  assert.deepEqual([a.buyerEmail, a.sessionId, a.paymentIntent, a.amountTotal, a.currency], ["buyer@example.com", "cs_1", "pi_1", 1234, "usd"]);
  assert.equal(b.recipientEmail, "kid@example.com");
  assert.equal((await deliverDueGifts(f.deps))?.purged, 0);
  f.clock.now = Date.parse(b.expiresAt) + 30 * 86_400_000;
  assert.equal((await deliverDueGifts(f.deps))?.purged, 1);
  assert.equal(b.recipientName, null);
  const v = fulfil();
  await handleGiftEvent(v.deps, event());
  await handleGiftEvent(v.deps, charge("charge.refunded"));
  v.clock.now = NOW + 31 * 86_400_000;
  assert.equal((await deliverDueGifts(v.deps))?.purged, 1);
  assert.equal(v.rows[0].recipientEmail, null);
});

function row(over: Partial<GiftRow> = {}): GiftRow {
  return { id: "gift_1", eventId: "evt_1", sessionId: "cs_1", buyerEmail: "buyer@example.com", recipientEmail: "kid@example.com", recipientName: "Ana <3", note: "Enjoy <b>it</b>", deliverOn: "2026-12-25", locale: "en", paymentIntent: "pi_1", paidAt: "2026-12-01T15:00:00.000Z", amountSubtotal: 1234, amountTotal: 1234, currency: "usd", expiresAt: "2027-12-25T00:00:00.000Z", deliverAfter: "2026-12-25T00:00:00.000Z", receiptSentAt: null, deliveredAt: null, redeemedAt: null, voidedAt: null, voidReason: null, attentionReason: null, ...over };
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
  const g = renderGiftEmail(row(), "ABCDEFGHJKMNPQRS", "https://www.polingual.com", POSTAL);
  assert.equal(g.to, "kid@example.com");
  assert.match(g.text, /Your gift code: ABCD-EFGH-JKMN-PQRS/);
  assert.match(g.text, /https:\/\/www\.polingual\.com\/gift\/redeem\?code=ABCD-EFGH-JKMN-PQRS/);
  assert.match(g.text, /Redeem by December 25, 2027\./);
  assert.match(g.text, /privacy@polingual\.com/);
  assert.match(g.text, /1 Test Street, Testville/);
  assert.match(g.html, /Enjoy &lt;b&gt;it&lt;\/b&gt;/);
  assert.doesNotMatch(g.html, /<b>it<\/b>/);
  assert.match(g.html, /href="https:\/\/www\.polingual\.com\/gift\/redeem\?code=ABCD-EFGH-JKMN-PQRS"/);
  assert.doesNotMatch(renderGiftEmail(row({ note: null }), "ABCDEFGHJKMNPQRS", "https://www.polingual.com", POSTAL).text, /Their note/);
  const es = renderGiftEmail(row({ locale: "es" }), "ABCDEFGHJKMNPQRS", "https://www.polingual.com", POSTAL);
  assert.match(es.text, /https:\/\/www\.polingual\.com\/es\/gift\/redeem\?code=/);
  assert.match(es.text, /Tu código de regalo: ABCD-EFGH-JKMN-PQRS/);
  assert.throws(() => renderGiftEmail(row({ recipientEmail: null }), "ABCDEFGHJKMNPQRS", "https://www.polingual.com", POSTAL));
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

test("a paid session that cannot be fulfilled is recorded for attention and support is alerted", async () => {
  const cases = [
    [event({ payment_intent: null }), "no_payment_intent"],
    [event({ customer_email: "nope", customer_details: null }), "bad_buyer_email"],
    [event({}, { recipient_email: "x" }), "bad_recipient"],
    [event({}, { recipient_name: "  " }), "bad_recipient"],
  ] as const;
  for (const [ev, reason] of cases) {
    assert.equal(attentionFromEvent(ev, NOW)?.reason, reason);
    const f = fulfil();
    assert.deepEqual(await handleGiftEvent(f.deps, ev), { status: 200, body: { received: true, gift: "gift_1", issued: false, attention: reason } }, reason);
    assert.deepEqual([f.rows.length, f.rows[0].attentionReason, f.rows[0].sessionId, f.rows[0].amountTotal], [1, reason, "cs_1", 1234]);
    assert.deepEqual(f.alerts.map((a) => [a.subject, a.key]), [["Polingual gift needs attention", "polingual-gift/attention/cs_1"]]);
    assert.ok(f.alerts[0].lines.some((l) => l.includes("cs_1")) && f.alerts[0].lines.some((l) => l.includes(reason)));
    await handleGiftEvent(f.deps, ev);
    assert.equal(f.rows.length, 1);
    f.clock.now = NOW + 30 * 86_400_000 - 1;
    assert.deepEqual(await deliverDueGifts(f.deps), { due: 0, sent: 0, failed: 0, purged: 0 });
    assert.equal(f.sent.length, 0);
    assert.deepEqual(await reconcileGifts({ ...f.deps, paidSessions: async () => ["cs_1"] }), { paid: 1, missing: [] });
  }
  assert.equal(attentionFromEvent(event(), NOW), null);
  assert.equal(attentionFromEvent(event({ payment_status: "unpaid", payment_intent: null }), NOW), null);
  const f = fulfil();
  assert.equal((await handleGiftEvent({ ...f.deps, store: () => null }, cases[0][0]))?.status, 503);
  const quiet = await handleGiftEvent({ ...f.deps, alert: async () => false }, cases[0][0]);
  assert.deepEqual([quiet?.status, f.rows.length], [200, 1]);
});

test("the daily reconcile alerts on paid sessions with no gift row and issues nothing", async () => {
  const f = fulfil();
  await handleGiftEvent(f.deps, event());
  await handleGiftEvent(f.deps, event({ id: "cs_void", payment_intent: "pi_v" }, {}, "evt_v"));
  await handleGiftEvent(f.deps, charge("charge.refunded", { payment_intent: "pi_v" }));
  const since: number[] = [];
  const deps = { ...f.deps, paidSessions: async (s: number) => (since.push(s), f.stripe.paid) };
  f.stripe.paid = ["cs_1", "cs_void"];
  assert.deepEqual(await reconcileGifts(deps), { paid: 2, missing: [] });
  assert.equal(since[0], Math.floor((NOW - 7 * 86_400_000) / 1000));
  assert.equal(f.alerts.length, 0);
  f.stripe.paid = ["cs_1", "cs_lost", "cs_gone"];
  assert.deepEqual(await reconcileGifts(deps), { paid: 3, missing: ["cs_lost", "cs_gone"] });
  assert.deepEqual([f.alerts.length, f.alerts[0].key, f.rows.length], [1, "polingual-gift/reconcile/2026-12-01", 2]);
  assert.ok(f.alerts[0].lines.includes("Checkout session: cs_lost"));
  f.stripe.paid = [];
  assert.deepEqual(await reconcileGifts(deps), { paid: 0, missing: [] });
  f.stripe.paid = null;
  assert.equal(await reconcileGifts(deps), null);
  assert.equal(await reconcileGifts({ ...deps, store: () => null }), null);
  const pages = [
    { has_more: true, data: [{ id: "cs_a", mode: "payment", payment_status: "paid", metadata: { product: "polingual_gift" } }, { id: "cs_sub", mode: "subscription", payment_status: "paid", metadata: { product: "polingual" } }] },
    { has_more: false, data: [{ id: "cs_b", mode: "payment", payment_status: "paid", metadata: { product: "polingual_gift" } }, { id: "cs_unpaid", mode: "payment", payment_status: "unpaid", metadata: { product: "polingual_gift" } }] },
  ];
  const urls: string[] = [];
  const stripe = (async (url: string) => (urls.push(url), new Response(JSON.stringify(pages[urls.length - 1])))) as unknown as typeof fetch;
  assert.deepEqual(await fetchPaidGiftSessions("sk_test_x", 123, stripe), ["cs_a", "cs_b"]);
  assert.match(urls[0], /\/v1\/checkout\/sessions\?status=complete&limit=100&created\[gte\]=123$/);
  assert.match(urls[1], /&starting_after=cs_sub$/);
  assert.equal(await fetchPaidGiftSessions("sk_test_x", 123, (async () => new Response("{}", { status: 500 })) as unknown as typeof fetch), null);
});

test("void events are stored only for gift payments", async () => {
  const f = fulfil();
  f.stripe.gift = false;
  assert.deepEqual((await handleGiftEvent(f.deps, charge("charge.dispute.created", { payment_intent: "pi_sub" })))?.body, { received: true, ignored: true });
  assert.deepEqual((await handleGiftEvent(f.deps, charge("charge.refunded", { payment_intent: "pi_sub", metadata: { product: "polingual" } })))?.body, { received: true, ignored: true });
  assert.equal(f.voids.size, 0);
  f.stripe.gift = null;
  assert.deepEqual(await handleGiftEvent(f.deps, charge("charge.dispute.created")), { status: 502, body: { error: "payment_check_failed" } });
  assert.equal(f.voids.size, 0);
  assert.equal((await handleGiftEvent(f.deps, charge("charge.refunded")))?.body.void, "held");
  f.stripe.gift = true;
  assert.equal((await handleGiftEvent(f.deps, charge("charge.dispute.created", { payment_intent: "pi_2" })))?.body.void, "held");
  assert.deepEqual(Array.from(f.voids.keys()), ["pi_1", "pi_2"]);
  const pi = (body: unknown) => (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
  assert.equal(await fetchIsGiftPayment("sk_test_x", "pi_1", pi({ id: "pi_1", metadata: { product: "polingual_gift" } })), true);
  assert.equal(await fetchIsGiftPayment("sk_test_x", "pi_1", pi({ id: "pi_1", metadata: {} })), false);
  assert.equal(await fetchIsGiftPayment("sk_test_x", "pi_1", pi({})), null);
  assert.equal(await fetchIsGiftPayment("sk_test_x", "pi_1", (async () => { throw new Error("down"); }) as unknown as typeof fetch), null);
});
