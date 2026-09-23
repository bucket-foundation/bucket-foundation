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
