import type { LobbyState } from "./client";

export type SetupMode = "single" | "sequence" | "mix";

export type WaitingRow = { id: string; name: string; ready: boolean; host: boolean; bot: boolean; me: boolean };

export type SettingsDraft = { mode: SetupMode; game: string; games: string[]; langs: string[] };

type Lobby = Pick<LobbyState, "players" | "setup" | "playlist" | "game" | "targets">;

export function waitingRows(lobby: Pick<LobbyState, "players">): WaitingRow[] {
  return lobby.players
    .map((p) => ({ id: p.userId, name: p.name, ready: p.ready, host: p.isHost, bot: p.bot, me: p.isMe }))
    .sort((a, b) => Number(b.host) - Number(a.host) || Number(b.ready) - Number(a.ready) || a.name.localeCompare(b.name));
}

export function readyLine(lobby: Pick<LobbyState, "players">): string {
  const n = lobby.players.length;
  const r = lobby.players.filter((p) => p.ready).length;
  return `${r} of ${n} ready`;
}

export function setupGames(lobby: Lobby): string[] {
  if (lobby.setup === "single" || !lobby.playlist.length) return [lobby.game ?? "daily"];
  return lobby.playlist;
}

export function draftOf(lobby: Lobby): SettingsDraft {
  const games = setupGames(lobby);
  return { mode: lobby.setup, game: lobby.game ?? games[0], games: lobby.setup === "sequence" ? games : [], langs: [...lobby.targets] };
}

export function settingsBody(d: SettingsDraft): { setup: SetupMode; game?: string; games?: string[]; targets: string[] } {
  if (d.mode === "sequence") return { setup: "sequence", games: d.games, targets: d.langs };
  if (d.mode === "mix") return { setup: "mix", targets: d.langs };
  return { setup: "single", game: d.game, targets: d.langs };
}

export function draftChanged(d: SettingsDraft, lobby: Lobby): boolean {
  const base = draftOf(lobby);
  if (d.mode !== base.mode || d.langs.join() !== base.langs.join()) return true;
  if (d.mode === "single") return d.game !== base.game;
  if (d.mode === "sequence") return d.games.join() !== base.games.join();
  return false;
}
