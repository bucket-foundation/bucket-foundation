import { NextResponse } from "next/server";
import { authConfigured, getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (authConfigured()) {
    try {
      await getServerSupabase().auth.signOut();
    } catch {
    }
  }
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  return res;
}
