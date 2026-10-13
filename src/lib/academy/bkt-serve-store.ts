import { mergeState, normalizeState, type EngineState } from "./engine";
import type { ProgressStore, ServerBranches } from "./progress-store";

export interface BktServeStoreOptions {
  token: string;
  base?: string;
  fetch?: typeof fetch;
  debounceMs?: number;
  onError?: (e: Error) => void;
}

export interface BktServeStore extends ProgressStore {
  flush(): Promise<void>;
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

  return { pull, load, save, flush };
}
