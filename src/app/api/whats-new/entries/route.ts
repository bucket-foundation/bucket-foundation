import { NextRequest, NextResponse } from "next/server";
import whatsNewData from "../../../../../data/whats-new.json";
import { getMarkStore } from "@/lib/download/marks";
import { handleList, handlePost, type Deps, type LegacyEntry, type Result } from "@/lib/whats-new/handler";
import { getWhatsNewStore } from "@/lib/whats-new/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };
const PUBLIC = { "cache-control": "public, max-age=0, s-maxage=300" };
const LEGACY = (whatsNewData as { entries: LegacyEntry[] }).entries;

function deps(): Deps {
  return { env: process.env, store: getWhatsNewStore(), marks: getMarkStore(), legacy: LEGACY };
}

function respond(result: Result, headers: Record<string, string>): NextResponse {
  if (result.body === null) return new NextResponse("Not Found", { status: result.status, headers: NO_STORE });
  return NextResponse.json(result.body, { status: result.status, headers });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const result = await handlePost(
    {
      authorization: req.headers.get("authorization"),
      contentType: req.headers.get("content-type"),
      contentLength: req.headers.get("content-length"),
      body: req.body,
    },
    deps(),
  );
  return respond(result, NO_STORE);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams;
  const state = params.get("state");
  const result = await handleList({ authorization: req.headers.get("authorization"), kind: params.get("kind"), state }, deps());
  return respond(result, state === null && result.status === 200 ? PUBLIC : NO_STORE);
}
