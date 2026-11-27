"use client";

import { useEffect, useRef, useState } from "react";
import type { LobbyApi } from "@/lib/lobby/client";
import { addFloat, readSignal, type Float } from "@/lib/lobby/signals";
import { LiveSocket } from "@/lib/stoa/socket";

export type RoomSignals = { floats: Float[]; votes: ReadonlyMap<number, ReadonlyMap<string, string>> };

export function useRoomSignals(api: LobbyApi, lobbyId: string | undefined, startedAt: string | null | undefined): RoomSignals {
  const [floats, setFloats] = useState<Float[]>([]);
  const [votes, setVotes] = useState<Map<number, Map<string, string>>>(new Map());
  const id = useRef(0);
  useEffect(() => setVotes(new Map()), [startedAt]);
  useEffect(() => {
    if (!lobbyId) return;
    let socket: LiveSocket | null = null;
    let stop = false;
    api
      .roomRealtime(lobbyId)
      .then((rt) => {
        if (stop) return;
        socket = new LiveSocket(
          rt,
          (payload) => {
            const s = readSignal(payload);
            if (!s) return;
            if (s.kind === "react") setFloats((f) => addFloat(f, s.emoji, Date.now(), ++id.current, Math.random));
            else setVotes((v) => new Map(v).set(s.round, new Map(v.get(s.round) ?? []).set(s.from, s.choice)));
          },
          () => undefined,
        );
        socket.start();
      })
      .catch(() => undefined);
    return () => {
      stop = true;
      socket?.stop();
    };
  }, [api, lobbyId]);
  return { floats, votes };
}
