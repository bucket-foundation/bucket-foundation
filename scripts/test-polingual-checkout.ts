import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  billingStep,
  funnelVisitor,
  checkoutConfig,
  checkoutForm,
  entitlementFromEvent,
  handleCheckout,
  handlePortal,
  handleWebhook,
  parseCheckoutRequest,
  verifyStripeSignature,
  subscriptionStatus,
  ACTIVE_STATUSES,
  FRESH,
  dayZeroCancel,
  trialEndingEmail,
  trialEndingFrom,
  type CheckoutConfig,
  type Entitlement,
  type EntitlementState,
  type WebhookDeps,
} from "../src/lib/billing/polingual-checkout";
import { withWebEntitlement } from "../src/lib/billing/web-entitlement";

const ENV = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_POLINGUAL_MONTHLY: "price_m", STRIPE_PRICE_POLINGUAL_YEARLY: "price_y" };
const NO_STATE = {
  current: async () => null,
  byCustomer: async () => null,
  chargeCustomer: async () => null,
  patch: async () => true,
};
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
  assert.equal((await handleCheckout({ config: () => null, userId: async () => "u1", createSession: ok, currentStatus: async () => null, trialHistory: async () => FRESH }, {})).status, 503);
  const cfg = () => checkoutConfig(ENV);
  assert.equal((await handleCheckout({ config: cfg, userId: async () => null, createSession: ok, currentStatus: async () => null, trialHistory: async () => FRESH }, {})).status, 401);
  assert.equal((await handleCheckout({ config: cfg, userId: async () => "u1", createSession: ok, currentStatus: async () => null, trialHistory: async () => FRESH }, { plan: "x" })).status, 400);
  assert.equal((await handleCheckout({ config: cfg, userId: async () => "u1", createSession: async () => ({ url: null, id: null }), currentStatus: async () => null, trialHistory: async () => FRESH }, {})).status, 502);
  let sent: URLSearchParams | null = null;
  const r = await handleCheckout({ config: cfg, userId: async () => "u1", createSession: async (_c, f) => ((sent = f), ok()), currentStatus: async () => null, trialHistory: async () => FRESH }, { referral: "rw-9" });
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
  const deps = { ...NO_STATE, secret: () => "whsec", now: () => 1_000_000, record: async (e: Entitlement) => (recorded.push(e), true) };
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

test("checkoutForm gives yearly the 7-day trial, monthly none, and app return urls", () => {
  const cfg = checkoutConfig({ ...ENV, POLINGUAL_SITE_URL: "https://p.test" }) as CheckoutConfig;
  const f = checkoutForm(cfg, { plan: "monthly", referral: null, network: null, email: null, returnTo: "app" }, "u1");
  assert.equal(f.get("subscription_data[trial_period_days]"), null);
  assert.equal(checkoutForm(cfg, { plan: "yearly", referral: null, network: null, email: null }, "u1").get("subscription_data[trial_period_days]"), "7");
  assert.equal(f.get("success_url"), "https://p.test/app?checkout=done");
  assert.equal(f.get("cancel_url"), "https://p.test/app");
  const parsed = parseCheckoutRequest({ plan: "monthly", return_to: "app" });
  assert.equal(parsed.ok && parsed.req.returnTo, "app");
  assert.equal(checkoutForm(cfg, { plan: "yearly", referral: null, network: null, email: null }, "u1").get("success_url"), cfg.successUrl);
});

test("a checkout with no payment due records a trial", () => {
  const meta = { product: "polingual", user_id: "u1", plan: "yearly" };
  assert.equal(entitlementFromEvent({ type: "checkout.session.completed", data: { object: { metadata: meta, payment_status: "no_payment_required", subscription: "sub_1" } } })?.status, "trialing");
});

test("handlePortal fails closed and opens a session for a web customer", async () => {
  const base = { secretKey: () => "sk", userId: async () => "u1", customer: async () => "cus_1", createPortal: async () => "https://billing.stripe.test/p", returnUrl: "https://p.test/app/account" };
  assert.equal((await handlePortal({ ...base, secretKey: () => null })).status, 503);
  assert.equal((await handlePortal({ ...base, userId: async () => null })).status, 401);
  assert.equal((await handlePortal({ ...base, customer: async () => null })).status, 404);
  assert.equal((await handlePortal({ ...base, createPortal: async () => null })).status, 502);
  let sent: URLSearchParams | null = null;
  const r = await handlePortal({ ...base, createPortal: async (_k, f) => ((sent = f), "https://billing.stripe.test/p") });
  assert.deepEqual(r, { status: 200, body: { url: "https://billing.stripe.test/p" } });
  assert.equal((sent as URLSearchParams | null)?.get("customer"), "cus_1");
});

