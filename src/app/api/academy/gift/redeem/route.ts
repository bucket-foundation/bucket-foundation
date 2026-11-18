import type { NextRequest } from "next/server";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { supabaseGiftStore } from "@/lib/billing/gift-store";
import { handleRedeem } from "@/lib/billing/polingual-gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const r = await handleRedeem({ store: supabaseGiftStore, userId: async () => (await verifyRequestUser(req))?.id ?? null, now: Date.now }, await readJson(req));
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("polingual gift redeem", e instanceof Error ? e.message : e);
    return jsonResponse({ error: "redeem_failed" }, 502);
  }
}
