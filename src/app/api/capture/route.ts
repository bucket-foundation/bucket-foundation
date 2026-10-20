import { NextRequest, NextResponse } from "next/server";
import { allowedOrigin } from "@/lib/capture/legs";
import { captureRequest } from "@/lib/capture/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return req.ip || req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = allowedOrigin(req.headers.get("origin"));
  const base: Record<string, string> = { "cache-control": "no-store", vary: "origin" };
  if (!origin) return base;
  return { ...base, "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "600" };
}

export function OPTIONS(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const headers = corsHeaders(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400, headers });
  }
  const result = await captureRequest(body, clientIp(req));
  return NextResponse.json(result.body, { status: result.status, headers });
}
