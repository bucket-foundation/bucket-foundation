// GET /api/research/atlas?op=<endpoint>&...params
//
// Same-origin proxy to the research-atlas read-only query API served from the
// Hetzner box (FastAPI over DuckDB opened read_only). The browser hits this
// route same-origin; we forward server-side to the atlas API. The API exposes a
// vetted, parameterized query surface only — NO arbitrary SQL — so this proxy
// just maps a small set of `op`s to the upstream paths + whitelisted params.
//
// op ∈ { stats, funders, portfolio, field-funders, field-works, org, search,
//        metascience-list, metascience }
//
// Env (server-only): ATLAS_API_URL  default "https://atlas-api.agfarms.dev"
// Graceful degradation: API down/unreachable/5xx → clean 503 envelope so the
// explorer can show "the atlas API is offline" without crashing the page.
// A valid 404 (e.g. unknown org) is a real answer and is passed through, not
// treated as an outage.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (u: string) => u.replace(/\/$/, "");
const API = clean(process.env.ATLAS_API_URL ?? "https://atlas-api.agfarms.dev");
const TIMEOUT_MS = Number(process.env.ATLAS_API_TIMEOUT_MS ?? "8000");

// op -> { build(searchParams) => upstream path, params it forwards }
// `id`, `field` and `ror` are path segments on the upstream; the rest are query
// params. We only forward params the upstream understands.
type Spec = {
  build: (sp: URLSearchParams) => string | null;
  params: string[];
};

const enc = (s: string) => encodeURIComponent(s);

const OPS: Record<string, Spec> = {
  stats: { build: () => "/stats", params: [] },
  funders: { build: () => "/funders", params: ["limit"] },
  portfolio: {
    build: (sp) => {
      const id = (sp.get("id") || "").trim();
      return id ? `/funder/${enc(id)}/portfolio` : null;
    },
    params: ["level", "limit"],
  },
  "field-funders": {
    build: (sp) => {
      const id = (sp.get("id") || "").trim();
      return id ? `/field/${enc(id)}/top-funders` : null;
    },
    params: ["limit"],
  },
  "field-works": {
    build: (sp) => {
      const id = (sp.get("id") || "").trim();
      return id ? `/field/${enc(id)}/top-works` : null;
    },
    params: ["limit"],
  },
  org: {
    build: (sp) => {
      const ror = (sp.get("ror") || sp.get("id") || "").trim();
      // upstream /org/<ror:path>/summary accepts a full ROR URL or a bare id
      return ror ? `/org/${ror.replace(/^\/+/, "")}/summary` : null;
    },
    params: [],
  },
  search: { build: () => "/search", params: ["q", "kind", "limit"] },
  "metascience-list": { build: () => "/metascience", params: [] },
  metascience: {
    build: (sp) => {
      const name = (sp.get("name") || "").trim();
      return name ? `/metascience/${enc(name)}` : null;
    },
    params: ["limit", "topic", "year_from", "year_to"],
  },
};

const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=120",
  "x-bucket-atlas": "v1",
} as const;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function offline(detail: string) {
  return json(
    {
      error: { code: "atlas_offline", message: detail },
      hint: "The research-atlas API is not reachable right now. Try again shortly.",
    },
    503,
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...JSON_HEADERS, "access-control-allow-methods": "GET, OPTIONS" },
  });
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const op = (sp.get("op") || "stats").toLowerCase();

  const spec = OPS[op];
  if (!spec) {
    return json({ error: { code: "unknown_op", allowed: Object.keys(OPS) } }, 400);
  }

  const path = spec.build(sp);
  if (path === null) {
    return json({ error: { code: "missing_param", op } }, 400);
  }

  const upstream = new URL(API + path);
  for (const p of spec.params) {
    const v = sp.get(p);
    if (v !== null && v !== "") upstream.searchParams.set(p, v);
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(upstream.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json", "x-bucket-proxy": "atlas-v1" },
    });
  } catch {
    clearTimeout(to);
    return offline("could not reach the atlas API");
  }
  clearTimeout(to);

  // Treat upstream 5xx as an outage (fail soft); pass 2xx/4xx straight through
  // (a 404 "org not found" is a real answer, not an outage).
  if (resp.status >= 500) {
    return offline(`atlas API returned ${resp.status}`);
  }

  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    return offline("atlas API returned a non-JSON response");
  }
  return json(body, resp.status);
}
