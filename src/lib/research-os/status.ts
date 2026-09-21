/**
 * The machinery behind Research OS, checked from this deployment's server:
 * the engine (`hte-serve`), the tutor's model endpoint, and the latest CI
 * runs (ros-frontend 1: the engine host and build health surfaces).
 *
 * Each check says which of four things it saw, because an unanswered check
 * and a service that is down read the same from outside:
 * - "up": the service answered and said it is healthy;
 * - "unhealthy": it answered and said something is wrong;
 * - "unreachable": this server could not get an answer (refused, timed
 *   out, DNS), which means down or out of this server's reach;
 * - "unset": this deployment has no address for it, so nothing was checked.
 *
 * Pure apart from the injected fetch, so scripts/test-research-os-status.ts
 * runs it offline.
 */

export type CheckState = "up" | "unhealthy" | "unreachable" | "unset";

export interface Check {
  name: string;
  state: CheckState;
  detail: string;
  ms: number | null;
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 3000;

async function timed(fetcher: Fetcher, url: string, init: RequestInit = {}): Promise<{ res: Response | null; ms: number; error: string | null }> {
  const started = Date.now();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(url, { ...init, signal: ctl.signal, cache: "no-store", redirect: "manual" });
    return { res, ms: Date.now() - started, error: null };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { res: null, ms: Date.now() - started, error: aborted ? `no answer in ${TIMEOUT_MS / 1000} s` : "connection failed" };
  } finally {
    clearTimeout(t);
  }
}

/** The engine: GET <HTE_SERVE_URL>/health answers {"ok": true, "status": "healthy"}. */
export async function checkEngine(base: string | undefined, fetcher: Fetcher): Promise<Check> {
  const name = "Hypothesis engine";
  if (!base?.trim()) return { name, state: "unset", detail: "No HTE_SERVE_URL on this deployment, so hypothesize is off here.", ms: null };
  const { res, ms, error } = await timed(fetcher, `${base.replace(/\/+$/, "")}/health`);
  if (!res) return { name, state: "unreachable", detail: `The engine did not answer this server: ${error}.`, ms };
  let body: { ok?: boolean; status?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    // A non-JSON answer is reported below as unhealthy.
  }
  if (res.ok && body.ok === true) {
    const extra = body.status && body.status !== "healthy" ? `, status ${body.status}` : "";
    return { name, state: "up", detail: `Healthy${extra}.`, ms };
  }
  return { name, state: "unhealthy", detail: `Answered HTTP ${res.status}${body.status ? `, status ${body.status}` : ""}.`, ms };
}

/** The tutor's OpenAI-compatible endpoint: GET <LLM_BASE_URL>/models lists the served models. */
export async function checkModel(base: string | undefined, apiKey: string | undefined, fetcher: Fetcher): Promise<Check> {
  const name = "Tutor model";
  if (!base?.trim()) return { name, state: "unset", detail: "No LLM_BASE_URL on this deployment; the tutor uses the hosted fallback when one is set.", ms: null };
  const headers: Record<string, string> = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  const { res, ms, error } = await timed(fetcher, `${base.replace(/\/+$/, "")}/models`, { headers });
  if (!res) return { name, state: "unreachable", detail: `The model endpoint did not answer this server: ${error}.`, ms };
  if (!res.ok) return { name, state: "unhealthy", detail: `Answered HTTP ${res.status}.`, ms };
  let ids: string[] = [];
  try {
    const body = (await res.json()) as { data?: { id?: string }[] };
    ids = (body.data ?? []).map((m) => m.id ?? "").filter(Boolean);
  } catch {
    return { name, state: "unhealthy", detail: "Answered with something other than a model list.", ms };
  }
  return ids.length > 0
    ? { name, state: "up", detail: `Serving ${ids.slice(0, 3).join(", ")}${ids.length > 3 ? ` and ${ids.length - 3} more` : ""}.`, ms }
    : { name, state: "unhealthy", detail: "Answered with no models.", ms };
}

export interface RunSummary {
  workflow: string;
  branch: string;
  status: string;
  conclusion: string | null;
  sha: string;
  at: string;
  url: string;
}

/** The newest run of each workflow, from the Actions API's workflow_runs list. */
export function latestRuns(body: unknown, branch: string): RunSummary[] {
  const runs = (body as { workflow_runs?: Record<string, unknown>[] })?.workflow_runs ?? [];
  const seen = new Set<string>();
  const out: RunSummary[] = [];
  for (const r of runs) {
    const workflow = String(r.name ?? "");
    if (!workflow || seen.has(workflow)) continue;
    seen.add(workflow);
    out.push({
      workflow,
      branch,
      status: String(r.status ?? ""),
      conclusion: r.conclusion == null ? null : String(r.conclusion),
      sha: String(r.head_sha ?? "").slice(0, 9),
      at: String(r.created_at ?? ""),
      url: String(r.html_url ?? ""),
    });
  }
  return out;
}

export const REPO = "bucket-foundation/bucket-foundation";

/** CI runs on a branch; null when GitHub did not answer, so the page says it could not check. */
export async function fetchRuns(branch: string, fetcher: Fetcher): Promise<RunSummary[] | null> {
  const { res } = await timed(fetcher, `https://api.github.com/repos/${REPO}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=20`, {
    headers: { accept: "application/vnd.github+json" },
  });
  if (!res || !res.ok) return null;
  try {
    return latestRuns(await res.json(), branch);
  } catch {
    return null;
  }
}
