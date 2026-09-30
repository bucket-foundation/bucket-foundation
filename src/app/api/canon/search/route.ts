import { NextRequest } from "next/server";
import { canonSearch, parseCanonSearchParams } from "@/lib/canon-search";
import { getEvidenceFor } from "@/lib/canon-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const params = parseCanonSearchParams(new URL(req.url));
  const { q, topK } = params;
  const found = canonSearch(params);
  if (!found.ok) {
    return new Response(
      JSON.stringify({ error: { code: found.code, message: found.message } }),
      { status: found.status, headers: { "content-type": "application/json" } },
    );
  }
  const { mode, results } = found;
  const out = results.map((r) => {
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
