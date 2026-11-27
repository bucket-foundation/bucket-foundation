import { REACTIONS, type Reaction } from "@academy/lobbies";

export const FLOAT_MS = 3200;
export const FLOAT_MAX = 24;

export type Float = { id: number; emoji: string; x: number; at: number };

export type Signal = { kind: "react"; emoji: Reaction; from: string } | { kind: "vote"; round: number; choice: string; from: string };

export function readSignal(payload: unknown): Signal | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const from = typeof p.from === "string" ? p.from : "";
  if (p.kind === "react" && typeof p.emoji === "string" && (REACTIONS as readonly string[]).includes(p.emoji)) return { kind: "react", emoji: p.emoji as Reaction, from };
  if (p.kind === "vote" && Number.isInteger(p.round) && typeof p.choice === "string" && from) return { kind: "vote", round: p.round as number, choice: p.choice, from };
  return null;
}

export function addFloat(floats: readonly Float[], emoji: string, now: number, id: number, rand: () => number): Float[] {
  const live = floats.filter((f) => now - f.at < FLOAT_MS);
  return [...live, { id, emoji, x: Math.round(5 + rand() * 90), at: now }].slice(-FLOAT_MAX);
}

export type Tally = { choice: string; votes: number }[];

export function tally(votes: ReadonlyMap<string, string>): Tally {
  const counts = new Map<string, number>();
  for (const c of votes.values()) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].map(([choice, n]) => ({ choice, votes: n })).sort((a, b) => b.votes - a.votes || a.choice.localeCompare(b.choice));
}
