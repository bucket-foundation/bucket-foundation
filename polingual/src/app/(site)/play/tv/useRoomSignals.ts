"use client";

import { useEffect, useRef, useState } from "react";
import type { LobbyApi } from "@/lib/lobby/client";
import { addFloat, readSignal, type Float } from "@/lib/lobby/signals";
import { LiveSocket } from "@/lib/stoa/socket";

export type RoomSignals = { floats: Float[] };

export function useRoomSignals(api: LobbyApi, lobbyId: string | undefined, startedAt: string | null | undefined): RoomSignals {
  const [floats, setFloats] = useState<Float[]>([]);
  const id = useRef(0);
  useEffect(() => setFloats([]), [startedAt]);
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
            if (s) setFloats((f) => addFloat(f, s.emoji, Date.now(), ++id.current, Math.random));
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
  return { floats };
}
