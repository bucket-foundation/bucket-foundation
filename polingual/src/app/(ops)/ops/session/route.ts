import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, EXPIRES_COOKIE, isAdminHost, REFRESH_COOKIE, refreshFounder, requestHost } from "@/lib/ops/gate";
import { sessionCookies } from "../session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminHost(requestHost(req.headers))) return new NextResponse("Not found", { status: 404 });
  const origin = `${req.nextUrl.protocol}//${requestHost(req.headers)}`;
  const r = await refreshFounder(req.cookies.get(REFRESH_COOKIE)?.value ?? "", process.env, fetch);
  if (!r.ok || !r.tokens) {
    const res = NextResponse.redirect(new URL("/sign-in", origin), 303);
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EXPIRES_COOKIE]) res.cookies.delete(name);
    return res;
  }
  const res = NextResponse.redirect(new URL("/", origin), 303);
  for (const c of sessionCookies(r.tokens)) res.cookies.set(c);
  res.headers.set("cache-control", "no-store");
  return res;
}
