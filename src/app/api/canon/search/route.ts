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
    results = tokenRank(q || "", topK * 3);
    mode = modeParam === "semantic" ? "semantic_fallback_lexical" : "lexical";
  }

  if (branchFilter) {
    results = results.filter((r) => r.entry.branch === branchFilter);
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
      url: `https://bucket.foundation/excerpts/${r.entry.concept}/${r.entry.slug}`,
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
