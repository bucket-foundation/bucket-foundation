import { NextRequest, NextResponse } from "next/server";
import { linkValid } from "@/lib/download/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams;
  const target = process.env.DOWNLOAD_ARTIFACT_URL?.trim();
  if (!linkValid(q.get("e"), q.get("s"), process.env.DOWNLOAD_LINK_SECRET?.trim(), Date.now())) {
    return new NextResponse("This link has expired. Request a new one at /download.", { status: 410, headers: { "cache-control": "no-store" } });
  }
  if (!target?.startsWith("https://")) return new NextResponse("Download not published yet.", { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.redirect(target, { status: 302, headers: { "cache-control": "no-store" } });
}
