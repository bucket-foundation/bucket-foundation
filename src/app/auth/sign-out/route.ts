/**
 * POST /auth/sign-out: end the site session and return to the home page.
 * POST only, so a link on another site cannot sign a person out.
 */
import { NextResponse } from "next/server";
import { authConfigured, getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (authConfigured()) {
    try {
      await getServerSupabase().auth.signOut();
    } catch {
      // A failed remote sign-out still clears the cookies below.
    }
  }
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  return res;
}
