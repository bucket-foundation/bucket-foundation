"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { LobbyError, lobbyError, type LobbySummary } from "@/lib/lobby/client";
import { LANG_SETS, roundsFor, roundSecondsFor, setupValid, type GameId, type SetupMode } from "../langs";
import { usePlay } from "../usePlay";

const LIST_MS = 5000;

function useListing(api: ReturnType<typeof usePlay>["api"], ready: boolean, setError: (e: string | null) => void) {
  const [open, setOpen] = useState<LobbySummary[] | null>(null);
  const [botsOn, setBotsOn] = useState(false);
  const [offered, setOffered] = useState<string[] | null>(null);
  const refresh = useCallback(async () => {
    if (!ready) return;
    try {
      const res = await api.listing();
      setOpen(res.lobbies);
      setBotsOn(res.bots);
      setOffered(res.games);
    } catch (err) {
      setError(lobbyError(err instanceof LobbyError ? err.code : undefined));
    }
  }, [api, ready, setError]);
  useEffect(() => {
    void refresh();
    if (!ready) return;
    const t = window.setInterval(() => void refresh(), LIST_MS);
    return () => window.clearInterval(t);
  }, [refresh, ready]);
  return { open, botsOn, offered };
}

export function useLobbies() {
  const router = useRouter();
  const { state, api, connect } = usePlay();
  const [code, setCode] = useState("");
  const [game, setGame] = useState<GameId>("daily");
  const [mode, setMode] = useState<SetupMode>("single");
  const [games, setGames] = useState<GameId[]>(["flags", "daily"]);
  const [langs, setLangs] = useState<string[]>(LANG_SETS[0].targets);
  const [rounds, setRounds] = useState(6);
  const [busy, setBusy] = useState(false);
  const [fill, setFill] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ready = state.status === "ready";
  const listing = useListing(api, ready, setError);

  const create = async () => {
    if (state.status !== "ready") return;
    const invalid = setupValid(mode, mode === "single" ? [game] : games, langs);
    if (invalid) {
      setError(invalid);
      return;
    }
    const first = mode === "sequence" ? games[0] : mode === "mix" ? "daily" : game;
    setBusy(true);
    setError(null);
    try {
      const lobby = await api.create({ name: `${state.nickname}'s lobby`, root: "en", targets: langs, rounds: roundsFor(first, rounds), roundSeconds: roundSecondsFor(first), listed: true, displayName: state.nickname, game: first, fillBots: listing.botsOn && fill, setup: mode, ...(mode === "sequence" ? { games } : {}) });
      router.push(`/play/${lobby.code}`);
    } catch (err) {
      setError(lobbyError(err instanceof LobbyError ? err.code : undefined));
      setBusy(false);
    }
  };

  const pick = (g: GameId) => {
    setMode("single");
    setGame(g);
    document.getElementById(ready ? "new-lobby" : "lobby-name")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeLobbyCode(code);
    if (!c) {
      setError("Codes have 6 letters and numbers.");
      return;
    }
    router.push(`/play/${c}`);
  };

  return { router, state, connect, ready, ...listing, code, setCode, game, setGame, mode, setMode, games, setGames, langs, setLangs, rounds, setRounds, busy, fill, setFill, error, create, pick, join };
}

export type LobbiesState = ReturnType<typeof useLobbies>;
