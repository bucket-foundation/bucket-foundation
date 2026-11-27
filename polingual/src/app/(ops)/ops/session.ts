import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ACCESS_COOKIE, EXPIRES_COOKIE, founderFromToken, isAdminHost, REFRESH_COOKIE, requestHost, type SessionTokens } from "@/lib/ops/gate";

export async function assertAdminHost(): Promise<void> {
  if (!isAdminHost(requestHost(await headers()))) notFound();
}

export async function currentAdmin(): Promise<string | null> {
  await assertAdminHost();
  const jar = await cookies();
  return founderFromToken(jar.get(ACCESS_COOKIE)?.value, process.env, fetch);
}

export async function requireAdmin(): Promise<string> {
  const admin = await currentAdmin();
  if (admin) return admin;
  const jar = await cookies();
  redirect(jar.get(REFRESH_COOKIE)?.value ? "/session" : "/sign-in");
}

const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionCookies(t: SessionTokens, now = Date.now()) {
  const accessAge = Math.max(60, t.expires_at - Math.floor(now / 1000));
  return [
    { name: ACCESS_COOKIE, value: t.access_token, ...cookieOpts, maxAge: accessAge },
    { name: REFRESH_COOKIE, value: t.refresh_token, ...cookieOpts, maxAge: REFRESH_MAX_AGE },
    { name: EXPIRES_COOKIE, value: String(t.expires_at), ...cookieOpts, maxAge: accessAge },
  ];
}

export async function setSession(t: SessionTokens): Promise<void> {
  const jar = await cookies();
  for (const c of sessionCookies(t)) jar.set(c);
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EXPIRES_COOKIE]) jar.delete(name);
}
