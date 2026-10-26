import test from "node:test";
import assert from "node:assert/strict";
import { X509Certificate, createHash, createPrivateKey, randomUUID, sign } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { APPLE_ROOT_CA_G3_SHA256 } from "../src/lib/app-store/apple-root";
import { appleRoot, verifyJws } from "../src/lib/app-store/jws";
import { classify, decodeNotification } from "../src/lib/app-store/notifications";
import { summarizeStoreEvents, type AppStoreEventStore, type SaveOutcome } from "../src/lib/app-store/store";
import { handleNotification } from "../src/app/api/app-store/notifications/handler";
import { handleStoreSummary } from "../src/app/api/admin/app-store/handler";
import type { StoreEvent } from "../src/lib/app-store/notifications";

const DIR = path.join(__dirname, "../tests/fixtures/app-store");
const pem = (n: string) => fs.readFileSync(path.join(DIR, n), "utf8");
const der = (n: string) => new X509Certificate(pem(n)).raw.toString("base64");
const ROOT = new X509Certificate(pem("root.pem"));
const LEAF_KEY = createPrivateKey(pem("leaf.key"));
const CHAIN = [der("leaf.pem"), der("inter.pem"), der("root.pem")];
const USER = "11111111-1111-4111-8111-111111111111";
const OPTS = { roots: [ROOT] };

function b64url(v: Buffer | string): string {
  return Buffer.from(v).toString("base64url");
}