const META = { product: "polingual", user_id: "u1", plan: "yearly" };
const evt = (id: string, created: number, type: string, object: Record<string, unknown>) => JSON.stringify({ id, created, type, data: { object } });

function harness(state: EntitlementState | null, customers: Record<string, string> = {}) {
  const recorded: Entitlement[] = [];
  const patched: { uid: string; status: string; id: string | null }[] = [];
  let row = state;
  const deps: WebhookDeps = {
    secret: () => "whsec",
    now: () => 1_000_000,
    record: async (e) => {
      recorded.push(e);
      row = { user_id: e.user_id, status: e.status, stripe_subscription: e.stripe_subscription ?? row?.stripe_subscription ?? null, last_event_id: e.last_event_id, last_event_at: e.last_event_at };
      return true;
    },
    current: async () => row,
    byCustomer: async (c) => (c === "cus_1" ? row : null),
    chargeCustomer: async (ch) => customers[ch] ?? null,
    patch: async (uid, p) => {
      patched.push({ uid, status: p.status, id: p.last_event_id });
      if (row) row = { ...row, ...p };
      return true;
    },
  };
  const send = (payload: string) => handleWebhook(deps, payload, sign(payload, "whsec", 1000));
  return { deps, send, recorded, patched, row: () => row };
}

test("a late checkout.session.completed never overwrites canceled", async () => {
  const h = harness(null);
  await h.send(evt("evt_del", 200, "customer.subscription.deleted", { id: "sub_1", status: "canceled", metadata: META }));
  assert.equal(h.row()?.status, "canceled");
  const late = await h.send(evt("evt_co", 100, "checkout.session.completed", { metadata: META, payment_status: "paid", customer: "cus_1", subscription: "sub_1" }));
  assert.equal(late.body.stale, true);
  const sameSecond = await h.send(evt("evt_co2", 200, "checkout.session.completed", { metadata: META, payment_status: "paid", customer: "cus_1", subscription: "sub_1" }));
  assert.equal(sameSecond.body.stale, true);
  assert.equal(h.row()?.status, "canceled");
  assert.equal(h.recorded.length, 1);
});

test("stale and duplicate subscription events are skipped", async () => {
  const h = harness(null);
  await h.send(evt("evt_2", 200, "customer.subscription.updated", { id: "sub_1", status: "active", metadata: META }));
  assert.equal((await h.send(evt("evt_1", 100, "customer.subscription.updated", { id: "sub_1", status: "trialing", metadata: META }))).body.stale, true);
  assert.equal((await h.send(evt("evt_2", 200, "customer.subscription.updated", { id: "sub_1", status: "active", metadata: META }))).body.stale, true);
  assert.equal(h.recorded.length, 1);
  assert.equal(h.recorded[0].last_event_id, "evt_2");
  assert.equal(h.recorded[0].last_event_at, new Date(200_000).toISOString());
  await h.send(evt("evt_3", 300, "customer.subscription.updated", { id: "sub_1", status: "past_due", metadata: META }));
  assert.equal(h.row()?.status, "past_due");
});

test("refunds and disputes revoke, a failed invoice marks past_due", async () => {
  const active: EntitlementState = { user_id: "u1", status: "active", stripe_subscription: "sub_1", last_event_id: "evt_0", last_event_at: new Date(100_000).toISOString() };
  const h = harness(active, { ch_9: "cus_1" });
  const failed = await h.send(evt("evt_f", 150, "invoice.payment_failed", { customer: "cus_1" }));
  assert.equal(failed.body.status, "past_due");
  assert.equal((await h.send(evt("evt_pr", 160, "charge.refunded", { customer: "cus_1", refunded: false }))).body.ignored, true);
  assert.equal((await h.send(evt("evt_r", 170, "charge.refunded", { customer: "cus_1", refunded: true }))).body.status, "refunded");
  assert.equal(h.row()?.status, "refunded");
  assert.equal((await h.send(evt("evt_f2", 180, "invoice.payment_failed", { customer: "cus_1" }))).body.ignored, true);
  assert.equal(h.row()?.status, "refunded");
  const d = harness({ ...active }, { ch_9: "cus_1" });
  assert.equal((await d.send(evt("evt_d", 150, "charge.dispute.created", { charge: "ch_9" }))).body.status, "disputed");
  assert.deepEqual(d.patched, [{ uid: "u1", status: "disputed", id: "evt_d" }]);
  const stale = harness({ ...active, last_event_at: new Date(500_000).toISOString() });
  assert.equal((await stale.send(evt("evt_old", 150, "charge.refunded", { customer: "cus_1", refunded: true }))).body.stale, true);
  const stranger = harness({ ...active });
  assert.equal((await stranger.send(evt("evt_x", 150, "charge.refunded", { customer: "cus_other", refunded: true }))).body.ignored, true);
});

