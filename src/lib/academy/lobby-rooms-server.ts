import { service } from "./groups-server";
import { bearer, isGuestToken } from "./lobby-guests";
import { checkLobby, LOBBIES, PLAYERS, SCREENS } from "./lobbies-server";
import { roomCard, type RoomCard } from "./lobby-cards";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RoomSeats {
  host: string;
  players: string[];
  screens: string[];
}

export async function roomSeats(lobbyId: string): Promise<RoomSeats | null> {
  const lobby = checkLobby(await service().from(LOBBIES).select("host_id").eq("id", lobbyId).maybeSingle(), "round lobby") as { host_id: string } | null;
  if (!lobby) return null;
  const players = checkLobby(await service().from(PLAYERS).select("user_id").eq("lobby_id", lobbyId), "round players") as { user_id: string }[];
  const screens = checkLobby(await service().from(SCREENS).select("user_id").eq("lobby_id", lobbyId), "round screens") as { user_id: string }[];
  return { host: lobby.host_id, players: players.map((p) => p.user_id), screens: screens.map((s) => s.user_id) };
}

export function inRoom(uid: string, s: RoomSeats): boolean {
  return uid === s.host || s.players.includes(uid) || s.screens.includes(uid);
}

export async function seatCard(lobbyId: string, uid: string): Promise<RoomCard | null> {
  const row = checkLobby(await service().from("lobby_cards").select("card").eq("lobby_id", lobbyId).eq("user_id", uid).maybeSingle(), "round card") as { card: unknown } | null;
  return row ? roomCard(row.card) : null;
}

export function guestRequest(authorization: string | null): boolean {
  const token = bearer(authorization);
  return !!token && isGuestToken(token);
}

export const TEACH = "lobby_teach";
export const TEACH_GUESSES = "lobby_teach_guesses";
export const TRIVIA = "lobby_trivia";
export const TRIVIA_ANSWERS = "lobby_trivia_answers";
const ROUND_TTL_MS = 24 * 60 * 60 * 1000;

export async function purgeRounds(now: number, closing?: string): Promise<void> {
  const before = new Date(now - ROUND_TTL_MS).toISOString();
  checkLobby(await service().from(TEACH).delete().lt("created_at", before), "teach purge");
  checkLobby(await service().from(TRIVIA).delete().lt("created_at", before), "trivia purge");
  if (closing) checkLobby(await service().from(TEACH).update({ clip: null }).eq("lobby_id", closing), "teach close");
}

export async function insertOnce(table: string, row: Record<string, unknown>, where: string): Promise<boolean> {
  const res = await service().from(table).insert(row);
  if (res.error && (res.error as { code?: string }).code === "23505") return false;
  checkLobby(res, where);
  return true;
}

export async function teachGuesses(lobbyId: string, round: number): Promise<Record<string, number>> {
  const rows = checkLobby(await service().from(TEACH_GUESSES).select("user_id,guess").eq("lobby_id", lobbyId).eq("round", round), "teach guesses") as { user_id: string; guess: number }[];
  return Object.fromEntries(rows.map((r) => [r.user_id, r.guess]));
}

export async function triviaAnswers(lobbyId: string): Promise<Record<string, Record<string, number>>> {
  const rows = checkLobby(await service().from(TRIVIA_ANSWERS).select("question,user_id,pick").eq("lobby_id", lobbyId), "trivia answers") as { question: number; user_id: string; pick: number }[];
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[String(r.question)] ??= {})[r.user_id] = r.pick;
  return out;
}

export async function claimed(res: unknown, where: string): Promise<boolean> {
  const rows = checkLobby(res as never, where) as unknown[] | null;
  return Array.isArray(rows) && rows.length > 0;
}

export async function addPoints(lobbyId: string, points: Record<string, number>): Promise<void> {
  const ids = Object.keys(points).filter((k) => points[k] > 0);
  if (!ids.length) return;
  const rows = checkLobby(await service().from(PLAYERS).select("user_id,score").eq("lobby_id", lobbyId).in("user_id", ids), "round scores") as { user_id: string; score: number }[];
  for (const r of rows) checkLobby(await service().from(PLAYERS).update({ score: r.score + points[r.user_id] }).eq("lobby_id", lobbyId).eq("user_id", r.user_id), "round score");
}