function jws(payload: Record<string, unknown>, x5c: string[] = CHAIN, alg = "ES256"): string {
  const head = b64url(JSON.stringify({ alg, x5c }));
  const body = b64url(JSON.stringify(payload));
  const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key: LEAF_KEY, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${b64url(sig)}`;
}

function notification(type: string, subtype: string | null, tx: Record<string, unknown> = {}, uuid = randomUUID()): string {
  const signedDate = Date.parse("2027-01-01T12:00:00Z");
  const transaction = jws({ appAccountToken: USER, productId: "polingual.monthly", transactionId: "2000", originalTransactionId: "1000", expiresDate: signedDate + 7 * 86_400_000, signedDate, bundleId: "foundation.bucket.polingual", environment: "Production", ...tx });
  const renewal = jws({ productId: "polingual.monthly", originalTransactionId: "1000", appAccountToken: USER, signedDate });
  return jws({ notificationType: type, subtype, notificationUUID: uuid, signedDate, data: { bundleId: "foundation.bucket.polingual", environment: "Production", signedTransactionInfo: transaction, signedRenewalInfo: renewal } });
}

test("the pinned root is Apple Root CA G3", () => {
  assert.equal(appleRoot().fingerprint256, APPLE_ROOT_CA_G3_SHA256);
  assert.match(appleRoot().subject, /CN=Apple Root CA - G3/);
  assert.equal(createHash("sha256").update(appleRoot().raw).digest("hex").toUpperCase(), APPLE_ROOT_CA_G3_SHA256.replace(/:/g, ""));
});

test("verifyJws accepts the test chain and rejects tampering", () => {
  const token = jws({ hello: "world", signedDate: Date.parse("2027-01-01T00:00:00Z") });
  assert.equal(verifyJws(token, OPTS).hello, "world");
  assert.throws(() => verifyJws(token), /untrusted_root/);
  const [h, , s] = token.split(".");
  assert.throws(() => verifyJws(`${h}.${b64url(JSON.stringify({ hello: "mars" }))}.${s}`, OPTS), /bad_signature/);
  assert.throws(() => verifyJws(jws({}, [der("rogue-leaf.pem"), der("inter.pem"), der("root.pem")]), OPTS), /bad_chain/);
  assert.throws(() => verifyJws(jws({}, [der("leaf.pem"), der("inter.pem"), der("rogue.pem")]), { roots: [ROOT, new X509Certificate(pem("rogue.pem"))] }), /bad_chain/);
  assert.throws(() => verifyJws(jws({}, CHAIN.slice(0, 2)), OPTS), /bad_x5c/);
  assert.throws(() => verifyJws(jws({}, CHAIN, "none"), OPTS), /bad_alg/);
  assert.throws(() => verifyJws(jws({ signedDate: Date.parse("2400-01-01T00:00:00Z") }), OPTS), /expired_chain/);
  assert.throws(() => verifyJws("a.b", OPTS), /malformed/);
});

test("classify maps Apple notification types", () => {
  assert.equal(classify("SUBSCRIBED", "INITIAL_BUY", 1, "FREE_TRIAL"), "trial");
  assert.equal(classify("SUBSCRIBED", "INITIAL_BUY", null, null), "subscribe");
  assert.equal(classify("DID_RENEW", null, null, null), "renew");
  assert.equal(classify("DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_DISABLED", null, null), "cancel");
  assert.equal(classify("REFUND", null, null, null), "refund");
  assert.equal(classify("EXPIRED", "VOLUNTARY", null, null), "expire");
  assert.equal(classify("TEST", null, null, null), "other");
});

test("decodeNotification links the user through appAccountToken", () => {
  const e = decodeNotification(notification("SUBSCRIBED", "INITIAL_BUY", { offerType: 1, offerDiscountType: "FREE_TRIAL" }), OPTS);
  assert.deepEqual([e.kind, e.userId, e.productId, e.originalTransactionId, e.environment], ["trial", USER, "polingual.monthly", "1000", "Production"]);
  assert.equal(e.expiresAt, "2027-01-08T12:00:00.000Z");
});

function memory(): AppStoreEventStore & { rows: Map<string, StoreEvent> } {
  const rows = new Map<string, StoreEvent>();
  return {
    rows,
    save: async (e): Promise<SaveOutcome> => (rows.has(e.notificationUuid) ? "duplicate" : (rows.set(e.notificationUuid, e), "recorded")),
    since: async () => Array.from(rows.values()).map((e) => ({ kind: e.kind, productId: e.productId, environment: e.environment, signedAt: e.signedAt, linked: e.userId !== null })),
  };
}

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/app-store/notifications", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
}

test("the route stores each notification once and refuses forged payloads", async () => {
  const store = memory();
  const deps = { store: () => store, bundleIds: () => ["foundation.bucket.polingual"], verify: OPTS };
  const uuid = randomUUID();
  const signedPayload = notification("REFUND", null, {}, uuid);
  assert.deepEqual(await (await handleNotification(post({ signedPayload }), deps)).json(), { outcome: "recorded" });
  assert.deepEqual(await (await handleNotification(post({ signedPayload }), deps)).json(), { outcome: "duplicate" });
  assert.equal(store.rows.size, 1);
  assert.equal((await handleNotification(post({ signedPayload: signedPayload.slice(0, -4) + "AAAA" }), deps)).status, 400);
  assert.equal((await handleNotification(post({ signedPayload }), { ...deps, verify: undefined })).status, 400);
  assert.equal((await handleNotification(post("{"), deps)).status, 400);
  assert.equal((await handleNotification(post({ signedPayload }), { ...deps, store: () => null })).status, 503);
  const other = await handleNotification(post({ signedPayload: notification("DID_RENEW", null) }), { ...deps, bundleIds: () => ["foundation.bucket.app"] });
  assert.deepEqual(await other.json(), { outcome: "ignored" });
  assert.equal(store.rows.size, 1);
});

test("admin summary counts kinds per product and skips sandbox", async () => {
  const store = memory();
  const deps = { store: () => store, bundleIds: () => [], verify: OPTS };
  for (const [t, s, tx] of [["SUBSCRIBED", "INITIAL_BUY", { offerType: 1 }], ["DID_RENEW", null, {}], ["DID_CHANGE_RENEWAL_STATUS", "AUTO_RENEW_DISABLED", {}], ["EXPIRED", "VOLUNTARY", {}]] as const) {
    await handleNotification(post({ signedPayload: notification(t, s, tx) }), deps);
  }
  const s = summarizeStoreEvents([...(await store.since("")), { kind: "renew", productId: "x", environment: "Sandbox", signedAt: "", linked: false }], 90);
  assert.deepEqual([s.totals.trial, s.totals.renew, s.totals.cancel, s.totals.expire, s.sandbox, s.unlinked], [1, 1, 1, 1, 1, 0]);
  assert.deepEqual(s.byProduct, [{ productId: "polingual.monthly", counts: { trial: 1, renew: 1, cancel: 1, expire: 1 } }]);
  const KEY = "k".repeat(24);
  const req = (key: string | null) => new NextRequest("http://localhost/api/admin/app-store", { headers: key ? { authorization: `Bearer ${key}` } : {} });
  assert.equal((await handleStoreSummary(req(null), { adminKey: () => KEY, store: () => store })).status, 404);
  const ok = await handleStoreSummary(req(KEY), { adminKey: () => KEY, store: () => store });
  assert.equal((await ok.json()).totals.trial, 1);
});
