/**
 * POST /api/mcp, the hosted MCP endpoint (Streamable HTTP, stateless JSON
 * responses): `src/lib/mcp/server.ts` holds the dispatch and the tools.
 * GET returns 405 (no server-initiated stream), DELETE returns 405 (no
 * session to end), OPTIONS answers CORS preflight for browser clients.
 */
import { NextRequest, NextResponse } from "next/server";
import { handleBody } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, authorization, mcp-protocol-version, mcp-session-id",
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, 400);
  }
  const out = await handleBody(body);
  if (out === null) return new NextResponse(null, { status: 202, headers: CORS });
  return json(out);
}

export async function GET() {
  return json({ error: "this server does not open a server-initiated stream; POST JSON-RPC messages" }, 405);
}

export async function DELETE() {
  return json({ error: "stateless server; no session to end" }, 405);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
