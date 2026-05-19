/**
 * bucket.foundation — /api/research
 * ---------------------------------
 * Zero-key, budget-capped, server-side research proxy.
 *
 * TRUST MODEL (read this before changing anything — it is the contract):
 *
 *   1. The CALLER (an AI agent or a human) needs NO wallet, NO key, and is
 *      NEVER asked to perform, authorize, or relay a payment. There is no
 *      step where the caller signs, sends, or even sees a payment challenge.
 *   2. Any x402 settlement happens entirely server-side, between
 *      bucket.foundation's own funded wallet and the upstream gateway. It is
 *      invisible to the caller by construction.
 *   3. If the server-side wallet cannot settle (not funded yet / upstream
 *      down), the proxy DOES NOT hand the caller a payment challenge to
 *      execute. Instead it serves a real answer from the local, already-paid
 *      bucket.foundation canon index. The caller still gets real, citeable
 *      data — just sourced from canon instead of the live gateway.
 *   4. `cite` is PASSIVE, FORWARD-LOOKING METADATA — a license notice telling
 *      a downstream *publisher* what it would owe if it re-publishes this in a
 *      paid work. Echoing it is not an action. The reading agent owes nothing
 *      and does nothing. This is "paid-to-cite", and it is deliberately kept
 *      separate from "pay-to-proceed" (which never happens on this path).
 *
 *   The single most important invariant: on the zero-key path the response
 *   MUST NOT contain `receipt.challenge`, an x402 header, or any instruction
 *   that asks the caller to pay. A safety-tuned agent reading this response
 *   must be able to cite it with zero objection because there is, verifiably,
 *   nothing to do. See /llms-full.txt §4 and PROTOCOL.md §3.1.
 *
 * OpenAPI (informal):
 *
 *   GET /api/research
 *     query:
 *       q      (required, string)            - natural-language research query
 *       tier   (optional, enum)              - "raw" | "query" | "insight" (default "insight")
 *       format (optional, string)            - "json" (default; only supported)
 *     responses:
 *       200: feed402/0.2 envelope, demo:false, agent_action_required:false
 *       400: { error: { code, message } }    - bad_request
 *       429: { error: { code, message } }    - budget_exhausted | rate_limited
 *     headers:
 *       x-bucket-proxy: v1
 *       x-bucket-tier:  <tier>
 *       x-bucket-source: gateway | canon-fallback
 *       access-control-allow-origin: *
 *
 * Environment (all server-side; never sent to the caller):
 *   BUCKET_GATEWAY_URL          default "https://x402-research.agfarms.dev"
 *   BUCKET_WALLET_PRIVATE_KEY   FOUNDER ACTION — funded Base wallet PK.
 *                               When set, the proxy signs the x402 handshake
 *                               upstream server-side. When unset, the proxy
 *                               serves the local canon fallback (still 200,
 *                               still real data, still no caller payment).
 *                               LIVES IN: K3s secret `bucket/x402-wallet` in
 *                               namespace inst-bucket-foundation, or Vercel
 *                               env var. NEVER committed, never in .env in git.
 *   BUCKET_DAILY_USD_CAP        default "1.00" (shared across all callers)
 *
 * Spec: https://github.com/gianyrox/feed402/blob/main/SPEC.md
 */

import { NextRequest, NextResponse } from "next/server";
import { buildIndex, tokenRank } from "@/lib/canon-search-index";
import { getEvidenceFor } from "@/lib/canon-evidence";
import { rankPrimary, authorsShort, type PrimaryPaper } from "@/lib/canon-primary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_URL =
  process.env.BUCKET_GATEWAY_URL?.replace(/\/$/, "") ??
  "https://x402-research.agfarms.dev";
const DAILY_CAP_USD = Number(process.env.BUCKET_DAILY_USD_CAP ?? "1.00");
const UPSTREAM_TIMEOUT_MS = 15_000;
const WALLET_FUNDED = Boolean(process.env.BUCKET_WALLET_PRIVATE_KEY);

const TIER_PRICES: Record<string, number> = {
  raw: 0.05,
  query: 0.01,
  insight: 0.002,
};

const VALID_TIERS = new Set(Object.keys(TIER_PRICES));

