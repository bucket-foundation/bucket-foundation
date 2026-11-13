import { NextRequest, NextResponse } from "next/server";
import { liveDeps, preflight, reply } from "@/lib/stoa/http";
import { roomState } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await ctx.params;
  return reply(req, await roomState(id, req.headers.get("authorization"), liveDeps()));
}
