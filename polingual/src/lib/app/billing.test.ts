import { test } from "node:test";
import assert from "node:assert/strict";
import { billingMessage, isAppleDevice, isWebProduct, openPortal, startCheckout } from "./billing";

const reply = (status: number, body: unknown, seen?: { url?: string; body?: string }) =>
  (async (u: RequestInfo | URL, init?: RequestInit) => {
    if (seen) Object.assign(seen, { url: String(u), body: String(init?.body) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;

test("startCheckout posts the plan and returns the Stripe url", async () => {
  const seen: { url?: string; body?: string } = {};
  assert.deepEqual(await startCheckout("monthly", reply(200, { url: "https://checkout.stripe.com/c/1" }, seen)), { ok: true, url: "https://checkout.stripe.com/c/1" });
  assert.equal(seen.url, "/api/polingual/checkout");
  assert.deepEqual(JSON.parse(seen.body ?? "{}"), { plan: "monthly", return_to: "app" });
});

test("startCheckout fails closed on errors, bad urls and the network", async () => {
  assert.deepEqual(await startCheckout("yearly", reply(503, { error: "checkout_unavailable" })), { ok: false, error: "checkout_unavailable" });
  assert.deepEqual(await startCheckout("yearly", reply(200, { url: "javascript:alert(1)" })), { ok: false, error: "failed" });
  const down = (async () => {
    throw new Error("x");
  }) as typeof fetch;
  assert.deepEqual(await startCheckout("yearly", down), { ok: false, error: "offline" });
});

test("openPortal reports an App Store subscriber", async () => {
  const r = await openPortal(reply(404, { error: "no_web_subscription" }));
  assert.deepEqual(r, { ok: false, error: "no_web_subscription" });
  assert.match(billingMessage("no_web_subscription"), /Apple/);
  assert.match(billingMessage("weird"), /Try again/);
});

test("isAppleDevice and isWebProduct", () => {
  assert.equal(isAppleDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)"), true);
  assert.equal(isAppleDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), true);
  assert.equal(isAppleDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false);
  assert.equal(isAppleDevice("Mozilla/5.0 (Linux; Android 15)"), false);
  assert.equal(isWebProduct("web.polingual.yearly"), true);
  assert.equal(isWebProduct("com.polingual.yearly"), false);
  assert.equal(isWebProduct(null), false);
});
