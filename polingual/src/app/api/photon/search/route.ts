// GET /api/photon/search?q=...&lang=...&kind=...&top_k=30
//
// Wraps searchPhotons() from src/lib/photon-db.ts and returns a stable
// shape matching what the homepage UI expects:
//
//   { query, n_results, results: Photon[], took_ms, stats? }
//
// stats is included so the empty-query call (`q=___NEVER___`) can populate
// the header with "45,000+ photons · 27 languages" without a second
// roundtrip.

import { NextResponse } from "next/server";
import { searchPhotons, photonStats } from "@/lib/photon-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const lang = url.searchParams.get("lang") || undefined;
  const kind = url.searchParams.get("kind") || undefined;
  const topK = Math.min(
    Math.max(parseInt(url.searchParams.get("top_k") || "30", 10) || 30, 1),
    100
  );

  // Sentinel used by the homepage on mount to pull stats without
  // committing to a real search.
  const isSentinel = q === "___NEVER___" || q === "";

  if (isSentinel) {
    const stats = await photonStats();
    return NextResponse.json({
      query: q,
      n_results: 0,
      results: [],
      took_ms: 0,
      stats,
    });
  }

  const res = await searchPhotons(q, { lang, kind, topK });
  return NextResponse.json(res, {
    headers: {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=120",
    },
  });
}
