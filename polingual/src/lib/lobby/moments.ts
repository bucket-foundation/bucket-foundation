import { nightRound, stealBonus } from "@academy/lobbies";
import type { LobbyState } from "./client";

export type MomentKind = "streak" | "new-language" | "perfect" | "steal";
export type Moment = { kind: MomentKind; text: string; round: number };

type Lobby = Pick<LobbyState, "players" | "results" | "prompts" | "playlist" | "game">;

const STREAKS = new Set([3, 5, 10]);

export function answerLang(prompt: { mode: string; lang: string | null; answer: string | null } | undefined): string | null {
  if (!prompt?.answer) return null;
  if (prompt.mode === "mixed") return prompt.answer.slice(0, prompt.answer.indexOf(":")) || null;
  if (prompt.mode === "flag") return prompt.answer;
  return prompt.lang;
}

function streakAt(results: Lobby["results"], userId: string, round: number): number {
  let n = 0;
  for (let r = round; r >= 0; r--) {
    const hit = results.find((x) => x.round === r && x.userId === userId);
    if (!hit?.correct) break;
    n++;
  }
  return n;
}

export function momentsFor(lobby: Lobby, round: number, known: ReadonlyMap<string, ReadonlySet<string>>, langName: (code: string) => string): Moment[] {
  const here = lobby.results.filter((r) => r.round === round);
  if (!here.length) return [];
  const name = (id: string) => lobby.players.find((p) => p.userId === id)?.name ?? "Someone";
  const out: Moment[] = [];
  const humans = lobby.players.filter((p) => !p.bot);
  if (humans.length >= 2 && humans.every((p) => here.some((r) => r.userId === p.userId && r.correct))) out.push({ kind: "perfect", text: "Perfect round! Everyone got it.", round });
  if (nightRound(lobby)?.final) {
    const before = lobby.players.map((p) => ({ user_id: p.userId, score: p.score - here.filter((r) => r.userId === p.userId).reduce((s, r) => s + r.points, 0) }));
    const order = [...here].sort((a, b) => a.ms - b.ms);
    for (const [i, r] of order.entries()) {
      if (r.correct && stealBonus(r.userId, before, order.slice(0, i).map((x) => ({ user_id: x.userId, correct: x.correct }))) > 0) out.push({ kind: "steal", text: `${name(r.userId)} steals!`, round });
    }
  }
  const lang = answerLang(lobby.prompts.find((p) => p.round === round));
  for (const r of here) {
    if (!r.correct) continue;
    const streak = streakAt(lobby.results, r.userId, round);
    if (STREAKS.has(streak)) out.push({ kind: "streak", text: `${name(r.userId)}: ${streak} in a row`, round });
    if (lang && known.get(r.userId)?.size && !known.get(r.userId)?.has(lang)) out.push({ kind: "new-language", text: `${name(r.userId)}: first word in ${langName(lang)}!`, round });
  }
  return out;
}

export function learnedLangs(lobby: Lobby, upTo: number): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const r of lobby.results) {
    if (r.round > upTo || !r.correct) continue;
    const lang = answerLang(lobby.prompts.find((p) => p.round === r.round));
    if (!lang) continue;
    out.set(r.userId, new Set([...(out.get(r.userId) ?? []), lang]));
  }
  return out;
}
