import type { NextRequest } from "next/server";
import { supabaseBetaStore } from "@/lib/beta/store";
import { handleBetaReport, handleSetCohort, type BetaAdminDeps } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const deps: BetaAdminDeps = { adminKey: () => process.env.WAITLIST_ADMIN_KEY, store: supabaseBetaStore };

export async function GET(req: NextRequest) {
  return handleBetaReport(req, deps);
}

export async function POST(req: NextRequest) {
  return handleSetCohort(req, deps);
}
