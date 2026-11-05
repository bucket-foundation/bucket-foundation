import { NextResponse, type NextRequest } from "next/server";
import { drainPurge } from "@/lib/academy/group-shares-server";
import { configured } from "@/lib/academy/groups-server";
import { adminKeyMatches } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  if (!configured()) return NextResponse.json({ error: "sync_unavailable" }, { status: 503 });
  let removed = 0;
  try {
    for (let round = 0; round < 20; round++) {
      const n = await drainPurge();
      removed += n;
      if (n === 0) break;
    }
  } catch (err) {
    console.error("[academy/groups] share purge failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "purge_failed", removed }, { status: 502 });
  }
  return NextResponse.json({ ok: true, removed });
}
