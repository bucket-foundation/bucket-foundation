import { NextRequest, NextResponse } from "next/server";
import { parseSignup } from "@/lib/signup";
import { reportSignup } from "@/lib/signup-conversion";
import { joinBeta } from "@/lib/beta";

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
  const result = await joinBeta(body, process.env, fetch, { origin: req.headers.get("origin"), referer: req.headers.get("referer"), ip });
  const parsed = parseSignup(body);
  if (result.status === 200 && parsed.ok && !parsed.suspect) await reportSignup(req, body, parsed.signup.email);
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