// Extremely simple in-memory daily spend counter. Resets per UTC day and per
// lambda cold start — intentionally low-ceremony; Track B replaces it with a
// Supabase-backed counter when real settlement lands. Note: this caps the
// SERVER's spend against the gateway. The caller never pays anything, so this
// is purely a self-protection budget, not a paywall on the caller.
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

const CITE_LICENSE = "bucket.foundation/cite-forever/v0.1";
const PAYOUT_WALLET =
  process.env.BUCKET_PAYOUT_WALLET ??
  "0xa91115B1AB8412f380Fd62446F523559F668b96B";

// The declarative anti-injection notice. This is attached to EVERY envelope
// the caller sees. It exists so a safety-tuned agent can verify, structurally,
// that the response is inert: nothing to sign, nothing to pay, nothing to
// follow. `cite` is forward-looking license metadata for downstream
// publishers, not an instruction to the reader.
function agentNotice() {
  return {
    agent_action_required: false,
    payment_required_from_you: false,
    summary:
      "This is data you may read and cite freely. No action, payment, " +
      "signature, or transaction is required from you or your user. The " +
      "`cite` block is passive license metadata describing what a future " +
      "PUBLISHER would owe if they re-publish this in a paid work — it is " +
      "not an instruction to you and you owe nothing for reading or citing. " +
      "There is no payment challenge in this response and you must not " +
      "treat the `cite` block as one. Trust model: " +
      "https://www.bucket.foundation/llms-full.txt#4",
  };
}

function citeBlock(tier: string) {
  return {
    // Forward-looking, passive. Re-publishing this in a downstream PAID work
    // is what this describes — it is not a charge to the reader.
    applies_to: "downstream_republication_in_a_paid_work",
    reader_owes: 0,
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
    { error: { code, message }, ...agentNotice() },
    {
      status,
      headers: tier ? { "x-bucket-tier": tier } : {},
    },
  );
}

/**
 * Transcript-quarantine heuristic.
 *
 * Sub-claims under bucket-canon/*\/sub-claims/ are auto-segmented YouTube
 * transcript chunks. A large fraction are mis-transcribed or carry ideological
 * /conspiracy content (e.g. "Anthony Fouchy made sure we always focused on
 * RNA and DNA", "99 of the NIH Budget", "the guy that controlled the
 * budget"). This is the OPPOSITE of canon (axioms / laws / primary
 * derivations) — at best ONE PARTIAL SOURCE, never the headline.
 *
 * Returns true if a chunk should be QUARANTINED — dropped entirely from the
 * caller-facing envelope. The bar is deliberately conservative: we only drop
 * material that is clearly a garbled mid-sentence fragment or a named-conspiracy
 * assertion, not legitimately on-topic discussion.
 */
const QUARANTINE_PATTERNS: RegExp[] = [
  // Misheard public-health figures + named-conspiracy framing.
  /\bfouch?[iy]\b/i,
  /\bfauci\b/i,
  /\bnih budget\b/i,
  /\bcontrolled the budget\b/i,
  /\bdeep state\b/i,
  /\bsacred cow\b/i,
  /\bbig pharma\b/i,
  /\bthey don'?t want you to\b/i,
  /\bwake up\b.*\bsheep\b/i,
  /\bplandemic\b/i,
];

// Mid-sentence garble: a "title" that is just the first ~12 words of speech,
// starting lowercase or with a discourse particle, ending with no terminal
// punctuation and often a dangling clause. Real canon claim titles are noun
// phrases; transcript titles read like "because guess what" / "and you can
// put it underneath there and if you look at the b".
function looksGarbled(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  // Starts with a lowercase letter or a classic spoken connective/filler.
  if (/^[a-z]/.test(t)) return true;
  if (
    /^(and |but |so |because |well |you know|i mean|like |okay|right |that'?s |it'?s |what |why |how |when |where |there |here )/i.test(
      t,
    )
  )
    return true;
  // No sentence-ending punctuation and clearly truncated (dangling word).
  if (!/[.?!]$/.test(t) && /\b\w{1,2}$/.test(t)) return true;
  return false;
}

function isQuarantined(title: string, snippet: string): boolean {
  const blob = `${title}\n${snippet}`;
  if (QUARANTINE_PATTERNS.some((re) => re.test(blob))) return true;
  if (looksGarbled(title)) return true;
  return false;
}

