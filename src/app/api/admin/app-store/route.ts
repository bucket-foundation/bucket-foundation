import type { NextRequest } from "next/server";
import { supabaseAppStoreEventStore } from "@/lib/app-store/store";
import { handleStoreSummary } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleStoreSummary(req, { adminKey: () => process.env.WAITLIST_ADMIN_KEY, store: supabaseAppStoreEventStore });
}
