import { buildIndex, cosineRank, tokenRank, getIndexDim, type ClaimIndexEntry } from "@/lib/canon-search-index";

export const CANON_TOP_K_MAX = 50;

export interface CanonSearchParams {
  q: string;
  qvec: string | null;
  topK: number;
  tier: string;
  branch: string;
  mode: string;
}

export type CanonHit = { entry: ClaimIndexEntry; score: number };

export type CanonSearchResult =
  | { ok: true; mode: string; results: CanonHit[] }
  | { ok: false; status: number; code: string; message: string };

export function parseCanonSearchParams(url: URL, defaultTopK = 10): CanonSearchParams {
  const raw = parseInt(url.searchParams.get("top_k") || String(defaultTopK), 10);
  return {
    q: (url.searchParams.get("q") || "").trim().slice(0, 200),
    qvec: url.searchParams.get("qvec"),
    topK: Math.min(CANON_TOP_K_MAX, Math.max(1, Number.isFinite(raw) ? raw : defaultTopK)),
    tier: (url.searchParams.get("tier") || "all").toLowerCase(),
    branch: url.searchParams.get("branch") || "",
    mode: (url.searchParams.get("mode") || "hybrid").toLowerCase(),
  };
}

export function decodeQVec(b64: string, dim: number): Float32Array | null {
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== dim * 4) return null;
    return new Float32Array(buf.buffer, buf.byteOffset, dim);
  } catch {
    return null;
  }
}

export function canonSearch(p: CanonSearchParams): CanonSearchResult {
  if (!p.q && !p.qvec) return { ok: false, status: 400, code: "missing_q", message: "q or qvec required" };
  const idx = buildIndex();
  if (!idx.length) return { ok: false, status: 503, code: "index_empty", message: "canon search index not built" };

  let results: CanonHit[] = [];
  let mode = p.mode;
  if (p.qvec) {
    const qv = decodeQVec(p.qvec, getIndexDim());
    if (qv) {
      results = cosineRank(qv, p.topK * 3);
      mode = "semantic";
    }
  }
  if (results.length === 0) {
    results = tokenRank(p.q, p.topK * 3);
    mode = p.mode === "semantic" ? "semantic_fallback_lexical" : "lexical";
  }
  if (p.branch) results = results.filter((r) => r.entry.branch === p.branch);
  return { ok: true, mode, results: results.slice(0, p.topK) };
}
