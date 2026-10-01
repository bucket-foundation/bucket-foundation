import { loadCanonIndex } from "./canon-index-loader";
import { rankCanon, tokenRank, type CanonHit, type CanonSearchParams, type CanonSearchResult, type ClaimIndexEntry } from "./canon-rank";

export { CANON_TOP_K_MAX, parseCanonSearchParams } from "./canon-rank";
export type { CanonHit, CanonSearchParams, CanonSearchResult, ClaimIndexEntry } from "./canon-rank";

export function decodeQVec(b64: string, dim: number): Float32Array | null {
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== dim * 4) return null;
    return new Float32Array(buf.buffer, buf.byteOffset, dim);
  } catch {
    return null;
  }
}

export function canonIndex(): ClaimIndexEntry[] {
  return loadCanonIndex();
}

export function canonTokenRank(query: string, topK = 10): CanonHit[] {
  return tokenRank(loadCanonIndex(), query, topK);
}

export function canonSearch(p: CanonSearchParams): CanonSearchResult {
  return rankCanon({ loadIndex: loadCanonIndex, decodeQVec }, p);
}
