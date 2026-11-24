import { spyPoints } from "@academy/ispy";
import type { LobbyPlayer } from "@academy/lobbies";

interface SpyBot {
  id: string;
  name: string;
  skill: "easy" | "medium" | "hard";
  flag: string;
  accuracy: number;
  from: number;
  to: number;
}

export const SPY_BOTS: SpyBot[] = [
  { id: "bot-ama", name: "Ama", skill: "hard", flag: "gh", accuracy: 0.85, from: 0.2, to: 0.55 },
  { id: "bot-ines", name: "Inês", skill: "medium", flag: "pt", accuracy: 0.65, from: 0.3, to: 0.75 },
  { id: "bot-kenji", name: "Kenji", skill: "easy", flag: "jp", accuracy: 0.45, from: 0.4, to: 0.95 },
];

export function unit(key: string): number {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h / 2 ** 32;
}

interface BotTurn {
  botId: string;
  atMs: number;
  correct: boolean;
}

export function botTurns(seed: string, round: number, roundSeconds: number, bots: readonly SpyBot[] = SPY_BOTS): BotTurn[] {
  const len = roundSeconds * 1000;
  return bots.map((b) => {
    const key = `${seed}:${round}:${b.id}`;
    return { botId: b.id, atMs: Math.round(len * (b.from + (b.to - b.from) * unit(`at:${key}`))), correct: unit(`ok:${key}`) < b.accuracy };
  });
}

export interface Tally {
  score: number;
  streak: number;
}

export function award(t: Tally, correct: boolean, ms: number, roundSeconds: number): Tally & { points: number } {
  const points = spyPoints(correct, ms, roundSeconds, t.streak);
  return { score: t.score + points, streak: correct ? t.streak + 1 : 0, points };
}

export function boardPlayers(me: { name: string; score: number; answered: boolean }, bots: readonly SpyBot[], tallies: Record<string, Tally>, answered: ReadonlySet<string>): LobbyPlayer[] {
  const base = { handle: null, ready: true, isHost: false, online: true, firstRound: 0, continues: 0 };
  return [
    { ...base, userId: "me", name: me.name, score: me.score, isMe: true, answered: me.answered, bot: false, skill: null, flag: null },
    ...bots.map((b) => ({ ...base, userId: b.id, name: b.name, score: tallies[b.id]?.score ?? 0, isMe: false, answered: answered.has(b.id), bot: true, skill: b.skill, flag: b.flag })),
  ];
}

export function myRank(players: readonly LobbyPlayer[]): number {
  return [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.isMe) + 1;
}

export function roundLeft(now: number, startedAt: number, roundSeconds: number): number {
  return Math.max(0, 1 - (now - startedAt) / (roundSeconds * 1000));
}

export function settle(tallies: Record<string, Tally>, turns: readonly BotTurn[], roundSeconds: number): Record<string, Tally> {
  const next = { ...tallies };
  for (const t of turns) next[t.botId] = award(next[t.botId] ?? { score: 0, streak: 0 }, t.correct, t.atMs, roundSeconds);
  return next;
}
