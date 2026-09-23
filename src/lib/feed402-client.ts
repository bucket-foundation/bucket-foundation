const FEED402_BASE_URL =
  process.env.FEED402_BASE_URL || "http://localhost:8402";

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

function signX402Header(_path: string, _costUsd: number): string {
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
