import { NextResponse, type NextRequest } from "next/server";
import { purgeTranslationReports } from "@/lib/academy/translation-report-server";
import { adminKeyMatches } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  try {
    const removed = await purgeTranslationReports();
    if (removed === null) return NextResponse.json({ error: "reports_unavailable" }, { status: 503 });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    console.error("[academy/translation-report] purge failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "purge_failed" }, { status: 502 });
  }
}
