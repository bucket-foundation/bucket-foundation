import { NextRequest, NextResponse } from "next/server";
import { purgeExpired } from "@/lib/download/handler";
import { adminKeyMatches, getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  const removed: Record<string, number> = {};
  try {
    for (const part of ["downloads", "downloads/suspect"] as const) {
      const store = getWaitlistStore(process.env, part);
      if (!store) return NextResponse.json({ error: "No Blob store is connected." }, { status: 503 });
      removed[part] = await purgeExpired(store);
    }
  } catch (err) {
    console.error("[download] retention purge failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Purge failed.", removed }, { status: 502 });
  }
  console.log("[download] retention purge", removed);
  return NextResponse.json({ ok: true, removed });
}
