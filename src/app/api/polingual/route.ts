// GET /api/polingual?op=<axis>&surface=<word>&lang=<code>&...
//
// Same-origin proxy to the FULL Polingual photon dictionary served from the
// Hetzner box (all 45k photons + 5 comparison axes), so the explorer is no
// longer limited to the ~6,500-word baked subset. The browser hits this route
// same-origin; we forward server-side to the photon API.
//
// op ∈ { lookup, semantic, phonetic, spelling, etymology, translate, health }
// Forwarded params per axis:
//   lookup     surface, lang
//   semantic   surface, lang, k, cross
//   phonetic   surface, lang, k
//   spelling   surface, lang, k
//   etymology  surface, lang
//   translate  surface, from, to, k
//
// Upstream: https://polingual.agfarms.dev (override with POLINGUAL_API_URL).
// Data: Wiktionary via Kaikki (CC-BY-SA); provenance travels in every payload.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = (
  process.env.POLINGUAL_API_URL ?? "https://polingual.agfarms.dev"
).replace(/\/$/, "");

const TIMEOUT_MS = Number(process.env.POLINGUAL_TIMEOUT_MS ?? "8000");

// op -> upstream path + the query params it accepts
const OPS: Record<string, { path: string; params: string[] }> = {
  health: { path: "/healthz", params: [] },
  lookup: { path: "/lookup", params: ["surface", "lang"] },
  semantic: { path: "/semantic", params: ["surface", "lang", "k", "cross"] },
  phonetic: { path: "/phonetic", params: ["surface", "lang", "k"] },
  spelling: { path: "/spelling", params: ["surface", "lang", "k"] },
  etymology: { path: "/etymology", params: ["surface", "lang"] },
  translate: { path: "/translate", params: ["surface", "from", "to", "k"] },
};

const JSON_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=60",
  "x-bucket-polingual": "v1",
} as const;

function err(status: number, code: string, extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ error: { code }, ...extra }, null, 2),
    { status, headers: JSON_HEADERS },
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const op = (url.searchParams.get("op") || "semantic").toLowerCase();

  const spec = OPS[op];
  if (!spec) {
    return err(400, "unknown_op", { allowed: Object.keys(OPS) });
  }
  if (op !== "health" && !url.searchParams.get("surface")) {
    return err(400, "missing_surface");
  }

  // Build the upstream URL from only the params this op accepts.
  const upstream = new URL(UPSTREAM + spec.path);
  for (const p of spec.params) {
    const v = url.searchParams.get(p);
    if (v !== null && v !== "") upstream.searchParams.set(p, v);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(upstream.toString(), {
      signal: controller.signal,
      headers: { accept: "application/json" },
      // server-side fetch; no credentials, no cookies forwarded
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...JSON_HEADERS, "x-polingual-took-ms": String(Date.now() - t0) },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    // Graceful, explicit fallback note so the client can degrade to the baked
    // subset rather than break, and surface a clear status to the user.
    return new Response(
      JSON.stringify(
        {
          error: { code: aborted ? "upstream_timeout" : "upstream_unreachable" },
          op,
          note:
            "The full Polingual dictionary service is temporarily unavailable; " +
            "the explorer may fall back to its baked subset.",
          provenance: "Wiktionary via Kaikki (CC-BY-SA)",
        },
        null,
        2,
      ),
      { status: 503, headers: JSON_HEADERS },
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "*",
      "access-control-max-age": "86400",
    },
  });
}
