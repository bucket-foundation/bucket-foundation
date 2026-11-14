"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LobbyError, lobbyError, serverOffset, type LobbyApi, type WebLobbyState } from "@/lib/lobby/client";

const POLL_MS = 1000;

export function errorOf(err: unknown): string {
  return lobbyError(err instanceof LobbyError ? err.code : undefined);
}

export function useRoomSync(api: LobbyApi, code: string | null, nickname: string, ready: boolean) {
  const [lobby, setLobby] = useState<WebLobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [kick, setKick] = useState(0);
  const version = useRef<number | undefined>(undefined);

  const take = useCallback((next: WebLobbyState, sentAt: number) => {
    version.current = next.version;
    setOffset(serverOffset(next.now, sentAt, Date.now()));
    setLobby(next);
  }, []);

  useEffect(() => {
    if (!ready || !code) return;
    let stop = false;
    const sentAt = Date.now();
    api
      .join({ code, displayName: nickname })
      .then((l) => !stop && take(l, sentAt))
      .catch((err) => !stop && setError(errorOf(err)));
    return () => {
      stop = true;
    };
  }, [api, code, nickname, ready, take]);

  usePoll(api, lobby?.id, take, kick, version, setError);

  return { lobby, error, setError, offset, take, setKick };
}

function usePoll(api: LobbyApi, id: string | undefined, take: (l: WebLobbyState, sentAt: number) => void, kick: number, version: { current: number | undefined }, setError: (e: string | null) => void) {
  useEffect(() => {
    if (!id) return;
    let busy = false;
    const pull = async () => {
      if (busy) return;
      busy = true;
      const sentAt = Date.now();
      try {
        const res = await api.state(id, version.current);
        if (res.changed && res.lobby) take(res.lobby, sentAt);
        setError(null);
      } catch (err) {
        setError(errorOf(err));
      } finally {
        busy = false;
      }
    };
    if (kick > 0) void pull();
    const t = window.setInterval(() => void pull(), POLL_MS);
    return () => window.clearInterval(t);
  }, [api, id, take, kick, version, setError]);
}
