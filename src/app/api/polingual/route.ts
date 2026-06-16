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
// Upstream chain (tried in order, deduped):
//   1. POLINGUAL_API_URL          — primary (e.g. the local full-6.5M box via a
//                                    Cloudflare tunnel). May be down/unreachable.
//   2. POLINGUAL_FALLBACK_API_URL  — fallback (the always-on 209k prod service,
//                                    default https://polingual.agfarms.dev).
//   3. (client) baked ~6,500-word offline subset, on a 503 from here.
// We only fail over on a network error / timeout / 5xx — NOT on a valid 2xx/4xx
// (a "word not found" is a real answer, not an outage).
// Data: Wiktionary via Kaikki (CC-BY-SA); provenance travels in every payload.

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (u: string) => u.replace(/\/$/, "");
const PRIMARY = clean(process.env.POLINGUAL_API_URL ?? "https://polingual.agfarms.dev");
const FALLBACK = clean(process.env.POLINGUAL_FALLBACK_API_URL ?? "https://polingual.agfarms.dev");
// deduped, order-preserving chain (avoid Set-spread for older TS targets)
const UPSTREAMS = PRIMARY === FALLBACK ? [PRIMARY] : [PRIMARY, FALLBACK];

// Short by default so a dead primary fails over to the fallback quickly.
const TIMEOUT_MS = Number(process.env.POLINGUAL_TIMEOUT_MS ?? "4000");

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

  // Try each upstream in order; fail over on network error / timeout / 5xx.
  const t0 = Date.now();
  let lastAborted = false;
  for (let i = 0; i < UPSTREAMS.length; i++) {
    const base = UPSTREAMS[i];
    const isLast = i === UPSTREAMS.length - 1;
    const tier = i === 0 ? "primary" : "fallback";

    const upstream = new URL(base + spec.path);
    for (const p of spec.params) {
      const v = url.searchParams.get(p);
      if (v !== null && v !== "") upstream.searchParams.set(p, v);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(upstream.toString(), {
        signal: controller.signal,
        headers: { accept: "application/json" },
        // server-side fetch; no credentials, no cookies forwarded
      });
      // A 5xx means the upstream is unhealthy — try the next one if any.
      if (res.status >= 500 && !isLast) {
        clearTimeout(timer);
        continue;
      }
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          ...JSON_HEADERS,
          "x-polingual-took-ms": String(Date.now() - t0),
          "x-polingual-upstream": tier,
        },
      });
    } catch (e) {
      lastAborted = e instanceof Error && e.name === "AbortError";
      if (!isLast) {
        clearTimeout(timer);
        continue; // primary unreachable/timed out → try the fallback
      }
      // Every upstream failed → 503 so the client degrades to the baked subset.
      return new Response(
        JSON.stringify(
          {
            error: { code: lastAborted ? "upstream_timeout" : "upstream_unreachable" },
            op,
            note:
              "The full Polingual dictionary service is temporarily unavailable; " +
              "the explorer may fall back to its baked subset.",
            provenance: "Wiktionary via Kaikki (CC-BY-SA)",
          },
          null,
          2,
        ),
        { status: 503, headers: { ...JSON_HEADERS, "x-polingual-upstream": "none" } },
      );
    } finally {
      clearTimeout(timer);
    }
  }
  // Unreachable (loop always returns), but satisfies the type checker.
  return err(503, "upstream_unreachable", { op });
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
