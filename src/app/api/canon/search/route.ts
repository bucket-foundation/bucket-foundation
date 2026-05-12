/**
 * bucket.foundation — /api/canon/search
 * --------------------------------------
 * Semantic + lexical search across the 599 curated canon claim cards
 * and 18 detected multi-branch primitive bridges.
 *
 * This is the **AI-agent-facing canon API**. Both humans (via the
 * /canon/search UI) and AI agents (via direct calls or the
 * bucket-foundation MCP server at /mcp) consume this endpoint.
 *
 * Auth: anonymous (rate-limited via standard ip).
 *
 * Query params:
 *   q       (required, string)            natural-language query
 *   top_k   (optional, 1-50, default 10)  results count
 *   tier    (optional, enum)              filter by predicted tier:
 *                                           nucleus | functional | edge | all  (default all)
 *   branch  (optional, string)            filter by branch slug (e.g. "01-mathematics")
 *   mode    (optional, enum)              "semantic" | "lexical" | "hybrid"  (default hybrid)
 *
 * Response (200):
 * {
 *   "query": "...",
 *   "top_k": 10,
 *   "mode": "lexical",   // or "semantic" once query-embedding wired
 *   "results": [
 *     {
 *       "claim_id": 0,
 *       "branch": "01-mathematics",
 *       "concept": "topology",
 *       "slug": "001-...",
 *       "title": "Claim — ...",
 *       "score": 12.0,
 *       "tier": "nucleus",
 *       "url": "https://bucket.foundation/canon/claims/topology/001-...",
 *       "excerpt": "...",
 *       "evidence_count": 10
 *     },
 *     ...
 *   ],
 *   "took_ms": 12
 * }
 *
 * Note on embedding inference:
 *   Server-side query embedding is not yet wired in this Vercel route.
 *   Until ONNX/Transformers.js is added, the route uses BM25-style
 *   token overlap. The /canon/search HTML page can additionally embed
 *   queries client-side via @xenova/transformers and POST the vector
 *   here as `?qvec=<base64>` for true semantic search.
 */

import { NextRequest } from "next/server";
import { buildIndex, cosineRank, tokenRank, getIndexDim } from "@/lib/canon-search-index";
import { getEvidenceFor } from "@/lib/canon-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeQVec(b64: string, dim: number): Float32Array | null {
  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length !== dim * 4) return null;
    return new Float32Array(buf.buffer, buf.byteOffset, dim);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const topK = Math.min(50, Math.max(1, parseInt(url.searchParams.get("top_k") || "10", 10)));
  const tier = (url.searchParams.get("tier") || "all").toLowerCase();
  const branchFilter = url.searchParams.get("branch") || "";
  const modeParam = (url.searchParams.get("mode") || "hybrid").toLowerCase();
  const qvec = url.searchParams.get("qvec");

  if (!q && !qvec) {
    return new Response(
      JSON.stringify({ error: { code: "missing_q", message: "q or qvec required" } }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const idx = buildIndex();
  if (!idx.length) {
    return new Response(
      JSON.stringify({ error: { code: "index_empty", message: "canon search index not built" } }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }

  let results: { entry: typeof idx[number]; score: number }[] = [];
  let mode = modeParam;

  if (qvec) {
    const dim = getIndexDim();
    const qv = decodeQVec(qvec, dim);
    if (qv) {
      results = cosineRank(qv, topK * 3);
      mode = "semantic";
    }
  }
  if (results.length === 0) {
    // lexical fallback / hybrid
    results = tokenRank(q || "", topK * 3);
    mode = modeParam === "semantic" ? "semantic_fallback_lexical" : "lexical";
  }

  // Apply branch filter
  if (branchFilter) {
    results = results.filter((r) => r.entry.branch === branchFilter);
  }
  // TODO: tier filter — needs tier-predictions.jsonl loaded into the index
  if (tier !== "all") {
    // placeholder: noop until tier wired
  }

  const out = results.slice(0, topK).map((r) => {
    const ev = getEvidenceFor(r.entry.concept, r.entry.slug);
    return {
      claim_id: r.entry.rowid,
      branch: r.entry.branch,
      concept: r.entry.concept,
      slug: r.entry.slug,
      title: r.entry.title,
      score: r.score,
      url: `https://bucket.foundation/canon/claims/${r.entry.concept}/${r.entry.slug}`,
      excerpt: r.entry.text.slice(0, 400),
      evidence_count: ev ? ev.evidence.length : 0,
    };
  });

  return new Response(
    JSON.stringify({
      query: q || null,
      top_k: topK,
      mode,
      n_results: out.length,
      results: out,
      took_ms: Date.now() - t0,
    }, null, 2),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "x-bucket-canon-version": "v1",
      },
    },
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
