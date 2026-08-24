/**
 * bucket.foundation, /api/research/replicheck
 * ------------------------------------------
 * Same-origin proxy for RepliCheck. Run statcheck-style p-value recomputation,
 * the GRIM test, and reporting-completeness flags over reported statistics in
 * pasted Results text. Backend logic is REAL (tools_repli.py:run_repli_check;
 * exact two-tailed scipy.stats + exact GRIM integer arithmetic).
 *
 * POST body { text, alpha?, items? }; `text` is Results text or "demo".
 * GET /api/research/replicheck?job=<id>[&result=1] → status / result
 *
 * Env (server-only): TOOLS_GATEWAY_URL. Gateway down → 503 tool_offline.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "replicheck";
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
  let body: { text?: unknown; alpha?: unknown; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const text = body.text ?? "demo";
  const isDemo = typeof text === "string" && text.trim().toLowerCase() === "demo";
  const ok = isDemo || (typeof text === "string" && text.trim().length >= 8);
  if (!ok) {
    return json(
      {
        error: {
          code: "bad_request",
          message: 'paste a Results section with reported statistics, or use "demo"',
        },
      },
      400,
    );
  }
  const alpha = typeof body.alpha === "number" ? body.alpha : 0.05;
  const items = typeof body.items === "number" ? body.items : 1;

  // [METERING SEAM, TODO(deploy), off in v1] Viatika authorize/price here.

  let resp: Response;
  try {
    resp = await gatewayFetch("/v1/replicheck/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, alpha, items }),
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
