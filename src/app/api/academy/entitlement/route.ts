import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { jsonResponse } from "@/lib/academy/device-server";
import { ACTIVE_STATUSES } from "@/lib/billing/polingual-checkout";
import { entitlementStoreConfigured, readEntitlement } from "@/lib/billing/entitlement-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  if (!entitlementStoreConfigured()) return jsonResponse({ error: "entitlements_unavailable" }, 503);
  const user = await verifyRequestUser(req);
  if (!user) return jsonResponse({ error: "unauthorized" }, 401);
  const product = new URL(req.url).searchParams.get("product") ?? "polingual";
  if (product !== "polingual") return jsonResponse({ error: "unknown_product" }, 400);
  const e = await readEntitlement(user.id, product);
  if (e === undefined) return jsonResponse({ error: "read_failed" }, 500);
  return jsonResponse({
    product,
    entitled: Boolean(e && ACTIVE_STATUSES.has(e.status)),
    status: e?.status ?? "none",
    plan: e?.plan ?? null,
    current_period_end: e?.current_period_end ?? null,
  });
}
