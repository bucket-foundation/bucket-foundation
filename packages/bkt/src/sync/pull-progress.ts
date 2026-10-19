import { mergeState, normalizeState, type EngineState } from "../../../../src/lib/academy/engine";
import { SYSTEMS_BRANCH } from "../../../../src/lib/academy/lang-client";
import { SyncError, type RemoteSync } from "../../../../src/lib/academy/remote-sync";

const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export interface LearnStore {
  learnState(branch: string): EngineState;
  putLearnState(branch: string, raw: unknown, now: number): void;
}

export async function pullRemoteProgress(remote: Pick<RemoteSync, "signedFetch">, store: LearnStore, now: () => number = Date.now): Promise<string[] | null> {
  let res: Response;
  try {
    res = await remote.signedFetch("/api/academy/progress");
  } catch (e) {
    if (e instanceof SyncError && e.code === "offline") return null;
    throw e;
  }
  if (!res.ok) return null;
  const j = (await res.json().catch(() => null)) as { branches?: Record<string, { data?: unknown }> } | null;
  if (!j || !j.branches || typeof j.branches !== "object") return null;
  const changed: string[] = [];
  for (const [branch, row] of Object.entries(j.branches)) {
    if (!BRANCH_RE.test(branch) || branch === SYSTEMS_BRANCH || !row || typeof row.data !== "object" || row.data === null) continue;
    const local = store.learnState(branch);
    const merged = mergeState(local, normalizeState(row.data));
    if (JSON.stringify(merged) === JSON.stringify(local)) continue;
    store.putLearnState(branch, merged, now());
    changed.push(branch);
  }
  return changed;
}
