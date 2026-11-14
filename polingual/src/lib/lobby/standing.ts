import type { LobbyState } from "@academy/lobbies";
import type { Phase } from "./client";

export function flagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...Array.from(code, (c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const LANG_FLAGS: Record<string, string> = {
  en: "GB", es: "ES", fr: "FR", it: "IT", pt: "PT", de: "DE", nl: "NL", sv: "SE", da: "DK", no: "NO", nb: "NO", fi: "FI", pl: "PL", cs: "CZ",
  ru: "RU", uk: "UA", el: "GR", tr: "TR", ar: "SA", he: "IL", fa: "IR", hi: "IN", bn: "BD", ur: "PK", ja: "JP", zh: "CN", ko: "KR",
  vi: "VN", th: "TH", id: "ID", ms: "MY", tl: "PH", sw: "KE", ro: "RO", hu: "HU", ca: "AD", la: "VA", ga: "IE", cy: "GB", eu: "ES",
};

export function langFlag(lang: string | null | undefined): string | null {
  return lang ? LANG_FLAGS[lang.split("-")[0]] ?? null : null;
}

export function streakOf(lobby: Pick<LobbyState, "results" | "players">): number {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  if (!me) return 0;
  const mine = lobby.results.filter((r) => r.userId === me).sort((a, b) => b.round - a.round);
  let n = 0;
  let expect = mine[0]?.round;
  for (const r of mine) {
    if (r.round !== expect || !r.correct) break;
    n++;
    expect = r.round - 1;
  }
  return n;
}

export function livesLeft(lobby: Pick<LobbyState, "results" | "players">, round: number, lives = 3): number {
  const meP = lobby.players.find((p) => p.isMe);
  const me = meP?.userId;
  const mine = lobby.results.filter((r) => r.userId === me && r.round < round);
  const by = new Map(mine.map((r) => [r.round, r.correct]));
  let left = lives + (meP?.continues ?? 0);
  for (let r = meP?.firstRound ?? 0; r < round; r++) if (by.get(r) !== true) left--;
  return Math.max(0, left);
}

export const LEARN_HREF = "/app?from=play";

export function botLabel(p: { bot: boolean; skill: string | null }): string | null {
  return p.bot ? (p.skill ? `bot · ${p.skill}` : "bot") : null;
}

export function myScore(lobby: Pick<LobbyState, "players">): number {
  return lobby.players.find((p) => p.isMe)?.score ?? 0;
}

export function standings(lobby: Pick<LobbyState, "players">): LobbyState["players"] {
  return [...lobby.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function missedWords(lobby: Pick<LobbyState, "prompts" | "results" | "players">): string[] {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  if (!me) return [];
  const right = new Set(lobby.results.filter((r) => r.userId === me && r.correct).map((r) => r.round));
  return lobby.prompts.filter((p) => !right.has(p.round) && p.answer).map((p) => (p.mode === "mixed" ? (p.answer as string).slice((p.answer as string).indexOf(":") + 1) : (p.answer as string)));
}

export function promptFor(lobby: Pick<LobbyState, "prompts">, round: number): LobbyState["prompts"][number] | null {
  return lobby.prompts.find((p) => p.round === round) ?? null;
}

export function answeredRound(lobby: Pick<LobbyState, "results" | "players">, round: number): boolean {
  const me = lobby.players.find((p) => p.isMe)?.userId;
  return !!me && lobby.results.some((r) => r.userId === me && r.round === round);
}

type RankedPlayer = LobbyState["players"][number] & { rank: number };

export function ranked(players: LobbyState["players"]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return sorted.map((p, i) => ({ ...p, rank: i > 0 && sorted[i - 1].score === p.score ? sorted.findIndex((q) => q.score === p.score) + 1 : i + 1 }));
}

export function gameProgress(phase: Phase, rounds: number): number {
  if (phase.kind === "finished") return 1;
  if (phase.kind === "round") return Math.min(1, phase.index / rounds);
  if (phase.kind === "reveal") return Math.min(1, (phase.index + 1) / rounds);
  return 0;
}

export function revealOrder<T extends { correct: boolean }>(entries: readonly T[]): T[] {
  return [...entries.filter((e) => e.correct), ...entries.filter((e) => !e.correct)];
}
