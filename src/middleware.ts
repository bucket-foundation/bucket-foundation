/**
 * Gate the private Kruse Index preview.
 *
 * Rules:
 *   - `/kruse` itself is a PUBLIC preview/landing — no gate.
 *   - `/kruse/search` and `/api/kruse/*` are gated by an HS256 magic-link
 *     cookie. Missing / invalid / expired -> 404 (do not leak existence).
 *   - First visit anywhere under /kruse with ?t=<token> -> set cookie,
 *     302 to /kruse/search (strip token).
 */

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_MAX_AGE_SECONDS, COOKIE_NAME, verifyToken } from "@/lib/kruse-token";

export const config = {
  matcher: ["/kruse/:path*", "/api/kruse/:path*"],
};

function notFound(): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function isGatedPath(pathname: string): boolean {
  // The public preview at /kruse is always reachable.
  // Everything deeper under /kruse, plus the JSON API, is gated.
  if (pathname === "/kruse" || pathname === "/kruse/") return false;
  if (pathname.startsWith("/api/kruse")) return true;
  if (pathname.startsWith("/kruse/")) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 1. Incoming magic link: ?t=<token> — accepted on any /kruse path.
  const rawToken = searchParams.get("t");
  if (rawToken) {
    const payload = await verifyToken(rawToken);
    if (!payload) {
      // Invalid token — for the public preview path, let it through unchrome.
      if (!isGatedPath(pathname)) return NextResponse.next();
      return notFound();
    }

    const clean = req.nextUrl.clone();
    clean.search = "";
    // If they clicked a link straight at /kruse, upgrade them to the gated
    // search view now that they have a valid token.
    if (clean.pathname === "/kruse" || clean.pathname === "/kruse/") {
      clean.pathname = "/kruse/search";
    }

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

  // 2. Public preview — no cookie required.
  if (!isGatedPath(pathname)) {
    return NextResponse.next();
  }

  // 3. Gated path — cookie required.
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return notFound();

  const payload = await verifyToken(cookie);
  if (!payload) {
    const res = notFound();
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const headers = new Headers(req.headers);
  headers.set("x-kruse-recipient", payload.r);
  return NextResponse.next({ request: { headers } });
}
