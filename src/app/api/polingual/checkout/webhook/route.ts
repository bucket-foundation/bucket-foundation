import { jsonResponse } from "@/lib/academy/device-server";
import { handleWebhook } from "@/lib/billing/polingual-checkout";
import { giftFulfilDeps } from "@/lib/billing/gift-store";
import { handleGiftEvent } from "@/lib/billing/polingual-gift";
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
