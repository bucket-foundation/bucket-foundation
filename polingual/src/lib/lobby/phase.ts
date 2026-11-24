import type { LobbyState } from "@academy/lobbies";

export type Phase =
  | { kind: "waiting" }
  | { kind: "countdown"; seconds: number }
  | { kind: "round"; index: number; remaining: number }
  | { kind: "reveal"; index: number; remaining: number }
  | { kind: "finished" };

type Clock = Pick<LobbyState, "startedAt" | "rounds" | "roundSeconds"> & { revealSeconds?: number };

export function gameSeconds(lobby: Omit<Clock, "startedAt">): number {
  return lobby.rounds * lobby.roundSeconds + Math.max(0, lobby.rounds - 1) * (lobby.revealSeconds ?? 0);
}

export function phaseAt(lobby: Clock & Pick<LobbyState, "status">, now: number): Phase {
  if (lobby.status === "lobby") return { kind: "waiting" };
  if (lobby.status === "done" || !lobby.startedAt) return lobby.status === "done" ? { kind: "finished" } : { kind: "waiting" };
  const elapsed = (now - Date.parse(lobby.startedAt)) / 1000;
  if (elapsed < 0) return { kind: "countdown", seconds: -elapsed };
  if (elapsed >= gameSeconds(lobby)) return { kind: "finished" };
  const slot = lobby.roundSeconds + (lobby.revealSeconds ?? 0);
  const index = Math.floor(elapsed / slot);
  const into = elapsed - index * slot;
  if (into < lobby.roundSeconds) return { kind: "round", index, remaining: lobby.roundSeconds - into };
  return { kind: "reveal", index, remaining: slot - into };
}

export const TALLY_WAIT_MS = 5000;

export function tallyLate(lobby: Clock, now: number): boolean {
  if (!lobby.startedAt) return false;
  return now - (Date.parse(lobby.startedAt) + gameSeconds(lobby) * 1000) > TALLY_WAIT_MS;
}

export function serverOffset(serverNow: string, sentAt: number, receivedAt: number): number {
  return Date.parse(serverNow) - (sentAt + receivedAt) / 2;
}
