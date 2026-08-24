/**
 * bucket.foundation, /api/research/labbrain
 * ------------------------------------------
 * Same-origin proxy for the LabBrain research tool (FIRST SLICE of the
 * research-tools surface; see docs/research-tools/04-implementation-architecture.md).
 *
 * The browser ONLY ever talks to bucket.foundation, same-origin. This route
 * forwards server-side to the always-on tools gateway (FastAPI on Hetzner,
 * behind nginx + TLS at research-tools.agfarms.dev). The gateway URL is
 * server-only env (TOOLS_GATEWAY_URL) and is NEVER sent to the client, unlike
 * the legacy gianyrox.com/research/api.json discovery file this replaces.
 *
 * Contract (uniform across all 7 tools, specialized to labbrain here):
 * POST /api/research/labbrain → gateway POST /v1/labbrain/submit
 * body { author, question } → { job_id, status, mode, price, [result] }
 * GET /api/research/labbrain?job=<id> → gateway GET /v1/jobs/<id> (status)
 * GET /api/research/labbrain?job=<id>&result=1→ gateway GET /v1/jobs/<id>/result
 *
 * Env (server-only):
 * TOOLS_GATEWAY_URL default "https://research-tools.agfarms.dev"
 *
 * Graceful degradation: if the gateway is down/unreachable, we return a clean
 * 503 "tool offline" envelope so the page degrades gracefully (mirrors the
 * Polingual proxy ethos), nothing throws, the caller is never stranded.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_URL =
  process.env.TOOLS_GATEWAY_URL?.replace(/\/$/, "") ??
  "https://research-tools.agfarms.dev";
const UPSTREAM_TIMEOUT_MS = Number(process.env.TOOLS_GATEWAY_TIMEOUT_MS ?? "20000");

const JSON_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "x-bucket-tool": "labbrain",
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function offline(detail: string): NextResponse {
  return json(
    {
      error: { code: "tool_offline", message: detail },
      tool: "labbrain",
      hint: "The research tools backend is not reachable right now. Try again shortly.",
    },
    503,
  );
}

async function gatewayFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(`${GATEWAY_URL}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-bucket-proxy": "v1",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(to);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: JSON_HEADERS });
}

// ---- submit ---------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: { author?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_request", message: "invalid JSON body" } }, 400);
  }
  const author = (body.author ?? "").trim();
  const question = (body.question ?? "").trim();
  if (author.length < 2) {
    return json({ error: { code: "bad_request", message: "author required" } }, 400);
  }
  if (question.length < 5) {
    return json({ error: { code: "bad_request", message: "question too short" } }, 400);
  }

  // [METERING SEAM, TODO, off in v1]
  // Resolve caller identity + call the Viatika vendor API to authorize/price
  // this run (server-side; caller never signs or pays, see /api/research
  // trust model + org CLAUDE.md Strategic Priority #6). v1 is a no-op:
  // const decision = await viatikaMeter({ tool: "labbrain", tier: "ask", caller });
  // if (!decision.allow) return json({ error: { code: "payment_required" } }, 402);
  // The gateway stays payment-agnostic; metering lives here, in Bucket.

  let resp: Response;
  try {
    resp = await gatewayFetch("/v1/labbrain/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author, question }),
    });
  } catch {
    return offline("could not reach the tools gateway (submit)");
  }
  if (!resp.ok) {
    // Forward the gateway's structured error (e.g. 400 validation, 502 build fail).
    let err: unknown;
    try {
      err = await resp.json();
    } catch {
      err = { error: { code: "upstream_error", message: `gateway ${resp.status}` } };
    }
    return json(err, resp.status);
  }
  const data = await resp.json();
  return json(data, 200);
}

// ---- status / result ------------------------------------------------------
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const jobId = (url.searchParams.get("job") ?? "").trim();
  const wantResult = url.searchParams.get("result") === "1";

  if (!jobId) {
    return json(
      { error: { code: "bad_request", message: "missing required query param: job" } },
      400,
    );
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
  const data = await resp.json();
  return json(data, 200);
}
