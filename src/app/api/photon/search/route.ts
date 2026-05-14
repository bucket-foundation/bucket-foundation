// GET /api/photon/search?q=<word>&lang=<code>&kind=<kind>&top_k=20
// Lexical search across photons. Semantic search via the vector files
// will land in a follow-up route once we ship the embedding-server.

import { NextRequest } from "next/server";
import { searchPhotons, photonStats } from "@/lib/photon-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const lang = url.searchParams.get("lang") || undefined;
  const kind = url.searchParams.get("kind") || undefined;
  const topK = Math.min(100, Math.max(1, parseInt(url.searchParams.get("top_k") || "20", 10)));

  if (!q) {
    const stats = photonStats();
    return new Response(
      JSON.stringify({ error: { code: "missing_q" }, stats }, null, 2),
      { status: 400, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } },
    );
  }

  const t0 = Date.now();
  const results = searchPhotons(q, lang, kind, topK);
  return new Response(
    JSON.stringify({
      query: q, lang, kind, top_k: topK,
      n_results: results.length,
      results,
      took_ms: Date.now() - t0,
    }, null, 2),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "x-bucket-photon": "v1",
      },
    },
  );
}
