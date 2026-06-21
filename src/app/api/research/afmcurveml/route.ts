/**
 * bucket.foundation — /api/research/afmcurveml
 * -----------------------------------------
 * Same-origin proxy for AFM-CurveML. AFM force-curve analysis: contact-point detection + Hertz/Sneddon Young's-modulus fit + adhesion. Backend logic is REAL (tools_imaging.py:run_afm_curve).
 *
 * POST body { z, force?, radius_nm?, geometry? }; `z` is an array (with `force`) or "demo".
 *   GET  /api/research/afmcurveml?job=<id>[&result=1] → status / result
 *
 * Env (server-only): TOOLS_GATEWAY_URL. Gateway down → 503 tool_offline.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "afmcurveml";
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
  let body: { z?: unknown; force?: number[]; radius_nm?: number; geometry?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const z = body.z ?? "demo";
  const isDemo = typeof z === "string" && z.trim().toLowerCase() === "demo";
  const isArray = Array.isArray(z) && z.length > 0 && Array.isArray(body.force) && body.force.length > 0;
  if (!isDemo && !isArray) {
    return json(
      { error: { code: "bad_request", message: 'provide z + force arrays, or z="demo"' } },
      400,
    );
  }
  if (body.geometry && body.geometry !== "sphere" && body.geometry !== "cone") {
    return json({ error: { code: "bad_request", message: "geometry must be 'sphere' or 'cone'" } }, 400);
  }

  // [METERING SEAM — TODO(deploy), off in v1] Viatika authorize/price here.

  let resp: Response;
  try {
    resp = await gatewayFetch("/v1/afmcurveml/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        z,
        force: body.force ?? null,
        radius_nm: body.radius_nm ?? 1000.0,
        geometry: body.geometry ?? "sphere",
      }),
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
