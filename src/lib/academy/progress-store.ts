/**
 * Where Academy progress lives in the browser and how it syncs. Local
 * storage keeps the same keys the Academy app used (`bucket-academy/v1/
 * <branch>`), so progress made in the app carries into Research OS. The
 * server copy is one row per person and branch in bucket.academy_progress,
 * reached through /api/academy/progress with the site session cookies;
 * local and server merge with mergeState so every device converges.
 */
"use client";

import { mergeState, normalizeState, type EngineState } from "./engine";

const LS_BASE = "bucket-academy/v1";
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
    // Storage full or blocked: the server copy still receives the push.
  }
}

/** Every branch with local progress on this device. */
export function localBranches(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_BASE + "/")) out.push(k.slice(LS_BASE.length + 1));
    }
  } catch {
    // no storage
  }
  return out;
}

export type ServerBranches = Record<string, { data: unknown; updated_at: string }>;

/** The server's copy for the signed-in person, or null when signed out or unavailable. */
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

/**
 * Load one branch: local first, merged with the server copy when there is
 * one. Writes the merged result back to both sides when they differed.
 */
export async function loadBranch(branch: string, server?: ServerBranches | null): Promise<EngineState> {
  const local = readLocal(branch);
  const remote = server === undefined ? await pullServer() : server;
  const remoteState = remote && remote[branch] ? normalizeState(remote[branch].data) : null;
  if (!remoteState) return local ?? normalizeState(null);
  const merged = mergeState(local, remoteState);
  const mergedJson = JSON.stringify(merged);
  if (JSON.stringify(local) !== mergedJson) writeLocal(branch, merged);
  if (JSON.stringify(remoteState) !== mergedJson) void pushBranch(branch, merged);
  return merged;
}

const timers = new Map<string, number>();

/** Persist a branch: local at once, server after a short quiet period. */
export function saveBranch(branch: string, state: EngineState): void {
  writeLocal(branch, state);
  const prev = timers.get(branch);
  if (prev) window.clearTimeout(prev);
  timers.set(
    branch,
    window.setTimeout(() => {
      timers.delete(branch);
      void pushBranch(branch, state);
    }, 1200)
  );
}
