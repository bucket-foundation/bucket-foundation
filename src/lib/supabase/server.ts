import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function authConfigured(): boolean {
  return Boolean(URL && ANON);
}

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
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          store.set({ name, value: "", ...options });
        } catch {
        }
      },
    },
  });
}

export function getRequestSupabase(req: NextRequest): SupabaseClient {
  return createServerClient(URL as string, ANON as string, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set() {
      },
      remove() {},
    },
  });
}

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
