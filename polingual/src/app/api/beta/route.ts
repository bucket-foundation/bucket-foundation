import { NextRequest, NextResponse } from "next/server";
import { joinBeta, wantsTestflight } from "@/lib/beta";
import { enrollAfterEmail } from "@/lib/testflight";
import { parseSignup } from "@/lib/signup";

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
  const result = await joinBeta(body, process.env, fetch, { origin: req.headers.get("origin"), referer: req.headers.get("referer"), ip, token: typeof (body as { turnstile?: unknown })?.turnstile === "string" ? (body as { turnstile: string }).turnstile : null });
  if (result.status === 200 && wantsTestflight(body)) {
    const parsed = parseSignup(body);
    if (parsed.ok && !parsed.suspect) await enrollAfterEmail(parsed.signup.email, ip || "unknown", process.env, fetch);
  }
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
