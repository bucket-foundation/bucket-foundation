import type { NextRequest } from "next/server";
import { supabaseAppStoreEventStore } from "@/lib/app-store/store";
import { handleNotification, parseBundleIds } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleNotification(req, { store: supabaseAppStoreEventStore, bundleIds: () => parseBundleIds(process.env.APP_STORE_BUNDLE_IDS) });
}