test("subscriptionStatus maps every Stripe status explicitly", () => {
  for (const s of ["active", "trialing", "past_due", "unpaid", "incomplete", "incomplete_expired", "paused", "canceled"]) assert.equal(subscriptionStatus(s), s);
  assert.equal(subscriptionStatus("weird"), "unknown");
  assert.deepEqual(["active", "trialing", "past_due"].filter((s) => ACTIVE_STATUSES.has(s)), ["active", "trialing", "past_due"]);
  for (const s of ["unpaid", "incomplete", "incomplete_expired", "paused", "canceled", "refunded", "disputed", "unknown"]) assert.equal(ACTIVE_STATUSES.has(s), false, s);
});

test("past_due keeps access until the period ends, then revokes", () => {
  const appStore = { active: false, productId: null, expiresAt: null, trial: false };
  const now = Date.parse("2026-11-23T00:00:00Z");
  assert.equal(withWebEntitlement(appStore, { status: "past_due", plan: "yearly", current_period_end: "2026-11-30T00:00:00Z" }, now).active, true);
  assert.equal(withWebEntitlement(appStore, { status: "past_due", plan: "yearly", current_period_end: "2026-11-20T00:00:00Z" }, now).active, false);
  for (const status of ["unpaid", "incomplete_expired", "paused", "refunded", "disputed"]) assert.equal(withWebEntitlement(appStore, { status, plan: "yearly", current_period_end: "2026-11-30T00:00:00Z" }, now).active, false, status);
});

test("a second checkout goes to the portal while a web plan is live", async () => {
  const cfg = () => checkoutConfig(ENV);
  const ok = async () => ({ url: "https://checkout.stripe.test/s", id: "cs_1" });
  for (const status of ["active", "trialing", "past_due"]) {
    const r = await handleCheckout({ config: cfg, userId: async () => "u1", currentStatus: async () => status, trialHistory: async () => FRESH, createSession: ok }, {});
    assert.deepEqual(r, { status: 409, body: { error: "already_subscribed", portal: true } });
  }
  assert.equal((await handleCheckout({ config: cfg, userId: async () => "u1", currentStatus: async () => "canceled", trialHistory: async () => FRESH, createSession: ok }, {})).status, 200);
});

test("the portal only opens the signed-in user's own customer", async () => {
  const looked: string[] = [];
  const customers: Record<string, string> = { owner: "cus_owner" };
  const r = await handlePortal({
    secretKey: () => "sk",
    userId: async () => "intruder",
    customer: async (uid) => (looked.push(uid), customers[uid] ?? null),
    createPortal: async () => "https://billing.stripe.test/p",
    returnUrl: "https://p.test/app/account",
  });
  assert.deepEqual(looked, ["intruder"]);
  assert.deepEqual(r, { status: 404, body: { error: "no_web_subscription" } });
});

test("a returning user gets no second trial and keeps their Stripe customer", async () => {
  const cfg = checkoutConfig(ENV) as CheckoutConfig;
  const req = { plan: "yearly" as const, referral: null, network: null, email: "a@b.co" };
  const fresh = checkoutForm(cfg, req, "u1");
  assert.equal(fresh.get("subscription_data[trial_period_days]"), "7");
  assert.equal(fresh.get("customer_email"), "a@b.co");
  const back = checkoutForm(cfg, req, "u1", { used: true, customer: "cus_9" });
  assert.equal(back.get("subscription_data[trial_period_days]"), null);
  assert.equal(back.get("customer"), "cus_9");
  assert.equal(back.get("customer_email"), null);
  for (const prior of ["canceled", "incomplete_expired", "refunded"]) {
    let sent: URLSearchParams | null = null;
    const r = await handleCheckout({ config: () => cfg, userId: async () => "u1", currentStatus: async () => prior, trialHistory: async () => ({ used: true, customer: "cus_9" }), createSession: async (_c, f) => ((sent = f), { url: "https://s", id: "cs" }) }, { plan: "yearly" });
    assert.equal(r.status, 200);
    assert.equal((sent as URLSearchParams | null)?.get("subscription_data[trial_period_days]"), null);
  }
});

