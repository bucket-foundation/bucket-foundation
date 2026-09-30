import { NextRequest } from "next/server";
import { canonSearch, parseCanonSearchParams } from "@/lib/canon-search";
import { canonFileHits } from "@/lib/explore/canon-files";
import { loadAdvisors } from "@/lib/explore/advisors";
import timeline from "@/data/canon-timeline.json";
import { HIT_TYPES, unify, type HitType } from "@/lib/explore/search";

const YEAR_BY_ID = new Map<string, number>(timeline.events.map((e: { id: string; year: number }) => [e.id, e.year]));

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const url = new URL(req.url);
  const params = parseCanonSearchParams(url, 40);
  const types = (url.searchParams.get("types") || "")
    .split(",")
    .filter((t): t is HitType => (HIT_TYPES as string[]).includes(t));
  const found = canonSearch(params);
  if (!found.ok) return json({ error: { code: found.code, message: found.message } }, found.status);

  const excerpts = found.results.map(({ entry, score }) => ({
    branch: entry.branch,
    concept: entry.concept,
    slug: entry.slug,
    title: entry.title,
    text: entry.text,
    score,
    year: YEAR_BY_ID.get(entry.concept) ?? null,
  }));
  const { sources, sample } = loadAdvisors();
  const advisors = params.branch ? [] : sources;
  const results = unify({ query: params.q, excerpts, advisors, types, topK: params.topK, extraHits: params.branch ? [] : canonFileHits(params.q) });
  return json({
    query: params.q || null,
    top_k: params.topK,
    mode: found.mode,
    n_results: results.length,
    advisors_sample: sample,
    results,
    took_ms: Date.now() - t0,
  });
}
