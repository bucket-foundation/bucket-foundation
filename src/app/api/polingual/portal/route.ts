import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse } from "@/lib/academy/device-server";
import { handlePortal } from "@/lib/billing/polingual-checkout";
import { entitlementStoreConfigured, readStripeCustomer } from "@/lib/billing/entitlement-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const site = (process.env.POLINGUAL_SITE_URL ?? "https://polingual.com").replace(/\/$/, "");
    const r = await handlePortal({
      secretKey: () => (entitlementStoreConfigured() ? process.env.STRIPE_SECRET_KEY?.trim() || null : null),
      userId: async () => (await verifyRequestUser(req))?.id ?? null,
      customer: (uid) => readStripeCustomer(uid, "polingual"),
      returnUrl: `${site}/app/account`,
      createPortal: async (key, form) => {
        const res = await fetch(`${STRIPE_API}/v1/billing_portal/sessions`, {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const j = (await res.json().catch(() => ({}))) as { url?: string };
        if (!res.ok) console.error("polingual portal", res.status);
        return res.ok ? (j.url ?? null) : null;
      },
    });
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual portal", e);
    return jsonResponse({ error: "portal_failed" }, 502);
  }
}
