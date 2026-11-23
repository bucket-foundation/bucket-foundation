import { NextRequest, NextResponse } from "next/server";
import { confirmJoin, TESTFLIGHT_JOIN_URL } from "@/lib/testflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  await confirmJoin(req.nextUrl.searchParams.get("e"), req.nextUrl.searchParams.get("t"), ip, process.env);
  return NextResponse.redirect(TESTFLIGHT_JOIN_URL, { status: 302, headers: { "cache-control": "no-store" } });
}
