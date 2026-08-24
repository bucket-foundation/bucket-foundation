/**
 * bucket.foundation, /api/research/proteinscout
 * ----------------------------------------------
 * Same-origin proxy for the ProteinScout research tool. Drop-in copy of the
 * LabBrain proxy (see /api/research/labbrain/route.ts and
 * docs/research-tools/04-implementation-architecture.md §2.5).
 *
 * Contract (uniform across all 7 tools):
 * POST /api/research/proteinscout → gateway POST /v1/proteinscout/submit
 * body { input } → { job_id, status, mode, price, [result] }
 * GET /api/research/proteinscout?job=<id> → gateway GET /v1/jobs/<id> (status)
 * GET /api/research/proteinscout?job=<id>&result=1 → gateway GET /v1/jobs/<id>/result
 *
 * Env (server-only): TOOLS_GATEWAY_URL default "https://research-tools.agfarms.dev"
 * TODO(deploy): set TOOLS_GATEWAY_URL in Vercel + K3s secret bucket/tools-gateway.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "proteinscout";
const GATEWAY_URL =
  process.env.TOOLS_GATEWAY_URL?.replace(/\/$/, "") ??
  "https://research-tools.agfarms.dev";
const UPSTREAM_TIMEOUT_MS = Number(process.env.TOOLS_GATEWAY_TIMEOUT_MS ?? "20000");

const JSON_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "x-bucket-tool": TOOL,
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS });
}

function offline(detail: string): NextResponse {
  return json(
    {
      error: { code: "tool_offline", message: detail },
      tool: TOOL,
      hint: "The research tools backend is not reachable right now. Try again shortly.",
    },
    503,
  );
}

async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(`${GATEWAY_URL}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json", "x-bucket-proxy": "v1", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(to);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: JSON_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: { input?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const input = (body.input ?? "").trim();
  if (input.length < 1) {
    return json({ error: { code: "bad_request", message: "input required" } }, 400);
  }

  // [METERING SEAM, TODO, off in v1], see /api/research/labbrain/route.ts.
  // const decision = await viatikaMeter({ tool: TOOL, tier: "analyze", caller });
  // if (!decision.allow) return json({ error: { code: "payment_required" } }, 402);

  let resp: Response;
  try {
    resp = await gatewayFetch(`/v1/${TOOL}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
    });
  } catch {
    return offline("could not reach the tools gateway (submit)");
  }
  if (!resp.ok) {
    let err: unknown;
    try {
      err = await resp.json();
    } catch {
      err = { error: { code: "upstream_error", message: `gateway ${resp.status}` } };
    }
    return json(err, resp.status);
  }
  return json(await resp.json(), 200);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jobId = (url.searchParams.get("job") ?? "").trim();
  const wantResult = url.searchParams.get("result") === "1";
  if (!jobId) {
    return json({ error: { code: "bad_request", message: "missing required query param: job" } }, 400);
  }
  const path = wantResult
    ? `/v1/jobs/${encodeURIComponent(jobId)}/result`
    : `/v1/jobs/${encodeURIComponent(jobId)}`;
  let resp: Response;
  try {
    resp = await gatewayFetch(path);
  } catch {
    return offline(`could not reach the tools gateway (${wantResult ? "result" : "status"})`);
  }
  if (!resp.ok) {
    let err: unknown;
    try {
      err = await resp.json();
    } catch {
      err = { error: { code: "upstream_error", message: `gateway ${resp.status}` } };
    }
    return json(err, resp.status);
  }
  return json(await resp.json(), 200);
}
