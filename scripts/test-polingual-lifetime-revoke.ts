import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleWebhook, isLifetime, type EntitlementState, type WebhookDeps } from "../src/lib/billing/polingual-checkout";
import { withWebEntitlement } from "../src/lib/billing/web-entitlement";

const sign = (payload: string, t: number) => `t=${t},v1=${createHmac("sha256", "whsec").update(`${t}.${payload}`).digest("hex")}`;
const evt = (id: string, created: number, type: string, object: Record<string, unknown>) => JSON.stringify({ id, created, type, data: { object } });
const APP_STORE = { active: false, productId: null, expiresAt: null, trial: false };
const META = { product: "polingual", user_id: "u1", plan: "lifetime" };

function world() {
  let row: (EntitlementState & { plan?: string | null; current_period_end?: string | null }) | null = null;
  const deps: WebhookDeps = {
    secret: () => "whsec",
    now: () => 1_000_000,
    record: async (e) => {
      row = { user_id: e.user_id, status: e.status, stripe_subscription: e.stripe_subscription, last_event_id: e.last_event_id, last_event_at: e.last_event_at, plan: e.plan, current_period_end: e.current_period_end };
      return true;
    },
    current: async () => row,
    byCustomer: async (c) => (c === "cus_1" ? row : null),
    chargeCustomer: async (ch) => (ch === "ch_1" ? "cus_1" : null),
    patch: async (_uid, p) => {
      if (row) row = { ...row, ...p };
      return true;
    },
  };
  const send = (p: string) => handleWebhook(deps, p, sign(p, 1000));
  const access = () => withWebEntitlement(APP_STORE, row ? { status: row.status, plan: row.plan ?? null, current_period_end: row.current_period_end ?? null } : null, 2_000_000).active;
  return { send, row: () => row, access };
}

async function bought() {
  const w = world();
  const p = evt("evt_buy", 100, "checkout.session.completed", { id: "cs_l", metadata: META, payment_status: "paid", subscription: null, customer: "cus_1" });
  assert.equal((await w.send(p)).status, 200);
  assert.ok(isLifetime(w.row() ?? { stripe_subscription: null }));
  assert.equal(w.access(), true);
  return w;
}

test("a refunded lifetime purchase loses access", async () => {
  const w = await bought();
  const r = await w.send(evt("evt_ref", 200, "charge.refunded", { customer: "cus_1", refunded: true }));
  assert.equal(r.body.status, "refunded");
  assert.equal(w.row()?.status, "refunded");
  assert.equal(w.access(), false);
});

test("a disputed lifetime purchase loses access", async () => {
  const w = await bought();
  const r = await w.send(evt("evt_dis", 200, "charge.dispute.created", { charge: "ch_1" }));
  assert.equal(r.body.status, "disputed");
  assert.equal(w.row()?.status, "disputed");
  assert.equal(w.access(), false);
});

test("a late lifetime checkout replay after a refund stays refunded", async () => {
  const w = await bought();
  await w.send(evt("evt_ref", 200, "charge.refunded", { customer: "cus_1", refunded: true }));
  await w.send(evt("evt_buy", 100, "checkout.session.completed", { id: "cs_l", metadata: META, payment_status: "paid", subscription: null, customer: "cus_1" }));
  assert.equal(w.row()?.status, "refunded");
  assert.equal(w.access(), false);
});
