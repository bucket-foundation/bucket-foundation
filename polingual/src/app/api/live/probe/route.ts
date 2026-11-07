import { NextRequest, NextResponse } from "next/server";
import { clientIp, liveDeps, preflight, readJson, reply } from "@/lib/stoa/http";
import { submitProbe } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return reply(req, await submitProbe(req.headers.get("authorization"), await readJson(req), liveDeps(), clientIp(req)));
}
