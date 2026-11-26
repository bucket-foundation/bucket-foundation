import { NextResponse, type NextRequest } from "next/server";
import { SLIDE_PATH } from "@/lib/ops/carousel";
import { storageUrl } from "@/lib/ops/send";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<NextResponse> {
  const path = (await ctx.params).path.join("/");
  if (!SLIDE_PATH.test(path) || !process.env.POLINGUAL_DB_URL?.trim()) return new NextResponse("Not found", { status: 404 });
  const r = await fetch(storageUrl(path, process.env), { cache: "no-store" });
  if (!r.ok || !r.body) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(r.body, { status: 200, headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400, s-maxage=31536000, immutable" } });
}
