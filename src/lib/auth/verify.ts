import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { getRequestSupabase } from "../supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface RequestUser {
  id: string;
  email: string | null;
}

export function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : "";
  return token || null;
}

export async function verifyRequestUser(req: NextRequest): Promise<RequestUser | null> {
  if (!SUPABASE_URL || !ANON_KEY) return null;
  try {
    const token = bearerToken(req);
    if (token) {
      const verifier = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await verifier.auth.getUser(token);
      if (error || !data?.user?.id) return null;
      return { id: data.user.id, email: data.user.email ?? null };
    }
    const { data, error } = await getRequestSupabase(req).auth.getUser();
    if (error || !data?.user?.id) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
