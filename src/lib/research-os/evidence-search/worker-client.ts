/**
 * The server's side of the loopback encoder worker (tools/evidence-search).
 *
 * One request per search, with the query, the corpus revision the server
 * expects and the eligible pairs it resolved. The response is trusted only
 * after it is checked: the request id and corpus revision echo, every
 * result is an eligible pair seen once, every score is a finite number,
 * and there are no more results than asked. Anything else counts as a
 * worker failure and the search falls back to keyword ranking.
 */
import type { Ranked } from "./lexical";
import { eligibleKey } from "./lexical";

export interface WorkerConfig {
  url: string;
  secret: string;
}

export interface WorkerRequest {
  requestId: string;
  query: string;
  corpusRevision: string;
  eligible: [string, string][];
  limit: number;
  deadlineMs: number;
}

export type WorkerOutcome =
  | { ok: true; results: Ranked[]; modelRevision: string }
  | { ok: false; reason: "refused" | "timeout" | "unreachable" | "http" | "malformed"; detail: string };

const LOOPBACK = new Set(["127.0.0.1", "[::1]", "localhost"]);

/** Refuses any worker address off this machine before a request is built. */
export function loopbackUrl(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" && LOOPBACK.has(u.hostname) ? u : null;
  } catch {
    return null;
  }
}

export async function scoreWithWorker(cfg: WorkerConfig, req: WorkerRequest, fetchImpl: typeof fetch = fetch): Promise<WorkerOutcome> {
  const base = loopbackUrl(cfg.url);
  if (!base) return { ok: false, reason: "refused", detail: "the worker URL is not an http loopback address" };
  if (!cfg.secret || cfg.secret.length < 32) return { ok: false, reason: "refused", detail: "the worker secret is shorter than 32 characters" };
  let res: Response;
  try {
    res = await fetchImpl(new URL("/score", base), {
      method: "POST",
      headers: { "content-type": "application/json", "x-evidence-worker-key": cfg.secret },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(req.deadlineMs),
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    return name === "TimeoutError" || name === "AbortError"
      ? { ok: false, reason: "timeout", detail: `no answer within ${req.deadlineMs} ms` }
      : { ok: false, reason: "unreachable", detail: e instanceof Error ? e.message : String(e) };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "malformed", detail: `HTTP ${res.status} with a body that is not JSON` };
  }
  if (res.status !== 200) {
    const code = (body as { error?: unknown })?.error;
    return { ok: false, reason: "http", detail: `HTTP ${res.status} ${typeof code === "string" ? code : ""}`.trim() };
  }
  return checkResponse(body, req);
}

/** The response checks, apart from transport, so tests reach each one. */
export function checkResponse(body: unknown, req: WorkerRequest): WorkerOutcome {
  const bad = (detail: string): WorkerOutcome => ({ ok: false, reason: "malformed", detail });
  const b = body as { requestId?: unknown; corpusRevision?: unknown; modelRevision?: unknown; results?: unknown };
  if (!b || typeof b !== "object") return bad("the body is not an object");
  if (b.requestId !== req.requestId) return bad("the request id does not echo");
  if (b.corpusRevision !== req.corpusRevision) return bad("the corpus revision does not echo");
  if (typeof b.modelRevision !== "string" || !b.modelRevision) return bad("no model revision");
  if (!Array.isArray(b.results) || b.results.length > req.limit) return bad("results are missing or exceed the limit");
  const eligible = new Set(req.eligible.map(([s, r]) => eligibleKey(s, r)));
  const seen = new Set<string>();
  const results: Ranked[] = [];
  for (const r of b.results as { sourceId?: unknown; sourceRevision?: unknown; score?: unknown }[]) {
    if (typeof r?.sourceId !== "string" || typeof r.sourceRevision !== "string") return bad("a result lacks its ids");
    const k = eligibleKey(r.sourceId, r.sourceRevision);
    if (!eligible.has(k)) return bad(`${r.sourceId} was not in the eligible set`);
    if (seen.has(k)) return bad(`${r.sourceId} appears twice`);
    if (typeof r.score !== "number" || !Number.isFinite(r.score)) return bad(`${r.sourceId} has a score that is not a finite number`);
    seen.add(k);
    results.push({ sourceId: r.sourceId, sourceRevision: r.sourceRevision, score: r.score });
  }
  return { ok: true, results, modelRevision: b.modelRevision };
}
