import type { CookieOptions } from "@supabase/ssr";
import { cookieDomainFor } from "../research-host";

export const SESSION_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export type PendingCookie = { name: string; value: string; options: CookieOptions };

export function sessionCookieOptions(host: string | null | undefined): CookieOptions {
  const domain = cookieDomainFor(host);
  return { path: "/", sameSite: "lax", maxAge: SESSION_COOKIE_MAX_AGE_SECONDS, ...(domain ? { domain } : {}) };
}

export function persistentCookie(cookie: PendingCookie, host: string | null | undefined, secure: boolean): PendingCookie {
  const base = sessionCookieOptions(host);
  const removing = cookie.value === "" || cookie.options.maxAge === 0;
  return {
    name: cookie.name,
    value: cookie.value,
    options: { ...cookie.options, ...base, secure, maxAge: removing ? 0 : base.maxAge },
  };
}
