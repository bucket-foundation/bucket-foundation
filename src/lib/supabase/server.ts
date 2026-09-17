/**
 * Server-side Supabase clients bound to the request's cookies. One session
 * for the whole site: middleware refreshes it, server components and route
 * handlers read it, and the browser client in ./browser writes it.
 */
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function authConfigured(): boolean {
  return Boolean(URL && ANON);
}

/** For server components and route handlers: reads the session from the request cookies. */
export function getServerSupabase(): SupabaseClient {
  const store = cookies();
  return createServerClient(URL as string, ANON as string, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          store.set({ name, value, ...options });
        } catch {
          // Server components cannot write cookies; middleware refreshes them.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          store.set({ name, value: "", ...options });
        } catch {
          // Same as above.
        }
      },
    },
  });
}

/** For a route handler that received a NextRequest: reads the session from that request's cookies. */
export function getRequestSupabase(req: NextRequest): SupabaseClient {
  return createServerClient(URL as string, ANON as string, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set() {
        // Route handlers do not refresh cookies; middleware does.
      },
      remove() {},
    },
  });
}

/** For middleware: reads from the request and writes refreshed cookies onto the response. */
export function getMiddlewareSupabase(req: NextRequest, res: NextResponse): SupabaseClient {
  return createServerClient(URL as string, ANON as string, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({ name, value, ...options });
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({ name, value: "", ...options });
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });
}

export interface SessionUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in person for the current server request, or null. Uses
 * getUser (verified against gotrue) rather than getSession (cookie contents
 * only), so a forged cookie never becomes a user.
 */
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
