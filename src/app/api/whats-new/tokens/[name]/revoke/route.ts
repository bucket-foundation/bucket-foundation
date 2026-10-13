import { NextRequest, NextResponse } from "next/server";
import { handleRevoke } from "@/lib/whats-new/handler";
import { getWhatsNewStore } from "@/lib/whats-new/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

export async function POST(req: NextRequest, { params }: { params: { name: string } }): Promise<NextResponse> {
  const result = await handleRevoke(
    { authorization: req.headers.get("authorization"), name: params.name },
    { env: process.env, store: getWhatsNewStore(), marks: null, legacy: [] },
  );
  if (result.body === null) return new NextResponse("Not Found", { status: result.status, headers: NO_STORE });
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}
