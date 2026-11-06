import { NextRequest, NextResponse } from "next/server";
import { liveDeps, preflight, readJson, reply } from "@/lib/stoa/http";
import { playerAction } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; pid: string; action: string }> }): Promise<NextResponse> {
  const { id, pid, action } = await ctx.params;
  return reply(req, await playerAction(id, pid, action, req.headers.get("authorization"), await readJson(req), liveDeps()));
}
