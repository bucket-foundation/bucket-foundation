"use client";

import { mergeState, normalizeState, type EngineState } from "./engine";
import { getBrowserSupabase, supabaseConfigured } from "../supabase/browser";
import { createReviewSync, type PulledReview, type QueuedReview, type ReviewEvent } from "./review-sync";

export type ServerBranches = Record<string, { data: unknown; updated_at: string }>;

export interface ProgressStore {
  pull(): Promise<ServerBranches | null>;
  load(branch: string, server?: ServerBranches | null): Promise<EngineState>;
  save(branch: string, state: EngineState): void;
  appendReview?(branch: string, review: ReviewEvent): QueuedReview;
  pullLog?(): Promise<PulledReview[] | null>;
}

export const LS_BASE = "bucket-academy/v1";
const API = "/api/academy/progress";

export function readLocal(branch: string): EngineState | null {
  try {
    const raw = localStorage.getItem(`${LS_BASE}/${branch}`);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeLocal(branch: string, state: EngineState): void {
  try {
    localStorage.setItem(`${LS_BASE}/${branch}`, JSON.stringify(state));
  } catch {
  }
}

export function localBranches(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_BASE + "/")) out.push(k.slice(LS_BASE.length + 1));
    }
  } catch {
  }
  return out;
}

export async function pullServer(): Promise<ServerBranches | null> {
  try {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { branches?: ServerBranches };
    return j.branches ?? {};
  } catch {
    return null;
  }
}

export async function pushBranch(branch: string, state: EngineState): Promise<boolean> {
  try {
    const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branch, data: state }) });
    return res.ok;
  } catch {
    return false;
  }
}

export const reviewSync = createReviewSync({
  storage: () => {
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      return null;
    }
  },
  fetch: (input, init) => fetch(input, init),
  uuid: () => crypto.randomUUID(),
  readLocal,
  pushSnapshot: pushBranch,
  onProblem: (problem, count) => console.error("academy review outbox", problem, count),
});

let authWatched = false;
function watchAuth(): void {
  if (authWatched || typeof window === "undefined" || !supabaseConfigured()) return;
  authWatched = true;
  try {
    const sb = getBrowserSupabase();
    void sb.auth.getSession().then(({ data }) => reviewSync.setUser(data.session?.user.id ?? null));
    sb.auth.onAuthStateChange((_event, session) => reviewSync.setUser(session?.user.id ?? null));
  } catch (e) {
    console.error("academy review outbox auth watch", e);
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function appendReview(branch: string, review: ReviewEvent): QueuedReview {
  watchAuth();
  const q = reviewSync.appendReview(branch, review);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void reviewSync.flush();
  }, 800);
  return q;
}

export async function pullLog(): Promise<PulledReview[] | null> {
  await reviewSync.flush();
  return reviewSync.pullLog();
}

export async function loadBranch(branch: string, server?: ServerBranches | null): Promise<EngineState> {
  const local = readLocal(branch);
  watchAuth();
  void pullLog();
  const remote = server === undefined ? await pullServer() : server;
  const remoteState = remote && remote[branch] ? normalizeState(remote[branch].data) : null;
  if (!remoteState) return local ?? normalizeState(null);
  const merged = mergeState(local, remoteState);
  const mergedJson = JSON.stringify(merged);
  if (JSON.stringify(local) !== mergedJson) writeLocal(branch, merged);
  if (JSON.stringify(remoteState) !== mergedJson && reviewSync.mode() !== "log") void pushBranch(branch, merged);
  return merged;
}

export function peekBranch(branch: string, server: ServerBranches | null): EngineState {
  const local = readLocal(branch);
  const remoteState = server && server[branch] ? normalizeState(server[branch].data) : null;
  if (!remoteState) return local ?? normalizeState(null);
  return mergeState(local, remoteState);
}

const timers = new Map<string, number>();

export function saveBranch(branch: string, state: EngineState): void {
  writeLocal(branch, state);
  const prev = timers.get(branch);
  if (prev) window.clearTimeout(prev);
  timers.set(
    branch,
    window.setTimeout(() => {
      timers.delete(branch);
      if (reviewSync.mode() !== "log") void pushBranch(branch, state);
    }, 1200)
  );
}

export const webProgressStore: ProgressStore = { pull: pullServer, load: loadBranch, save: saveBranch, appendReview, pullLog };

export function exportLocal(): Record<string, EngineState> {
  const out: Record<string, EngineState> = {};
  for (const b of localBranches()) {
    const s = readLocal(b);
    if (s) out[b] = s;
  }
  return out;
}
