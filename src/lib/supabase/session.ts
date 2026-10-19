import type { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { persistentCookie, sessionCookieOptions, type PendingCookie } from "./cookie-options";

export interface SessionResult {
  res: NextResponse;
  signedIn: boolean;
}

export async function updateSession(req: NextRequest, build: () => NextResponse, url: string, anon: string): Promise<SessionResult> {
  const host = req.headers.get("host");
  const secure = req.nextUrl.protocol === "https:";
  const pending: PendingCookie[] = [];
  const supabase = createServerClient(url, anon, {
    cookieOptions: sessionCookieOptions(host),
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(list) {
        for (const c of list) {
          const p = persistentCookie({ name: c.name, value: c.value, options: c.options ?? {} }, host, secure);
          req.cookies.set(p.name, p.value);
          pending.push(p);
        }
      },
    },
  });
  let signedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    signedIn = false;
  }
  const res = build();
  for (const p of pending) res.cookies.set(p.name, p.value, p.options);
  return { res, signedIn };
}
