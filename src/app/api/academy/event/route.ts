import type { NextRequest } from "next/server";
import { verifyRequestUser } from "@/lib/auth/verify";
import { supabaseEventStore } from "@/lib/academy/events-server";
import { handleLearnEvent } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleLearnEvent(req, { verifyUser: verifyRequestUser, store: supabaseEventStore });
}
