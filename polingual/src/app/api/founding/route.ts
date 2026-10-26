import { NextRequest, NextResponse } from "next/server";
import { parseSignup } from "@/lib/signup";
import { reportSignup } from "@/lib/signup-conversion";
import { claimFounding, fetchSpots } from "@/lib/founding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const spots = await fetchSpots(process.env);
  return NextResponse.json(spots ? { ...spots, siteKey: process.env.TURNSTILE_SITE_KEY?.trim() } : { error: "offline" }, { status: spots ? 200 : 503, headers: { "cache-control": spots ? "s-maxage=30" : "no-store" } });
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
  const parsed = parseSignup(body);
  if (result.status === 200 && parsed.ok && !parsed.suspect) await reportSignup(req, body, parsed.signup.email);
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
