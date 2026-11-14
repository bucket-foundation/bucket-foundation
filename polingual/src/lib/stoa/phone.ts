import type { Snapshot } from "./client";

export type OpenPayload = { idx: number; round: number; kind: "pick_word" | "which_language" | "translate"; prompt: Record<string, string>; options: string[]; opens_at: number; closes_at: number };
export type PhoneTileState = "idle" | "chosen" | "dim" | "right";

export function announce(left: number | null, paused: boolean): string {
  if (paused) return "Paused.";
  if (left === 10) return "10 seconds left.";
  if (left === 5) return "5 seconds left.";
  if (left === 0) return "Time is up.";
  return "";
}

export function openedSnap(prev: Snapshot | null, p: OpenPayload, seq: number): Snapshot | null {
  if (!prev) return prev;
  return {
    ...prev,
    room: { ...prev.room, phase: "question", idx: p.idx, seq, opens_at: p.opens_at, closes_at: p.closes_at, paused: false },
    question: { idx: p.idx, round: p.round, kind: p.kind, prompt: p.prompt, options: p.options, answer: null, counts: null },
    player: prev.player ? { ...prev.player, choice: null } : prev.player,
  };
}

export function refetchDelay(type: string, random: () => number): number {
  return type === "rotate" || type === "reveal" ? 0 : Math.floor(random() * 800);
}

export function sfxBuzz(f: string): number | number[] | null {
  if (f === "right" || f === "streak") return [40, 60, 40];
  if (f === "wrong") return 180;
  if (f === "open") return 25;
  return null;
}

export function questionStates(chosen: number | null): PhoneTileState[] {
  return [0, 1, 2, 3].map((i) => (chosen === null ? "idle" : i === chosen ? "chosen" : "dim"));
}

export function revealStates(answer: number | null): PhoneTileState[] {
  return [0, 1, 2, 3].map((i) => (i === answer ? "right" : "dim"));
}

export function roundSeconds(room: Pick<Snapshot["room"], "opens_at" | "closes_at">): number {
  return room.opens_at && room.closes_at ? Math.round((room.closes_at - room.opens_at) / 1000) : 20;
}

export function resultText(choice: number | null | undefined, right: boolean, points: number, place: number | null): string {
  const lead = choice == null ? "No answer this time." : right ? "Right." : "Not this one.";
  return `${lead} ${points} points${place ? `, place ${place}` : ""}.`;
}

export function answerError(error: string | undefined): string | null {
  if (error === "duplicate") return null;
  return error === "late" ? "Time ran out before your answer arrived." : "Your answer did not reach the room.";
}
