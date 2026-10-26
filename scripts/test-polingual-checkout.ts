import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  checkoutConfig,
  checkoutForm,
  entitlementFromEvent,
  handleCheckout,
  handleWebhook,
  parseCheckoutRequest,
  verifyStripeSignature,
  type CheckoutConfig,
  type Entitlement,
} from "../src/lib/billing/polingual-checkout";

const ENV = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_POLINGUAL_MONTHLY: "price_m", STRIPE_PRICE_POLINGUAL_YEARLY: "price_y" };
const sign = (payload: string, secret: string, t: number) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;

test("checkoutConfig is null until every required env var is set", () => {
  assert.equal(checkoutConfig({}), null);
  assert.equal(checkoutConfig({ ...ENV, STRIPE_PRICE_POLINGUAL_YEARLY: "" }), null);
  const cfg = checkoutConfig({ ...ENV, POLINGUAL_SITE_URL: "https://example.test/" });
  assert.equal(cfg?.successUrl, "https://example.test/welcome?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(checkoutConfig(ENV)?.cancelUrl, "https://polingual.com/pricing");
});

test("parseCheckoutRequest validates plan, referral and network", () => {
  assert.deepEqual(parseCheckoutRequest({}), { ok: true, req: { plan: "yearly", referral: null, network: null, email: null } });
  assert.deepEqual(parseCheckoutRequest({ plan: "weekly" }), { ok: false, error: "bad_plan" });
  assert.deepEqual(parseCheckoutRequest({ referral: "a b" }), { ok: false, error: "bad_referral" });
  assert.deepEqual(parseCheckoutRequest({ referral: "r1", affiliate_network: "cj" }), { ok: false, error: "bad_affiliate_network" });
  const r = parseCheckoutRequest({ plan: "monthly", referral: "abc-123", email: "Ada@Example.org" });
  assert.deepEqual(r, { ok: true, req: { plan: "monthly", referral: "abc-123", network: "rewardful", email: "ada@example.org" } });
});

test("checkoutForm passes the referral into client_reference_id and metadata", () => {
  const cfg = checkoutConfig(ENV) as CheckoutConfig;
  const rw = checkoutForm(cfg, { plan: "monthly", referral: "rw-1", network: "rewardful", email: null }, "u1");
  assert.equal(rw.get("client_reference_id"), "rw-1");
  assert.equal(rw.get("line_items[0][price]"), "price_m");
  assert.equal(rw.get("metadata[referral]"), "rw-1");
  assert.equal(rw.get("subscription_data[metadata][user_id]"), "u1");
  const im = checkoutForm(cfg, { plan: "yearly", referral: "irclick", network: "impact", email: "a@b.co" }, "u1");
  assert.equal(im.get("client_reference_id"), null);
  assert.equal(im.get("metadata[affiliate_network]"), "impact");
  assert.equal(im.get("customer_email"), "a@b.co");
  const none = checkoutForm(cfg, { plan: "yearly", referral: null, network: null, email: null }, "u1");
  assert.equal(none.get("metadata[referral]"), null);
});

test("handleCheckout returns 503 unset, 401 signed out, 502 on Stripe failure, url on success", async () => {
  const ok = async () => ({ url: "https://checkout.stripe.test/s", id: "cs_1" });
  assert.equal((await handleCheckout({ config: () => null, userId: async () => "u1", createSession: ok }, {})).status, 503);
  const cfg = () => checkoutConfig(ENV);
  assert.equal((await handleCheckout({ config: cfg, userId: async () => null, createSession: ok }, {})).status, 401);
  assert.equal((await handleCheckout({ config: cfg, userId: async () => "u1", createSession: ok }, { plan: "x" })).status, 400);
  assert.equal((await handleCheckout({ config: cfg, userId: async () => "u1", createSession: async () => ({ url: null, id: null }) }, {})).status, 502);
  let sent: URLSearchParams | null = null;
  const r = await handleCheckout({ config: cfg, userId: async () => "u1", createSession: async (_c, f) => ((sent = f), ok()) }, { referral: "rw-9" });
  assert.deepEqual(r, { status: 200, body: { url: "https://checkout.stripe.test/s", id: "cs_1" } });
  assert.equal((sent as URLSearchParams | null)?.get("client_reference_id"), "rw-9");
});

test("verifyStripeSignature checks secret, payload and timestamp tolerance", () => {
  const p = '{"a":1}';
  assert.equal(verifyStripeSignature(p, sign(p, "whsec", 1000), "whsec", 1100), true);
  assert.equal(verifyStripeSignature(p, `v1=deadbeef,${sign(p, "whsec", 1000)}`, "whsec", 1000), true);
  assert.equal(verifyStripeSignature(p, sign(p, "other", 1000), "whsec", 1000), false);
  assert.equal(verifyStripeSignature('{"a":2}', sign(p, "whsec", 1000), "whsec", 1000), false);
  assert.equal(verifyStripeSignature(p, sign(p, "whsec", 1000), "whsec", 1400), false);
  assert.equal(verifyStripeSignature(p, null, "whsec", 1000), false);
  assert.equal(verifyStripeSignature(p, "t=1000", "whsec", 1000), false);
});

test("entitlementFromEvent maps checkout and subscription events", () => {
  const meta = { product: "polingual", user_id: "u1", plan: "yearly", referral: "rw-1", affiliate_network: "rewardful" };
  const done = entitlementFromEvent({ type: "checkout.session.completed", data: { object: { metadata: meta, payment_status: "paid", customer: "cus_1", subscription: "sub_1" } } });
  assert.equal(done?.status, "active");
  assert.equal(done?.stripe_subscription, "sub_1");
  assert.equal(done?.referral, "rw-1");
  assert.equal(entitlementFromEvent({ type: "checkout.session.completed", data: { object: { metadata: meta, payment_status: "unpaid" } } }), null);
  const upd = entitlementFromEvent({ type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "past_due", metadata: meta, current_period_end: 0 } } });
  assert.equal(upd?.status, "past_due");
  assert.equal(upd?.current_period_end, "1970-01-01T00:00:00.000Z");
  assert.equal(entitlementFromEvent({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "active", metadata: meta } } })?.status, "canceled");
  assert.equal(entitlementFromEvent({ type: "invoice.paid", data: { object: { metadata: meta } } }), null);
  assert.equal(entitlementFromEvent({ type: "checkout.session.completed", data: { object: { metadata: { product: "other", user_id: "u1" }, payment_status: "paid" } } }), null);
});

