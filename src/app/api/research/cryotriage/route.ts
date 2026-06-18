/**
 * bucket.foundation — /api/research/cryotriage
 * --------------------------------------------
 * Same-origin proxy for the CryoTriage research tool (cryo-EM micrograph QC).
 * GPU tool — runs in DEMO/synthetic mode on the gateway (no GPU on the box); an
 * uploaded micrograph still runs the CPU triage path. SUBMIT is multipart
 * (optional micrograph upload). Status + result are JSON GETs (see
 * /api/research/labbrain/route.ts + /api/research/patchseqml/route.ts, docs §2.5).
 *
 *   POST /api/research/cryotriage                 → gateway POST /v1/cryotriage/submit
 *        multipart: file=<mic.png>?               (else synthetic micrographs)
 *   GET  ?job=<id> / ?job=<id>&result=1           → status / result (render: "html")
 *
 * Env (server-only): TOOLS_GATEWAY_URL  default "https://research-tools.agfarms.dev"
 * TODO(deploy): set TOOLS_GATEWAY_URL in Vercel + K3s secret bucket/tools-gateway.
 * TODO(deploy): wire a real GPU cryo-EM triage worker (flip cryotriage off demo).
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL = "cryotriage";
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
      headers: { "x-bucket-proxy": "v1", ...(init.headers ?? {}) },
    });
  } finally {
    clearTimeout(to);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: JSON_HEADERS });
}

export async function POST(req: NextRequest) {
  // Multipart pass-through (file optional → synthetic micrographs on the gateway).
  let inForm: FormData | null = null;
  try {
    inForm = await req.formData();
  } catch {
    inForm = null; // allow an empty submit → gateway uses synthetic micrographs
  }
  const out = new FormData();
  const file = inForm?.get("file");
  if (file && file instanceof File && file.size > 0) {
    out.append("file", file, file.name || "mic.png");
  }

  // [METERING SEAM — TODO, off in v1] — see /api/research/labbrain/route.ts.

  let resp: Response;
  try {
    resp = await gatewayFetch(`/v1/${TOOL}/submit`, { method: "POST", body: out });
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
    resp = await gatewayFetch(path, { headers: { accept: "application/json" } });
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
