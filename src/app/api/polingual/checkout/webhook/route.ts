import { jsonResponse } from "@/lib/academy/device-server";
import { handleWebhook } from "@/lib/billing/polingual-checkout";
import { entitlementStoreConfigured, recordEntitlement } from "@/lib/billing/entitlement-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const payload = await req.text();
    const r = await handleWebhook(
      {
        secret: () => (entitlementStoreConfigured() ? (process.env.STRIPE_WEBHOOK_SECRET ?? null) : null),
        now: Date.now,
        record: recordEntitlement,
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
