import { NextRequest, NextResponse } from "next/server";
import { handleDownload, rateLimiter } from "@/lib/download/handler";
import { getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };
const limited = rateLimiter(5, 60_000);

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400, headers: NO_STORE });
  }
  const result = await handleDownload(body, clientIp(req), {
    store: (suspect) => getWaitlistStore(process.env, suspect ? "downloads/suspect" : "downloads"),
    limited,
  });
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}
