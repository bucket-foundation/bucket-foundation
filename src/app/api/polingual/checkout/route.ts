import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { checkoutConfig, handleCheckout } from "@/lib/billing/polingual-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const r = await handleCheckout(
      {
        config: () => checkoutConfig(process.env),
        userId: async () => (await verifyRequestUser(req))?.id ?? null,
        createSession: async (cfg, form) => {
          const res = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
            method: "POST",
            headers: { authorization: `Bearer ${cfg.secretKey}`, "content-type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          });
          const j = (await res.json().catch(() => ({}))) as { url?: string; id?: string };
          if (!res.ok) console.error("polingual checkout", res.status);
          return { url: res.ok ? (j.url ?? null) : null, id: j.id ?? null };
        },
      },
      await readJson(req),
    );
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual checkout", e);
    return jsonResponse({ error: "checkout_failed" }, 502);
  }
}
