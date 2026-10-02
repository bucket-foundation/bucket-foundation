import { NextRequest, NextResponse } from "next/server";
import { freshPublicWhatsNew, LEGACY_ENTRIES, revalidateWhatsNew } from "@/lib/whats-new/cached";
import { handlePublish } from "@/lib/whats-new/handler";
import { getWhatsNewStore } from "@/lib/whats-new/store";
import { queueInstant, sendInstant } from "@/lib/whats-new-email/instant";
import { digestLedger } from "@/lib/whats-new-email/send";
import { mailWiring } from "@/lib/whats-new-email/wiring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };
const MAIL_BUDGET_MS = 40_000;

async function mailNow(id: string): Promise<Record<string, unknown>> {
  const wiring = mailWiring();
  if ("error" in wiring) return { queued: false, reason: wiring.error };
  const { store, progress, config, recipients } = wiring;
  try {
    await queueInstant(store, id, Date.now());
    const report = await sendInstant({ id, entries: freshPublicWhatsNew, store, ledger: digestLedger(store), recipients, config, progress, now: Date.now(), deadline: Date.now() + MAIL_BUDGET_MS });
    return { queued: true, ...report };
  } catch (err) {
    console.error("[whats-new] instant email failed:", err instanceof Error ? err.message : "unknown");
    return { queued: true, reason: "The email stays queued for the next daily run." };
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const result = await handlePublish(
    { authorization: req.headers.get("authorization"), id: params.id, ifMatch: req.headers.get("if-match") },
    { env: process.env, store: getWhatsNewStore(), marks: null, legacy: LEGACY_ENTRIES },
  );
  if (result.publicChanged) revalidateWhatsNew();
  if (result.body === null) return new NextResponse("Not Found", { status: result.status, headers: NO_STORE });
  const email = result.status === 200 && result.body.changed === true && result.body.kind === "production" ? await mailNow(params.id) : undefined;
  return NextResponse.json(email ? { ...result.body, email } : result.body, { status: result.status, headers: NO_STORE });
}
