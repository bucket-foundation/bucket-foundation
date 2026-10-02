import { parseCanonSearchParams, type CanonSearchParams, type CanonSearchResult } from "../canon-rank";
import type { LoadedAdvisors } from "./advisors";
import { ANY_TERM, type Floor, type RankStats } from "./rank";
import { HIT_TYPES, advisorId, unify, type ExcerptSource, type Hit, type HitType, type Talk } from "./search";
import { searchSources, sourceToHit, type Prepared } from "./source-index";

export const EXPLORE_DEFAULT_TOP_K = 40;
export const MAP_ADVISOR_CAP = 400;

type CanonFound = Extract<CanonSearchResult, { ok: true }>;

export interface RankingCorpus {
  stats: RankStats;
}

export interface RankingFounding {
  hitId: string | null;
  bonus: number;
  card: unknown;
}

export interface ExploreRanking<C extends RankingCorpus = RankingCorpus> {
  corpus: () => Promise<C>;
  founding: (query: string) => RankingFounding | null;
  talkFor: (file: string) => Talk | null;
  rankedPools: (query: string, corpus: C, opts: { branch?: string; bonus?: Map<string, number>; year?: (concept: string) => number | null; floor?: Floor }) => { sources: Hit[]; excerpts: ExcerptSource[]; files: Hit[] };
  semanticExcerpts: (query: string, corpus: C, found: CanonFound["results"], year?: (concept: string) => number | null, talk?: (file: string) => Talk | null) => ExcerptSource[];
  needsClosest: (query: string, rows: number) => boolean;
}

export interface ExploreSearchDeps {
  ranking?: ExploreRanking<any>;
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

  if (deps.ranking) return rankedSearch(deps, deps.ranking, url, t0, params, types, found);

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

async function rankedSearch(
  deps: ExploreSearchDeps,
  ranking: ExploreRanking,
  url: URL,
  t0: number,
  params: CanonSearchParams,
  types: HitType[],
  found: CanonFound,
): Promise<ExploreReply> {
  const semantic = found.mode === "semantic";
  const founding = params.branch ? null : ranking.founding(params.q);
  const corpus = await ranking.corpus();
  const bonus = founding?.hitId && founding.bonus > 0 ? new Map([[founding.hitId, founding.bonus]]) : undefined;
  const anyTerm = url.searchParams.get("match") === "any";
  const { sources, sample, origin } = deps.advisors();
  const advisors = params.branch ? [] : sources;
  const search = (floor?: Floor) => {
    const ranked = ranking.rankedPools(params.q, corpus, { branch: params.branch, bonus, year: deps.yearOf, floor });
    return unify({
      query: params.q,
      excerpts: semantic ? ranking.semanticExcerpts(params.q, corpus, found.results, deps.yearOf, ranking.talkFor) : ranked.excerpts,
      advisors,
      sources: params.branch ? [] : ranked.sources,
      types,
      topK: params.topK,
      extraHits: params.branch ? [] : ranked.files,
      stats: corpus.stats,
    });
  };
  const strict = search(anyTerm ? ANY_TERM : undefined);
  const closest = !anyTerm && !semantic && ranking.needsClosest(params.q, strict.length);
  const results = closest ? search(ANY_TERM) : strict;
  return {
    status: 200,
    body: {
      query: params.q || null,
      top_k: params.topK,
      mode: found.mode,
      n_results: results.length,
      advisors_sample: sample,
      advisors_source: origin,
      pinned: founding?.card ?? null,
      closest,
      results,
      took_ms: Date.now() - t0,
    },
  };
}
