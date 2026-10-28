import type { NextRequest } from "next/server";
import { supabaseAppStoreEventStore } from "@/lib/app-store/store";
import { verifyRequestUser } from "@/lib/auth/verify";
import { handleAccountToken } from "../notifications/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleAccountToken(req, { store: supabaseAppStoreEventStore, verifyUser: verifyRequestUser });
}
