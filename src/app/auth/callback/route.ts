import { NextResponse, type NextRequest } from "next/server";
import { resolveCallback } from "@/lib/auth/callback";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const target = await resolveCallback(new URL(req.url), () => getServerSupabase().auth);
  return NextResponse.redirect(target);
}
