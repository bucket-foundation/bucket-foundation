import { NextRequest, NextResponse } from "next/server";
import { COOKIE_MAX_AGE_SECONDS, COOKIE_NAME, verifyToken } from "@/lib/kruse-token";
import { isProtectedPath, signInUrl } from "@/lib/auth/paths";
import { getMiddlewareSupabase, authConfigured } from "@/lib/supabase/server";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|academy-app|textures|api/(?!kruse)|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|bin|json|txt|xml|webmanifest|mp4|css|js|map)$).*)",
  ],
};

function notFound(): NextResponse {
  return new NextResponse("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function isKrusePath(pathname: string): boolean {
  return pathname === "/kruse" || pathname.startsWith("/kruse/") || pathname.startsWith("/api/kruse");
}

function isKruseGated(pathname: string): boolean {
  if (pathname === "/kruse" || pathname === "/kruse/") return false;
  return pathname.startsWith("/api/kruse") || pathname.startsWith("/kruse/");
}

async function kruse(req: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = req.nextUrl;
  const rawToken = searchParams.get("t");
  if (rawToken) {
    const payload = await verifyToken(rawToken);
    if (!payload) return isKruseGated(pathname) ? notFound() : NextResponse.next();
    const clean = req.nextUrl.clone();
    clean.search = "";
    if (clean.pathname === "/kruse" || clean.pathname === "/kruse/") clean.pathname = "/kruse/search";
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
  if (!isKruseGated(pathname)) return NextResponse.next();
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isKrusePath(pathname)) return kruse(req);

  const res = NextResponse.next({ request: { headers: req.headers } });
  if (!authConfigured()) {
    if (isProtectedPath(pathname)) return NextResponse.redirect(new URL(signInUrl(pathname + req.nextUrl.search), req.url));
    return res;
  }

  const supabase = getMiddlewareSupabase(req, res);
  let signedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  } catch {
    signedIn = false;
  }

  if (!signedIn && isProtectedPath(pathname)) {
    const redirect = NextResponse.redirect(new URL(signInUrl(pathname + req.nextUrl.search), req.url));
    res.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return res;
}
