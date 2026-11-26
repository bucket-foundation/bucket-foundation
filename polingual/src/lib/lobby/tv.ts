import type { Sfx, Track } from "../stoa/script";
import type { Standing } from "../stoa/client";
import type { LobbyState } from "./client";
import type { Phase } from "./phase";

export type TvBeat = { key: string; players: number };

const TICK_FROM = 3;

export function tvTrack(phase: Phase): Track {
  if (phase.kind === "round") return "question";
  if (phase.kind === "reveal") return "reveal";
  if (phase.kind === "finished") return "finale";
  return "lobby";
}

export function tvKey(startedAt: string | null | undefined, phase: Phase): string {
  if (phase.kind === "countdown") return `${startedAt}:countdown:${Math.ceil(phase.seconds)}`;
  if (phase.kind === "round") {
    const left = Math.ceil(phase.remaining);
    return `${startedAt}:round:${phase.index}${left <= TICK_FROM ? `:t${left}` : ""}`;
  }
  if (phase.kind === "reveal") return `${startedAt}:reveal:${phase.index}`;
  return phase.kind;
}

export function tvSfx(prev: TvBeat | null, next: TvBeat): Sfx[] {
  if (!prev) return [];
  const out: Sfx[] = [];
  if (next.players > prev.players) out.push("join");
  if (next.key === prev.key) return out;
  const [, kind, , tick] = next.key.split(":");
  if (next.key === "finished") out.push("fanfare");
  else if (kind === "countdown") out.push(prev.key.includes(":countdown:") ? "tick" : "whoosh");
  else if (kind === "round") out.push(tick ? "tick" : "open");
  else if (kind === "reveal") out.push("reveal");
  return out;
}

export function tvPlayers(lobby: Pick<LobbyState, "players">): Standing[] {
  return [...lobby.players]
    .filter((p) => !p.isMe)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p) => ({ player_id: p.userId, nickname: p.name, points: p.score }));
}

export type TvRound = { label: string; gloss: string | null; choices: string[]; answer: string | null; seconds: number | null };

export function tvAnswer(prompt: Pick<LobbyState["prompts"][number], "mode" | "answer">): string | null {
  if (!prompt.answer) return null;
  return prompt.mode === "mixed" ? prompt.answer.slice(prompt.answer.indexOf(":") + 1) : prompt.answer;
}

export function tvRound(lobby: Pick<LobbyState, "rounds" | "prompts" | "players">, phase: Phase): TvRound {
  if (phase.kind === "waiting") {
    const n = lobby.players.filter((p) => !p.isMe).length;
    return { label: n === 1 ? "1 player in" : `${n} players in`, gloss: null, choices: [], answer: null, seconds: null };
  }
  if (phase.kind === "countdown") return { label: "Get ready", gloss: null, choices: [], answer: null, seconds: Math.ceil(phase.seconds) };
  if (phase.kind === "finished") return { label: "Final scores", gloss: null, choices: [], answer: null, seconds: null };
  const prompt = lobby.prompts.find((p) => p.round === phase.index) ?? null;
  return {
    label: `Round ${phase.index + 1} of ${lobby.rounds}`,
    gloss: prompt?.gloss ?? null,
    choices: prompt?.choices ?? [],
    answer: phase.kind === "reveal" && prompt ? tvAnswer(prompt) : null,
    seconds: phase.kind === "round" ? Math.ceil(phase.remaining) : null,
  };
}

export function tvJoinUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/play/${code}`;
}

export function tvPath(code: string): string {
  return `/play/tv/${encodeURIComponent(code)}`;
}

export const TV_ORIGIN = ["https:", "", "polingual.com"].join("/");

export function tvShortUrl(url: string): string {
  return url.replace(/^https?:[/][/]/, "");
}
