/**
 * bucket.foundation — /api/research/unitdimcheck
 * -------------------------------------------------
 * Same-origin proxy for UnitDimCheck (universal physics/engineering tool). SI
 * dimensional analysis, unit conversion, and equation dimensional-consistency
 * checking over the 7 SI base dimensions. Backend is REAL (tools_units.py).
 *
 * POST body { op: "convert"|"check"|"parse", value?, from?, to?, equation?, unit? } | { demo: true }
 *   GET  /api/research/unitdimcheck?job=<id>[&result=1] → status / result
 *
 * Env (server-only): TOOLS_GATEWAY_URL. Gateway down → 503 tool_offline.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "unitdimcheck";
const GATEWAY_URL =
  process.env.TOOLS_GATEWAY_URL?.replace(/\/$/, "") ??
  "https://research-tools.agfarms.dev";
const UPSTREAM_TIMEOUT_MS = Number(process.env.TOOLS_GATEWAY_TIMEOUT_MS ?? "30000");

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
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const op = typeof body.op === "string" ? body.op.trim().toLowerCase() : "";
  const demo = body.demo === true || op === "demo";
  if (!demo) {
    if (!["convert", "check", "parse"].includes(op)) {
      return json(
        { error: { code: "bad_request", message: 'op must be "convert", "check", "parse", or use demo' } },
        400,
      );
    }
    if (op === "check" && typeof body.equation !== "string") {
      return json({ error: { code: "bad_request", message: "check needs an equation (e.g. 'N = kg*m/s^2')" } }, 400);
    }
    if (op === "parse" && typeof body.unit !== "string") {
      return json({ error: { code: "bad_request", message: "parse needs a unit string" } }, 400);
    }
    if (op === "convert" && (body.value === undefined || typeof body.from !== "string" || typeof body.to !== "string")) {
      return json({ error: { code: "bad_request", message: "convert needs value, from, and to" } }, 400);
    }
  }

  // [METERING SEAM — TODO(deploy), off in v1] Viatika authorize/price here.

  let resp: Response;
  try {
    resp = await gatewayFetch("/v1/unitdimcheck/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
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
