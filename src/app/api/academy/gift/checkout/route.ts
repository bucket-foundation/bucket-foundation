import type { NextRequest } from "next/server";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { entitlementStoreConfigured } from "@/lib/billing/entitlement-store";
import { giftConfig, giftMailConfig, handleGiftCheckout, WindowLimiter } from "@/lib/billing/polingual-gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";
const limiter = new WindowLimiter(10, 3_600_000);

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const r = await handleGiftCheckout(
      {
        config: () => giftConfig(process.env),
        ready: () => entitlementStoreConfigured() && giftMailConfig(process.env) !== null,
        now: Date.now,
        allow: () => limiter.take(ip, Date.now()),
        createSession: async (cfg, form) => {
          const res = await fetch(`${STRIPE_API}/v1/checkout/sessions`, {
            method: "POST",
            headers: { authorization: `Bearer ${cfg.secretKey}`, "content-type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          });
          const j = (await res.json().catch(() => ({}))) as { url?: string; id?: string };
          if (!res.ok) console.error("polingual gift checkout", res.status);
          return { url: res.ok ? (j.url ?? null) : null, id: j.id ?? null };
        },
      },
      await readJson(req),
    );
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual gift checkout", e);
    return jsonResponse({ error: "checkout_failed" }, 502);
  }
}
