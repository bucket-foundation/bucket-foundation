// src/app/api/auth/[...nextauth]/route.ts
// NextAuth v4 App Router catch-all. Lazy-initialised so a Vercel build
// without auth env vars (NEXT_PUBLIC_SUPABASE_URL etc) doesn't crash
// page-data collection. When env is missing, returns 503 at request time.

import { NextRequest } from "next/server";
import NextAuth from "next-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cached: ((req: Request, ctx: unknown) => Promise<Response>) | null = null;

async function getHandler() {
  if (cached) return cached;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!supabaseUrl || !supabaseKey || !nextAuthSecret) {
    cached = async () =>
      new Response(
        JSON.stringify({
          error: "auth_not_configured",
          missing: [
            !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
            !supabaseKey && "SUPABASE_SERVICE_ROLE_KEY",
            !nextAuthSecret && "NEXTAUTH_SECRET",
          ].filter(Boolean),
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    return cached;
  }
  const { authOptions } = await import("@/lib/auth");
  cached = NextAuth(authOptions) as typeof cached;
  return cached!;
}

export async function GET(req: NextRequest, ctx: unknown) {
  const h = await getHandler();
  return h(req, ctx);
}

export async function POST(req: NextRequest, ctx: unknown) {
  const h = await getHandler();
  return h(req, ctx);
}
