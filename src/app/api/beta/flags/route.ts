import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { supabaseBetaStore } from "@/lib/beta/store";
import { handleBetaFlags } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleBetaFlags(req, { verifyUser: verifyRequestUser, store: supabaseBetaStore });
}
