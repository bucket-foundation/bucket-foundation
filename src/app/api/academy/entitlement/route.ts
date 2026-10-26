import type { NextRequest } from "next/server";
import { supabaseAppStoreEventStore } from "@/lib/app-store/store";
import { verifyRequestUser } from "@/lib/auth/verify";
import { handleEntitlement } from "../../app-store/notifications/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleEntitlement(req, { store: supabaseAppStoreEventStore, verifyUser: verifyRequestUser });
}
