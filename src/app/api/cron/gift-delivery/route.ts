import { NextRequest, NextResponse } from "next/server";
import { giftFulfilDeps } from "@/lib/billing/gift-store";
import { deliverDueGifts, RECONCILE_HOUR_UTC, reconcileGifts } from "@/lib/billing/polingual-gift";
import { cronAuthorized } from "@/lib/whats-new-email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  try {
    const deps = giftFulfilDeps();
    const report = await deliverDueGifts(deps);
    if (!report) return NextResponse.json({ error: "Gift delivery is not configured." }, { status: 503 });
    const reconcile = new Date().getUTCHours() === RECONCILE_HOUR_UTC ? await reconcileGifts(deps) : undefined;
    console.log("[polingual-gift] delivery", report, reconcile ?? "");
    return NextResponse.json({ ok: true, ...report, ...(reconcile ? { reconcile } : {}) });
  } catch (err) {
    console.error("[polingual-gift] delivery run failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Gift delivery failed." }, { status: 502 });
  }
}
