/**
 * bucket.foundation, /api/research/calciumtraceml
 * ------------------------------------------------
 * Same-origin proxy for CalciumTraceML. Computes ΔF/F (rolling-percentile F0
 * baseline) from a calcium-imaging fluorescence trace and detects transients
 * (MAD threshold + single-exponential decay-τ fit). Backend logic is REAL
 * (services/research-tools/tools_imaging.py:run_calcium_trace).
 *
 * POST /api/research/calciumtraceml → gateway /v1/calciumtraceml/submit
 * body { trace, fs_hz?, baseline_window_s?, thresh_mad? }
 * GET /api/research/calciumtraceml?job=<id>[&result=1] → status / result
 *
 * `trace` is a JSON array of fluorescence samples OR the string "demo"
 * (synthetic trace with a known transient count).
 *
 * Env (server-only): TOOLS_GATEWAY_URL. Gateway down → 503 tool_offline.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "calciumtraceml";
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
  let body: { trace?: unknown; fs_hz?: number; baseline_window_s?: number; thresh_mad?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const trace = body.trace ?? "demo";
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
    resp = await gatewayFetch("/v1/calciumtraceml/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trace,
        fs_hz: body.fs_hz ?? 30.0,
        baseline_window_s: body.baseline_window_s ?? 3.0,
        thresh_mad: body.thresh_mad ?? 3.0,
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
