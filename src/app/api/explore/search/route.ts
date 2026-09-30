import { NextRequest } from "next/server";
import { buildIndex, tokenRank } from "@/lib/canon-search-index";
import { loadAdvisors } from "@/lib/explore/advisors";
import { HIT_TYPES, unify, type HitType } from "@/lib/explore/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
  const topK = Math.min(100, Math.max(1, parseInt(url.searchParams.get("top_k") || "40", 10) || 40));
  const types = (url.searchParams.get("types") || "")
    .split(",")
    .filter((t): t is HitType => (HIT_TYPES as string[]).includes(t));
  if (!q) return json({ error: { code: "missing_q", message: "q required" } }, 400);

  const excerpts = buildIndex().length
    ? tokenRank(q, topK * 2)
        .filter((r) => r.score > 0)
        .map(({ entry, score }) => ({
          branch: entry.branch,
          concept: entry.concept,
          slug: entry.slug,
          title: entry.title,
          text: entry.text,
          score,
        }))
    : [];
  const { sources, sample } = loadAdvisors();
  const results = unify({ query: q, excerpts, advisors: sources, types, topK });
  return json({ query: q, n_results: results.length, advisors_sample: sample, results, took_ms: Date.now() - t0 });
}
