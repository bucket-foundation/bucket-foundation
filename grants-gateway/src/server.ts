/**
 * grants-gateway — feed402 v0.2 paid grants-search merchant.
 *
 * Endpoints (see SPEC.md §5 tiers):
 *   GET /grants/raw?id=...                           $0.010 / row
 *   GET /grants/query?topic=&deadline_before=&...    $0.005 / call
 *   GET /grants/insight?venture=&topic=              $0.002 / call
 *
 * All endpoints return a feed402 §3 envelope with a mandatory citation
 * block (canonical_url -> grants.gov / NIH RePORTER / NSF / ProPublica
 * 990-PF page). Payment verification is STUBBED — see src/x402.ts.
 *
 * Run: npm run dev
 * Curl: see README.md
 */

import { Hono } from "hono";
import type { Context } from "hono";
import {
  SPEC_VERSION,
  type CitationSource,
  type Envelope,
  type ErrorBody,
  type IndexManifest,
  type Manifest,
  type Receipt,
  type TierName,
  type TierSpec,
} from "./types.js";
import { MemoryGrantsStore, type GrantsStore } from "./data/grants-store.js";
import { MockSynthesizer, type Synthesizer } from "./insight/synthesizer.js";
import { meterFromEnv, type ViatikaMeter } from "./metering/viatika.js";
import { nowIso, traceId, verifyPayment, x402Challenge } from "./x402.js";

// ---------- Config ----------

const PROVIDER_NAME = process.env.PROVIDER_NAME ?? "bucket-grants-gateway";
const PROVIDER_VERSION = "0.1.0-alpha.1";
const PROVIDER_DOMAIN = process.env.PROVIDER_DOMAIN ?? "grants.bucket.foundation";
const CHAIN = process.env.FEED402_CHAIN ?? "base-sepolia";
const WALLET: `0x${string}` =
  (process.env.FEED402_WALLET as `0x${string}`) ??
  "0x0000000000000000000000000000000000000000";

const TIERS: Record<TierName, TierSpec> = {
  raw:     { path: "/grants/raw",     price_usd: 0.010, unit: "row" },
  query:   { path: "/grants/query",   price_usd: 0.005, unit: "call" },
  insight: { path: "/grants/insight", price_usd: 0.002, unit: "call" },
};

// ---------- Wiring ----------

const store: GrantsStore = new MemoryGrantsStore();
const synthesizer: Synthesizer = new MockSynthesizer();
const meter: ViatikaMeter = meterFromEnv();

// ---------- Helpers ----------

function makeReceipt(tier: TierName, tx: string): Receipt {
  return {
    tier,
    price_usd: TIERS[tier].price_usd,
    tx,
    paid_at: nowIso(),
  };
}

function sourceCitation(args: {
  source_id: string;
  canonical_url: string;
  retrieval?: { score: number; rank: number };
  chunk_id?: string;
}): CitationSource {
  const cit: CitationSource = {
    type: "source",
    source_id: args.source_id,
    provider: PROVIDER_NAME,
    retrieved_at: nowIso(),
    license: "public-domain",
    canonical_url: args.canonical_url,
  };
  if (args.retrieval) {
    cit.chunk_id = args.chunk_id ?? `${args.source_id}#c0`;
    cit.retrieval = { model: "keyword-overlap-v0", ...args.retrieval };
  }
  return cit;
}

async function chargeOrFail(
  c: Context,
  tier: TierName,
  caller?: string,
): Promise<{ ok: true; tx: string } | { ok: false; resp: Response }> {
  const pay = verifyPayment(c);
  if (!pay.ok) {
    return { ok: false, resp: x402Challenge(c, tier, TIERS[tier], CHAIN, WALLET) as unknown as Response };
  }
  const m = await meter.meter({
    tenant: process.env.VIATIKA_TENANT_ID ?? "bucket-foundation",
    product: "grants-gateway",
    tier,
    price_micros: Math.round(TIERS[tier].price_usd * 1_000_000),
    caller,
  });
  if (!m.ok) {
    const body: ErrorBody = {
      error: { code: m.reason, message: m.message },
      trace_id: traceId(),
    };
    return { ok: false, resp: c.json(body, 402) as unknown as Response };
  }
  return { ok: true, tx: pay.tx };
}

// ---------- App ----------

const app = new Hono();

