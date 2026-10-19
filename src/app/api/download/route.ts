import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/waitlist/core";
import { forgetDownload } from "@/lib/download/handler";
import { captureRequest } from "@/lib/capture/server";
import { adminKeyMatches, getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const FORGET_PARTS = ["downloads", "downloads/suspect", "polingual", "polingual/suspect"] as const;
function clientIp(req: NextRequest): string {
  return req.ip || req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400, headers: NO_STORE });
  }
  const result = await captureRequest({ ...(body && typeof body === "object" ? body : {}), source: "download" }, clientIp(req));
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.WAITLIST_ADMIN_KEY)) return new NextResponse("Not Found", { status: 404, headers: NO_STORE });
  const email = normalizeEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "Give a valid email." }, { status: 400, headers: NO_STORE });
  try {
    for (const part of FORGET_PARTS) {
      const store = getWaitlistStore(process.env, part);
      if (!store) return NextResponse.json({ error: "No Blob store is connected." }, { status: 503, headers: NO_STORE });
      await forgetDownload(store, email);
    }
  } catch (err) {
    console.error("[download] forget failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Delete failed. Try again." }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({ ok: true, deleted: email }, { headers: NO_STORE });
}
