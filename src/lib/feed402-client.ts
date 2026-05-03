// src/lib/feed402-client.ts
// Typed client for the local feed402 instance. Hits FEED402_BASE_URL with
// a stubbed x402 wallet header. Real wallet signing is a future bead.

const FEED402_BASE_URL =
  process.env.FEED402_BASE_URL || "http://localhost:8402";

export interface CitationEnvelope {
  citation: {
    type: string; // "source" | "VDS" | future extension types
    canonical_url: string;
    title: string;
    authors: string[];
    year?: number;
    snippet?: string;
    doi?: string;
    license?: string;
  };
  payment: {
    tier: "raw" | "query" | "insight";
    cost_usd: number;
    settled: boolean;
    tx_hash?: string;
  };
  meta: Record<string, unknown>;
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
