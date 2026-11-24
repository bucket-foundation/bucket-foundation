import { jsonResponse } from "@/lib/academy/device-server";
import { handleWebhook, trialEndingEmail, type TrialEnding } from "@/lib/billing/polingual-checkout";
import { claimPaidOnce, sendBillingFunnel } from "@/lib/billing/funnel-send";
import { giftFulfilDeps, sendGiftEmail } from "@/lib/billing/gift-store";
import { giftMailConfig, handleGiftEvent } from "@/lib/billing/polingual-gift";
import { entitlementStoreConfigured, patchEntitlement, readEntitlementByCustomer, readEntitlementState, recordEntitlement } from "@/lib/billing/entitlement-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

async function chargeCustomer(charge: string): Promise<string | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY unset");
  const res = await fetch(`${STRIPE_API}/v1/charges/${encodeURIComponent(charge)}`, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`charge lookup ${res.status}`);
  const j = (await res.json().catch(() => ({}))) as { customer?: unknown };
  return typeof j.customer === "string" && j.customer ? j.customer : null;
}

async function remindTrialEnding(t: TrialEnding): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const mail = giftMailConfig(process.env);
  if (!key || !mail) return true;
  const res = await fetch(`${STRIPE_API}/v1/customers/${encodeURIComponent(t.customer)}`, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) return false;
  const j = (await res.json().catch(() => ({}))) as { email?: unknown };
  if (typeof j.email !== "string" || !j.email) return true;
  const site = (process.env.POLINGUAL_SITE_URL ?? "https://www.polingual.com").replace(/\/$/, "");
  const m = trialEndingEmail(t.trialEnd, site);
  return sendGiftEmail(mail, { to: j.email, subject: m.subject, text: m.text, html: `<p>${m.text}</p>` }, `trial-ending-${t.eventId}`);
}

async function cancelSubscription(subscription: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return false;
  const res = await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(subscription)}`, { method: "DELETE", headers: { authorization: `Bearer ${key}` } });
  return res.ok || res.status === 404;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = await req.text();
    const r = await handleWebhook(
      {
        secret: () => (entitlementStoreConfigured() ? (process.env.STRIPE_WEBHOOK_SECRET ?? null) : null),
        now: Date.now,
        record: recordEntitlement,
        current: (uid) => readEntitlementState(uid, "polingual"),
        byCustomer: (c) => readEntitlementByCustomer(c, "polingual"),
        chargeCustomer,
        patch: (uid, p) => patchEntitlement(uid, "polingual", p),
        gift: (event) => handleGiftEvent(giftFulfilDeps(), event),
        trialEnding: remindTrialEnding,
        funnel: sendBillingFunnel,
        claimPaid: claimPaidOnce,
        cancelSubscription,
      },
      payload,
      req.headers.get("stripe-signature"),
    );
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual webhook", e);
    return jsonResponse({ error: "webhook_failed" }, 500);
  }
}
