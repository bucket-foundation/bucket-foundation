import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse, readJson } from "@/lib/academy/device-server";
import { entitlementStoreConfigured } from "@/lib/billing/entitlement-store";
import { handleVerify, type VerifyBody } from "@/lib/billing/play";
import { playDeps } from "@/lib/billing/play-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  if (!entitlementStoreConfigured()) return jsonResponse({ error: "unavailable" }, 503);
  try {
    const user = await verifyRequestUser(req);
    const r = await handleVerify(playDeps(), user?.id ?? null, ((await readJson(req)) ?? {}) as VerifyBody);
    return jsonResponse(r.body, r.status);
  } catch (e) {
    console.error("play verify", e);
    return jsonResponse({ error: "unavailable" }, 503);
  }
}
