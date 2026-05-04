/**
 * grants-gateway — shared types
 *
 * The feed402 envelope/citation/manifest types are mirrored from
 * ../../../feed402/types.ts (kept local so this scaffold is self-contained;
 * a future PR can replace this file with `import` once feed402 publishes
 * an npm package).
 */

export const SPEC_VERSION = "feed402/0.2" as const;

export type TierName = "raw" | "query" | "insight";

export interface TierSpec {
  path: string;
  price_usd: number;
  unit: "row" | "call";
}

export interface ChunkStrategy {
  kind: "token-window" | "paragraph" | "post" | "none" | string;
  size?: number;
  overlap?: number;
}

export interface IndexManifest {
  type: "dense" | "sparse" | "hybrid" | string;
  model: string;
  dim?: number;
  distance?: "cosine" | "dot" | "l2";
  chunks: number;
  chunk_strategy: ChunkStrategy;
  corpus_sha256: string;
  built_at: string;
}

export type CitationType = "source" | "vds" | string;

export interface RetrievalProvenance {
  model: string;
  score: number;
  rank: number;
}

export interface CitationSource {
  type: "source";
  source_id: string;
  provider: string;
  retrieved_at: string;
  license?: string;
  canonical_url?: string;
  chunk_id?: string;
  retrieval?: RetrievalProvenance;
}

export interface Receipt {
  tier: TierName;
  price_usd: number;
  tx: string;
  paid_at: string;
}

/**
 * Synthesis provenance — emitted on `/grants/insight` envelopes when a real
 * model was called. Sibling to feed402 §3.2 retrieval provenance, but at the
 * envelope level so a downstream agent can audit what model produced the
 * synthesis (vs which corpus chunk was retrieved).
 */
export interface SynthesisProvenance {
  model_id: string;
  candidates: Array<{ id: string; score: number }>;
  prompt_sha256: string;
  ts: string;
}

export interface Envelope<D = unknown> {
  data: D;
  citation: CitationSource;
  receipt: Receipt;
  provenance?: SynthesisProvenance;
}

export interface Manifest {
  name: string;
  version: string;
  spec: string;
  chain: string;
  wallet: `0x${string}`;
  tiers: Partial<Record<TierName, TierSpec>>;
  citation_policy?: string;
  citation_types: CitationType[];
  contact?: string;
  index?: IndexManifest;
}

export type ErrorCode =
  | "invalid_tier"
  | "invalid_input"
  | "upstream_unavailable"
  | "rate_limited"
  | "citation_unavailable"
  | "not_found"
  | "payment_required";

export interface ErrorBody {
  error: { code: ErrorCode | string; message: string };
  trace_id: string;
}

// ---------- Domain types ----------

/**
 * A single grant opportunity record. Schema is intended to be a superset of
 * grants.gov, NIH RePORTER, NSF awards, and foundation 990 PF "Grants Paid"
 * — fields nullable where any one source doesn't carry them.
 */
export interface Grant {
  /** Stable id, e.g. "grants-gov:HHS-2026-NIH-AG-001" or "irs-990:13-1837418:2024:0042". */
  id: string;
  /** Human title of the opportunity. */
  title: string;
  /** Funder display name (e.g. "NIH/NIA", "Robert Wood Johnson Foundation"). */
  funder: string;
  /** Source system that produced this row. */
  source: "grants.gov" | "nih-reporter" | "nsf-awards" | "irs-990pf" | "manual" | string;
  /** Free-text topical summary (denormalised from RFP body). */
  summary: string;
  /** Eligibility free-text (e.g. "501(c)(3) public charities; nonprofits with <$5M budget"). */
  eligibility: string;
  /** Topic tags — drives /grants/query?topic=. */
  topics: string[];
  /** Award ceiling in USD. Null when funder doesn't publish one. */
  amount_max_usd: number | null;
  /** Award floor in USD. Null when not published. */
  amount_min_usd: number | null;
  /** Application deadline ISO-8601 date. Null for rolling deadlines. */
  deadline: string | null;
  /** True when funder explicitly takes applications year-round. */
  rolling: boolean;
  /** Public listing URL — the citation envelope's canonical_url. */
  canonical_url: string;
  /** When this row was last refreshed from upstream. */
  last_seen_at: string;
}

export interface GrantQuery {
  topic?: string;
  deadline_before?: string; // ISO date
  min_amount?: number;
  max_amount?: number;
  funder?: string;
  eligibility?: string;
  limit?: number;
}

export interface InsightRequest {
  /** Slug of an AGFarms venture or external profile. */
  venture: string;
  /** Free-text topic / focus area. */
  topic: string;
}

export interface InsightResponse {
  venture: string;
  topic: string;
  summary: string;
  matches: Array<{
    grant_id: string;
    fit_score: number; // 0..1
    rationale: string;
    deadline: string | null;
    days_until_deadline: number | null;
  }>;
  gaps: string[];
}
