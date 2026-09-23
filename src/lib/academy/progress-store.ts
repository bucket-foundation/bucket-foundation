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

export type ServerBranches = Record<string, { data: unknown; updated_at: string }>;

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
