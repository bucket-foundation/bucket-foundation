import { NextRequest, NextResponse } from "next/server";
import { csvReply, liveDeps, preflight, reply } from "@/lib/stoa/http";
import { roomSummary } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest): NextResponse {
  return preflight(req);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await ctx.params;
  const r = await roomSummary(id, req.headers.get("authorization"), liveDeps());
  if (r.status !== 200) return reply(req, r);
  return csvReply(req, `stoa-${r.body.code}-results.csv`, String(r.body.csv));
}
