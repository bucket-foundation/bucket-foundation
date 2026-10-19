import { mergeState, normalizeState, type EngineState } from "./engine";
import type { ProgressStore, ServerBranches } from "./progress-store";
import type { PulledReview, QueuedReview, ReviewEvent } from "./review-sync";

export interface BktServeStoreOptions {
  token: string;
  base?: string;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  uuid?: () => string;
  debounceMs?: number;
  onError?: (e: Error) => void;
}

export interface BktServeStore extends ProgressStore {
  flush(): Promise<void>;
  appendReview(branch: string, review: ReviewEvent): QueuedReview;
  pullLog(): Promise<PulledReview[] | null>;
}

export function createBktServeStore(opts: BktServeStoreOptions): BktServeStore {
  const base = opts.base ?? "";
  const f = opts.fetch ?? fetch;
  const wait = opts.debounceMs ?? 400;
  const headers = { authorization: `Bucket ${opts.token}`, "content-type": "application/json" };
  const pending = new Map<string, { state: EngineState; timer: ReturnType<typeof setTimeout> }>();
  const report = (e: unknown) => opts.onError?.(e instanceof Error ? e : new Error(String(e)));

  async function pull(): Promise<ServerBranches | null> {
    try {
      const r = await f(`${base}/local/progress`, { headers });
      if (!r.ok) throw new Error(`progress pull ${r.status}`);
      return ((await r.json()) as { branches?: ServerBranches }).branches ?? {};
    } catch (e) {
      report(e);
      return null;
    }
  }

  async function push(branch: string, state: EngineState): Promise<EngineState | null> {
    try {
      const r = await f(`${base}/local/progress`, { method: "POST", headers, body: JSON.stringify({ branch, data: state }) });
      if (!r.ok) throw new Error(`progress save ${r.status}`);
      return normalizeState(((await r.json()) as { data?: unknown }).data);
    } catch (e) {
      report(e);
      return null;
    }
  }

  async function load(branch: string, server?: ServerBranches | null): Promise<EngineState> {
    const all = server === undefined ? await pull() : server;
    const row = all?.[branch];
    const saved = row ? normalizeState(row.data) : normalizeState(null);
    const queued = pending.get(branch)?.state;
    return queued ? mergeState(saved, queued) : saved;
  }

  function save(branch: string, state: EngineState): void {
    const prev = pending.get(branch);
    if (prev) clearTimeout(prev.timer);
    const timer = setTimeout(() => {
      pending.delete(branch);
      void push(branch, state);
    }, wait);
    pending.set(branch, { state, timer });
  }

  async function flush(): Promise<void> {
    const jobs = Array.from(pending.entries()).map(([branch, { state, timer }]) => {
      clearTimeout(timer);
      pending.delete(branch);
      return push(branch, state);
    });
    await Promise.all(jobs);
  }

  const uuid = opts.uuid ?? (() => crypto.randomUUID());
  const sent = new Set<Promise<unknown>>();

  function appendReview(branch: string, review: ReviewEvent): QueuedReview {
    const q: QueuedReview = { ...review, review_id: review.review_id || uuid(), branch, device_id: "local" };
    const p = f(`${base}/local/review-log`, { method: "POST", headers, body: JSON.stringify({ branch, review: { ...review, review_id: q.review_id } }) })
      .then((r) => {
        if (!r.ok) throw new Error(`review log append ${r.status}`);
      })
      .catch(report)
      .finally(() => sent.delete(p));
    sent.add(p);
    return q;
  }

  async function pullLog(): Promise<PulledReview[] | null> {
    await Promise.all(Array.from(sent));
    try {
      const r = await f(`${base}/local/review-log`, { headers });
      if (!r.ok) throw new Error(`review log pull ${r.status}`);
      return ((await r.json()) as { reviews: PulledReview[] | null }).reviews;
    } catch (e) {
      report(e);
      return null;
    }
  }

  return { pull, load, save, flush, appendReview, pullLog };
}
