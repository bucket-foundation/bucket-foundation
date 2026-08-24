/**
 * bucket.foundation, /api/research/hhfit
 * ---------------------------------------
 * Same-origin proxy for the HH-FitML neuroscience tool. Fits single-compartment
 * passive-membrane (RC) parameters, R, C, tau, V0, to a current-clamp voltage
 * trace via scipy least-squares, reporting fit quality (R^2 / RMSE). Backend
 * logic is REAL (services/research-tools/tools_neuro.py:run_hh_fit).
 *
 * POST /api/research/hhfit → gateway POST /v1/hhfit/submit
 * body { trace, current_pa?, dt_ms?, stim_onset_ms? }
 * → { job_id, status, mode, price, [result] }
 * GET /api/research/hhfit?job=<id>[&result=1] → status / result
 *
 * `trace` is a JSON array of mV samples OR the string "demo" (synthetic trace
 * with known ground-truth params, so the real fit is verifiable end-to-end).
 *
 * Env (server-only): TOOLS_GATEWAY_URL. Gateway down → 503 tool_offline.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "hhfit";
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
  let body: {
    trace?: unknown;
    current_pa?: number;
    dt_ms?: number;
    stim_onset_ms?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const trace = body.trace ?? "demo";
  // trace must be the string "demo" OR a non-empty numeric array.
  const isDemo = typeof trace === "string" && trace.trim().toLowerCase() === "demo";
  const isArray = Array.isArray(trace) && trace.length > 0;
  if (!isDemo && !isArray) {
    return json(
      { error: { code: "bad_request", message: 'trace must be a numeric array or the string "demo"' } },
      400,
    );
  }

  // [METERING SEAM, TODO(deploy), off in v1] Viatika authorize/price here.

  let resp: Response;
  try {
    resp = await gatewayFetch("/v1/hhfit/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trace,
        current_pa: body.current_pa ?? 100.0,
        dt_ms: body.dt_ms ?? 0.1,
        stim_onset_ms: body.stim_onset_ms ?? null,
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
