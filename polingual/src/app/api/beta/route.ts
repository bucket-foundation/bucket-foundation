import { NextRequest, NextResponse } from "next/server";
import { joinBeta } from "@/lib/beta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the form as JSON." }, { status: 400 });
  }
  const result = await joinBeta(body, process.env);
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
