import { service } from "./groups-server";
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

export async function addPoints(lobbyId: string, points: Record<string, number>): Promise<void> {
  const ids = Object.keys(points).filter((k) => points[k] > 0);
  if (!ids.length) return;
  const rows = checkLobby(await service().from(PLAYERS).select("user_id,score").eq("lobby_id", lobbyId).in("user_id", ids), "round scores") as { user_id: string; score: number }[];
  for (const r of rows) checkLobby(await service().from(PLAYERS).update({ score: r.score + points[r.user_id] }).eq("lobby_id", lobbyId).eq("user_id", r.user_id), "round score");
}
