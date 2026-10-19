"use client";

import { loadBranch, localBranches, pullServer, pushBranch, readLocal } from "./progress-store";
import { SYSTEMS_KEY, saveSystems } from "./lang-client";

export const GUEST_FREE_ATOMS = 1;

export async function mergeGuestProgress(): Promise<void> {
  clearGuestLesson();
  const branches = localBranches();
  if (hasLocalSystems()) await saveSystems({});
  if (branches.length === 0) return;
  const server = await pullServer();
  if (!server) return;
  await Promise.all(
    branches.map(async (b) => {
      if (server[b]) {
        await loadBranch(b, server);
        return;
      }
      const local = readLocal(b);
      if (local) await pushBranch(b, local);
    })
  );
}

export function guestMayGrade(branch: string, cards: Record<string, unknown>, atomId: string): boolean {
  if (atomId in cards) return true;
  const elsewhere = localBranches()
    .filter((b) => b !== branch)
    .reduce((n, b) => n + Object.keys(readLocal(b)?.cards ?? {}).length, 0);
  return Object.keys(cards).length + elsewhere < GUEST_FREE_ATOMS;
}

function hasLocalSystems(): boolean {
  try {
    return localStorage.getItem(SYSTEMS_KEY) !== null;
  } catch {
    return false;
  }
}

export const GUEST_LESSON_KEY = "bucket-guest-lang-lesson";
export const GUEST_LESSON_MS = 45 * 60 * 1000;

export function guestMayStudyLanguage(systemId: string, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(GUEST_LESSON_KEY);
    const held = raw ? (JSON.parse(raw) as { system?: string; at?: number }) : null;
    if (!held || typeof held.at !== "number") {
      localStorage.setItem(GUEST_LESSON_KEY, JSON.stringify({ system: systemId, at: now }));
      return true;
    }
    return held.system === systemId && now - held.at < GUEST_LESSON_MS;
  } catch {
    return true;
  }
}

export function clearGuestLesson(): void {
  try {
    localStorage.removeItem(GUEST_LESSON_KEY);
  } catch {
  }
}
