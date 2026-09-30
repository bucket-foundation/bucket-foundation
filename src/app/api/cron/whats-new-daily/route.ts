import { NextRequest, NextResponse } from "next/server";
import whatsNew from "../../../../../data/whats-new.json";
import { getWaitlistStore } from "@/lib/waitlist/store";
import { cronAuthorized, digestConfig, optedInRecipients, sendDailyDigest } from "@/lib/whats-new-email/send";
import { getOptOutStore, unsubscribeSecret } from "@/lib/whats-new-email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUDGET_MS = 270_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  const deadline = Date.now() + BUDGET_MS;
  const config = digestConfig(process.env, unsubscribeSecret());
  if ("missing" in config) return NextResponse.json({ error: "Digest email is not configured.", missing: config.missing }, { status: 503 });
  const list = getWaitlistStore(process.env, "list");
  const downloads = getWaitlistStore(process.env, "downloads");
  const optOuts = getOptOutStore();
  if (!list || !downloads || !optOuts) return NextResponse.json({ error: "No Blob store is connected." }, { status: 503 });
  try {
    const report = await sendDailyDigest({
      entries: whatsNew.entries,
      recipients: () => optedInRecipients([list, downloads], optOuts, config.secret),
      config,
      now: Date.now(),
      deadline,
    });
    console.log("[whats-new] daily digest", report);
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[whats-new] daily digest failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Digest failed." }, { status: 502 });
  }
}
