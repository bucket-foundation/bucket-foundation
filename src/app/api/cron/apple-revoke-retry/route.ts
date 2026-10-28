import { NextRequest, NextResponse } from "next/server";
import { retryCronReply, retryPendingRevokes } from "@/lib/academy/apple-token";
import { appleTokenDeps } from "@/lib/academy/apple-token-store";
import { adminKeyMatches } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.CRON_SECRET)) return new NextResponse("Not Found", { status: 404 });
  try {
    const r = await retryPendingRevokes(appleTokenDeps());
    console.log("[apple] pending revoke retry", JSON.stringify(r));
    const { status, body } = retryCronReply(r);
    return NextResponse.json(body, { status });
  } catch (err) {
    console.error("[apple] pending revoke retry failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Retry failed." }, { status: 502 });
  }
}
