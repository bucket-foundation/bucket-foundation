/**
 * Gate the private Kruse Index preview.
 *
 * Rules:
 *   - Only /kruse and /api/kruse/* are gated. Every other route passes through.
 *   - First visit with ?t=<HS256 token>   -> set HttpOnly cookie, 302 to /kruse (strip token).
 *   - Cookie present & valid              -> pass through.
 *   - Missing / invalid / expired         -> return a plain 404 (do not leak existence).
 */

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_MAX_AGE_SECONDS, COOKIE_NAME, verifyToken } from "@/lib/kruse-token";

export const config = {
  matcher: ["/kruse", "/kruse/:path*", "/api/kruse/:path*"],
};

function notFound(): NextResponse {
  // A minimal 404 body — no Next.js chrome, no hint the route exists.
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1. Incoming magic link: ?t=<token>
  const rawToken = searchParams.get("t");
  if (rawToken) {
    const payload = await verifyToken(rawToken);
    if (!payload) return notFound();

    // Redirect to /kruse without the token in the URL.
    const clean = req.nextUrl.clone();
    clean.search = "";
    clean.pathname = "/kruse";

    const res = NextResponse.redirect(clean, 302);
    res.cookies.set(COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    return res;
  }

  // 2. Existing cookie?
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return notFound();

  const payload = await verifyToken(cookie);
  if (!payload) {
    // Stale/invalid cookie — clear it and 404.
    const res = notFound();
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // 3. Valid — pass through. Forward the verified recipient id to downstream
  // route handlers via a request header so the API proxy can log / rate-limit.
  const headers = new Headers(req.headers);
  headers.set("x-kruse-recipient", payload.r);

  // Only /kruse and /api/kruse/* should be reachable.
  if (!pathname.startsWith("/kruse") && !pathname.startsWith("/api/kruse")) {
    return notFound();
  }

  return NextResponse.next({ request: { headers } });
}
