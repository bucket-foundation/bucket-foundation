import { NextRequest, NextResponse } from "next/server";
import { purgeExpired } from "@/lib/download/handler";
import { getMarkStore, MARK_MAX_AGE_MS } from "@/lib/download/marks";
import { adminKeyMatches, getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 45_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  const deadline = Date.now() + BUDGET_MS;
  const removed: Record<string, number> = {};
  let done = true;
  try {
    for (const part of ["downloads", "downloads/suspect"] as const) {
      const store = getWaitlistStore(process.env, part);
      if (!store) return NextResponse.json({ error: "No Blob store is connected." }, { status: 503 });
      const r = await purgeExpired(store, new Date(), deadline);
      removed[part] = r.removed;
      done &&= r.done;
    }
    const marks = getMarkStore();
    if (marks) {
      const r = await marks.sweep(Date.now() - MARK_MAX_AGE_MS, deadline);
      removed.marks = r.removed;
      done &&= r.done;
    }
  } catch (err) {
    console.error("[download] retention purge failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Purge failed.", removed }, { status: 502 });
  }
  console.log("[download] retention purge", removed, done ? "complete" : "partial, resumes next run");
  return NextResponse.json({ ok: true, removed, done });
}
