import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { accountHash, handleRtdn, handleVerify, parseRtdn, type PlayDeps, type PlayEntitlement, type PlayGoogle, type PlayRow } from "../src/lib/billing/play";
import { googlePlayClient, serviceAccount, verifyPubSubToken } from "../src/lib/billing/play-google";
import type { EntitlementState } from "../src/lib/billing/polingual-checkout";

const PKG = "com.polingual.app";
const YEARLY = "com.polingual.yearly";
const NOW = Date.parse("2026-11-25T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

function sub(over: Record<string, unknown> = {}, item: Record<string, unknown> = {}) {
  return {
    subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    startTime: iso(NOW - 3600_000),
    externalAccountIdentifiers: { obfuscatedExternalAccountId: accountHash("u1") },
    lineItems: [{ productId: YEARLY, expiryTime: iso(NOW + 7 * 86400_000), offerPhase: { freeTrial: {} }, ...item }],
    ...over,
  };
}

function world(google: Partial<Record<string, Record<string, unknown> | null>> = {}) {
  const rows = new Map<string, PlayRow>();
  const ents = new Map<string, EntitlementState & { plan?: string; current_period_end?: string | null }>();
  const events: string[] = [];
  const acks: string[] = [];
  const trials: string[] = [];
  const g: PlayGoogle = {
    subscription: async (_p, t) => google[t] ?? null,
    product: async (_p, _id, t) => google[t] ?? null,
    acknowledge: async (_p, kind, _id, t) => (acks.push(`${kind}:${t}`), true),
  };
  const deps: PlayDeps = {
    google: () => g,
    store: {
      row: async (t) => rows.get(t) ?? null,
      save: async (r) => (rows.set(r.purchase_token, { ...r }), true),
      replace: async (t) => void (rows.has(t) && rows.set(t, { ...(rows.get(t) as PlayRow), state: "replaced" })),
    },
    current: async (u) => ents.get(u) ?? null,
    record: async (e: PlayEntitlement) => (ents.set(e.user_id, { user_id: e.user_id, status: e.status, stripe_subscription: null, last_event_id: e.last_event_id, last_event_at: e.last_event_at, plan: e.plan, current_period_end: e.current_period_end }), true),
    markTrial: async (u) => void trials.push(u),
    funnel: async (v, n) => void events.push(`${n}:${v}`),
    now: () => NOW,
  };
  return { rows, ents, events, acks, trials, deps, google };
}

const body = (token = "tok1", productId = YEARLY) => ({ packageName: PKG, productId, purchaseToken: token });

function rtdn(n: Record<string, unknown>) {
  return { message: { data: Buffer.from(JSON.stringify({ version: "1.0", packageName: PKG, eventTimeMillis: String(NOW), ...n })).toString("base64"), messageId: "m1" } };
}

test("verify trial writes entitlement, marks trial, acks, emits trial_start once", async () => {
  const w = world({ tok1: sub() });
  const r = await handleVerify(w.deps, "u1", body());
  assert.equal(r.status, 200);
  assert.equal(r.body.state, "trialing");
  assert.equal(w.ents.get("u1")?.status, "trialing");
  assert.equal(w.ents.get("u1")?.plan, "yearly");
  assert.deepEqual(w.trials, ["u1"]);
  assert.deepEqual(w.acks, ["subs:tok1"]);
  await handleVerify(w.deps, "u1", body());
  assert.deepEqual(w.events, ["trial_start:u1"]);
});

test("verify refuses bad input, missing user, foreign hash and token bound to another user", async () => {
  const w = world({ tok1: sub() });
  assert.equal((await handleVerify(w.deps, null, body())).status, 401);
  assert.equal((await handleVerify(w.deps, "u1", { ...body(), packageName: "x" })).status, 400);
  assert.equal((await handleVerify(w.deps, "u1", body("tok1", "other"))).status, 400);
  assert.equal((await handleVerify(w.deps, "u2", body())).status, 409);
  await handleVerify(w.deps, "u1", body());
  const w2 = world({ tok1: sub({ externalAccountIdentifiers: {} }) });
  await handleVerify(w2.deps, "u1", body());
  assert.equal((await handleVerify(w2.deps, "u2", body())).status, 409);
  assert.equal((await handleVerify(world().deps, "u1", body())).status, 400);
});

test("verify returns 503 without service account", async () => {
  const w = world();
  assert.equal((await handleVerify({ ...w.deps, google: () => null }, "u1", body())).status, 503);
});

test("pending purchase stores row without access or ack", async () => {
  const w = world({ tok1: sub({ subscriptionState: "SUBSCRIPTION_STATE_PENDING" }) });
  const r = await handleVerify(w.deps, "u1", body());
  assert.equal(r.body.active, false);
  assert.deepEqual(w.acks, []);
  assert.equal(w.rows.get("tok1")?.state, "incomplete");
});

test("lifetime product verifies through products.get", async () => {
  const w = world({ tokL: { purchaseState: 0, acknowledgementState: 0, purchaseTimeMillis: String(NOW), obfuscatedExternalAccountId: accountHash("u1") } });
  const r = await handleVerify(w.deps, "u1", body("tokL", "com.polingual.lifetime"));
  assert.equal(r.body.state, "active");
  assert.equal(w.ents.get("u1")?.current_period_end, null);
  assert.deepEqual(w.acks, ["inapp:tokL"]);
  assert.deepEqual(w.events, ["paid:u1"]);
});

test("active Stripe row is left alone", async () => {
  const w = world({ tok1: sub() });
  w.ents.set("u1", { user_id: "u1", status: "active", stripe_subscription: "sub_1", last_event_id: "evt", last_event_at: null });
  await handleVerify(w.deps, "u1", body());
  assert.equal(w.ents.get("u1")?.stripe_subscription, "sub_1");
  assert.equal(w.rows.get("tok1")?.user_id, "u1");
});

test("upgrade marks linked token replaced", async () => {
  const w = world({ tok1: sub(), tok2: sub({ linkedPurchaseToken: "tok1" }, { offerPhase: { basePrice: {} } }) });
  await handleVerify(w.deps, "u1", body("tok1"));
  await handleVerify(w.deps, "u1", body("tok2"));
  assert.equal(w.rows.get("tok1")?.state, "replaced");
  assert.equal(w.ents.get("u1")?.status, "active");
});

test("rtdn renew moves trial to paid once", async () => {
  const w = world({ tok1: sub() });
  await handleVerify(w.deps, "u1", body());
  w.google.tok1 = sub({}, { offerPhase: { basePrice: {} }, expiryTime: iso(NOW + 365 * 86400_000) });
  const r = await handleRtdn(w.deps, true, rtdn({ subscriptionNotification: { notificationType: 2, purchaseToken: "tok1", subscriptionId: YEARLY } }));
  assert.equal(r.status, 200);
  assert.equal(w.ents.get("u1")?.status, "active");
  await handleRtdn(w.deps, true, rtdn({ subscriptionNotification: { notificationType: 2, purchaseToken: "tok1", subscriptionId: YEARLY } }));
  assert.deepEqual(w.events, ["trial_start:u1", "paid:u1"]);
});

test("rtdn cancel inside day zero emits trial_cancel_d0 once and keeps access to expiry", async () => {
  const w = world({ tok1: sub() });
  await handleVerify(w.deps, "u1", body());
  w.google.tok1 = sub({ subscriptionState: "SUBSCRIPTION_STATE_CANCELED", canceledStateContext: { userInitiatedCancellation: { cancelTime: iso(NOW - 60_000) } } });
  const n = rtdn({ subscriptionNotification: { notificationType: 3, purchaseToken: "tok1", subscriptionId: YEARLY } });
  await handleRtdn(w.deps, true, n);
  await handleRtdn(w.deps, true, n);
  assert.deepEqual(w.events, ["trial_start:u1", "trial_cancel_d0:u1"]);
  assert.equal(w.ents.get("u1")?.status, "trialing");
});

test("rtdn expire and refund revoke", async () => {
  const w = world({ tok1: sub({}, { offerPhase: { basePrice: {} } }) });
  await handleVerify(w.deps, "u1", body());
  w.google.tok1 = sub({ subscriptionState: "SUBSCRIPTION_STATE_EXPIRED" });
  await handleRtdn(w.deps, true, rtdn({ subscriptionNotification: { notificationType: 13, purchaseToken: "tok1", subscriptionId: YEARLY } }));
  assert.equal(w.ents.get("u1")?.status, "canceled");
  await handleRtdn(w.deps, true, rtdn({ voidedPurchaseNotification: { purchaseToken: "tok1", orderId: "GPA.1", productType: 1, refundType: 1 } }));
  assert.equal(w.ents.get("u1")?.status, "refunded");
  assert.equal(w.rows.get("tok1")?.state, "refunded");
});

test("rtdn refund before verify stores unbound row that stays refunded", async () => {
  const w = world({ tok9: sub({ subscriptionState: "SUBSCRIPTION_STATE_EXPIRED" }) });
  const r = await handleRtdn(w.deps, true, rtdn({ voidedPurchaseNotification: { purchaseToken: "tok9", productType: 1 } }));
  assert.equal(r.body.unbound, true);
  assert.equal(w.rows.get("tok9")?.state, "refunded");
  const v = await handleVerify(w.deps, "u1", body("tok9"));
  assert.equal(v.body.state, "refunded");
  assert.equal(v.body.active, false);
});

test("rtdn refuses unauthorized and ignores test or foreign package", async () => {
  const w = world();
  assert.equal((await handleRtdn(w.deps, false, rtdn({ testNotification: {} }))).status, 401);
  assert.equal((await handleRtdn(w.deps, true, rtdn({ testNotification: {} }))).body.ignored, true);
  assert.equal((await handleRtdn(w.deps, true, { message: { data: Buffer.from(JSON.stringify({ packageName: "x", subscriptionNotification: { purchaseToken: "t" } })).toString("base64") } })).body.ignored, true);
  assert.equal(parseRtdn({}), null);
});

test("pubsub token check: audience, issuer, email", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (aud: string, email: string) =>
    new SignJWT({ email, email_verified: true }).setProtectedHeader({ alg: "RS256", kid: "k" }).setIssuer("https://accounts.google.com").setAudience(aud).setIssuedAt(NOW / 1000).setExpirationTime(NOW / 1000 + 600).sign(privateKey);
  const opts = { audience: "https://x/api/play/rtdn", email: "push@p.iam.gserviceaccount.com", keys, now: NOW };
  assert.equal(await verifyPubSubToken(`Bearer ${await sign(opts.audience, opts.email)}`, opts), true);
  assert.equal(await verifyPubSubToken(`Bearer ${await sign("other", opts.email)}`, opts), false);
  assert.equal(await verifyPubSubToken(`Bearer ${await sign(opts.audience, "evil@x")}`, opts), false);
  assert.equal(await verifyPubSubToken(null, opts), false);
  assert.equal(await verifyPubSubToken(`Bearer ${await sign(opts.audience, opts.email)}`, { ...opts, audience: "" }), false);
});

