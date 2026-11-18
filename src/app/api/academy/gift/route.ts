import { jsonResponse } from "@/lib/academy/device-server";
import { entitlementStoreConfigured } from "@/lib/billing/entitlement-store";
import { giftStatus } from "@/lib/billing/polingual-gift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return jsonResponse(giftStatus(process.env, entitlementStoreConfigured()));
}
