import type { LobbyState } from "@academy/lobbies";
import type { MissedWord, RoomRecord } from "./results";
import { dayOf } from "./results";

type Lobby = Pick<LobbyState, "prompts" | "results" | "players">;
export const REVIEW_SIZE = 5;

function myId(lobby: Lobby): string | null {
  return lobby.players.find((p) => p.isMe)?.userId ?? null;
}

export function missedRounds(lobby: Lobby, uid: string | null = myId(lobby)): number[] {
  if (!uid) return [];
  const right = new Set(lobby.results.filter((r) => r.userId === uid && r.correct).map((r) => r.round));
  return lobby.prompts.filter((p) => p.answer && !right.has(p.round)).map((p) => p.round);
}

export function reviewCards(lobby: Lobby, learn: readonly string[]): MissedWord[] {
  const out: MissedWord[] = [];
  const seen = new Set<string>();
  for (const round of missedRounds(lobby)) {
    const p = lobby.prompts.find((x) => x.round === round);
    const reveal = p?.reveal ?? [];
    const e = learn.map((l) => reveal.find((r) => r.lang === l)).find(Boolean) ?? reveal.find((r) => r.correct);
    if (!e || seen.has(`${e.lang}:${e.word}`)) continue;
    seen.add(`${e.lang}:${e.word}`);
    out.push({ lang: e.lang, word: e.word, meaning: e.meaning || e.gloss || p?.gloss || "" });
    if (out.length >= REVIEW_SIZE) break;
  }
  return out;
}

export function podium(lobby: Pick<LobbyState, "players">): { name: string; score: number }[] {
  return lobby.players
    .filter((p) => !p.bot)
    .map((p) => ({ name: p.name, score: p.total ?? p.score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3);
}

export function wordOfNight(lobby: Lobby): { word: string; meaning: string; lang: string } | null {
  let best: { round: number; misses: number } | null = null;
  for (const p of lobby.prompts) {
    if (!p.answer) continue;
    const misses = lobby.results.filter((r) => r.round === p.round && !r.correct).length;
    if (!best || misses > best.misses) best = { round: p.round, misses };
  }
  const p = best ? lobby.prompts.find((x) => x.round === best!.round) : null;
  const e = p?.reveal?.find((r) => r.correct) ?? p?.reveal?.[0];
  return e ? { word: e.word, meaning: e.meaning || e.gloss, lang: e.lang } : null;
}

export function roomRecord(lobby: Lobby & Pick<LobbyState, "code" | "id" | "startedAt">, learn: readonly string[], now: number): RoomRecord | null {
  const me = lobby.players.find((p) => p.isMe);
  if (!me) return null;
  const ranked = [...lobby.players].sort((a, b) => (b.total ?? b.score) - (a.total ?? a.score));
  return {
    key: `${lobby.id}|${lobby.startedAt ?? ""}`,
    code: lobby.code,
    day: dayOf(now),
    xp: Math.max(0, me.score),
    rank: ranked.findIndex((p) => p.isMe) + 1,
    players: lobby.players.length,
    missed: reviewCards(lobby, learn),
    savedAt: now,
  };
}
