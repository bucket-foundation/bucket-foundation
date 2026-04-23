import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/kruse-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy to the Kruse Index search server.
 *
 * In dev: defaults to http://localhost:8765.
 * In prod: set KRUSE_INDEX_URL (will ultimately point at the feed402 wrapper
 * once bkt-005 ships).
 *
 * Enforces the same cookie gate as middleware, so this endpoint is not a
 * bypass even if someone discovers the path.
 */
export async function GET(req: NextRequest) {
  // Same-origin only.
  const origin = req.headers.get("origin");
  if (origin) {
    const reqOrigin = new URL(req.url).origin;
    if (origin !== reqOrigin) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // Re-verify the cookie (defence in depth; middleware already ran).
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return new NextResponse("Not Found", { status: 404 });
  const payload = await verifyToken(cookie);
  if (!payload) return new NextResponse("Not Found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json([]);
  const mode = searchParams.get("mode") ?? "hybrid";
  const limitRaw = parseInt(searchParams.get("limit") ?? "10", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, limitRaw)) : 10;
  if (!["keyword", "semantic", "hybrid"].includes(mode)) {
    return NextResponse.json({ error: "bad mode" }, { status: 400 });
  }

  const base = process.env.KRUSE_INDEX_URL ?? "http://localhost:8765";
  const upstream = `${base.replace(/\/$/, "")}/search?q=${encodeURIComponent(q)}&mode=${mode}&limit=${limit}`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(upstream, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) {
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