// §1 Discovery manifest
app.get("/.well-known/feed402.json", async (c) => {
  const all = await store.all();
  const index: IndexManifest = {
    type: "sparse",
    model: "keyword-overlap-v0",
    chunks: all.length,
    chunk_strategy: { kind: "post" },
    corpus_sha256: await store.corpusHash(),
    built_at: nowIso(),
  };
  const manifest: Manifest = {
    name: PROVIDER_NAME,
    version: PROVIDER_VERSION,
    spec: SPEC_VERSION,
    chain: CHAIN,
    wallet: WALLET,
    tiers: TIERS,
    citation_policy: "public-domain",
    citation_types: ["source"],
    contact: `ops@${PROVIDER_DOMAIN}`,
    index,
  };
  return c.json(manifest);
});

// /grants/raw — single full record by id
app.get("/grants/raw", async (c) => {
  const id = c.req.query("id");
  if (!id) {
    const body: ErrorBody = {
      error: { code: "invalid_input", message: "id query param required" },
      trace_id: traceId(),
    };
    return c.json(body, 400);
  }
  const charge = await chargeOrFail(c, "raw");
  if (!charge.ok) return charge.resp;

  const grant = await store.getById(id);
  if (!grant) {
    const body: ErrorBody = {
      error: { code: "not_found", message: `grant ${id} not in corpus` },
      trace_id: traceId(),
    };
    return c.json(body, 404);
  }

  const env: Envelope = {
    data: { grant },
    citation: sourceCitation({
      source_id: grant.id,
      canonical_url: grant.canonical_url,
    }),
    receipt: makeReceipt("raw", charge.tx),
  };
  return c.json(env, 200);
});

// /grants/query — structured search
app.get("/grants/query", async (c) => {
  const charge = await chargeOrFail(c, "query");
  if (!charge.ok) return charge.resp;

  const q = {
    topic: c.req.query("topic"),
    deadline_before: c.req.query("deadline_before"),
    min_amount: numQ(c.req.query("min_amount")),
    max_amount: numQ(c.req.query("max_amount")),
    funder: c.req.query("funder"),
    eligibility: c.req.query("eligibility"),
    limit: numQ(c.req.query("limit")) ?? 50,
  };
  const rows = await store.search(q);

  if (rows.length === 0) {
    const body: ErrorBody = {
      error: { code: "citation_unavailable", message: "no grants matched filter" },
      trace_id: traceId(),
    };
    return c.json(body, 404);
  }

  const top = rows[0];
  const env: Envelope = {
    data: { rows, count: rows.length },
    citation: sourceCitation({
      source_id: top.id,
      canonical_url: top.canonical_url,
      retrieval: { score: 1.0, rank: 0 },
    }),
    receipt: makeReceipt("query", charge.tx),
  };
  return c.json(env, 200);
});

// /grants/insight — venture-fit synthesis
app.get("/grants/insight", async (c) => {
  const venture = c.req.query("venture");
  const topic = c.req.query("topic");
  if (!venture || !topic) {
    const body: ErrorBody = {
      error: { code: "invalid_input", message: "venture and topic query params required" },
      trace_id: traceId(),
    };
    return c.json(body, 400);
  }
  const charge = await chargeOrFail(c, "insight");
  if (!charge.ok) return charge.resp;

  const candidates = await store.all();
  const insight = await synthesizer.synthesize({ venture, topic }, candidates);

  // Cite the top match (or the first candidate if no match)
  const topId = insight.matches[0]?.grant_id ?? candidates[0]?.id;
  const top = topId ? await store.getById(topId) : null;
  const citation = top
    ? sourceCitation({
        source_id: top.id,
        canonical_url: top.canonical_url,
        retrieval: { score: insight.matches[0]?.fit_score ?? 0, rank: 0 },
      })
    : ({
        type: "source" as const,
        source_id: "grants-gateway:empty",
        provider: PROVIDER_NAME,
        retrieved_at: nowIso(),
        canonical_url: `https://${PROVIDER_DOMAIN}/`,
      } satisfies CitationSource);

  const env: Envelope = {
    data: insight,
    citation,
    receipt: makeReceipt("insight", charge.tx),
  };
  return c.json(env, 200);
});

app.notFound((c) =>
  c.json<ErrorBody>(
    { error: { code: "not_found", message: "unknown route" }, trace_id: traceId() },
    404,
  ),
);

function numQ(v: string | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ---------- Entrypoint ----------

const port = Number(process.env.PORT ?? 8789);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { serve } = await import("@hono/node-server").catch(() => ({
    serve: (opts: { fetch: typeof app.fetch; port: number }) => {
      console.error("[grants-gateway] @hono/node-server not installed; run `npm i`");
      console.error(`[grants-gateway] Would have served on :${opts.port}`);
      return null;
    },
  }));
  serve({ fetch: app.fetch, port });
  console.log(`[grants-gateway] listening on :${port}`);
  console.log(`[grants-gateway] manifest: http://localhost:${port}/.well-known/feed402.json`);
}

export { app };
