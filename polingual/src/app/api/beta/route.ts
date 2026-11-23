import { NextRequest, NextResponse } from "next/server";
import { joinBeta, wantsTestflight } from "@/lib/beta";
import { requestInvite } from "@/lib/testflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400 });
  }
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const token = typeof (body as { turnstile?: unknown })?.turnstile === "string" ? (body as { turnstile: string }).turnstile : null;
  const meta = { origin: req.headers.get("origin"), referer: req.headers.get("referer"), ip, token };
  const result = wantsTestflight(body) ? await requestInvite(body, process.env, fetch, meta) : await joinBeta(body, process.env, fetch, meta);
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
