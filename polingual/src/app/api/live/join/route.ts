import { NextRequest, NextResponse } from "next/server";
import { clientIp, liveDeps, preflight, readJson, reply } from "@/lib/stoa/http";
import { joinRoom } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return reply(req, await joinRoom(await readJson(req), clientIp(req), liveDeps()));
}
