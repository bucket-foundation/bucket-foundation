import { NextRequest, NextResponse } from "next/server";
import { liveDeps, preflight, readJson, reply } from "@/lib/stoa/http";
import { createRoom } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return reply(req, await createRoom(req.headers.get("authorization"), await readJson(req), liveDeps()));
}
