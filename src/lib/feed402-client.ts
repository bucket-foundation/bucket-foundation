// src/lib/feed402-client.ts
// Typed client for the local feed402 instance. Hits FEED402_BASE_URL with
// a stubbed x402 wallet header. Real wallet signing is a future bead.

const FEED402_BASE_URL =
  process.env.FEED402_BASE_URL || "http://localhost:8402";

// bkt-tsv: re-derived from feed402 SPEC §3 / types.ts Envelope shape.
// SPEC is source of truth — `citation` is an ARRAY of Citation entries, not a
// single object, and the payment block is named `receipt`. Sibling fix in
// ~/agfarms/feed402/types.ts is making citation an array; if upstream still
// shows singular at this commit, we hold this shape — the SPEC wins.

export type FeedTier = "raw" | "query" | "insight";

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
  // Tolerated convenience fields some providers tack on; keep optional so we
  // remain forward-compatible per SPEC §2.3 (ignore unknown fields).
  title?: string;
  authors?: string[];
  year?: number;
  snippet?: string;
  doi?: string;
}

export interface CitationVDS {
  type: "vds";
  script_id: string;
  session_id: string;
  captured_by: `0x${string}`;
  captured_at: string;
  verifier: string;
  verification: {
    status: "PASS" | "FAIL" | "INCONCLUSIVE";
    confidence: number;
    findings: Array<{ kind: string; value: string | number; confidence: number }>;
  };
  onchain?: string;
  signature: `0x${string}`;
}

export type Citation = CitationSource | CitationVDS;

export interface Receipt {
  tier: FeedTier;
  price_usd: number;
  tx: string;
  paid_at: string;
}

export interface CitationEnvelope<D = unknown> {
  data: D;
  citation: Citation[];
  receipt: Receipt;
}

export interface SearchResult {
  results: CitationEnvelope[];
  query: string;
  source: "pubmed" | "openalex" | "patents";
}

/**
 * Sign an x402 payment header for the given request.
 * TODO(bkt-q7k+2): real ECDSA signing with BUCKET_X402_PRIVATE_KEY using viem.
 *   For now we just emit a placeholder so requests are well-formed.
 */
function signX402Header(_path: string, _costUsd: number): string {
  // TODO: real signature — viem.privateKeyToAccount(...).signMessage(...)
  const stubKey = process.env.BUCKET_X402_PRIVATE_KEY ? "stub-signed" : "unsigned";
  return `x402 ${stubKey}`;
}

async function feed402Get<T>(
  path: string,
  costUsd: number,
): Promise<T> {
  const res = await fetch(`${FEED402_BASE_URL}${path}`, {
    headers: {
      "X-Payment": signX402Header(path, costUsd),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`feed402 ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function searchPubmed(query: string, limit = 5): Promise<SearchResult> {
  const q = encodeURIComponent(query);
  return feed402Get<SearchResult>(`/pubmed/search?q=${q}&limit=${limit}`, 0.005);
}

export async function searchOpenalex(query: string, limit = 5): Promise<SearchResult> {
  const q = encodeURIComponent(query);
  return feed402Get<SearchResult>(`/openalex/search?q=${q}&limit=${limit}`, 0.005);
}

export async function searchPatents(query: string, limit = 5): Promise<SearchResult> {
  const q = encodeURIComponent(query);
  return feed402Get<SearchResult>(`/patents/search?q=${q}&limit=${limit}`, 0.005);
}

export async function getCitationEnvelope(canonicalUrl: string): Promise<CitationEnvelope> {
  const u = encodeURIComponent(canonicalUrl);
  return feed402Get<CitationEnvelope>(`/citation?url=${u}`, 0.01);
}
