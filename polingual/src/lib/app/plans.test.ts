import { test } from "node:test";
import assert from "node:assert/strict";
import { accessFrom, fetchAccess, PLANS } from "./plans";

test("plans list the five prices", () => {
  assert.deepEqual(PLANS.map((p) => `${p.name} ${p.price}`), ["Monthly $9.99", "Yearly $59.99", "Family $89.99", "Lifetime $149.99", "Student $29.99"]);
});

test("only monthly and yearly sell today; the rest are coming soon", () => {
  assert.deepEqual(PLANS.filter((p) => p.productId).map((p) => p.productId), ["com.polingual.monthly", "com.polingual.yearly"]);
});

test("accessFrom opens only on an active entitlement", () => {
  assert.equal(accessFrom({ status: 200, body: { active: true, productId: "com.polingual.yearly", expiresAt: null, trial: false } }).status, "open");
  assert.equal(accessFrom({ status: 200, body: { active: false } }).status, "locked");
  assert.equal(accessFrom({ status: 401, body: { error: "unauthorized" } }).status, "locked");
  assert.equal(accessFrom({ status: 503, body: { error: "unavailable" } }).status, "unknown");
  assert.equal(accessFrom(null).status, "unknown");
});

test("fetchAccess survives a network failure", async () => {
  const f = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  assert.equal((await fetchAccess(f)).status, "unknown");
  const ok = (async () => new Response(JSON.stringify({ active: true, trial: true }))) as typeof fetch;
  assert.deepEqual(await fetchAccess(ok), { status: "open", productId: null, expiresAt: null, trial: true });
});
