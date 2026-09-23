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

export interface Grant {
  id: string;
  title: string;
  funder: string;
  source: "grants.gov" | "nih-reporter" | "nsf-awards" | "irs-990pf" | "manual" | string;
  summary: string;
  eligibility: string;
  topics: string[];
  amount_max_usd: number | null;
  amount_min_usd: number | null;
  deadline: string | null;
  rolling: boolean;
  canonical_url: string;
  last_seen_at: string;
}

export interface GrantQuery {
  topic?: string;
  deadline_before?: string;
  min_amount?: number;
  max_amount?: number;
  funder?: string;
  eligibility?: string;
  limit?: number;
}

export interface InsightRequest {
  venture: string;
  topic: string;
}

export interface InsightResponse {
  venture: string;
  topic: string;
  summary: string;
  matches: Array<{
    grant_id: string;
    fit_score: number;
    rationale: string;
    deadline: string | null;
    days_until_deadline: number | null;
  }>;
  gaps: string[];
}
