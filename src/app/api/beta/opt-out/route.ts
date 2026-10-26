import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { supabaseBetaStore } from "@/lib/beta/store";
import { handleBetaOptOut } from "../events/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleBetaOptOut(req, { verifyUser: verifyRequestUser, store: supabaseBetaStore });
}
