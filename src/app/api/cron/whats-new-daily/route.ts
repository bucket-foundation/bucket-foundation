import { NextRequest, NextResponse } from "next/server";
import { getWaitlistStore } from "@/lib/waitlist/store";
import { freshPublicWhatsNew } from "@/lib/whats-new/cached";
import { getWhatsNewStore } from "@/lib/whats-new/store";
import { cronAuthorized, digestConfig, digestLedger, optedInRecipients, sendDailyDigest } from "@/lib/whats-new-email/send";
import { getOptOutStore, unsubscribeSecret } from "@/lib/whats-new-email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 50_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  const deadline = Date.now() + BUDGET_MS;
  const config = digestConfig(process.env, unsubscribeSecret());
  if ("missing" in config) return NextResponse.json({ error: "Digest email is not configured.", missing: config.missing }, { status: 503 });
  const list = getWaitlistStore(process.env, "list");
  const downloads = getWaitlistStore(process.env, "downloads");
  const optOuts = getOptOutStore();
  const progress = getOptOutStore(process.env, "progress");
  const store = getWhatsNewStore();
  if (!list || !downloads || !optOuts || !progress || !store) return NextResponse.json({ error: "No Blob store is connected." }, { status: 503 });
  try {
    const report = await sendDailyDigest({
      entries: freshPublicWhatsNew,
      ledger: digestLedger(store),
      recipients: () => optedInRecipients([list, downloads], optOuts, config.secret),
      config,
      now: Date.now(),
      deadline,
      progress,
    });
    console.log("[whats-new] daily digest", report);
    if (report.skipped === "offline") return NextResponse.json({ error: "The mail API is unreachable.", ...report }, { status: 502 });
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[whats-new] daily digest failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Digest failed." }, { status: 502 });
  }
}