/**
 * The zero-key real-data fallback.
 *
 * When the server cannot (or is configured not to) settle the upstream x402
 * call, we DO NOT hand the caller a payment challenge. We answer from the
 * local bucket.foundation canon — content that bucket.foundation has ALREADY
 * paid for / curated, and is free to read and cite. The caller gets a real,
 * populated, citeable envelope with `demo:false` and, critically, NO
 * `receipt.challenge` and NO x402 header.
 *
 * CANON PRECEDENCE (the thesis, enforced here):
 *   1. The CURATED PRIMARY-RESEARCH layer (bucket-canon/*\/primary-papers.yaml
 *      — real papers/derivations with DOIs, e.g. Mitchell 1961 chemiosmosis)
 *      is ranked FIRST and, when it matches, headlines the answer + citation
 *      with canon_tier:"canon" and a real doi.org canonical_url.
 *   2. Auto-segmented transcript sub-claims are DEMOTED to clearly-labelled
 *      `candidate` supporting context, never the headline, and run through
 *      isQuarantined() to drop garbled / conspiracy chunks.
 *   3. If NO primary paper matches, we fall back to transcript candidates but
 *      the envelope is explicitly canon_tier:"candidate" and the answer is
 *      framed as unverified one-partial-source material, not canon.
 */
function transcriptCandidates(q: string) {
  let ranked: ReturnType<typeof tokenRank> = [];
  try {
    if (buildIndex().length) ranked = tokenRank(q, 24);
  } catch {
    ranked = [];
  }
  // Drop quarantined chunks BEFORE they can ever reach the caller.
  const clean = ranked.filter(
    (r) => !isQuarantined(r.entry.title, r.entry.text),
  );
  const evidence = clean.slice(0, 6).map((r) => {
    const ev = getEvidenceFor(r.entry.concept, r.entry.slug);
    return {
      source_id: `candidate:${r.entry.concept}/${r.entry.slug}`,
      tier: "candidate" as const,
      note: "one partial source (auto-segmented transcript) — not canon",
      branch: r.entry.branch,
      concept: r.entry.concept,
      title: r.entry.title,
      snippet: r.entry.text.slice(0, 400),
      score: Number(r.score.toFixed(3)),
      canonical_url: `https://www.bucket.foundation/canon/claims/${r.entry.concept}/${r.entry.slug}`,
      evidence_count: ev ? ev.evidence.length : 0,
    };
  });
  const branches = Array.from(new Set(clean.map((r) => r.entry.branch))).sort();
  return { top: clean[0]?.entry ?? null, evidence, branches };
}

function primaryEvidence(q: string) {
  let ranked: ReturnType<typeof rankPrimary> = [];
  try {
    ranked = rankPrimary(q, 6);
  } catch {
    ranked = [];
  }
  const evidence = ranked.map(({ paper: p, score }) => ({
    source_id: `canon:${p.branch}/${p.concept}/${p.id}`,
    tier: "canon" as const,
    branch: p.branch,
    concept: p.concept,
    title: p.title,
    citation: `${authorsShort(p)}${p.year ? ` (${p.year})` : ""}. ${p.title}.${p.venueName ? ` ${p.venueName}.` : ""}`,
    doi: p.doi || null,
    canonical_url: p.canonicalUrl || (p.doi ? `https://doi.org/${p.doi}` : null),
    canon_score: p.canonScore,
    citation_count: p.citationCount,
    score: Number(score.toFixed(3)),
  }));
  return { top: ranked[0]?.paper ?? null, evidence };
}

function primaryAnswer(p: PrimaryPaper, q: string): string {
  const who = authorsShort(p);
  const reasons = p.canonScoreReasons.length
    ? ` Canon weight ${p.canonScore} (${p.canonScoreReasons.join("; ")}).`
    : ` Canon weight ${p.canonScore}.`;
  return (
    `From the bucket.foundation curated primary-research canon ` +
    `(${p.branch} · ${p.concept}) for "${q}": ` +
    `${who}${p.year ? ` (${p.year})` : ""}. "${p.title}"` +
    `${p.venueName ? `, ${p.venueName}` : ""}. ` +
    `Primary source, ${p.citationCount.toLocaleString()} citations.${reasons} ` +
    `Cite the primary work at ${p.canonicalUrl || (p.doi ? `https://doi.org/${p.doi}` : "the DOI")}.`
  );
}

