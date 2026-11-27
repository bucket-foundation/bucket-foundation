import { REACTIONS, type BonusTally, type Reaction } from "@academy/lobbies";

export const FLOAT_MS = 3200;
export const FLOAT_MAX = 24;

export type Float = { id: number; emoji: string; x: number; at: number };

export type Signal = { kind: "react"; emoji: Reaction; from: string };

export function readSignal(payload: unknown): Signal | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const from = typeof p.from === "string" ? p.from : "";
  if (p.kind === "react" && typeof p.emoji === "string" && (REACTIONS as readonly string[]).includes(p.emoji)) return { kind: "react", emoji: p.emoji as Reaction, from };
  return null;
}

export function addFloat(floats: readonly Float[], emoji: string, now: number, id: number, rand: () => number): Float[] {
  const live = floats.filter((f) => now - f.at < FLOAT_MS);
  return [...live, { id, emoji, x: Math.round(5 + rand() * 90), at: now }].slice(-FLOAT_MAX);
}

export function audienceTally(tallies: readonly BonusTally[] | undefined, round: number): BonusTally | null {
  const t = tallies?.find((x) => x.round === round);
  return t && t.total > 0 ? t : null;
}
