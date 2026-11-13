import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { getMarkStore } from "@/lib/download/marks";
import { serveDownload } from "@/lib/download/serve";
import { getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result = await serveDownload(req.nextUrl.searchParams, {
    secret: process.env.DOWNLOAD_LINK_SECRET?.trim(),
    artifact: process.env.DOWNLOAD_ARTIFACT_BLOB,
    marks: getMarkStore(),
    store: getWaitlistStore(process.env, "downloads"),
    fetchArtifact: (pathname) => get(pathname, { access: "private", useCache: false }),
    now: Date.now(),
  });
  if (result.kind === "text") return new NextResponse(result.body, { status: result.status, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" } });
  return new NextResponse(result.stream, { headers: { ...NO_STORE, "content-type": "application/octet-stream", "content-disposition": `attachment; filename="${result.name}"` } });
}