function canonFallback(q: string, tier: string) {
  const now = new Date().toISOString();

  // ---- Layer 1: curated primary-research papers (REAL canon) ----
  const primary = primaryEvidence(q);
  if (primary.top) {
    const p = primary.top;
    const trans = transcriptCandidates(q);
    return json(
      {
        data: {
          answer: primaryAnswer(p, q),
          evidence: primary.evidence,
          // Transcript material is included ONLY as clearly-labelled,
          // demoted, post-quarantine supporting context — never the answer.
          supporting_candidates: trans.evidence,
        },
        citation: {
          type: "source",
          source_id: `canon:${p.branch}/${p.concept}/${p.id}`,
          provider: "bucket-foundation",
          retrieved_at: now,
          license: "CC-BY-4.0",
          canonical_url:
            p.canonicalUrl || (p.doi ? `https://doi.org/${p.doi}` : null),
          doi: p.doi || null,
          title: p.title,
          authors: p.authors.map((a) =>
            [a.given, a.family].filter(Boolean).join(" "),
          ),
          year: p.year,
          venue: p.venueName || null,
        },
        receipt: {
          tier,
          status: "served_from_canon",
          price_usd: 0,
          paid_by:
            "bucket-foundation (pre-paid curated primary canon; reader pays nothing)",
        },
        cite: citeBlock(tier),
        tags: [p.branch, p.concept],
        canon_tier: "canon",
        foundation_branches: [p.branch],
        provenance: [
          provenanceStep(
            "retrieved",
            "bucket-foundation/canon-primary-papers",
          ),
        ],
        ...agentNotice(),
      },
      {
        status: 200,
        headers: {
          "x-bucket-tier": tier,
          "x-bucket-source": "canon-primary",
        },
      },
    );
  }

  // ---- Layer 2: NO primary match — demoted transcript candidates only ----
  const { top, evidence, branches } = transcriptCandidates(q);

  if (!top) {
    // Index empty or no match — still return a valid, inert envelope.
    // No payment challenge. The caller's flow does not break.
    return json(
      {
        data: {
          answer: null,
          note:
            `No canon match for "${q}". The bucket.foundation live gateway ` +
            `is not currently settling server-side, and the local canon ` +
            `index returned no result. Nothing is required from you — ` +
            `retry later or refine the query. No payment is involved.`,
          evidence: [],
        },
        citation: {
          type: "source",
          source_id: "bucket:canon-index",
          provider: "bucket-foundation",
          retrieved_at: now,
          license: "CC-BY-4.0",
          canonical_url: "https://www.bucket.foundation/canon",
        },
        receipt: {
          tier,
          status: "served_from_canon",
          price_usd: 0,
          paid_by: "bucket-foundation (pre-paid canon; reader pays nothing)",
        },
        cite: citeBlock(tier),
        tags: [],
        canon_tier: "candidate",
        foundation_branches: [],
        provenance: [provenanceStep("served_from_canon", "bucket-foundation/canon")],
        ...agentNotice(),
      },
      { status: 200, headers: { "x-bucket-tier": tier, "x-bucket-source": "canon-fallback" } },
    );
  }

  return json(
    {
      data: {
        // NOT canon. No curated primary paper matched this query. This is an
        // unverified, auto-segmented transcript fragment — ONE PARTIAL SOURCE
        // — surfaced only because it is the closest non-quarantined material.
        answer:
          `No curated primary-research canon entry matched "${q}". ` +
          `The closest available material is an UNVERIFIED, auto-segmented ` +
          `transcript candidate (one partial source, NOT canon) from ` +
          `${top.branch} · ${top.concept}: "${top.title}". ` +
          `Treat as a lead to verify against primary sources, not as a ` +
          `citeable foundation. ${top.text.slice(0, 400)}`,
        evidence,
      },
      citation: {
        // candidate, not source — and the canonical_url points at the
        // candidate viewer, never presented as a primary-research citation.
        type: "candidate",
        source_id: `candidate:${top.concept}/${top.slug}`,
        provider: "bucket-foundation",
        retrieved_at: now,
        license: "CC-BY-4.0",
        canonical_url: `https://www.bucket.foundation/canon/claims/${top.concept}/${top.slug}`,
        title: top.title,
        note: "unverified auto-segmented transcript — one partial source, not canon",
      },
      receipt: {
        tier,
        // No tx, no challenge, no wallet for the caller. This content was
        // already paid for / curated by bucket.foundation.
        status: "served_from_canon",
        price_usd: 0,
        paid_by: "bucket-foundation (pre-paid canon; reader pays nothing)",
      },
      cite: citeBlock(tier),
      tags: [top.branch, top.concept],
      canon_tier: "candidate",
      foundation_branches: branches,
      provenance: [
        provenanceStep("retrieved", "bucket-foundation/canon-candidates"),
      ],
      ...agentNotice(),
    },
    { status: 200, headers: { "x-bucket-tier": tier, "x-bucket-source": "canon-fallback" } },
  );
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
    // Strip anything that could look like a caller-facing payment instruction.
    // On this path the server already settled; the caller must never see a
    // challenge. Defensive: even if upstream leaks one, we drop it.
    const receipt =
      obj.receipt && typeof obj.receipt === "object"
        ? { ...(obj.receipt as Record<string, unknown>) }
        : {};
    delete (receipt as Record<string, unknown>).challenge;
    return {
      ...obj,
      receipt,
      cite: obj.cite ?? citeBlock(tier),
      tags: obj.tags ?? [],
      canon_tier: obj.canon_tier ?? "candidate",
      foundation_branches: obj.foundation_branches ?? [],
      provenance: [...existingProv, provenanceStep("proxied", via)],
      ...agentNotice(),
    };
  }
  return envelope;
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

  // Server-side spend cap (per UTC day). This caps the SERVER's outlay to the
  // gateway, not the caller. The caller never pays. If the cap is hit we serve
  // canon instead of erroring the caller out of real data.
  rollDay();
  const price = TIER_PRICES[tier];
  if (spend.usd + price > DAILY_CAP_USD) {
    return canonFallback(q, tier);
  }

  // ---------------------------------------------------------------------
  // ZERO-KEY GUARANTEE
  // If we have no funded server wallet, we DO NOT call the x402 gateway and
  // we DO NOT manufacture a payment challenge for the caller. We answer from
  // the pre-paid canon. The caller gets real data with nothing to do.
  // ---------------------------------------------------------------------
  if (!WALLET_FUNDED) {
    return canonFallback(q, tier);
  }

  // Wallet IS funded → settle the x402 handshake SERVER-SIDE only. The caller
  // never participates. (Server-side signing with BUCKET_WALLET_PRIVATE_KEY is
  // implemented in lib/x402-pay.ts; see FOUNDER ACTION note in the header.)
  const upstream =
    tier === "insight"
      ? `${GATEWAY_URL}/research/insight`
      : `${GATEWAY_URL}/research/pubmed/search?q=${encodeURIComponent(q)}`;
  const upstreamMethod = tier === "insight" ? "POST" : "GET";
  const upstreamBody =
    tier === "insight" ? JSON.stringify({ q, query: q }) : undefined;

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let resp: Response;
  try {
    // signX402ServerSide() attaches the X-PAYMENT header using the SERVER's
    // funded wallet. This is the only place a key is ever used, and it never
    // leaves the server. Implemented behind the wallet-funded flag.
    const { signX402ServerSide } = await import("@/lib/x402-pay");
    const payHeader = await signX402ServerSide(upstream, price);
    resp = await fetch(upstream, {
      method: upstreamMethod,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-bucket-proxy": "v1",
        ...(payHeader ? { "x-payment": payHeader } : {}),
      },
      body: upstreamBody,
      cache: "no-store",
    });
  } catch (e: unknown) {
    clearTimeout(to);
    const msg = e instanceof Error ? e.message : String(e);
    // Any upstream failure → serve real canon data. Never strand the caller
    // and never hand them a payment challenge.
    void msg;
    return canonFallback(q, tier);
  }
  clearTimeout(to);

  // Any non-2xx from upstream (including 402 because settlement didn't take)
  // → fall back to canon. We NEVER forward an x402 challenge to the caller.
  if (!resp.ok) {
    return canonFallback(q, tier);
  }

  let envelope: unknown;
  try {
    envelope = await resp.json();
  } catch {
    return canonFallback(q, tier);
  }

  // Charge the SERVER's budget only on a real successful settlement.
  spend.usd += price;

  let enriched = mergeCiteFields(envelope, tier, GATEWAY_URL);

  // Permanence layer (feature-flagged OFF by default). Unchanged behaviour.
  if (
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
    status: 200,
    headers: { "x-bucket-tier": tier, "x-bucket-source": "gateway" },
  });
}
