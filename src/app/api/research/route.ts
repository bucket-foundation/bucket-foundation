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
  "x-robots-tag": "all",
  link: '</cite-forever/v0.1>; rel="license"',
};

// Additive feed402/0.2+ fields layered onto every envelope (backward compatible).
const CITE_LICENSE = "bucket.foundation/cite-forever/v0.1";
const PAYOUT_WALLET =
  process.env.BUCKET_PAYOUT_WALLET ??
  "0xa91115B1AB8412f380Fd62446F523559F668b96B";

function citeBlock(tier: string) {
  return {
    price_usd: TIER_PRICES[tier] ?? 0,
    payout_wallet: PAYOUT_WALLET,
    license: CITE_LICENSE,
  };
}

function provenanceStep(action: string, via: string) {
  return {
    action,
    at: new Date().toISOString(),
    by: "bucket-proxy/v1",
    via,
  };
}

function mergeCiteFields(
  envelope: unknown,
  tier: string,
  via: string,
): unknown {
  if (envelope && typeof envelope === "object" && !Array.isArray(envelope)) {
    const obj = envelope as Record<string, unknown>;
    const existingProv = Array.isArray(obj.provenance)
      ? (obj.provenance as unknown[])
      : [];
    return {
      ...obj,
      cite: obj.cite ?? citeBlock(tier),
      tags: obj.tags ?? [],
      canon_tier: obj.canon_tier ?? "candidate",
      foundation_branches: obj.foundation_branches ?? [],
      provenance: [...existingProv, provenanceStep("proxied", via)],
    };
  }
  return envelope;
}

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
        buyer_wallet: null,
        status: "upstream_unavailable",
      },
      cite: citeBlock(tier),
      tags: [],
      canon_tier: "candidate",
      foundation_branches: [],
      provenance: [provenanceStep("upstream_unavailable", GATEWAY_URL)],
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

  // Gateway routes live under /research/* — insight is POST, sources are GET
  const upstream =
    tier === "insight"
      ? `${GATEWAY_URL}/research/insight`
      : `${GATEWAY_URL}/research/pubmed/search?q=${encodeURIComponent(q)}`;
  const upstreamMethod = tier === "insight" ? "POST" : "GET";
  const upstreamBody =
    tier === "insight" ? JSON.stringify({ q, query: q }) : undefined;

  // Attempt call. If BUCKET_WALLET_PRIVATE_KEY is set we'd sign here — for
  // Track A we forward the raw call and let upstream 402 through if unsigned.
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(upstream, {
      method: upstreamMethod,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-bucket-proxy": "v1",
      },
      body: upstreamBody,
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

  // 402 from upstream (payment required) → decode the x402 challenge so the
  // caller gets a structured, actionable envelope. This is the zero-key demo
  // path: the proxy wallet isn't funded yet, but an agent reading this
  // response can (a) pay the challenge directly from its own wallet, or
  // (b) read /llms-full.txt for funding status.
  if (resp.status === 402) {
    const challengeB64 = resp.headers.get("payment-required") ?? "";
    let challenge: Record<string, unknown> | null = null;
    let price_usd = TIER_PRICES[tier];
    let payTo: string | null = null;
    let asset: string | null = null;
    let network: string | null = null;
    try {
      const decoded = Buffer.from(challengeB64, "base64").toString("utf-8");
      challenge = JSON.parse(decoded);
      const accepts = (challenge?.accepts as Array<Record<string, unknown>>) ?? [];
      const first = accepts[0] ?? {};
      payTo = (first.payTo as string) ?? null;
      asset = (first.extra as Record<string, unknown>)?.name as string ?? "USDC";
      network = (first.network as string) ?? null;
      const amt = Number(first.amount ?? 0);
      if (amt > 0) price_usd = amt / 1_000_000; // USDC has 6 decimals
    } catch {
      // keep defaults
    }
    return json(
      {
        data: null,
        citation: {
          type: "source",
          provider: "bucket-foundation",
          canonical_url: "https://www.bucket.foundation/protocol",
          license: "CC-BY-4.0",
          retrieved_at: new Date().toISOString(),
        },
        receipt: {
          tier,
          status: "payment_required",
          price_usd,
          asset,
          network,
          pay_to: payTo,
          challenge: challengeB64 || null,
          demo: true,
        },
        cite: {
          price_usd,
          payout_wallet: payTo ?? PAYOUT_WALLET,
          license: CITE_LICENSE,
        },
        tags: [],
        canon_tier: "candidate",
        foundation_branches: [],
        provenance: [provenanceStep("payment_required", GATEWAY_URL)],
        error: {
          code: "payment_required",
          message:
            "This endpoint requires x402 payment. The bucket.foundation proxy wallet is not yet funded — you can (a) pay the x402 challenge directly from your own Base wallet using receipt.challenge, or (b) check back soon for zero-key service. See https://www.bucket.foundation/llms-full.txt §4 for details.",
        },
      },
      {
        status: 402,
        headers: {
          "x-bucket-tier": tier,
          "payment-required": challengeB64,
        },
      },
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

  let enriched = mergeCiteFields(envelope, tier, GATEWAY_URL);

  // Permanence layer (feature-flagged OFF by default).
  // When BUCKET_PERMANENCE_ENABLED=true, every successful envelope is
  // dual-written to Arweave (via Irys) + EAS on Base before return.
  // Failures are logged but do NOT break the 200 response — the envelope
  // still goes back to the caller without permanence receipts.
  if (
    resp.ok &&
    process.env.BUCKET_PERMANENCE_ENABLED === "true" &&
    enriched &&
    typeof enriched === "object"
  ) {
    try {
      const { permanentize } = await import("@/lib/permanence/dual-write");
      const r = await permanentize(
        enriched as Record<string, unknown> & { provenance?: unknown[] },
      );
      enriched = r.enriched;
    } catch (e) {
      console.error("[permanence] dual-write failed:", e);
    }
  }

  return json(enriched, {
    status: resp.status,
    headers: { "x-bucket-tier": tier },
  });
}
