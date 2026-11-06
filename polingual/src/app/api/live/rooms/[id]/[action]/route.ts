import { NextRequest, NextResponse } from "next/server";
import { liveDeps, preflight, reply } from "@/lib/stoa/http";
import { hostAction } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; action: string }> }): Promise<NextResponse> {
  const { id, action } = await ctx.params;
  return reply(req, await hostAction(id, action, req.headers.get("authorization"), liveDeps()));
}
