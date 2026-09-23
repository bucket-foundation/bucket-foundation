import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (u: string) => u.replace(/\/$/, "");
const PRIMARY = process.env.POLINGUAL_API_URL ? clean(process.env.POLINGUAL_API_URL) : "";
const FALLBACK = process.env.POLINGUAL_FALLBACK_API_URL ? clean(process.env.POLINGUAL_FALLBACK_API_URL) : "";
const UPSTREAMS = Array.from(new Set([PRIMARY, FALLBACK].filter(Boolean)));

const TIMEOUT_MS = Number(process.env.POLINGUAL_TIMEOUT_MS ?? "4000");

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

  if (UPSTREAMS.length === 0) {
    return new Response(
      JSON.stringify(
        {
          error: { code: "upstream_not_configured" },
          op,
          note: "No Polingual API URL is configured; the explorer falls back to its baked subset.",
          provenance: "Wiktionary via Kaikki (CC-BY-SA)",
        },
        null,
        2,
      ),
      { status: 503, headers: { ...JSON_HEADERS, "x-polingual-upstream": "none" } },
    );
  }

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
      });
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
        continue;
      }
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