test("handleWebhook gates on secret and signature and records entitlements", async () => {
  const recorded: Entitlement[] = [];
  const deps = { secret: () => "whsec", now: () => 1_000_000, record: async (e: Entitlement) => (recorded.push(e), true) };
  const payload = JSON.stringify({ type: "checkout.session.completed", data: { object: { metadata: { product: "polingual", user_id: "u1" }, payment_status: "paid" } } });
  assert.equal((await handleWebhook({ ...deps, secret: () => null }, payload, null)).status, 503);
  assert.equal((await handleWebhook(deps, payload, sign(payload, "nope", 1000))).status, 400);
  assert.equal((await handleWebhook(deps, "{", sign("{", "whsec", 1000))).body.error, "bad_payload");
  const r = await handleWebhook(deps, payload, sign(payload, "whsec", 1000));
  assert.deepEqual(r, { status: 200, body: { received: true, status: "active" } });
  assert.equal(recorded.length, 1);
  const other = JSON.stringify({ type: "invoice.paid", data: { object: {} } });
  assert.equal((await handleWebhook(deps, other, sign(other, "whsec", 1000))).body.ignored, true);
  assert.equal((await handleWebhook({ ...deps, record: async () => false }, payload, sign(payload, "whsec", 1000))).status, 500);
});
