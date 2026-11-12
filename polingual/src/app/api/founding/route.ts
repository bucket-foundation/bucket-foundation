import { NextRequest, NextResponse } from "next/server";
import { claimFounding, foundingStatus } from "@/lib/founding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const status = await foundingStatus(process.env);
  return NextResponse.json(status.body, { headers: { "cache-control": status.cache } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400 });
  }
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const result = await claimFounding(body, process.env, fetch, { origin: req.headers.get("origin"), referer: req.headers.get("referer"), ip, token: typeof (body as { turnstile?: unknown })?.turnstile === "string" ? (body as { turnstile: string }).turnstile : null });
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
