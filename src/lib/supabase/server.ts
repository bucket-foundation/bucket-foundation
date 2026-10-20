import { cookies, headers } from "next/headers";
import { persistentCookie, sessionCookieOptions } from "./cookie-options";
import { updateSession, type SessionResult } from "./session";
import type { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function authConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function getServerSupabase(): SupabaseClient {
  const store = cookies();
  let host: string | null = null;
  let secure = process.env.NODE_ENV === "production";
  try {
    const h = headers();
    host = h.get("host");
    secure = h.get("x-forwarded-proto") === "https" || secure;
  } catch {
    host = null;
  }
  return createServerClient(URL as string, ANON as string, {
    cookieOptions: sessionCookieOptions(host),
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          for (const c of list) {
            const p = persistentCookie({ name: c.name, value: c.value, options: c.options ?? {} }, host, secure);
            store.set(p.name, p.value, p.options);
          }
        } catch {
        }
      },
    },
  });
}

export function getRequestSupabase(req: NextRequest): SupabaseClient {
  return createServerClient(URL as string, ANON as string, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
      },
    },
  });
}

export function refreshMiddlewareSession(req: NextRequest, build: () => NextResponse): Promise<SessionResult> {
  return updateSession(req, build, URL as string, ANON as string);
}

export interface SessionUser {
  id: string;
  email: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!authConfigured()) return null;
  try {
    const { data, error } = await getServerSupabase().auth.getUser();
    if (error || !data.user) return null;
    return toSessionUser(data.user);
  } catch {
    return null;
  }
}

export function toSessionUser(u: User): SessionUser {
  return { id: u.id, email: u.email ?? null };
}
