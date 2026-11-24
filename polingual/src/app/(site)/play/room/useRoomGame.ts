"use client";

import { useEffect, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { useNow } from "@/lib/hooks/clock";
import { phaseAt, type LobbySummary } from "@/lib/lobby/client";
import { roundKeyOf, worldOf, type Picked } from "@/lib/lobby/room";
import { readMuted } from "@/lib/lobby/sound";
import type { WorldId } from "@/ui/art/play";
import { useAdsVisible } from "../AdsContext";
import { useAccount } from "../Account";
import { usePlay } from "../usePlay";
import { useRoomActions } from "./useRoomActions";
import { useRoomCues } from "./useRoomCues";
import { useRoomSync } from "./useRoomSync";

const TICK_MS = 200;

export function useRoomGame(rawCode: string, onGame: (g: WorldId, code: string) => void) {
  const code = normalizeLobbyCode(rawCode);
  const { state, api, connect } = usePlay();
  const ready = state.status === "ready";
  const nickname = state.status === "ready" ? state.nickname : "";
  const sync = useRoomSync(api, code, nickname, ready);
  const { lobby, offset } = sync;
  const now = useNow(TICK_MS);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [chat, setChat] = useState("");
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState("");
  const [rewarded, setRewarded] = useState(false);
  const worldId = worldOf(lobby);
  useEffect(() => {
    if (lobby) onGame(worldId, lobby.code);
  }, [lobby, worldId, onGame]);
  const adsVisible = useAdsVisible();
  const account = useAccount();
  useEffect(() => setMuted(readMuted(() => window.localStorage)), []);
  const livePhase = lobby ? phaseAt(lobby, now + offset) : null;
  const roundKey = roundKeyOf(lobby?.startedAt, livePhase);
  const cues = useRoomCues(roundKey, lobby?.startedAt, muted, adsVisible, sync.setKick);
  const next = useNextLobby(api, livePhase?.kind, ready, lobby);
  const actions = useRoomActions({ api, state, lobby, picked, setPicked, muted, setMuted, busy, setBusy, setCopied, take: sync.take, setError: sync.setError });
  return { code, state, api, connect, ready, ...sync, now, picked, chat, setChat, copied, muted, next, skipped, setSkipped, rewarded, setRewarded, worldId, adsVisible, account, ...cues, ...actions, busy };
}

function useNextLobby(api: ReturnType<typeof usePlay>["api"], kind: string | undefined, ready: boolean, lobby: { id: string; game: string; standing: boolean } | null) {
  const [next, setNext] = useState<LobbySummary | null>(null);
  useEffect(() => {
    if (kind !== "finished" || !ready || lobby?.standing) return;
    let stop = false;
    api
      .listing()
      .then((res) => {
        if (stop) return;
        const rooms = res.lobbies.filter((l) => l.standing && l.id !== lobby?.id);
        setNext(rooms.find((l) => l.game === lobby?.game) ?? rooms[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [kind, ready, api, lobby?.id, lobby?.game, lobby?.standing]);
  return next;
}

export type RoomGameState = ReturnType<typeof useRoomGame>;
export type LiveRoom = RoomGameState & { lobby: NonNullable<RoomGameState["lobby"]> };
