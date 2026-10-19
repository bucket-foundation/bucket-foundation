"use client";

import { loadBranch, localBranches, pullServer, pushBranch, readLocal } from "./progress-store";
import { SYSTEMS_KEY, saveSystems } from "./lang-client";

export const GUEST_FREE_ATOMS = 1;

export async function mergeGuestProgress(): Promise<void> {
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
const pageLesson = Math.random().toString(36).slice(2);

export function guestMayStudyLanguage(): boolean {
  try {
    const held = localStorage.getItem(GUEST_LESSON_KEY);
    if (held === null) {
      localStorage.setItem(GUEST_LESSON_KEY, pageLesson);
      return true;
    }
    return held === pageLesson;
  } catch {
    return true;
  }
}
