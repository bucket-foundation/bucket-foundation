import type { NextRequest } from "next/server";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { giftLimiter, supabaseGiftStore } from "@/lib/billing/gift-store";
import { handleRedeem } from "@/lib/billing/polingual-gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limited = giftLimiter("gift-redeem", 10, 3_600_000);

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const r = await handleRedeem({ store: supabaseGiftStore, userId: async () => (await verifyRequestUser(req))?.id ?? null, limited, ip, now: Date.now }, await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual gift redeem", e instanceof Error ? e.message : e);
    return jsonResponse({ error: "redeem_failed" }, 502);
  }
}
