import { NextRequest, NextResponse } from "next/server";
import { buildIndex, tokenRank } from "@/lib/canon-search-index";
import { getEvidenceFor } from "@/lib/canon-evidence";
import { rankPrimary, authorsShort, type PrimaryPaper } from "@/lib/canon-primary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_URL = process.env.BUCKET_GATEWAY_URL?.replace(/\/$/, "") ?? "";
const DAILY_CAP_USD = Number(process.env.BUCKET_DAILY_USD_CAP ?? "1.00");
const UPSTREAM_TIMEOUT_MS = 15_000;
const WALLET_FUNDED = Boolean(process.env.BUCKET_WALLET_PRIVATE_KEY);

const TIER_PRICES: Record<string, number> = {
  raw: 0.05,
  query: 0.01,
  insight: 0.002,
};

const VALID_TIERS = new Set(Object.keys(TIER_PRICES));

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

const QUARANTINE_PATTERNS: RegExp[] = [
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

function looksGarbled(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  if (/^[a-z]/.test(t)) return true;
  if (
    /^(and |but |so |because |well |you know|i mean|like |okay|right |that'?s |it'?s |what |why |how |when |where |there |here )/i.test(
      t,
    )
  )
    return true;
  if (!/[.?!]$/.test(t) && /\b\w{1,2}$/.test(t)) return true;
  return false;
}

function isQuarantined(title: string, snippet: string): boolean {
  const blob = `${title}\n${snippet}`;
  if (QUARANTINE_PATTERNS.some((re) => re.test(blob))) return true;
  if (looksGarbled(title)) return true;
  return false;
}

function transcriptCandidates(q: string) {
  let ranked: ReturnType<typeof tokenRank> = [];
  try {
    if (buildIndex().length) ranked = tokenRank(q, 24);
  } catch {
    ranked = [];
  }
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
      canonical_url: `https://www.bucket.foundation/excerpts/${r.entry.concept}/${r.entry.slug}`,
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

  const primary = primaryEvidence(q);
  if (primary.top) {
    const p = primary.top;
    const trans = transcriptCandidates(q);
    return json(
      {
        data: {
          answer: primaryAnswer(p, q),
          evidence: primary.evidence,
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

  const { top, evidence, branches } = transcriptCandidates(q);

  if (!top) {
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
        type: "candidate",
        source_id: `candidate:${top.concept}/${top.slug}`,
        provider: "bucket-foundation",
        retrieved_at: now,
        license: "CC-BY-4.0",
        canonical_url: `https://www.bucket.foundation/excerpts/${top.concept}/${top.slug}`,
        title: top.title,
        note: "unverified auto-segmented transcript — one partial source, not canon",
      },
      receipt: {
        tier,
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

  rollDay();
  const price = TIER_PRICES[tier];
  if (spend.usd + price > DAILY_CAP_USD) {
    return canonFallback(q, tier);
  }

  if (!WALLET_FUNDED || !GATEWAY_URL) {
    return canonFallback(q, tier);
  }

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
    void msg;
    return canonFallback(q, tier);
  }
  clearTimeout(to);

  if (!resp.ok) {
    return canonFallback(q, tier);
  }

  let envelope: unknown;
  try {
    envelope = await resp.json();
  } catch {
    return canonFallback(q, tier);
  }

  spend.usd += price;

  let enriched = mergeCiteFields(envelope, tier, GATEWAY_URL);

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
