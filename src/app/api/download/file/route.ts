import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { checkLink, redeemLink } from "@/lib/download/notify";
import { getMarkStore } from "@/lib/download/marks";
import { getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

function text(body: string, status: number): NextResponse {
  return new NextResponse(body, { status, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8" } });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const now = Date.now();
  const link = checkLink(req.nextUrl.searchParams, process.env.DOWNLOAD_LINK_SECRET?.trim(), now);
  if (!link.ok) return text("This link has expired. Request a new one at /download.", 410);
  const artifact = process.env.DOWNLOAD_ARTIFACT_BLOB?.trim();
  const marks = getMarkStore();
  const store = getWaitlistStore(process.env, "downloads");
  if (!artifact || !marks || !store) return text("Download not published yet.", 503);
  try {
    if (!(await store.read(link.key))) return text("This link has expired. Request a new one at /download.", 410);
    if (!(await redeemLink(marks, link.sig, now))) return text("This link was used. Request a new one at /download.", 410);
    const res = await get(artifact, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return text("Download not published yet.", 503);
    const name = artifact.split("/").pop() ?? "bucket";
    return new NextResponse(res.stream, {
      headers: {
        ...NO_STORE,
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${name.replace(/[^\w.-]/g, "_")}"`,
      },
    });
  } catch (err) {
    console.error("[download] serve failed:", err instanceof Error ? err.message : err);
    return text("Download failed. Try again in a minute.", 502);
  }
}
