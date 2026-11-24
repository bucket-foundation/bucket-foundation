import test from "node:test";
import assert from "node:assert/strict";
import { checkoutConfig, handleCheckout, type CheckoutConfig } from "../src/lib/billing/polingual-checkout";
import type { EntitlementEvent } from "../src/lib/app-store/entitlement";
import { handleTrialUsedGet, handleTrialUsedPost, trialUsed, type TrialStore, type TrialUsedDeps } from "../src/lib/billing/trial-used";

const ENV = { STRIPE_SECRET_KEY: "sk", STRIPE_PRICE_POLINGUAL_MONTHLY: "pm", STRIPE_PRICE_POLINGUAL_YEARLY: "py" };

function world() {
  const flags = new Map<string, TrialStore>();
  const webRows = new Set<string>();
  const apple = new Map<string, EntitlementEvent[]>();
  const sources = (uid: string) => ({
    flag: async () => flags.get(uid) ?? null,
    webRow: async () => webRows.has(uid),
    appStoreEvents: async () => apple.get(uid) ?? [],
  });
  const deps = (uid: string | null): TrialUsedDeps => ({
    userId: async () => uid,
    sources,
    mark: async (u, s) => void (flags.has(u) || flags.set(u, s)),
    reminderEmail: async () => true,
  });
  async function webCheckout(uid: string): Promise<string | null> {
    let trial: string | null = "unset";
    const cfg = checkoutConfig(ENV) as CheckoutConfig;
    await handleCheckout(
      {
        config: () => cfg,
        userId: async () => uid,
        currentStatus: async () => null,
        trialHistory: async (u) => ({ used: await trialUsed(sources(u)), customer: null }),
        createSession: async (_c, f) => ((trial = f.get("subscription_data[trial_period_days]")), { url: "https://s", id: "cs" }),
      },
      { plan: "yearly" },
    );
    return trial;
  }
  return { flags, webRows, apple, deps, webCheckout };
}

test("a new user gets the web trial", async () => {
  const w = world();
  assert.equal(await w.webCheckout("u1"), "7");
  assert.deepEqual((await handleTrialUsedGet(w.deps("u1"))).body, { used: false, reminderEmail: true });
});

test("Android trial first, then web: no second trial", async () => {
  const w = world();
  assert.equal((await handleTrialUsedPost(w.deps("u1"), { store: "play" })).status, 200);
  assert.equal(await w.webCheckout("u1"), null);
});

test("web trial first, then Android: the server reports the trial as used", async () => {
  const w = world();
  w.webRows.add("u1");
  assert.equal((await handleTrialUsedGet(w.deps("u1"))).body.used, true);
});

test("an App Store trial counts on every store", async () => {
  const w = world();
  w.apple.set("u1", [{ kind: "trial", productId: "com.polingual.yearly", originalTransactionId: "1", signedAt: "2026-11-01T00:00:00Z", expiresAt: null }]);
  assert.equal(await w.webCheckout("u1"), null);
  w.apple.set("u2", [{ kind: "other", productId: null, originalTransactionId: null, signedAt: "2026-11-01T00:00:00Z", expiresAt: null }]);
  assert.equal(await w.webCheckout("u2"), "7");
});

test("the trial-used routes need a user and a known store", async () => {
  const w = world();
  assert.equal((await handleTrialUsedGet(w.deps(null))).status, 401);
  assert.equal((await handleTrialUsedPost(w.deps(null), { store: "play" })).status, 401);
  assert.equal((await handleTrialUsedPost(w.deps("u1"), { store: "steam" })).status, 400);
  await handleTrialUsedPost(w.deps("u1"), { store: "play" });
  await handleTrialUsedPost(w.deps("u1"), { store: "web" });
  assert.equal(w.flags.get("u1"), "play");
});
