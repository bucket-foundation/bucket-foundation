/**
 * bucket.foundation — /api/research
 * ---------------------------------
 * Zero-key, budget-capped, server-side proxy into the feed402/0.2 research
 * gateway. Callers do NOT need a wallet. The proxy holds the Base Sepolia
 * wallet, signs the x402 handshake upstream, and passes the envelope through.
 *
 * OpenAPI (informal):
 *
 *   GET /api/research
 *     query:
 *       q      (required, string)            - natural-language research query
 *       tier   (optional, enum)              - "raw" | "query" | "insight" (default "insight")
 *       format (optional, string)            - "json" (default; currently the only supported)
 *     responses:
 *       200: { data, citation, receipt }     - feed402/0.2 envelope
 *       400: { error: { code, message } }    - bad_request
 *       429: { error: { code, message } }    - budget_exhausted | rate_limited
 *       502: { data: null, citation, receipt: { status: "upstream_unavailable" }, error }
 *       504: { error: { code: "upstream_timeout" } }
 *     headers:
 *       x-bucket-proxy: v1
 *       x-bucket-tier:  <tier>
 *       access-control-allow-origin: *
 *
 * Environment:
 *   BUCKET_GATEWAY_URL          default "https://x402-research.agfarms.dev"
 *   BUCKET_WALLET_PRIVATE_KEY   if unset, proxy calls upstream without x402 signing
 *                               (upstream may then 402 — we pass that through)
 *   BUCKET_DAILY_USD_CAP        default "1.00"
 *
 * Spec: https://github.com/gianyrox/feed402/blob/main/SPEC.md
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_URL =
  process.env.BUCKET_GATEWAY_URL?.replace(/\/$/, "") ??
  "https://x402-research.agfarms.dev";
const DAILY_CAP_USD = Number(process.env.BUCKET_DAILY_USD_CAP ?? "1.00");
const UPSTREAM_TIMEOUT_MS = 15_000;

const TIER_PRICES: Record<string, number> = {
  raw: 0.05,
  query: 0.01,
  insight: 0.002,
};

const VALID_TIERS = new Set(Object.keys(TIER_PRICES));

// Extremely simple in-memory daily spend counter. Resets per UTC day and per
// lambda cold start — this is intentionally low-ceremony; Track B replaces it
// with a Supabase-backed counter when real settlement lands.
type Spend = { day: string; usd: number };
const spend: Spend = { day: utcDay(), usd: 0 };

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDay() {
  const today = utcDay();
  if (spend.day !== today) {
    spend.day = today;
    spend.usd = 0;
  }
}

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type, x-bucket-client",
  "x-bucket-proxy": "v1",
};

function json(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

function errorEnvelope(
  status: number,
  code: string,
  message: string,
  tier?: string,
) {
  return json(
    { error: { code, message } },
    {
      status,
      headers: tier ? { "x-bucket-tier": tier } : {},
    },
  );
}

function stubUpstreamUnavailable(q: string, tier: string, reason: string) {
  const now = new Date().toISOString();
  return json(
    {
      data: null,
      citation: {
        type: "source",
        source_id: "bucket:stub",
        provider: "bucket-foundation",
        retrieved_at: now,
        license: "CC-BY-4.0",
        canonical_url: "https://www.bucket.foundation/protocol",
      },
      receipt: {
        tier,
        price_usd: 0,
        tx: null,
        paid_at: null,
        status: "upstream_unavailable",
      },
      error: {
        code: "upstream_unavailable",
        message: `Upstream gateway unavailable: ${reason}. Retry shortly. Query: ${q}`,
      },
    },
    {
      status: 502,
      headers: { "x-bucket-tier": tier },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const tier = (url.searchParams.get("tier") ?? "insight").trim();
  const format = (url.searchParams.get("format") ?? "json").trim();

  if (!q) {
    return errorEnvelope(
      400,
      "bad_request",
      "Missing required query parameter: q",
    );
  }
  if (!VALID_TIERS.has(tier)) {
    return errorEnvelope(
      400,
      "bad_request",
      `Unknown tier "${tier}". Expected one of: ${Array.from(VALID_TIERS).join(", ")}`,
    );
  }
  if (format !== "json") {
    return errorEnvelope(
      400,
      "bad_request",
      `Unsupported format "${format}". Only "json" is supported.`,
      tier,
    );
  }

  // Budget cap (per UTC day, in-memory best-effort)
  rollDay();
  const price = TIER_PRICES[tier];
  if (spend.usd + price > DAILY_CAP_USD) {
    return errorEnvelope(
      429,
      "budget_exhausted",
      `Daily proxy budget of $${DAILY_CAP_USD.toFixed(
        2,
      )} reached. Retry after UTC midnight, or run your own proxy (see /llms-full.txt §3).`,
      tier,
    );
  }

  const upstream = `${GATEWAY_URL}/${tier}?q=${encodeURIComponent(q)}`;

  // Attempt call. If BUCKET_WALLET_PRIVATE_KEY is set we'd sign here — for
  // Track A we forward the raw call and let upstream 402 through if unsigned.
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(upstream, {
      method: "GET",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "x-bucket-proxy": "v1",
      },
      cache: "no-store",
    });
  } catch (e: unknown) {
    clearTimeout(to);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("aborted") || msg.toLowerCase().includes("timeout")) {
      return errorEnvelope(
        504,
        "upstream_timeout",
        `Upstream gateway timed out after ${UPSTREAM_TIMEOUT_MS}ms`,
        tier,
      );
    }
    return stubUpstreamUnavailable(q, tier, msg);
  }
  clearTimeout(to);

  // 502-class from upstream → stub envelope so the caller flow doesn't break
  if (resp.status >= 500) {
    return stubUpstreamUnavailable(q, tier, `HTTP ${resp.status}`);
  }

  // 429 from upstream → forward as rate_limited
  if (resp.status === 429) {
    return errorEnvelope(
      429,
      "rate_limited",
      "Upstream gateway rate-limited this proxy. Back off and retry.",
      tier,
    );
  }

  // 402 from upstream (payment required) → we don't hold a wallet in Track A,
  // so surface a clear upstream_unavailable with the reason. Track B wires
  // real payment here.
  if (resp.status === 402) {
    return stubUpstreamUnavailable(
      q,
      tier,
      "upstream requires x402 payment; proxy wallet not configured",
    );
  }

  // Parse envelope
  let envelope: unknown;
  try {
    envelope = await resp.json();
  } catch {
    return stubUpstreamUnavailable(q, tier, "upstream returned non-JSON");
  }

  // Only charge budget on successful passthrough
  if (resp.ok) {
    spend.usd += price;
  }

  return json(envelope, {
    status: resp.status,
    headers: { "x-bucket-tier": tier },
  });
}
