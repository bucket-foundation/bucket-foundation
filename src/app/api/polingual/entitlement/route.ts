import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { supabaseEntitlementStore } from "@/lib/polingual/entitlement";
import { handleEntitlement } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleEntitlement(req, { verifyUser: verifyRequestUser, store: supabaseEntitlementStore });
}
