/**
 * One evidence search, inside the deadlines in IMPLEMENTATION.md: eight
 * seconds end to end, of which the worker may use six. Keyword ranking
 * runs in this process first and always answers; the worker's dense
 * ranking joins it by reciprocal rank fusion when it answers in time and
 * passes the response checks. When the worker is absent, late, down or
 * malformed, the search returns the keyword ranking and says so with
 * status `degraded`.
 *
 * The caller resolves the eligible set, the admitted and currently public
 * sources, before this runs. It masks keyword scoring and is the only set
 * the worker may score. Authorization and the pilot gates live in the
 * route (ros-ai-find), which calls this.
 */
import { fuse, LexicalIndex, eligibleKey, type Fused, type Ranked } from "./lexical";
import { scoreWithWorker, type WorkerConfig, type WorkerOutcome, type WorkerRequest } from "./worker-client";

export const REQUEST_DEADLINE_MS = 8000;
export const WORKER_BUDGET_MS = 6000;
/** Kept back from the worker for fusion, hydration and the response. */
export const RESPONSE_RESERVE_MS = 500;
export const CANDIDATES = 100;
/**
 * How deep each ranking goes into fusion. At 100 per list over a corpus of
 * 500, nearly every keyword hit also sits somewhere in the dense list, and
 * a weak match on both beats the dense list's first place. Twenty per list
 * matches the reranker's window in IMPLEMENTATION.md and keeps the union
 * under CANDIDATES. A development default: EVALUATION.md's development set
 * chooses the value the sealed evaluation freezes.
 */
export const FUSE_DEPTH = 20;
export const MAX_QUERY_CODE_POINTS = 512;

export interface SearchInput {
  requestId: string;
  query: string;
  corpusRevision: string;
  eligible: { sourceId: string; sourceRevision: string }[];
  limit: number;
  lexical: LexicalIndex;
  worker: WorkerConfig | null;
  /** When the request arrived, from the same clock as `now`. */
  startedAt?: number;
}

export interface SearchDeps {
  score?: (cfg: WorkerConfig, req: WorkerRequest) => Promise<WorkerOutcome>;
  now?: () => number;
}

export interface SearchResult {
  mode: "hybrid" | "lexical";
  status: "ok" | "no_match" | "degraded";
  results: Fused[];
  /** Why the dense ranking is missing, when it is. */
  worker: { used: boolean; failure: string | null; modelRevision: string | null; deadlineMs: number | null };
  lexicalScored: number;
}

export class SearchInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchInputError";
    Object.setPrototypeOf(this, SearchInputError.prototype);
  }
}

export async function evidenceSearch(input: SearchInput, deps: SearchDeps = {}): Promise<SearchResult> {
  const now = deps.now ?? (() => Date.now());
  const score = deps.score ?? ((cfg, req) => scoreWithWorker(cfg, req));
  const started = input.startedAt ?? now();
  const query = input.query.trim();
  if (!query || Array.from(query).length > MAX_QUERY_CODE_POINTS) throw new SearchInputError(`the query is 1 to ${MAX_QUERY_CODE_POINTS} code points`);
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > FUSE_DEPTH) throw new SearchInputError(`limit is 1 to ${FUSE_DEPTH}`);

  const eligible = new Set(input.eligible.map((e) => eligibleKey(e.sourceId, e.sourceRevision)));
  if (eligible.size === 0) {
    // Nothing is admitted and public right now: an ordinary empty answer, with no worker call.
    return { mode: input.worker ? "hybrid" : "lexical", status: "no_match", results: [], worker: { used: false, failure: null, modelRevision: null, deadlineMs: null }, lexicalScored: 0 };
  }
  const lexical = input.lexical.search(query, eligible, FUSE_DEPTH);

  let dense: Ranked[] | null = null;
  let failure: string | null = input.worker ? null : "no worker configured";
  let modelRevision: string | null = null;
  let deadlineMs: number | null = null;
  if (input.worker) {
    const remaining = REQUEST_DEADLINE_MS - (now() - started) - RESPONSE_RESERVE_MS;
    deadlineMs = Math.floor(Math.min(WORKER_BUDGET_MS, remaining));
    if (deadlineMs < 1) {
      failure = "no time left for the worker";
      deadlineMs = null;
    } else {
      const out = await score(input.worker, {
        requestId: input.requestId,
        query,
        corpusRevision: input.corpusRevision,
        eligible: input.eligible.map((e) => [e.sourceId, e.sourceRevision] as [string, string]),
        limit: FUSE_DEPTH,
        deadlineMs,
      });
      if (out.ok) {
        dense = out.results;
        modelRevision = out.modelRevision;
      } else {
        failure = `${out.reason}: ${out.detail}`;
      }
    }
  }

  const results = dense
    ? fuse(lexical.results, dense, input.limit)
    : lexical.results.slice(0, input.limit).map((r, i) => ({ ...r, score: r.score, lexicalRank: i + 1, denseRank: null }));
  return {
    mode: dense ? "hybrid" : "lexical",
    status: dense ? (results.length ? "ok" : "no_match") : "degraded",
    results,
    worker: { used: dense !== null, failure, modelRevision, deadlineMs },
    lexicalScored: lexical.scored,
  };
}
