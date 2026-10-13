export type ClaimIndexEntry = {
  rowid: number;
  branch: string;
  concept: string;
  slug: string;
  title: string;
  path: string;
  text: string;
  vec: Float32Array;
};

export type CanonHit = { entry: ClaimIndexEntry; score: number };

export const CANON_TOP_K_MAX = 50;
export const CANON_DEFAULT_DIM = 384;

export interface CanonSearchParams {
  q: string;
  qvec: string | null;
  topK: number;
  tier: string;
  branch: string;
  mode: string;
}

export type CanonSearchResult =
  | { ok: true; mode: string; results: CanonHit[] }
  | { ok: false; status: number; code: string; message: string };

export interface CanonSearchDeps {
  loadIndex: () => ClaimIndexEntry[];
  decodeQVec: (b64: string, dim: number) => Float32Array | null;
}

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

export function indexDim(index: ClaimIndexEntry[]): number {
  return index[0]?.vec.length || CANON_DEFAULT_DIM;
}

export function cosineRank(index: ClaimIndexEntry[], q: Float32Array, topK = 10): CanonHit[] {
  const scores = new Array<CanonHit>(index.length);
  for (let i = 0; i < index.length; i++) {
    const v = index[i].vec;
    let s = 0;
    for (let j = 0; j < q.length; j++) s += q[j] * v[j];
    scores[i] = { entry: index[i], score: s };
  }
  scores.sort((a, b) => b.score - a.score || a.entry.rowid - b.entry.rowid);
  return scores.slice(0, topK);
}

export function tokenRank(index: ClaimIndexEntry[], query: string, topK = 10): CanonHit[] {
  const qWords = Array.from(
    new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3)),
  );
  if (qWords.length === 0) return [];
  const scores = index.map((e) => {
    const text = e.text.toLowerCase();
    let s = 0;
    for (const w of qWords) {
      const re = new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
      const m = text.match(re);
      if (m) s += m.length;
    }
    return { entry: e, score: s };
  });
  scores.sort((a, b) => b.score - a.score || a.entry.rowid - b.entry.rowid);
  return scores.slice(0, topK);
}

export function rankCanon(deps: CanonSearchDeps, p: CanonSearchParams): CanonSearchResult {
  if (!p.q && !p.qvec) return { ok: false, status: 400, code: "missing_q", message: "q or qvec required" };
  const index = deps.loadIndex();
  if (!index.length) return { ok: false, status: 503, code: "index_empty", message: "canon search index not built" };

  let results: CanonHit[] = [];
  let mode = p.mode;
  if (p.qvec) {
    const qv = deps.decodeQVec(p.qvec, indexDim(index));
    if (qv) {
      results = cosineRank(index, qv, p.topK * 3);
      mode = "semantic";
    }
  }
  if (results.length === 0) {
    results = tokenRank(index, p.q, p.topK * 3);
    mode = p.mode === "semantic" ? "semantic_fallback_lexical" : "lexical";
  }
  if (p.branch) results = results.filter((r) => r.entry.branch === p.branch);
  return { ok: true, mode, results: results.slice(0, p.topK) };
}
