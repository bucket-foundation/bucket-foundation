import { parseCanonSearchParams, type CanonSearchParams, type CanonSearchResult } from "../canon-rank";
import type { LoadedAdvisors } from "./advisors";
import { HIT_TYPES, advisorId, unify, type Hit, type HitType } from "./search";
import { searchSources, sourceToHit, type Prepared } from "./source-index";

export const EXPLORE_DEFAULT_TOP_K = 40;
export const MAP_ADVISOR_CAP = 400;

export interface ExploreSearchDeps {
  canon: (p: CanonSearchParams) => CanonSearchResult;
  advisors: () => LoadedAdvisors;
  sources: () => Prepared[] | Promise<Prepared[]>;
  yearOf: (concept: string) => number | null;
  canonFiles: (query: string) => Hit[];
}

export interface ExploreReply {
  status: number;
  body: unknown;
}

export async function exploreSearch(deps: ExploreSearchDeps, url: URL): Promise<ExploreReply> {
  const t0 = Date.now();
  if (url.searchParams.get("map") === "1") {
    const { sources, sample, axes, origin } = deps.advisors();
    const advisors = sources
      .filter((a) => a.star?.length)
      .sort((a, b) => b.score - a.score || a.rank - b.rank)
      .slice(0, MAP_ADVISOR_CAP)
      .map((a) => ({ id: advisorId(a), name: a.name, field: a.field, score: a.score, star: a.star }));
    return { status: 200, body: { advisors_sample: sample, advisors_source: origin, axes_split: origin === "bundle", axes, advisors } };
  }
  const params = parseCanonSearchParams(url, EXPLORE_DEFAULT_TOP_K);
  const types = (url.searchParams.get("types") || "")
    .split(",")
    .filter((t): t is HitType => (HIT_TYPES as string[]).includes(t));
  const found = deps.canon(params);
  if (!found.ok) return { status: found.status, body: { error: { code: found.code, message: found.message } } };

  const excerpts = found.results.map(({ entry, score }) => ({
    branch: entry.branch,
    concept: entry.concept,
    slug: entry.slug,
    title: entry.title,
    text: entry.text,
    score,
    year: deps.yearOf(entry.concept),
  }));
  const { sources, sample, origin } = deps.advisors();
  const advisors = params.branch ? [] : sources;
  const wantsSources = !types.length || types.some((t) => t === "paper" || t === "text" || t === "talk");
  const sourceHits = wantsSources && !params.branch ? searchSources(params.q, await deps.sources()).map(sourceToHit) : [];
  const results = unify({ query: params.q, excerpts, advisors, sources: sourceHits, types, topK: params.topK, extraHits: params.branch ? [] : deps.canonFiles(params.q) });
  return {
    status: 200,
    body: {
      query: params.q || null,
      top_k: params.topK,
      mode: found.mode,
      n_results: results.length,
      advisors_sample: sample,
      advisors_source: origin,
      results,
      took_ms: Date.now() - t0,
    },
  };
}
