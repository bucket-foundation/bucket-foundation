import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ID, requeueCredentialFailed } from "@/lib/academy/apple-token";
import { appleTokenDeps } from "@/lib/academy/apple-token-store";
import { adminKeyMatches } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
  if (!adminKeyMatches(given, process.env.WAITLIST_ADMIN_KEY)) return new NextResponse("Not Found", { status: 404, headers: NO_STORE });
  const adminId = req.headers.get("x-admin-id")?.trim() ?? "";
  if (!ADMIN_ID.test(adminId)) return NextResponse.json({ error: "Send x-admin-id: who is requeueing." }, { status: 400, headers: NO_STORE });
  try {
    return NextResponse.json({ ok: true, ...(await requeueCredentialFailed(appleTokenDeps(), adminId)) }, { headers: NO_STORE });
  } catch (err) {
    console.error("[apple] requeue failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Requeue failed." }, { status: 502, headers: NO_STORE });
  }
}