test("google client signs a service-account grant and calls androidpublisher", async () => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const { exportPKCS8 } = await import("jose");
  const sa = serviceAccount(Buffer.from(JSON.stringify({ client_email: "sa@p.iam.gserviceaccount.com", private_key: await exportPKCS8(privateKey) })).toString("base64"));
  assert.ok(sa);
  assert.equal(serviceAccount("nope"), null);
  const calls: string[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "at", expires_in: 3600 }));
    if (url.includes("missing")) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify({ subscriptionState: "SUBSCRIPTION_STATE_ACTIVE" }));
  }) as typeof fetch;
  const c = googlePlayClient(sa, "https://ap.test", fetcher);
  assert.equal((await c.subscription(PKG, "t/1"))?.subscriptionState, "SUBSCRIPTION_STATE_ACTIVE");
  assert.equal(await c.subscription(PKG, "missing"), null);
  assert.equal(await c.acknowledge(PKG, "subs", YEARLY, "t"), true);
  assert.deepEqual(calls, [
    "POST https://oauth2.googleapis.com/token",
    "GET https://ap.test/androidpublisher/v3/applications/com.polingual.app/purchases/subscriptionsv2/tokens/t%2F1",
    "GET https://ap.test/androidpublisher/v3/applications/com.polingual.app/purchases/subscriptionsv2/tokens/missing",
    "POST https://ap.test/androidpublisher/v3/applications/com.polingual.app/purchases/subscriptions/com.polingual.yearly/tokens/t:acknowledge",
  ]);
});
