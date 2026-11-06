import { NextRequest, NextResponse } from "next/server";
import { liveDeps, reply } from "@/lib/stoa/http";
import { sweep } from "@/lib/stoa/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function POST(req: NextRequest): Promise<NextResponse> {
  return reply(req, await sweep(req.headers.get("authorization"), liveDeps()));
}
