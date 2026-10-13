import { NextRequest, NextResponse } from "next/server";
import { freshPublicWhatsNew } from "@/lib/whats-new/cached";
import { queuedInstant, sendInstant, type InstantReport } from "@/lib/whats-new-email/instant";
import { cronAuthorized, digestLedger, mailedInstantly, sendDailyDigest } from "@/lib/whats-new-email/send";
import { mailWiring } from "@/lib/whats-new-email/wiring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 50_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  const deadline = Date.now() + BUDGET_MS;
  const wiring = mailWiring();
  if ("error" in wiring) return NextResponse.json({ error: wiring.error, missing: wiring.missing }, { status: wiring.status });
  const { config, progress, store, recipients } = wiring;
  const ledger = digestLedger(store);
  try {
    const instant: InstantReport[] = [];
    for (const id of await queuedInstant(store)) {
      if (Date.now() > deadline) break;
      instant.push(await sendInstant({ id, entries: freshPublicWhatsNew, store, ledger, recipients, config, progress, now: Date.now(), deadline }));
    }
    const report = await sendDailyDigest({
      entries: freshPublicWhatsNew,
      ledger,
      recipients,
      config,
      now: Date.now(),
      deadline,
      progress,
      instant: mailedInstantly,
    });
    console.log("[whats-new] daily digest", report, instant);
    if (report.skipped === "offline") return NextResponse.json({ error: "The mail API is unreachable.", ...report, instant }, { status: 502 });
    return NextResponse.json({ ok: true, ...report, instant });
  } catch (err) {
    console.error("[whats-new] daily digest failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Digest failed." }, { status: 502 });
  }
}
