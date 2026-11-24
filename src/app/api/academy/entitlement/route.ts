import type { NextRequest } from "next/server";
import { supabaseAppStoreEventStore } from "@/lib/app-store/store";
import { entitlementStoreConfigured, readEntitlement } from "@/lib/billing/entitlement-store";
import { webEntitlementsOn } from "@/lib/billing/web-entitlement";
import { verifyRequestUser } from "@/lib/auth/verify";
import { handleEntitlement } from "../../app-store/notifications/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleEntitlement(req, {
    store: supabaseAppStoreEventStore,
    verifyUser: verifyRequestUser,
    web: async (userId) => (webEntitlementsOn(process.env, entitlementStoreConfigured()) ? readEntitlement(userId, "polingual") : null),
  });
}
