import { NextRequest, NextResponse } from "next/server";
import { recordEvents } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Send events as JSON." }, { status: 400 });
  }
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const result = await recordEvents(body, process.env, fetch, {
    origin: req.headers.get("origin"),
    referer: req.headers.get("referer"),
    ip,
    country: req.headers.get("x-vercel-ip-country"),
  });
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
