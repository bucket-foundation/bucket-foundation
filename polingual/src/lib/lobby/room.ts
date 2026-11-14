import { WORLDS, type WorldId } from "@/ui/art/play";
import type { LobbyState } from "./client";

export type Picked = { game: string | null; round: number; choice: string; correct: boolean; points: number; pending?: boolean };

export function worldOf(lobby: Pick<LobbyState, "game"> | null): WorldId {
  if (!lobby) return "duel";
  if (lobby.game === "spy") return "ispy";
  if (lobby.game === "daily" || lobby.game === "live") return "same-word";
  return lobby.game in WORLDS ? (lobby.game as WorldId) : "duel";
}

export function roundKeyOf(startedAt: string | null | undefined, phase: { kind: string; index?: number } | null): string {
  if (phase?.kind === "round" || phase?.kind === "reveal") return `${startedAt}:${phase.kind}:${phase.index}`;
  return phase?.kind ?? "";
}

export function secondsUntil(at: string | null | undefined, now: number): number | null {
  return at ? Math.max(0, Math.ceil((Date.parse(at) - now) / 1000)) : null;
}

export function pickFor(picked: Picked | null, startedAt: string | null, round: number): Picked | null {
  return picked?.round === round && picked.game === startedAt ? picked : null;
}

export function choiceState(mine: Picked | null, done: boolean, choice: string): string | undefined {
  if (mine) return mine.choice === choice ? (mine.pending ? "pending" : mine.correct ? "right" : "wrong") : "dim";
  return done ? "dim" : undefined;
}

export function tilesFeedback(mine: Picked): string {
  if (mine.pending) return "Checking";
  if (mine.correct) return `Perfect. +${mine.points}`;
  return mine.points > 0 ? `Close. +${mine.points}` : "Missed some. -1 life";
}

export function roundFeedback(mine: Picked): string {
  if (mine.pending) return "Checking";
  if (mine.points > 0) return `Right. +${mine.points}`;
  return mine.correct ? "Right." : "Not this time.";
}

export function waitingHint(lobby: Pick<LobbyState, "standing" | "isHost">, readyCount: number): string {
  if (lobby.standing) return "The next game starts soon.";
  if (readyCount < 2) return "Starts 15 seconds after two players are ready.";
  return lobby.isHost ? "Everyone ready? Start now or wait for the countdown." : "The host can start now.";
}

export function livesText(lives: number): string {
  return `${"♥".repeat(lives)}${"♡".repeat(Math.max(0, 3 - lives))}`;
}

export function timerWidth(remaining: number, total: number): string {
  return `${Math.max(0, Math.min(100, (remaining / total) * 100))}%`;
}

export function powerNote(powers: LobbyState["powers"], round: number): string | null {
  if (!powers.some((p) => p.round === round)) return null;
  return powers.find((p) => p.round === round)?.kind === "double" ? "Double points is on for the next round." : "50/50 is on for the next round.";
}