test("trial_will_end for a live polingual trial becomes a reminder", async () => {
  const object = { customer: "cus_1", trial_end: 1_800_000_000, metadata: META, cancel_at_period_end: false };
  assert.deepEqual(trialEndingFrom(JSON.parse(evt("evt_t", 1, "customer.subscription.trial_will_end", object))), { eventId: "evt_t", customer: "cus_1", trialEnd: 1_800_000_000 });
  assert.equal(trialEndingFrom(JSON.parse(evt("evt_t", 1, "customer.subscription.trial_will_end", { ...object, cancel_at_period_end: true }))), null);
  assert.equal(trialEndingFrom(JSON.parse(evt("evt_t", 1, "customer.subscription.trial_will_end", { ...object, metadata: { product: "other" } }))), null);
  assert.match(trialEndingEmail(1_800_000_000, "https://p.test").text, /\$59\.99.*https:\/\/p\.test\/app\/account/);
  const h = harness(null);
  const reminded: string[] = [];
  const payload = evt("evt_t", 1, "customer.subscription.trial_will_end", object);
  const ok = await handleWebhook({ ...h.deps, trialEnding: async (t) => (reminded.push(t.eventId), true) }, payload, sign(payload, "whsec", 1000));
  assert.deepEqual([ok.status, reminded], [200, ["evt_t"]]);
  const bad = await handleWebhook({ ...h.deps, trialEnding: async () => false }, payload, sign(payload, "whsec", 1000));
  assert.equal(bad.status, 500);
});

test("a cancel on the trial's first day reaches the funnel with the visitor", async () => {
  const VIS = "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12";
  const cfg = checkoutConfig(ENV) as CheckoutConfig;
  const parsed = parseCheckoutRequest({ plan: "yearly", visitor: VIS.toUpperCase() });
  assert.ok(parsed.ok);
  const f = checkoutForm(cfg, parsed.ok ? parsed.req : (null as never), "u1");
  assert.equal(f.get("subscription_data[metadata][visitor]"), VIS);
  assert.equal(parseCheckoutRequest({ visitor: "x" }).ok && (parseCheckoutRequest({ visitor: "x" }) as { req: { visitor?: string } }).req.visitor, undefined);
  const obj = (at: number) => ({ id: "sub_1", status: "trialing", cancel_at_period_end: true, trial_start: 1_000, canceled_at: at, metadata: { ...META, visitor: VIS } });
  assert.equal(dayZeroCancel({ type: "customer.subscription.updated", data: { object: obj(1_000 + 3_600) } }), VIS);
  assert.equal(dayZeroCancel({ type: "customer.subscription.updated", data: { object: obj(1_000 + 90_000) } }), null);
  assert.equal(dayZeroCancel({ type: "customer.subscription.updated", data: { object: { ...obj(1_100), cancel_at_period_end: false } } }), null);
  const h = harness(null);
  const sent: string[] = [];
  const payload = evt("evt_c", 1, "customer.subscription.updated", obj(1_100));
  await handleWebhook({ ...h.deps, funnel: async (v, n) => void sent.push(`${n}:${v}`) }, payload, sign(payload, "whsec", 1000));
  assert.deepEqual(sent, [`trial_cancel_d0:${VIS}`, `trial_start:${VIS}`]);
});

test("trial_start and paid reach the funnel once per user from billing records", async () => {
  const VIS = "0b6f1d2e-8a4c-4f3e-9d2a-1c5b7e9f0a12";
  const h = harness(null);
  const sent: string[] = [];
  const deps = { ...h.deps, funnel: async (v: string, n: string) => void sent.push(`${n}:${v}`) };
  const go = (p: string) => handleWebhook(deps, p, sign(p, "whsec", 1000));
  await go(evt("evt_1", 10, "checkout.session.completed", { metadata: { ...META, visitor: VIS }, payment_status: "no_payment_required", customer: "cus_1", subscription: "sub_1" }));
  await go(evt("evt_2", 20, "checkout.session.completed", { metadata: { ...META, visitor: VIS }, payment_status: "no_payment_required", customer: "cus_1", subscription: "sub_1" }));
  assert.deepEqual(sent, [`trial_start:${VIS}`]);
  assert.equal(billingStep({ user_id: "u1", status: "active", stripe_subscription: null, last_event_id: null, last_event_at: null }, { ...h.recorded[0], status: "active" }), null);
  assert.equal(billingStep({ user_id: "u1", status: "trialing", stripe_subscription: null, last_event_id: null, last_event_at: null }, { ...h.recorded[0], status: "active" }), "paid");
  assert.equal(funnelVisitor({ data: { object: { metadata: {} } } }, { user_id: "U-2" }), "u-2");
});
