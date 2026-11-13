import { NextRequest, NextResponse } from "next/server";
import { clientIpFrom, postgrestRpc, type LiveDeps, type LiveResult } from "./live";
import { buildRoomSet } from "./generators";

const ORIGINS = new Set(["https://polingual.com", "https://www.polingual.com", "https://bucket.foundation", "https://www.bucket.foundation"]);

export function liveDeps(): LiveDeps {
  return { env: process.env, rpc: postgrestRpc(process.env, fetch), send: fetch, build: buildRoomSet };
}

function cors(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const h: Record<string, string> = { "cache-control": "no-store", vary: "origin" };
  if (origin && ORIGINS.has(origin)) {
    h["access-control-allow-origin"] = origin;
    h["access-control-allow-methods"] = "GET, POST, OPTIONS";
    h["access-control-allow-headers"] = "authorization, content-type";
  }
  return h;
}

export function preflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export function reply(req: NextRequest, result: LiveResult): NextResponse {
  return NextResponse.json(result.body, { status: result.status, headers: cors(req) });
}

export function csvReply(req: NextRequest, filename: string, csv: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: { ...cors(req), "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "")}"` },
  });
}

export async function readJson(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  if (text.length > 16_000) return null;
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

export function clientIp(req: NextRequest): string | null {
  return clientIpFrom(req.headers);
}
